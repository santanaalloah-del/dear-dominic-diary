import { getLiveDateExperience, leaveCurrentDatePlace, readDateExperience } from "@/lib/date-experience";
import { notifyDateExperienceChanged } from "@/lib/date-live-events";

/**
 * A conservative, free chat-to-Date continuity bridge.
 *
 * Only the user's explicit present-tense departure can advance an already
 * active Date. Proposals, imagined actions, questions and Dominic's dialogue
 * must never create an arrival, confirm an invitation or reveal a surprise.
 */
export async function syncLiveDateFromChat(userId: string, message: string): Promise<boolean> {
  const text = message.trim().replace(/\s+/g, " ");
  if (!text || text.length > 350) return false;

  // Deliberately strict: don't treat "should we go?", "tomorrow we're
  // leaving", quoted speech or a past event as a real-world transition.
  const departure = /^(?:\*\s*)?(?:we(?:'re| are) (?:leaving|heading out|on our way|walking (?:out|there)) now|(?:let's|let us) (?:head out|go now|leave now)|(?:we(?:'ve| have) just left|we just left))(?:[.!*\s]|$)/i;
  const negated = /\b(?:not|never|don't|didn't|won't|tomorrow|later|yesterday|if|maybe|pretend|imagine|what if)\b/i;
  if (!departure.test(text) || negated.test(text)) return false;

  const liveDate = await getLiveDateExperience(userId);
  if (!liveDate) return false;
  const experience = readDateExperience(liveDate);
  if (experience.currentLocationMode !== "place") return false;

  const updated = await leaveCurrentDatePlace({ userId, date: liveDate });
  notifyDateExperienceChanged(updated.id);
  return true;
}
