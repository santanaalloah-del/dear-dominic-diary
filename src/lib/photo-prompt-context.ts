type PhotoContextRequest = {
  mode?: string | null;
  source_context?: string | null;
  subject_type?: "me" | "dominic" | "both" | string | null;
  closeness_level?: string | null;
  spontaneity_level?: string | null;
  context_snapshot?: Record<string, unknown> | null;
  anti_repeat_snapshot?: Record<string, unknown> | null;
};

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0
      )
    : [];
}

function modeInstruction(mode: string | null | undefined) {
  switch (mode) {
    case "surprise":
      return [
        "SURPRISE MODE:",
        "Choose a small believable moment yourself from the available current context.",
        "Do not make it feel like a planned photoshoot. Prefer something mundane, funny, affectionate, slightly messy, or casually worth sending.",
      ].join(" ");
    case "chat_context":
      return [
        "FROM CONVERSATION MODE:",
        "Turn the recent conversation into a plausible photo that could naturally belong inside that chat.",
        "Use the conversation as context, not as text to print into the image.",
        "Do not invent a dramatic event if the conversation only supports an ordinary moment.",
      ].join(" ");
    case "chat_photo":
      return [
        "CHAT PHOTO MODE:",
        "Make this feel like a photo someone would genuinely send in a private chat right now.",
        "Favor immediacy, casual framing, ordinary lighting and an unpolished personal-camera feeling.",
      ].join(" ");
    case "memory":
      return [
        "MEMORY MODE:",
        "Make the image feel like a real remembered personal photograph.",
        "Keep it believable and specific rather than dreamy, cinematic, symbolic, or nostalgic-filter-heavy.",
      ].join(" ");
    case "daily_life":
      return [
        "DAILY LIFE MODE:",
        "Capture an ordinary lived-in moment rather than a special occasion.",
        "Prefer natural posture, imperfect framing and mundane activity.",
        "Avoid making every daily-life image a posed selfie.",
      ].join(" ");
    case "spontaneous":
      return [
        "SPONTANEOUS MODE:",
        "This moment should feel unrequested and context-aware, as if Dominic naturally decided a photo was worth taking or sending.",
        "Use his current situation and the recent shared context.",
        "Do not manufacture a major event merely to justify the photo.",
      ].join(" ");
    case "adjust":
      return [
        "ADJUST MODE:",
        "Preserve the established scene and identity unless the requested adjustment explicitly changes them.",
      ].join(" ");
    case "request":
    default:
      return [
        "REQUEST MODE:",
        "Follow the requested scene closely while keeping the result believable as a personal photograph.",
      ].join(" ");
  }
}

function closenessInstruction(
  closeness: string | null | undefined,
  subjectType: string | null | undefined
) {
  if (subjectType !== "both" || !closeness) return null;

  const descriptions: Record<string, string> = {
    casual:
      "Couple closeness: casual. They can share the frame naturally without forced romantic contact.",
    sweet:
      "Couple closeness: sweet. Use gentle affection such as natural proximity, a light touch, leaning together, or an easy warm expression.",
    romantic:
      "Couple closeness: romantic. Show believable relationship intimacy without turning it into editorial posing.",
    flirty:
      "Couple closeness: flirty. Use playful chemistry, teasing eye contact, touch or body language while staying natural and non-performative.",
    intimate:
      "Couple closeness: intimate-soft. Use quiet physical closeness and private tenderness, never explicit sexual content or exaggerated posing.",
  };

  return descriptions[closeness] ?? null;
}

function spontaneityInstruction(level: string | null | undefined) {
  if (!level) return null;

  if (level === "high") {
    return "Spontaneity: high. Allow imperfect crop, off-center framing, movement, slight blur, casual expression, awkward-but-real timing, or a mundane detail when appropriate.";
  }

  if (level === "medium") {
    return "Spontaneity: medium. Keep the composition readable but still personal, casual and not over-directed.";
  }

  if (level === "low") {
    return "Spontaneity: low. The photo may feel more intentional, but it should still look personal rather than professionally staged.";
  }

  return null;
}

