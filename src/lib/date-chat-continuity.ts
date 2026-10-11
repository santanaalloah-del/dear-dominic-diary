import { beginDateExperience, getLiveDateExperience, leaveCurrentDatePlace, readDateExperience } from "@/lib/date-experience";
import { createContextualDate, startDate } from "@/lib/date-flow";
import { notifyDateExperienceChanged } from "@/lib/date-live-events";

let starting = false;

/**
 * Free, conservative chat-to-Date bridge. No additional AI inference.
 * Only an explicit present-tense departure, after Dominic suggested an
 * outing, can create a Date. A suggestion alone never creates one.
 */
export async function syncLiveDateFromChat(
  userId: string,
  message: string,
  recentDominicText = "",
): Promise<boolean> {
  const text = message.trim().replace(/\s+/g, " ");
  if (!text || text.length > 350 || starting) return false;

  const departure = /^(?:\*\s*)?(?:we(?:'re| are) (?:leaving|heading out|on our way|walking (?:out|there)) now|(?:let's|let us) (?:head out|go now|leave now|go get (?:coffee|food|breakfast|lunch|dinner))|(?:we(?:'ve| have) just left|we just left))(?:[.!*\s]|$)/i;
  const negated = /\b(?:not|never|don't|didn't|won't|tomorrow|later|yesterday|if|maybe|pretend|imagine|what if)\b/i;
  if (!departure.test(text) || negated.test(text)) return false;

  starting = true;
  try {
    let date = await getLiveDateExperience(userId);
    if (!date) {
      // Don't create a Date from a casual departure unrelated to a mutual
      // outing. Dominic's recent proposal is required, not merely a place name.
      const proposedOuting = /\b(?:we could|let's|wanna|want to|how about|maybe we|shall we|should we)\b.{0,120}\b(?:go out|outside|walk|coffee|eat|food|restaurant|breakfast|lunch|dinner|date)\b/i;
      if (!proposedOuting.test(recentDominicText)) return false;

      date = await createContextualDate({
        userId,
        title: "Our day out",
        note: "Started naturally together in chat.",
      });
      date = await startDate({ userId, dateId: date.id });
      date = await beginDateExperience({ userId, date });
      notifyDateExperienceChanged(date.id);
      return true;
    }

    const experience = readDateExperience(date);
    if (experience.currentLocationMode === "walking") return false;
    const updated = await leaveCurrentDatePlace({ userId, date });
    notifyDateExperienceChanged(updated.id);
    return true;
  } finally {
    starting = false;
  }
}
