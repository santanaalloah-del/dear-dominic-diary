import { syncChatMenu } from '@/lib/date-chat-menu-sync';
import {
  arriveAtChatDatePlace,
  beginDateExperience,
  finishDateExperience,
  getLiveDateExperience,
  leaveCurrentDatePlace,
  readDateExperience,
} from "@/lib/date-experience";
import { createContextualDate, finishDate, getDateFlowState, startDate } from "@/lib/date-flow";
import { notifyDateExperienceChanged } from "@/lib/date-live-events";
import { getDates, type DiarioItem } from "@/lib/diario-world";
import { observeDateConversation, type DateChatLine } from "@/lib/date-chat-observation";

// Avoid duplicate writes during overlapping history refreshes within a tab.
const inFlight = new Set<string>();
const processed = new Map<string, string>();

/**
 * Brings Dates up to date from the existing, persisted dialogue.
 *
 * No extra model calls, no invented geolocation or venue/menu catalogue.
 * Requires Alloah's assent, an outing context and a confirmed departure
 * narrated by Dominic. Running on chat load also repairs older missed outings.
 */
async function syncDateMovementFromConversation(
  userId: string,
  messages: DateChatLine[],
): Promise<boolean> {
  const observation = observeDateConversation(messages);
  if (!observation) return false;

  const signature = [
    observation.acceptanceId,
    observation.lastEvidenceId,
    observation.locationMode,
    observation.finished ? "finished" : "ongoing",
  ].join(":");

  if (inFlight.has(userId) || processed.get(userId) === signature) return false;

  inFlight.add(userId);
  try {
    const dates = await getDates(userId);
    const previous = dates.find((date) =>
      String(date.data?.chat_source_message_id ?? "") === observation.acceptanceId
    ) ?? null;

    // A completed, chat-started outing must not be recreated simply because
    // the user reopens chat on the same calendar day.
    if (previous && getDateFlowState(previous) === "past") {
      processed.set(userId, signature);
      return false;
    }

    const active = await getLiveDateExperience(userId);
    if (active && (!previous || previous.id !== active.id)) {
      // Never hijack a manually initiated Date or a different live outing.
      processed.set(userId, signature);
      return false;
    }

    let date: DiarioItem;
    let changed = false;

    if (previous) {
      date = previous;
      if (getDateFlowState(previous) !== "live") {
        date = await startDate({ userId, dateId: previous.id });
        changed = true;
      }
    } else {
      date = await createContextualDate({
        userId,
        title: "Brunch together",
        note: "A spontaneous outing agreed in chat. The venue name is not yet known.",
        chatSourceMessageId: observation.acceptanceId,
      });
      date = await startDate({ userId, dateId: date.id });
      changed = true;
    }

    if (!readDateExperience(date).events.some((entry) => entry.type === "date_started")) {
      date = await beginDateExperience({ userId, date });
      changed = true;
    }

    const state = readDateExperience(date);
    if (observation.finished) {
      date = await finishDateExperience({ userId, date });
      date = await finishDate({ userId, dateId: date.id });
      changed = true;
    } else if (observation.locationMode === "place" && observation.venueLabel) {
      if (state.currentLocationMode !== "place" ||
          (!state.currentPlaceId && state.currentPlaceName !== observation.venueLabel)) {
        date = await arriveAtChatDatePlace({
          userId,
          date,
          placeName: observation.venueLabel,
        });
        changed = true;
      }
    } else if (state.currentLocationMode === "between_places") {
      date = await leaveCurrentDatePlace({ userId, date });
      changed = true;
    } else if (state.currentLocationMode === "place" &&
               !state.currentPlaceId) {
      // Only a chat-mentioned stop may be left automatically by chat evidence;
      // saved real Places remain controlled by Date Mode's own movement tools.
      date = await leaveCurrentDatePlace({ userId, date });
      changed = true;
    }

    processed.set(userId, signature);
    if (changed) notifyDateExperienceChanged(date.id);
    return changed;
  } finally {
    inFlight.delete(userId);
  }
}

// Run menu replay even when there is no new movement evidence.
export async function syncDateFromConversation(userId: string, messages: DateChatLine[]): Promise<boolean> {
  const changed = await syncDateMovementFromConversation(userId, messages);
  await syncChatMenu(userId, messages);
  return changed;
}
