import { supabase } from "@/integrations/supabase/client";
import {
  identityFeedbackBoost,
  type IdentityReferenceUsage,
} from "@/lib/photo-identity-feedback";
import {
  getWardrobePhotoContexts,
  type WardrobePhotoContext,
  type WardrobeOwner,
} from "@/lib/wardrobe-context";
import apartmentFloorPlanUrl from "@/assets/apartment-floor-plan.png";
import homeBathroom0200 from "@/assets/home-bathroom-0200.jpeg";
import homeBathroom0700 from "@/assets/home-bathroom-0700.jpeg";
import homeBathroom1100 from "@/assets/home-bathroom-1100.jpeg";
import homeBathroom1740 from "@/assets/home-bathroom-1740.jpeg";
import homeBathroom1830 from "@/assets/home-bathroom-1830.jpeg";
import homeBathroom1910 from "@/assets/home-bathroom-1910.jpeg";
import homeBathroom2100 from "@/assets/home-bathroom-2100.jpeg";
import homeBedroom0200 from "@/assets/home-bedroom-0200.png";
import homeBedroom0700 from "@/assets/home-bedroom-0700.png";
import homeBedroom1100 from "@/assets/home-bedroom-1100.png";
import homeBedroom1740 from "@/assets/home-bedroom-1740.png";
import homeBedroom1830 from "@/assets/home-bedroom-1830.png";
import homeBedroom1910 from "@/assets/home-bedroom-1910.png";
import homeBedroom2100 from "@/assets/home-bedroom-2100.png";
import homeKitchen0200 from "@/assets/home-kitchen-0200.jpeg";
import homeKitchen0700 from "@/assets/home-kitchen-0700.jpeg";
import homeKitchen1100 from "@/assets/home-kitchen-1100.jpeg";
import homeKitchen1740 from "@/assets/home-kitchen-1740.jpeg";
import homeKitchen1830 from "@/assets/home-kitchen-1830.jpeg";
import homeKitchen1910 from "@/assets/home-kitchen-1910.jpeg";
import homeKitchen2100 from "@/assets/home-kitchen-2100.jpeg";
import homeLiving0200 from "@/assets/home-living-0200.png";
import homeLiving0700 from "@/assets/home-living-0700.png";
import homeLiving1100 from "@/assets/home-living-1100.jpeg";
import homeLiving1740 from "@/assets/home-living-1740.png";
import homeLiving1830 from "@/assets/home-living-1830.png";
import homeLiving1910 from "@/assets/home-living-1910.png";
import homeLiving2100 from "@/assets/home-living-2100.png";

import {
  getPhotoReferenceBundle,
  type PhotoFeatureInput,
  type PhotoGenerationRequest,
} from "@/lib/photo-engine";

export type PhotoProviderPreview = {
  dataUrl: string;
  mimeType: string;
  provider: string;
  model: string;
  prompt: string;
  feature: PhotoFeatureInput;
};

type GeneratePreviewInput = {
  userId: string;
  request: PhotoGenerationRequest;
  sourceImageDataUrl?: string | null;
};

type ProviderReferencePayload = {
  id: string;
  url: string;
  subject: string;
  title: string | null;
  description: string | null;
  purposes: string[];
  strength: string;
  referenceKind: string;
  lookType: string | null;
  isCurrent: boolean;
};

type AnchorGroups = {
  face: string[];
  profile: string[];
  body: string[];
  tattoos: string[];
  couple: string[];
};

type TattooRegion =
  | "face"
  | "neck"
  | "chest"
  | "abdomen"
  | "back"
  | "left_arm"
  | "right_arm"
  | "left_hand"
  | "right_hand"
  | "left_leg"
  | "right_leg"
  | "other";

type TattooRegionEntry = {
  region: TattooRegion;
  anchorIds: string[];
  visibleDetails: string[];
};

type VisualCanonRow = {
  subject: "alloah" | "dominic" | "couple";
  status: string;
  profile: Record<string, unknown>;
  reference_ids: string[];
  analysis_version: number;
  last_analyzed_at: string | null;
};

type VisualCanonPayload = {
  subject: VisualCanonRow["subject"];
  profile: Record<string, unknown>;
  anchorReferenceIds: string[];
  anchorGroups: AnchorGroups;
  analysisVersion: number;
  lastAnalyzedAt: string | null;
};

