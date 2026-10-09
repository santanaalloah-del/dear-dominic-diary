import { supabase } from "@/integrations/supabase/client";
import { resolveDominicPresence, type DominicState } from "@/lib/dominic-state";

export type SpontaneousPhotoOpportunity = {
  id: string;
  status: "pending" | "accepted" | "dismissed" | "saved";
  subjectType: "dominic" | "both";
  photoStyle: "natural_iphone" | "candid" | "mirror" | "selfie";
  note: string;
  createdAt: string;
  expiresAt: string;
  stateStartedAt: string;
  sourceActivity: string;
  sourceLocation: string;
  scene: string;
  mood: string;
  conversationSummary: string | null;
};

export type SpontaneousPhotoState = {
  enabled: boolean;
  frequency: "rare" | "balanced" | "often";
  includeCouple: boolean;
  useLocationContext: boolean;
  pending: SpontaneousPhotoOpportunity | null;
  savedIdeas: SpontaneousPhotoOpportunity[];
  lastEvaluatedStateStartedAt: string | null;
  cooldownUntil: string | null;
  lastDecisionAt: string | null;
  dayKey: string | null;
  offersToday: number;
};

type SettingsRow = {
  user_id: string;
  data: Record<string, unknown> | null;
};

const SETTINGS_KEY = "spontaneous_photo_state";
const OPPORTUNITY_LIFETIME_MS = 90 * 60 * 1000;
const ACCEPT_COOLDOWN_MS = 4 * 60 * 60 * 1000;
const DISMISS_COOLDOWN_MS = 6 * 60 * 60 * 1000;
const DAY_LIMIT = { rare: 1, balanced: 2, often: 4 } as const;
const CHECK_INTERVAL_MS = { rare: 12 * 60 * 60 * 1000, balanced: 5 * 60 * 60 * 1000, often: 2 * 60 * 60 * 1000 } as const;
function rioDayKey(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

const PRIVATE_ACTIVITIES = new Set([
  "sleeping",
  "napping",
  "showering",
  "getting_dressed",
]);

const ACTIVITY_SCORE: Record<string, number> = {
  making_coffee: 4,
  cooking: 4,
  eating: 2,
  washing_dishes: 2,
  cleaning: 2,
  doing_laundry: 3,
  watching_something: 3,
  listening_to_music: 4,
  playing_guitar: 5,
  writing_music: 5,
  recording: 5,
  reading: 3,
  scrolling: 2,
  on_the_phone: 2,
  relaxing: 3,
  getting_ready: 4,
  leaving_home: 3,
  coming_home: 4,
  walking: 4,
  getting_food: 3,
  shopping: 3,
  at_a_cafe: 5,
  with_friends: 4,
  working: 3,
  driving: 2,
  waking_up: 3,
  idle: 1,
};

function safeObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function safeString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function defaultState(): SpontaneousPhotoState {
  return {
    enabled: true,
    frequency: "balanced",
    includeCouple: true,
    useLocationContext: true,
    pending: null,
    savedIdeas: [],
    dayKey: null,
    offersToday: 0,
    lastEvaluatedStateStartedAt: null,
    cooldownUntil: null,
    lastDecisionAt: null,
  };
}

function parseOpportunity(value: unknown): SpontaneousPhotoOpportunity | null {
  const raw = safeObject(value);

  if (
    typeof raw.id !== "string" ||
    (raw.status !== "pending" &&
      raw.status !== "accepted" &&
      raw.status !== "dismissed" && raw.status !== "saved") ||
    typeof raw.createdAt !== "string" ||
    typeof raw.expiresAt !== "string" ||
    typeof raw.stateStartedAt !== "string" ||
    typeof raw.sourceActivity !== "string" ||
    typeof raw.sourceLocation !== "string" ||
    typeof raw.scene !== "string" ||
    typeof raw.mood !== "string"
  ) {
    return null;
  }

  return {
    id: raw.id,
    status: raw.status,
    subjectType: raw.subjectType === "both" ? "both" : "dominic",
    photoStyle: ["natural_iphone", "candid", "mirror", "selfie"].includes(String(raw.photoStyle))
      ? raw.photoStyle as SpontaneousPhotoOpportunity["photoStyle"] : "natural_iphone",
    note: typeof raw.note === "string" ? raw.note.slice(0, 240) : "He noticed a moment worth keeping.",
    createdAt: raw.createdAt,
    expiresAt: raw.expiresAt,
    stateStartedAt: raw.stateStartedAt,
    sourceActivity: raw.sourceActivity,
    sourceLocation: raw.sourceLocation,
    scene: raw.scene,
    mood: raw.mood,
    conversationSummary:
      typeof raw.conversationSummary === "string"
        ? raw.conversationSummary
        : null,
  };
}

function parseState(value: unknown): SpontaneousPhotoState {
  const raw = safeObject(value);
  const fallback = defaultState();

  return {
    enabled: typeof raw.enabled === "boolean" ? raw.enabled : fallback.enabled,
    frequency: raw.frequency === "rare" || raw.frequency === "often" ? raw.frequency : "balanced",
    includeCouple: raw.includeCouple !== false,
    useLocationContext: raw.useLocationContext !== false,
    pending: parseOpportunity(raw.pending),
    savedIdeas: Array.isArray(raw.savedIdeas) ? raw.savedIdeas
      .map(parseOpportunity)
      .filter((item): item is SpontaneousPhotoOpportunity => Boolean(item))
      .filter((item) => item.status === "saved").slice(-20) : [],
    dayKey: typeof raw.dayKey === "string" ? raw.dayKey : null,
    offersToday: typeof raw.offersToday === "number" && Number.isFinite(raw.offersToday)
      ? Math.max(0, Math.floor(raw.offersToday)) : 0,
    lastEvaluatedStateStartedAt:
      typeof raw.lastEvaluatedStateStartedAt === "string"
        ? raw.lastEvaluatedStateStartedAt
        : null,
    cooldownUntil:
      typeof raw.cooldownUntil === "string" ? raw.cooldownUntil : null,
    lastDecisionAt:
      typeof raw.lastDecisionAt === "string" ? raw.lastDecisionAt : null,
  };
}

async function loadSettings(userId: string): Promise<SettingsRow | null> {
  const { data, error } = await (supabase as any)
    .from("diario_settings")
    .select("user_id,data")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as SettingsRow | null;
}

async function saveState(userId: string, state: SpontaneousPhotoState) {
  const current = await loadSettings(userId);
  const currentData =
    current?.data && typeof current.data === "object" ? current.data : {};

  const { error } = await (supabase as any)
    .from("diario_settings")
    .upsert(
      {
        user_id: userId,
        data: {
          ...currentData,
          [SETTINGS_KEY]: state,
        },
      },
      { onConflict: "user_id" }
    );

  if (error) throw error;
}

function deterministicPercent(seed: string) {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return Math.abs(hash >>> 0) % 100;
}

function sceneForState(state: DominicState) {
  const detail = state.detail?.trim();

  const scenes: Record<string, string> = {
    waking_up:
      "Dominic taking a sleepy, unpolished morning phone photo shortly after waking up.",
    making_coffee:
      "Dominic casually taking or sending a phone photo while making coffee in the kitchen.",
    cooking:
      "Dominic casually taking or sending a phone photo mid-cooking, with a lived-in kitchen and imperfect timing.",
    eating:
      "Dominic sending a quick casual photo while eating, like a mundane private-chat update.",
    washing_dishes:
      "Dominic caught in an ordinary kitchen moment while washing dishes, casual and slightly messy.",
    cleaning:
      "Dominic taking a quick candid-feeling photo in the middle of cleaning the apartment.",
    doing_laundry:
      "Dominic in a mundane laundry moment, casual and domestic rather than posed.",
    watching_something:
      "Dominic sending a relaxed phone photo while watching something at home.",
    listening_to_music:
      "Dominic sending a casual photo while listening to music, absorbed in the moment rather than posing.",
    playing_guitar:
      "Dominic casually sending a photo while playing guitar, like he decided to show the moment without setting up a shoot.",
    writing_music:
      "Dominic sending an intimate everyday snapshot while writing music, with natural clutter and concentration.",
    recording:
      "Dominic sending a quick behind-the-scenes phone photo while recording or working on music.",
    reading:
      "Dominic sending a quiet casual photo while reading, natural posture and ordinary room light.",
    scrolling:
      "Dominic sending a lazy casual photo while scrolling on his phone at home.",
    on_the_phone:
      "Dominic in an ordinary phone-call moment, captured casually rather than staged.",
    relaxing:
      "Dominic sending a relaxed at-home phone photo while doing nothing special.",
    getting_ready:
      "Dominic sending a quick mirror or candid phone photo while getting ready, natural and unpolished.",
    leaving_home:
      "Dominic sending a quick photo on his way out, like a small private-chat update.",
    coming_home:
      "Dominic sending a just-got-home photo, slightly tired and natural rather than posed.",
    walking:
      "Dominic sending a casual outdoor phone photo while walking, with believable movement and imperfect framing.",
    getting_food:
      "Dominic sending a quick casual photo while out getting food.",
    shopping:
      "Dominic sending a mundane phone photo while out shopping, more personal update than posed outfit photo.",
    at_a_cafe:
      "Dominic sending a casual cafe photo from where he is sitting, like a small real-time update.",
    with_friends:
      "Dominic sending a casual snapshot from hanging out with friends, not a formal group pose.",
    working:
      "Dominic sending a low-key phone photo from a work moment, ordinary and context-aware.",
    driving:
      "Dominic sending a parked, safe casual photo from around a driving moment; never depict him actively using a phone while driving.",
    idle:
      "Dominic sending a small, ordinary phone photo simply because the moment felt worth sharing.",
  };

  const base =
    scenes[state.activity] ??
    "Dominic sending a believable spontaneous phone photo from his current moment.";

  return detail ? `${base} Context detail: ${detail}` : base;
}

function opportunityScore(
  state: DominicState,
  conversationSummary: string | null
) {
  let score = ACTIVITY_SCORE[state.activity] ?? 1;

  if (conversationSummary && conversationSummary.length >= 40) score += 1;
  if (conversationSummary && conversationSummary.length >= 220) score += 1;

  if (state.mood === "playful" || state.mood === "social") score += 1;
  if (state.mood === "focused" && ["playing_guitar", "writing_music", "recording"].includes(state.activity)) {
    score += 1;
  }

  if (state.detail?.trim()) score += 1;

  return score;
}

function chanceThreshold(score: number) {
  if (score >= 7) return 88;
  if (score === 6) return 72;
  if (score === 5) return 58;
  if (score === 4) return 42;
  return 0;
}

export async function getSpontaneousPhotoState(userId: string) {
  const row = await loadSettings(userId);
  return parseState(row?.data?.[SETTINGS_KEY]);
}

/** Preferences and saved ideas are private Supabase data; no image calls. */
export async function setSpontaneousPhotoPreferences(userId: string, values: Partial<
  Pick<SpontaneousPhotoState, "enabled" | "frequency" | "includeCouple" | "useLocationContext">
>) {
  const current = await getSpontaneousPhotoState(userId);
  const next: SpontaneousPhotoState = { ...current, ...values };
  if (!next.enabled || (values.useLocationContext === false && current.useLocationContext)) next.pending = null;
  await saveState(userId, next);
  return next;
}

export async function saveSpontaneousPhotoIdea(userId: string, idea: SpontaneousPhotoOpportunity) {
  const current = await getSpontaneousPhotoState(userId);
  const saved: SpontaneousPhotoOpportunity = { ...idea, status: "saved" };
  const savedIdeas = [...current.savedIdeas.filter(item => item.id !== idea.id), saved].slice(-20);
  const next = { ...current, savedIdeas,
    pending: current.pending?.id === idea.id ? null : current.pending,
    cooldownUntil: new Date(Date.now() + ACCEPT_COOLDOWN_MS).toISOString(),
    lastDecisionAt: new Date().toISOString(),
  };
  await saveState(userId, next);
  return saved;
}

export async function removeSavedSpontaneousPhotoIdea(userId: string, ideaId: string) {
  const current = await getSpontaneousPhotoState(userId);
  await saveState(userId, { ...current,
    savedIdeas: current.savedIdeas.filter(item => item.id !== ideaId),
  });
}

export async function markSpontaneousPhotoIdeaReviewed(userId: string, idea: SpontaneousPhotoOpportunity) {
  const current = await getSpontaneousPhotoState(userId);
  await saveState(userId, {
    ...current,
    pending: current.pending?.id === idea.id ? null : current.pending,
    // Reviewing is free. Keep saved ideas until the user explicitly removes
    // them, so abandoning Photo Engine never destroys a favorite moment.
    savedIdeas: current.savedIdeas,
    cooldownUntil: new Date(Date.now() + ACCEPT_COOLDOWN_MS).toISOString(),
    lastDecisionAt: new Date().toISOString(),
  });
}

export async function evaluateSpontaneousPhotoOpportunity({
  userId,
  dominicState,
  conversationSummary,
  force = false,
}: {
  userId: string;
  dominicState: DominicState | null;
  conversationSummary?: string | null;
  force?: boolean;
}): Promise<SpontaneousPhotoOpportunity | null> {
  if (!dominicState) return null;

  const current = await getSpontaneousPhotoState(userId);
  const now = Date.now();

  if (!current.enabled) return null;

  if (
    current.pending?.status === "pending" &&
    current.pending.stateStartedAt === dominicState.startedAt &&
    current.pending.sourceActivity === dominicState.activity &&
    current.pending.sourceLocation === (current.useLocationContext ? dominicState.location : "private") &&
    new Date(current.pending.expiresAt).getTime() > now
  ) {
    return current.pending;
  }

  if (
    current.cooldownUntil &&
    new Date(current.cooldownUntil).getTime() > now &&
    !force
  ) {
    return null;
  }

  const dayKey = rioDayKey();
  const offersToday = current.dayKey === dayKey ? current.offersToday : 0;
  if (offersToday >= DAY_LIMIT[current.frequency] && !force) return null;
  const slot = Math.floor(now / CHECK_INTERVAL_MS[current.frequency]);
  const evaluationKey = dominicState.startedAt + "|" + slot;
  if (current.lastEvaluatedStateStartedAt === evaluationKey && !force) return null;

  if (PRIVATE_ACTIVITIES.has(dominicState.activity)) {
    await saveState(userId, {
      ...current,
      pending: null,
      lastEvaluatedStateStartedAt: evaluationKey,
    });
    return null;
  }

  const cleanedConversation =
    safeString(conversationSummary)?.slice(-1600) ?? null;

  const score = opportunityScore(dominicState, cleanedConversation);
  const threshold = chanceThreshold(score);

  const roll = deterministicPercent(
    `${userId}|${evaluationKey}|${dominicState.activity}|${dominicState.location}`
  );

  const shouldOffer = force || (threshold > 0 && roll < threshold);

  if (!shouldOffer) {
    await saveState(userId, {
      ...current,
      pending: null,
      lastEvaluatedStateStartedAt: evaluationKey,
    });
    return null;
  }

  // Couple scenes only when real presence data confirms being together.
  // Otherwise Dominic may send HIS own photo, not invent Alloah at his side.
  const presence = current.includeCouple && current.useLocationContext
    ? await resolveDominicPresence(userId).catch(() => null) : null;
  const together = Boolean(presence?.togetherNow);
  const subjectType: "dominic" | "both" = together &&
    deterministicPercent(evaluationKey + "|couple") < 45 ? "both" : "dominic";
  const styleChoices: SpontaneousPhotoOpportunity["photoStyle"][] =
    dominicState.activity === "getting_ready" ? ["mirror", "natural_iphone", "candid"]
    : ["natural_iphone", "candid", "selfie"];
  const index = deterministicPercent(evaluationKey + "|style|" + (force ? crypto.randomUUID() : ""));
  const photoStyle = styleChoices[index % styleChoices.length];
  const sceneBase = sceneForState(dominicState);
  const places: Record<string, string> = {
    living: "the actual living room",
    kitchen: "the actual kitchen",
    bedroom: "the actual bedroom",
    bathroom: "the actual bathroom",
  };
  const realPlace = places[dominicState.location] ?? null;
  const details = [
    "An unposed in-between instant, with slightly imperfect phone framing.",
    "A casual diagonal candid, catching the activity in progress, not a posed portrait.",
    "A quiet close perspective on the everyday activity, without inventing new actions.",
    "A naturally off-center shot from a plausible different vantage point.",
  ];
  const variation = details[index % details.length];
  const scene = subjectType === "both"
    ? "Alloah and Dominic really are together now. A relaxed candid photo of them during Dominic's current activity (" +
      dominicState.activity.replaceAll("_", " ") + "). " + variation +
      (realPlace ? " Keep the actual physical layout of " + realPlace + "." : " Only use the known actual location.")
    : sceneBase + " " + variation +
      (realPlace ? " Keep the actual physical layout of " + realPlace + "." : "");
  const note = subjectType === "both"
    ? "He wanted to remember a small moment together."
    : "He thought this little part of his day was worth showing you.";
  const createdAt = new Date().toISOString();

  const opportunity: SpontaneousPhotoOpportunity = {
    id: crypto.randomUUID(),
    status: "pending",
    subjectType,
    photoStyle,
    note,
    createdAt,
    expiresAt: new Date(now + OPPORTUNITY_LIFETIME_MS).toISOString(),
    stateStartedAt: dominicState.startedAt,
    sourceActivity: dominicState.activity,
    sourceLocation: current.useLocationContext ? dominicState.location : "private",
    scene: current.useLocationContext ? scene :
      "Dominic taking an imperfect, everyday photo of himself in a plausible current moment. Do not invent Alloah's presence or a specific address.",
    mood: dominicState.mood ?? "everyday",
    conversationSummary: cleanedConversation,
  };

  await saveState(userId, {
    ...current,
    pending: opportunity,
    lastEvaluatedStateStartedAt: evaluationKey,
    dayKey,
    offersToday: offersToday + 1,
  });

  return opportunity;
}

async function decideOpportunity({
  userId,
  opportunity,
  status,
  cooldownMs,
}: {
  userId: string;
  opportunity: SpontaneousPhotoOpportunity;
  status: "accepted" | "dismissed";
  cooldownMs: number;
}) {
  const current = await getSpontaneousPhotoState(userId);
  const now = Date.now();

  if (current.pending?.id !== opportunity.id) return;

  await saveState(userId, {
    ...current,
    pending: {
      ...opportunity,
      status,
    },
    cooldownUntil: new Date(now + cooldownMs).toISOString(),
    lastDecisionAt: new Date(now).toISOString(),
  });
}

export async function acceptSpontaneousPhotoOpportunity({
  userId,
  opportunity,
}: {
  userId: string;
  opportunity: SpontaneousPhotoOpportunity;
}) {
  await decideOpportunity({
    userId,
    opportunity,
    status: "accepted",
    cooldownMs: ACCEPT_COOLDOWN_MS,
  });
}

export async function dismissSpontaneousPhotoOpportunity({
  userId,
  opportunity,
}: {
  userId: string;
  opportunity: SpontaneousPhotoOpportunity;
}) {
  await decideOpportunity({
    userId,
    opportunity,
    status: "dismissed",
    cooldownMs: DISMISS_COOLDOWN_MS,
  });
}