function currentContextBlock(contextSnapshot: Record<string, unknown>) {
  const conversationSummary = asString(contextSnapshot.conversationSummary);
  const location = asString(contextSnapshot.location);
  const activity = asString(contextSnapshot.activity);
  const mood = asString(contextSnapshot.mood);
  const timeOfDay = asString(contextSnapshot.timeOfDay);
  const localTime = asString(contextSnapshot.localTime);
  const dominicState = asObject(contextSnapshot.dominicState);

  const dominicActivity = asString(dominicState.activity);
  const dominicLocation = asString(dominicState.location);
  const dominicMood =
    asString(dominicState.mood) ??
    asString(dominicState.energy) ??
    asString(dominicState.status);

  const lines = [
    conversationSummary
      ? `Recent conversation context: ${conversationSummary}`
      : null,
    location ? `Current contextual location: ${location}.` : null,
    activity ? `Current contextual activity: ${activity}.` : null,
    mood ? `Requested/context mood: ${mood}.` : null,
    timeOfDay ? `Current time-of-day mood: ${timeOfDay}.` : null,
    localTime ? `Context timestamp: ${localTime}.` : null,
    dominicActivity && dominicActivity !== activity
      ? `Dominic current activity: ${dominicActivity}.`
      : null,
    dominicLocation && dominicLocation !== location
      ? `Dominic current location: ${dominicLocation}.`
      : null,
    dominicMood ? `Dominic current state: ${dominicMood}.` : null,
  ].filter((value): value is string => Boolean(value));

  if (!lines.length) return null;

  return [
    "CURRENT CONTEXT:",
    ...lines,
    "Use these details only when they help the photo feel naturally connected to the present moment.",
    "Do not force every context detail into the frame.",
    "Do not literally render conversation text, timestamps, metadata labels, or status words unless the user explicitly asks for visible text.",
  ].join("\n");
}

function antiRepeatBlock(snapshot: Record<string, unknown>) {
  const avoidObject = asObject(snapshot.avoid);

  const poses = asStringArray(avoidObject.poses);
  const cameraAngles = asStringArray(avoidObject.cameraAngles);
  const framings = asStringArray(avoidObject.framings);
  const locations = asStringArray(avoidObject.locations);
  const compositions = asStringArray(avoidObject.compositions);
  const prefer = asStringArray(snapshot.prefer);

  const rules = [
    poses.length ? `Avoid repeating recent poses: ${poses.join(", ")}.` : null,
    cameraAngles.length
      ? `Avoid repeating recent camera angles: ${cameraAngles.join(", ")}.`
      : null,
    framings.length
      ? `Avoid repeating recent framings: ${framings.join(", ")}.`
      : null,
    locations.length
      ? `Avoid repeating recent locations when the scene allows: ${locations.join(", ")}.`
      : null,
    compositions.length
      ? `Avoid repeating recent compositions: ${compositions.join(", ")}.`
      : null,
    prefer.length
      ? `Prefer one of these underused directions when appropriate: ${prefer.join(", ")}.`
      : null,
  ].filter((value): value is string => Boolean(value));

  if (!rules.length) return null;

  return [
    "ANTI-REPETITION:",
    "Do not sacrifice identity or the requested scene merely to be different.",
    ...rules,
    "Variation should feel organic, not random.",
  ].join("\n");
}

export function buildPhotoContextPrompt(request: PhotoContextRequest) {
  const contextSnapshot = asObject(request.context_snapshot);
  const antiRepeatSnapshot = asObject(request.anti_repeat_snapshot);

  const parts = [
    modeInstruction(request.mode),
    request.source_context
      ? `Source context: ${request.source_context}.`
      : null,
    closenessInstruction(request.closeness_level, request.subject_type),
    spontaneityInstruction(request.spontaneity_level),
    currentContextBlock(contextSnapshot),
    antiRepeatBlock(antiRepeatSnapshot),
  ].filter((value): value is string => Boolean(value));

  return parts.length
    ? ["BEHAVIOR / CONTEXT INTELLIGENCE", ...parts].join("\n\n")
    : null;
}