const MAX_PROVIDER_REFERENCES = 10;

const HOME_TIME_VARIANTS = [
  { minute: 120, key: "0200" },
  { minute: 420, key: "0700" },
  { minute: 660, key: "1100" },
  { minute: 1060, key: "1740" },
  { minute: 1110, key: "1830" },
  { minute: 1150, key: "1910" },
  { minute: 1260, key: "2100" },
] as const;

const HOME_ROOM_IMAGES: Record<string, Record<string, string>> = {
  living: { "0200": homeLiving0200, "0700": homeLiving0700, "1100": homeLiving1100, "1740": homeLiving1740, "1830": homeLiving1830, "1910": homeLiving1910, "2100": homeLiving2100 },
  bedroom: { "0200": homeBedroom0200, "0700": homeBedroom0700, "1100": homeBedroom1100, "1740": homeBedroom1740, "1830": homeBedroom1830, "1910": homeBedroom1910, "2100": homeBedroom2100 },
  kitchen: { "0200": homeKitchen0200, "0700": homeKitchen0700, "1100": homeKitchen1100, "1740": homeKitchen1740, "1830": homeKitchen1830, "1910": homeKitchen1910, "2100": homeKitchen2100 },
  bathroom: { "0200": homeBathroom0200, "0700": homeBathroom0700, "1100": homeBathroom1100, "1740": homeBathroom1740, "1830": homeBathroom1830, "1910": homeBathroom1910, "2100": homeBathroom2100 },
};

function rioClock(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0) % 24;
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  return { hour, minute, totalMinutes: hour * 60 + minute };
}

function closestHomeTimeKey(date = new Date()) {
  const minute = rioClock(date).totalMinutes;
  return HOME_TIME_VARIANTS.reduce((best, candidate) => {
    const direct = Math.abs(candidate.minute - minute);
    const wrapped = Math.min(direct, 1440 - direct);
    const bestDirect = Math.abs(best.minute - minute);
    const bestWrapped = Math.min(bestDirect, 1440 - bestDirect);
    return wrapped < bestWrapped ? candidate : best;
  }).key;
}

function homeLightingInstruction(date = new Date()) {
  const { hour } = rioClock(date);
  if (hour < 5) {
    return "It is after midnight in Rio de Janeiro. Exterior windows MUST read as nighttime/dark. ZERO sunlight, ZERO blue-sky daylight, ZERO sunbeams. Interior lamps/screens/flash may illuminate the room naturally.";
  }
  if (hour < 7) {
    return "It is pre-dawn/early morning in Rio de Janeiro. Keep exterior light very dim and cool; no strong direct sunlight.";
  }
  if (hour < 17) {
    return "It is daytime in Rio de Janeiro. Daylight through windows is physically plausible and should follow the selected timed room reference.";
  }
  if (hour < 19) {
    return "It is late afternoon/early evening in Rio de Janeiro. Follow the selected timed room reference for fading exterior light; do not turn it into midday sun.";
  }
  return "It is nighttime in Rio de Janeiro. Exterior windows MUST be dark/nighttime. ZERO sunlight and ZERO daytime sky. Use believable interior artificial light, phone flash, screens, or practical lamps.";
}

async function homeCanonContext(userId: string, request: PhotoGenerationRequest) {
  const room = typeof request.context_snapshot?.location === "string" ? request.context_snapshot.location : null;
  const roomImages = room ? HOME_ROOM_IMAGES[room] : null;
  if (!room || !roomImages) return null;

  const timeKey = closestHomeTimeKey();
  const { data: objects } = await (supabase as any)
    .from("home_objects")
    .select("name,object_type,room,metadata")
    .eq("user_id", userId)
    .eq("room", room)
    .eq("is_active", true);

  const objectList = (objects ?? []).map((item: any) => item.name || item.object_type).filter(Boolean);

  return {
    room,
    timeKey,
    sceneUrl: roomImages[timeKey],
    floorPlanUrl: apartmentFloorPlanUrl,
    instruction: [
      "SHARED HOME VISUAL CANON:",
      "This is Alloah and Dominic's one shared apartment.",
      `Current room: ${room}. The attached ${room} reference at ${timeKey} is the PRIMARY visual canon for this room: preserve its actual furniture, decor, materials, colors, windows, spatial identity and time-of-day lighting.`,
      homeLightingInstruction(),
      "Time-of-day lighting is a hard physical constraint, not a stylistic suggestion. Never introduce sunlight or a bright daytime exterior into a nighttime reference.",
      "The apartment floor plan is a secondary structural reference for room boundaries and circulation.",
      objectList.length ? `Persisted room objects: ${objectList.join(" | ")}.` : null,
      "Vary pose, framing and camera angle naturally, but keep the environment recognizably the same canonical apartment. Never replace it with a generic bedroom, living room, kitchen or bathroom.",
    ].filter(Boolean).join(" "),
  };
}

