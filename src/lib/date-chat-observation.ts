/**
 * Free and deterministic observations from already-saved chat text.
 * This NEVER asks a model to interpret a message. It requires Alloah's
 * acceptance AND an explicit narrated departure before opening a Date.
 * Mentioned locations are scene labels, not geocoded real businesses.
 */
export type DateChatLine = {
  id: string | number;
  role: string;
  content: string;
  created_at: string;
};

export type DateChatObservation = {
  acceptanceId: string;
  acceptedAt: string;
  venueLabel: string | null;
  locationMode: "walking" | "place";
  lastEvidenceId: string;
  finished: boolean;
};

const RIO = "America/Sao_Paulo";

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\u2018\u2019\u0060]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function dateKey(value: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: RIO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function acceptsGoing(text: string): boolean {
  const value = normalize(text);
  if (/\b(?:not|never|don't|didn't|won't|tomorrow|yesterday|later|maybe|pretend|imagine|what if)\b/.test(value)) return false;
  if (/let'?s go (?:to sleep|back to bed|to work|home|shower|before we)/.test(value)) return false;
  return /\b(?:let'?s go(?:!|\.|,|\s|$)|we(?:'re| are) (?:leaving|heading out|going out)(?: now)?\b|you lead the way(?: then)?\b|let'?s head out\b|(?:let'?s|we can) (?:have|grab|get) (?:brunch|breakfast|lunch|dinner|coffee)\b)/.test(value);
}

function describesOuting(text: string): boolean {
  return /\b(?:bakery|cafe|café|coffee|croissant|pastr(?:y|ies)|brunch|breakfast|lunch|dinner|restaurant|food|eat|espresso|toastie|sandwich)\b/.test(normalize(text));
}

function actuallyOutside(text: string): boolean {
  const value = normalize(text);
  return /\b(?:door (?:shut|closed|clicks) behind us|(?:hit|hits|reach|reaches) the sidewalk|(?:step|steps|stepping|walk|walks|walking) (?:out(?:side)?|onto|down|along) (?:the |a )?(?:sidewalk|street)|(?:leading|leads|tugging|tugs) (?:you|us) (?:down|along|onto) (?:the )?(?:sunlit |sunny )?(?:sidewalk|street)|(?:we're|we are) (?:outside|on the street|walking to the bakery))\b/.test(value);
}

function clearlyAtVenue(text: string): boolean {
  const value = normalize(text);
  return /\b(?:pulls? out a (?:wicker |wooden |small )?chair|(?:dropping|drops|sits|sitting) into the seat across from you|(?:sat|sitting|seated|settled) (?:at|around) (?:the |a )?(?:outside |outdoor )?table|(?:at|into) (?:one of )?the (?:small )?outdoor tables|(?:we're|we are) (?:at|inside) (?:the )?(?:bakery|cafe|café|restaurant)|(?:we |we've |we have )?(?:arrived at|got to) (?:the )?(?:bakery|cafe|café|restaurant))\b/.test(value);
}

function homeAgain(text: string): boolean {
  const value = normalize(text);
  return /(?:^|[.!?]\s*)(?:we(?:'re| are) (?:back home|home now)|we(?:'ve| have) (?:gotten|arrived) home|we just got home|(?:the|our) date (?:is|was) over|we finished our date)(?:[.!?]|$)/.test(value);
}

function placeDescription(utterances: string[]): string | null {
  const joined = utterances.map(normalize).join(" ");
  if (/\bbakery\b/.test(joined)) return /\b(?:outdoor table|terrace|striped awning)\b/.test(joined) ? "Bakery · outdoor terrace" : "Bakery (name not yet known)";
  if (/\b(?:cafe|café)\b/.test(joined)) return "Café (name not yet known)";
  if (/\brestaurant\b/.test(joined)) return "Restaurant (name not yet known)";
  return null;
}

/**
 * We read at most the last 160 messages, limited to today's Rio calendar day
 * and an 12-hour window. This can repair an outing missed by older app code
 * on next chat load but cannot resurrect a Date from a previous day.
 */
export function observeDateConversation(
  transcript: DateChatLine[],
  now = new Date()
): DateChatObservation | null {
  const nowMs = now.getTime();
  const today = dateKey(now);
  const lines = transcript
    .slice(-160)
    .filter((line) => {
      if (line.role !== "user" && line.role !== "assistant") return false;
      if (!line.content || typeof line.content !== "string") return false;
      const time = new Date(line.created_at);
      const delta = nowMs - time.getTime();
      return Number.isFinite(delta) && delta >= -60_000 && delta <= 12 * 60 * 60_000 && dateKey(time) === today;
    });

  for (let index = 0; index < lines.length; index += 1) {
    const accepted = lines[index];
    if (accepted.role !== "user" || !acceptsGoing(accepted.content)) continue;

    const earlierAssistant = lines.slice(Math.max(0, index - 12), index)
      .filter((line) => line.role === "assistant")
      .map((line) => line.content);
    if (!earlierAssistant.some(describesOuting)) continue;

    // A proposed outing or "let's go" alone is not proof it happened.
    const departureIndex = lines.findIndex((line, position) =>
      position > index && position <= index + 8 &&
      line.role === "assistant" && actuallyOutside(line.content)
    );
    if (departureIndex < 0) continue;

    let stage: "walking" | "place" = "walking";
    let lastEvidenceId = String(lines[departureIndex].id);
    let finished = false;
    let venueLabel: string | null = null;

    for (let position = departureIndex + 1; position < lines.length; position += 1) {
      const line = lines[position];
      if (line.role === "user" && homeAgain(line.content)) {
        finished = true;
        lastEvidenceId = String(line.id);
        break;
      }
      if (line.role === "assistant" && actuallyOutside(line.content)) {
        stage = "walking";
        lastEvidenceId = String(line.id);
      }
      if (line.role === "assistant" && clearlyAtVenue(line.content)) {
        const context = lines.slice(Math.max(index, position - 16), position + 1)
          .map((candidate) => candidate.content);
        const label = placeDescription(context);
        if (label) {
          stage = "place";
          venueLabel = label;
          lastEvidenceId = String(line.id);
        }
      }
      if (line.role === "user" && /\b(?:we(?:'re| are) (?:leaving|heading out)|we just left|let'?s head out)\b/i.test(normalize(line.content))) {
        stage = "walking";
        lastEvidenceId = String(line.id);
      }
    }

    return {
      acceptanceId: String(accepted.id),
      acceptedAt: accepted.created_at,
      venueLabel: stage === "place" ? venueLabel : null,
      locationMode: stage,
      lastEvidenceId,
      finished,
    };
  }

  return null;
}
