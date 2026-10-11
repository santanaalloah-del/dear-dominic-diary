/**
 * Deterministic, no-LLM interpretation of explicit real-time Date updates.
 * Never infer that an invitation was accepted from Dominic's words alone.
 */
export type DateChatIntent =
  | { type: "depart" }
  | { type: "arrive"; placeName: string }
  | { type: "finish" }
  | null;

export function parseDateChatIntent(message: string): DateChatIntent {
  const text = message.trim().replace(/\s+/g, " ").replace(/^\*\s*|\s*\*$/g, "").trim();
  if (!text || text.length > 240) return null;

  // Don't turn hypotheticals, plans, quotations or denials into real events.
  if (/\b(?:not|never|don't|didn't|won't|tomorrow|later|yesterday|if|maybe|pretend|imagine|what if|would|could)\b/i.test(text)) return null;
  const clean = text.replace(/[.!?*]+$/g, "").trim();

  if (/^(?:we(?:'re| are) (?:back home|home now)|we(?:'ve| have) (?:gotten|arrived) home|we (?:just )?got home|(?:the|our) date is over|we finished our date|we(?:'re| are) done with our date)$/i.test(clean)) {
    return { type: "finish" };
  }

  const arrival = clean.match(/^(?:we(?:'re| are) (?:at|inside|here at)|we (?:just )?arrived at|we (?:just )?got to|we (?:just )?made it to) (?:the )?(.+)$/i);
  if (arrival) {
    const placeName = (arrival[1] ?? "").trim();
    if (placeName.length < 3 || placeName.length > 80) return null;
    if (/^(?:a |the )?(?:place|restaurant|cafe|coffee shop|bar|store|park|somewhere|surprise|location|destination|house|home|work|here|there|his place|my place)$/i.test(placeName)) return null;
    if (/\b(?:when|where|because|but|although|before|after|until|instead|or)\b/i.test(placeName)) return null;
    return { type: "arrive", placeName };
  }

  if (/^(?:we(?:'re| are) (?:leaving|heading out|on our way|walking out)(?: now)?|we (?:just )?left(?: home|the house|the place)?|we(?:'ve| have) just left|(?:let's|let us) (?:head out|go now|leave now|go get (?:coffee|food|breakfast|lunch|dinner)))$/i.test(clean)) {
    return { type: "depart" };
  }

  return null;
}

export function isRecentOutingProposal(text: string): boolean {
  const clean = text.trim().replace(/\s+/g, " ");
  if (!clean || clean.length > 2500) return false;
  // A real invitation must precede the user's explicit departure.
  const proposal = /\b(?:let's|let us|wanna|want to|we could|how about|shall we|should we|why don't we|i was thinking we could)\b.{0,120}\b(?:go out|head out|go eat|go get|grab|coffee|eat|food|restaurant|breakfast|lunch|dinner|walk|date)\b/i;
  return proposal.test(clean) && !/\b(?:let's not|we shouldn't|don't go|never go)\b/i.test(clean);
}