function cleanReferencePayload(
  item: Awaited<ReturnType<typeof getPhotoReferenceBundle>>["selected"][number]
): ProviderReferencePayload {
  return {
    id: item.reference.id,
    url: item.url,
    subject: item.reference.subject,
    title: item.reference.title,
    description: item.reference.description,
    purposes: item.reference.reference_purposes ?? [],
    strength: item.reference.reference_strength ?? "supporting",
    referenceKind: item.reference.reference_kind ?? "identity",
    lookType: item.reference.look_type ?? null,
    isCurrent: Boolean(item.reference.is_current),
  };
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function emptyAnchorGroups(): AnchorGroups {
  return {
    face: [],
    profile: [],
    body: [],
    tattoos: [],
    couple: [],
  };
}

function anchorGroupsFromProfile(profile: Record<string, unknown>): AnchorGroups {
  const raw =
    profile.anchor_groups &&
    typeof profile.anchor_groups === "object" &&
    !Array.isArray(profile.anchor_groups)
      ? (profile.anchor_groups as Record<string, unknown>)
      : {};

  return {
    face: stringArray(raw.face),
    profile: stringArray(raw.profile),
    body: stringArray(raw.body),
    tattoos: stringArray(raw.tattoos),
    couple: stringArray(raw.couple),
  };
}

function tattooRegionsFromProfile(
  profile: Record<string, unknown>
): TattooRegionEntry[] {
  const allowed = new Set<TattooRegion>([
    "face",
    "neck",
    "chest",
    "abdomen",
    "back",
    "left_arm",
    "right_arm",
    "left_hand",
    "right_hand",
    "left_leg",
    "right_leg",
    "other",
  ]);

  if (!Array.isArray(profile.tattoo_regions)) return [];

  return profile.tattoo_regions
    .map((raw) => {
      if (!raw || typeof raw !== "object") return null;

      const item = raw as Record<string, unknown>;
      const region =
        typeof item.region === "string" &&
        allowed.has(item.region as TattooRegion)
          ? (item.region as TattooRegion)
          : null;

      if (!region) return null;

      return {
        region,
        anchorIds: stringArray(item.anchor_ids),
        visibleDetails: stringArray(item.visible_details),
      };
    })
    .filter((item): item is TattooRegionEntry => Boolean(item));
}

function requestedTattooRegions(
  request: PhotoGenerationRequest
): TattooRegion[] {
  const text = requestText(request);
  const regions = new Set<TattooRegion>();

  const has = (...terms: string[]) => terms.some((term) => text.includes(term));

  if (has("face tattoo", "face tattoos", "cheek tattoo", "under eye", "under-eye")) {
    regions.add("face");
  }
  if (has("neck", "throat")) regions.add("neck");
  if (has("chest", "pectoral", "pec", "shirtless", "topless")) {
    regions.add("chest");
  }
  if (has("abdomen", "stomach", "belly", "upper abdomen", "shirtless", "topless")) {
    regions.add("abdomen");
  }
  if (has("back tattoo", "back tattoos", "bare back")) regions.add("back");

  if (has("left arm")) regions.add("left_arm");
  if (has("right arm")) regions.add("right_arm");
  if (has("left hand")) regions.add("left_hand");
  if (has("right hand")) regions.add("right_hand");
  if (has("left leg", "left thigh", "left calf")) regions.add("left_leg");
  if (has("right leg", "right thigh", "right calf")) regions.add("right_leg");

  if (has("arm", "arms", "sleeveless", "tank top")) {
    regions.add("left_arm");
    regions.add("right_arm");
  }
  if (has("hand", "hands")) {
    regions.add("left_hand");
    regions.add("right_hand");
  }
  if (has("leg", "legs", "shorts", "swim", "beach")) {
    regions.add("left_leg");
    regions.add("right_leg");
  }

  return Array.from(regions);
}

function tattooRegionAnchorIds(
  canon: VisualCanonRow | undefined,
  requestedRegions: TattooRegion[]
) {
  if (!canon || !requestedRegions.length) return [];

  const requested = new Set(requestedRegions);

  return tattooRegionsFromProfile(canon.profile ?? {}).flatMap((entry) =>
    requested.has(entry.region) ? entry.anchorIds : []
  );
}

function canonSubjectsForRequest(
  subjectType: PhotoGenerationRequest["subject_type"]
): VisualCanonRow["subject"][] {
  if (subjectType === "me") return ["alloah"];
  if (subjectType === "dominic") return ["dominic"];
  return ["alloah", "dominic", "couple"];
}

async function getReadyCanons({
  userId,
  request,
}: {
  userId: string;
  request: PhotoGenerationRequest;
}): Promise<VisualCanonRow[]> {
  const subjects = canonSubjectsForRequest(request.subject_type);

  const { data, error } = await (supabase as any)
    .from("visual_canons")
    .select(
      "subject,status,profile,reference_ids,analysis_version,last_analyzed_at"
    )
    .eq("user_id", userId)
    .eq("status", "ready")
    .in("subject", subjects);

  if (error) {
    console.warn("Could not load visual canons for photo generation:", error);
    return [];
  }

  return (data ?? []) as VisualCanonRow[];
}

function canonPayload(canons: VisualCanonRow[]): VisualCanonPayload[] {
  return canons.map((canon) => ({
    subject: canon.subject,
    profile: canon.profile ?? {},
    anchorReferenceIds: stringArray(canon.profile?.anchor_reference_ids),
    anchorGroups: anchorGroupsFromProfile(canon.profile ?? {}),
    analysisVersion: canon.analysis_version ?? 1,
    lastAnalyzedAt: canon.last_analyzed_at ?? null,
  }));
}

function requestText(request: PhotoGenerationRequest) {
  return [
    request.scene,
    request.mood,
    request.shot_type,
    request.photo_style,
    request.adjustment_instruction,
    typeof request.context_snapshot?.activity === "string"
      ? request.context_snapshot.activity
      : null,
    typeof request.context_snapshot?.conversationSummary === "string"
      ? request.context_snapshot.conversationSummary
      : null,
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();
}

function requestNeedsProfile(request: PhotoGenerationRequest) {
  const text = requestText(request);

  return [
    "profile",
    "side",
    "side view",
    "three quarter",
    "3/4",
    "looking away",
    "turned",
    "over shoulder",
    "mirror",
  ].some((term) => text.includes(term));
}

function requestNeedsBody(request: PhotoGenerationRequest) {
  const text = requestText(request);

  return [
    "full body",
    "full-body",
    "standing",
    "walking",
    "outfit",
    "body",
    "torso",
    "waist",
    "shirtless",
    "swim",
    "beach",
    "mirror",
  ].some((term) => text.includes(term));
}

function requestNeedsTattoos(request: PhotoGenerationRequest) {
  const text = requestText(request);

  return [
    "tattoo",
    "tattoos",
    "shirtless",
    "chest",
    "torso",
    "neck",
    "arm",
    "hand",
    "hands",
    "sleeveless",
    "tank top",
    "swim",
    "beach",
  ].some((term) => text.includes(term));
}

function chooseProviderReferences(
  request: PhotoGenerationRequest,
  selected: Awaited<ReturnType<typeof getPhotoReferenceBundle>>["selected"],
  canons: VisualCanonRow[]
) {
  const requestedIds = new Set(request.reference_ids ?? []);
  const pool = selected
    .filter(
      (item) =>
        requestedIds.size === 0 ||
        requestedIds.has(item.reference.id)
    )
    .sort(
      (first, second) =>
        identityFeedbackBoost(second.reference.metadata) -
        identityFeedbackBoost(first.reference.metadata)
    );

  const chosen: typeof pool = [];
  const used = new Set<string>();

  const take = (
    predicate: (item: (typeof pool)[number]) => boolean,
    count: number
  ) => {
    for (const item of pool) {
      if (chosen.length >= MAX_PROVIDER_REFERENCES || count <= 0) break;
      if (used.has(item.reference.id) || !predicate(item)) continue;

      chosen.push(item);
      used.add(item.reference.id);
      count -= 1;
    }
  };

  const identityUseful = (item: (typeof pool)[number]) => {
    const purposes = item.reference.reference_purposes ?? [];

    return (
      item.reference.reference_strength === "primary" ||
      purposes.includes("face") ||
      purposes.includes("body") ||
      purposes.includes("hair") ||
      purposes.includes("tattoos")
    );
  };

  const canonFor = (subject: VisualCanonRow["subject"]) =>
    canons.find((item) => item.subject === subject);

  const groupsFor = (subject: VisualCanonRow["subject"]) => {
    const canon = canonFor(subject);
    return canon
      ? anchorGroupsFromProfile(canon.profile ?? {})
      : emptyAnchorGroups();
  };

  const fallbackAnchorIdsFor = (subject: VisualCanonRow["subject"]) => {
    const canon = canonFor(subject);
    return new Set(stringArray(canon?.profile?.anchor_reference_ids));
  };

  const takeIds = (
    subject: VisualCanonRow["subject"],
    ids: string[],
    count: number
  ) => {
    if (!ids.length || count <= 0) return;
    const idSet = new Set(ids);

    take(
      (item) =>
        item.reference.subject === subject &&
        idSet.has(item.reference.id),
      count
    );
  };

  const takeFallbackAnchors = (
    subject: VisualCanonRow["subject"],
    count: number
  ) => {
    const ids = fallbackAnchorIdsFor(subject);

    take(
      (item) =>
        item.reference.subject === subject &&
        ids.has(item.reference.id),
      count
    );
  };

  const wantsProfile = requestNeedsProfile(request);
  const wantsBody = requestNeedsBody(request);
  const wantsTattoos = requestNeedsTattoos(request);
  const requestedRegions = requestedTattooRegions(request);

  if (request.subject_type === "both") {
    const alloahGroups = groupsFor("alloah");
    const dominicGroups = groupsFor("dominic");
    const coupleGroups = groupsFor("couple");

    // Identity first: two strong face anchors for each person.
    takeIds("alloah", alloahGroups.face, 2);
    takeIds("dominic", dominicGroups.face, 2);

    // Couple anchors teach spacing, relative scale and how they look together.
    takeIds("couple", coupleGroups.couple, 2);

    if (wantsProfile) {
      takeIds("alloah", alloahGroups.profile, 1);
      takeIds("dominic", dominicGroups.profile, 1);
    }

    if (wantsBody) {
      takeIds("alloah", alloahGroups.body, 1);
      takeIds("dominic", dominicGroups.body, 1);
    }

    if (wantsTattoos) {
      const dominicCanon = canonFor("dominic");
      const regionalTattooIds = tattooRegionAnchorIds(
        dominicCanon,
        requestedRegions
      );

      // Prefer the exact visible body-region evidence. Generic tattoo anchors
      // are only the fallback when no region-specific anchor exists yet.
      takeIds("dominic", regionalTattooIds, 2);
      takeIds("dominic", dominicGroups.tattoos, 1);
    }

    // Explicit Current Look always beats historical styling when enabled.
    take(
      (item) =>
        item.reference.subject === "alloah" &&
        item.reference.is_current,
      1
    );

    take(
      (item) =>
        item.reference.subject === "dominic" &&
        item.reference.is_current,
      1
    );

    // Backwards-compatible fallback while older canons are upgraded.
    takeFallbackAnchors("alloah", 1);
    takeFallbackAnchors("dominic", 1);
    takeFallbackAnchors("couple", 1);
  } else {
    const subject =
      request.subject_type === "me" ? "alloah" : "dominic";

    const groups = groupsFor(subject);

    // The face is always the identity backbone.
    takeIds(subject, groups.face, 4);

    if (wantsProfile) {
      takeIds(subject, groups.profile, 2);
    }

    if (wantsBody) {
      takeIds(subject, groups.body, 2);
    }

    if (subject === "dominic" && wantsTattoos) {
      const dominicCanon = canonFor("dominic");
      const regionalTattooIds = tattooRegionAnchorIds(
        dominicCanon,
        requestedRegions
      );

      takeIds(subject, regionalTattooIds, 3);
      takeIds(subject, groups.tattoos, 2);
    }

    // Even when the prompt does not explicitly mention tattoos, Dominic gets
    // one tattoo anchor if there is room because his marks are identity-critical.
    if (subject === "dominic") {
      takeIds(subject, groups.tattoos, 1);
    }

    // Current hair/makeup/etc. is a temporary override, never the identity base.
    take(
      (item) =>
        item.reference.subject === subject &&
        item.reference.is_current,
      2
    );

    // Backwards-compatible fallbacks for incomplete/older canon profiles.
    takeFallbackAnchors(subject, 3);

    take(
      (item) =>
        item.reference.subject === subject && identityUseful(item),
      3
    );
  }

  take(() => true, MAX_PROVIDER_REFERENCES - chosen.length);

  return chosen.slice(0, MAX_PROVIDER_REFERENCES);
}

function tattooRegionInstruction(
  request: PhotoGenerationRequest,
  canons: VisualCanonRow[]
) {
  if (
    request.subject_type !== "dominic" &&
    request.subject_type !== "both"
  ) {
    return null;
  }

  const regions = requestedTattooRegions(request);
  if (!regions.length) return null;

  const canon = canons.find((item) => item.subject === "dominic");
  if (!canon) return null;

  const requested = new Set(regions);
  const entries = tattooRegionsFromProfile(canon.profile ?? {}).filter((entry) =>
    requested.has(entry.region)
  );

  if (!entries.length) return null;

  const details = entries.flatMap((entry) =>
    entry.visibleDetails.map(
      (detail) => `${entry.region.replaceAll("_", " ")}: ${detail}`
    )
  );

  return [
    "DOMINIC TATTOO REGION MATCHING:",
    "Use the attached tattoo references that correspond to the body regions visible in this scene. Preserve placement and side; do not mirror, move, merge, or invent tattoos.",
    details.length ? details.join(" | ") : null,
  ]
    .filter(Boolean)
    .join(" ");
}

function wardrobeOwnersForRequest(
  subjectType: PhotoGenerationRequest["subject_type"]
): WardrobeOwner[] {
  if (subjectType === "me") return ["alloah"];
  if (subjectType === "dominic") return ["dominic"];
  return ["alloah", "dominic"];
}

function wardrobeInstruction(
  request: PhotoGenerationRequest,
  contexts: WardrobePhotoContext[]
) {
  if (!request.use_current_look || !contexts.length) return null;

  const blocks = contexts.map((context) => {
    const label = context.owner === "alloah" ? "Alloah" : "Dominic";
    const pieces = context.clothing.map((item) => {
      const note = item.note ? ` — ${item.note}` : "";
      return `${item.title} (${item.category})${note}`;
    });

    return [
      `${label} CURRENT WARDROBE STATE:`,
      context.lookTitle ? `Saved look: ${context.lookTitle}.` : null,
      context.lookNote ? `Look note: ${context.lookNote}.` : null,
      pieces.length ? `Pieces: ${pieces.join(" | ")}.` : null,
      "Treat this as the active outfit. Do not replace it with historical clothing from identity references.",
      "Only infer visual details that are actually described here; do not invent logos, prints, colors, fabrics, or cuts that are not specified yet.",
    ]
      .filter(Boolean)
      .join(" ");
  });

  return blocks.join(" ");
}

function currentOverrideInstruction(
  request: PhotoGenerationRequest,
  canons: VisualCanonRow[]
) {
  if (!request.use_current_look) return null;

  const relevantSubjects = canonSubjectsForRequest(request.subject_type);
  const instructions: string[] = [];

  for (const subject of relevantSubjects) {
    if (subject === "couple") continue;

    const canon = canons.find((item) => item.subject === subject);
    const profile = canon?.profile ?? {};
    const overrides =
      profile.current_overrides &&
      typeof profile.current_overrides === "object" &&
      !Array.isArray(profile.current_overrides)
        ? (profile.current_overrides as Record<string, unknown>)
        : {};

    if (overrides.makeup === "none") {
      const label = subject === "alloah" ? "Alloah" : "Dominic";
      instructions.push(
        `${label} is currently wearing NO makeup. Keep a natural bare face and do not add eyeliner, eyeshadow, lipstick, false lashes, contour, or visible cosmetic styling.`
      );
    }

    if (overrides.makeup === "reference") {
      const label = subject === "alloah" ? "Alloah" : "Dominic";
      instructions.push(
        `${label}'s current makeup is defined by the attached current-look makeup references. Historical makeup must not override the current references.`
      );
    }
  }

  return instructions.length ? instructions.join(" ") : null;
}

export async function generatePhotoProviderPreview({
  userId,
  request,
  sourceImageDataUrl,
}: GeneratePreviewInput): Promise<PhotoProviderPreview> {
  const [{ data: sessionData }, bundle, canons, wardrobeContexts, homeCanon] =
    await Promise.all([
      supabase.auth.getSession(),
      getPhotoReferenceBundle({
        userId,
        subjectType: request.subject_type,
        useCurrentLook: request.use_current_look,
      }),
      getReadyCanons({
        userId,
        request,
      }),
      getWardrobePhotoContexts({
        userId,
        owners: wardrobeOwnersForRequest(request.subject_type),
      }),
      homeCanonContext(userId, request),
    ]);

  const accessToken = sessionData.session?.access_token;

  if (!accessToken) {
    throw new Error("Your session expired. Please sign in again.");
  }

  const selectedReferences = chooseProviderReferences(
    request,
    bundle.selected,
    canons
  );

  const references = selectedReferences.map(cleanReferencePayload);

  if (homeCanon) {
    references.push({
      id: `shared-home-${homeCanon.room}-${homeCanon.timeKey}`,
      url: new URL(homeCanon.sceneUrl, window.location.origin).toString(),
      subject: "shared_home",
      title: `Canonical ${homeCanon.room} at ${homeCanon.timeKey}`,
      description: homeCanon.instruction,
      purposes: ["environment", "scene", homeCanon.room, homeCanon.timeKey],
      strength: "primary",
      referenceKind: "scene",
      lookType: null,
      isCurrent: true,
    });
    references.push({
      id: "shared-home-floor-plan",
      url: new URL(homeCanon.floorPlanUrl, window.location.origin).toString(),
      subject: "shared_home",
      title: "Shared apartment floor plan",
      description: "Secondary structural reference for the shared apartment.",
      purposes: ["architecture", "layout"],
      strength: "supporting",
      referenceKind: "scene",
      lookType: null,
      isCurrent: true,
    });
  }

  const identityReferenceUsage: IdentityReferenceUsage[] =
    selectedReferences.map((item) => ({
      id: item.reference.id,
      subject: item.reference.subject,
      purposes: item.reference.reference_purposes ?? [],
      strength: item.reference.reference_strength ?? "supporting",
      referenceKind: item.reference.reference_kind ?? "identity",
      isCurrent: Boolean(item.reference.is_current),
    }));

  const response = await fetch("/api/photo-engine", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      userId,
      request: {
        ...request,
        adjustment_instruction: [
          request.adjustment_instruction,
          currentOverrideInstruction(request, canons),
          tattooRegionInstruction(request, canons),
          wardrobeInstruction(request, wardrobeContexts),
          homeCanon?.instruction ?? null,
        ]
          .filter((value): value is string => Boolean(value))
          .join(" ") || null,
      },
      references,
      canons: canonPayload(canons),
      sourceImageDataUrl: sourceImageDataUrl ?? null,
    }),
  });

  const body = (await response.json().catch(() => null)) as
    | (PhotoProviderPreview & { error?: string })
    | null;

  if (!response.ok) {
    throw new Error(
      body?.error || `Photo provider failed with status ${response.status}.`
    );
  }

  if (!body?.dataUrl || !body?.mimeType) {
    throw new Error("The image provider returned no image.");
  }

  return {
    ...body,
    feature: {
      ...(body.feature ?? {}),
      featureData: {
        ...(body.feature?.featureData ?? {}),
        identityReferenceUsage,
        identityFeedbackVersion: 1,
      },
    },
  };
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, encoded] = dataUrl.split(",", 2);
  const match = header.match(/^data:([^;]+);base64$/i);

  if (!match || !encoded) {
    throw new Error("Invalid generated image data.");
  }

  const binary = window.atob(encoded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: match[1] });
}
