import { supabase } from "@/integrations/supabase/client";
import { analyzePhotoScene, type PhotoTimeKey } from "@/lib/photo-scene-intent";
import { getWearingSelection } from "@/lib/wardrobe-context";
import { makeCurrentlyWearingBoard } from "@/lib/photo-wardrobe-reference-board";
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

export type PhotoReferenceAudit = {
  auditOnly: true;
  noCreditsUsed: true;
  referenceCount: number;
  people: Record<string, { faceReferences: number; faceCanonAnchors: number; currentHairReferences: number; tattooReferences: number }>;
  outfits: Record<string, { imageCount: number; garmentCount: number; items: string[] }>;
  homeReferences: number;
  canonSubjects: string[];
  tattooRegions: string[];
  requestedCount: number;
  warnings: string[];
  scene: { pose: string; framing: string; lighting: string; expression: string; room: string | null; outdoors: boolean; timeKey: string | null; actionNotes?: string[] };
  referenceRoles: Array<{ subject: string; title: string | null; purposes: string[] }>;
};

type GeneratePreviewInput = {
  userId: string;
  request: PhotoGenerationRequest;
  sourceImageDataUrl?: string | null;
  background?: boolean;
  auditOnly?: boolean;
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

const MAX_PROVIDER_REFERENCES = 14;

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

function homeLightingInstruction(timeKey: PhotoTimeKey) {
  // Use the SAME light period as the attached canonical room photo, rather
  // than imposing the real current hour on a requested past/future scene.
  if (timeKey === "0200") {
    return "The requested room is at night / after midnight. Exterior windows are DARK, never sunlit; realistic indoor lamps, screen light or phone flash can illuminate faces.";
  }
  if (timeKey === "0700") {
    return "This is an early morning room image. Exterior light is gentle and dim, with no harsh midday sun.";
  }
  if (timeKey === "1100") {
    return "This is a daytime room image. Natural window daylight is plausible and should match the reference.";
  }
  if (timeKey === "1740" || timeKey === "1830") {
    return "This is a fading late-afternoon / dusk room image. Preserve the actual reference's sunset-level window brightness.";
  }
  return "This is a nighttime room image. Exterior windows are dark, not bright blue daylight. Use natural indoor household lighting that matches the reference.";
}

async function homeCanonContext(userId: string, request: PhotoGenerationRequest) {
  const intent = analyzePhotoScene(request.scene, request.photo_style, request.subject_type);
  const storedLocation = typeof request.context_snapshot?.location === "string"
    ? request.context_snapshot.location : null;
  // The photographer requested the kitchen, not Dominic's old living-room
  // state; equally, a street/office scene must not receive indoor home art.
  const room = intent.room ?? (intent.outdoors ? null : storedLocation);
  const roomImages = room ? HOME_ROOM_IMAGES[room] : null;
  if (!room || !roomImages) return null;

  const timeKey = intent.timeKey ?? closestHomeTimeKey();
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
      homeLightingInstruction(timeKey),
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

  // Fixed phrases only; do not match "arm" in "warm", or "hand" within another word.
  const has = (...terms: string[]) => terms.some((term) =>
    new RegExp("(^|[^a-z])" + term + "(?=$|[^a-z])", "i").test(text)
  );

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
  // Hand and arm tattoos matter in actions such as holding, hugging, or sharing.
  if (has("joint", "cigarette", "cigarro", "smoking", "holding", "sharing", "cuddling", "cuddle", "hugging", "hug", "embracing") || text.includes("abraç")) {
    regions.add("left_hand"); regions.add("right_hand");
    regions.add("left_arm"); regions.add("right_arm");
  }

  // Dominic's facial marks are PERMANENT. They must not disappear just
  // because a normal selfie or portrait doesn't say "face tattoo".
  // Add these AFTER explicitly exposed body regions so a shirtless/hands
  // scene still gets its own detailed tattoo photos first.
  const showsDominic = request.subject_type !== "me";
  const faceHidden = /only the back|rear view|back of (his|dominic)|face not visible|faces? (?:hidden|out of frame)|sem mostrar o rosto|de costas|from behind/.test(text);
  if (showsDominic && !faceHidden) {
    regions.add("face");
    if (has("selfie", "portrait", "neck", "headshot", "chest", "shirtless", "topless", "mirror", "waist", "shoulders", "ombros", "pescoço", "retrato")) {
      regions.add("neck");
    }
  }
  return Array.from(regions);
}

function tattooRegionAnchorIds(
  canon: VisualCanonRow | undefined,
  requestedRegions: TattooRegion[]
) {
  if (!canon || !requestedRegions.length) return [];

  const entries = tattooRegionsFromProfile(canon.profile ?? {});
  // Round-robin the requested anatomical regions. For a joint held between
  // two people, do not consume every tattoo slot with the LEFT hand before
  // giving the right hand and arms a chance. A specifically named left hand
  // or a bare chest still appears first in requestedRegions.
  const byRegion = requestedRegions.map((region) =>
    Array.from(new Set(entries
      .filter((entry) => entry.region === region)
      .flatMap((entry) => entry.anchorIds)))
  );
  const chosen: string[] = [];
  const seen = new Set<string>();
  const max = Math.max(0, ...byRegion.map((ids) => ids.length));
  for (let index = 0; index < max; index += 1) {
    for (const ids of byRegion) {
      const id = ids[index];
      if (id && !seen.has(id)) {
        chosen.push(id);
        seen.add(id);
      }
    }
  }
  return chosen;
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
    .in("status", ["ready", "error"])
    .in("subject", subjects);

  if (error) {
    console.warn("Could not load visual canons for photo generation:", error);
    return [];
  }

  // Preserve the previous valid analysis if a later AI parse failed. Do not
  // change its error status or spend credits on automatic re-analysis.
  return ((data ?? []) as VisualCanonRow[]).filter((canon) => {
    if (canon.status === "ready") return true;
    const anchors = anchorGroupsFromProfile(canon.profile ?? {});
    return canon.status === "error" && canon.analysis_version > 0 &&
      (anchors.face.length > 0 || anchors.tattoos.length > 0) &&
      (canon.profile?.subject === canon.subject || !canon.profile?.subject);
  });
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

function sceneContainsTerm(text: string, term: string): boolean {
  const clean = (value: string) => value.toLowerCase()
    .replace(/[^a-z0-9À-ÿ]+/g, " ").trim();
  return (" " + clean(text) + " ").includes(" " + clean(term) + " ");
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
  ].some((term) => sceneContainsTerm(text, term));
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
  ].some((term) => sceneContainsTerm(text, term));
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
  ].some((term) => sceneContainsTerm(text, term));
}

type PhotoQualityIssue = "face_alloah" | "face_dominic" | "tattoos" | "wardrobe" | "anatomy" | "connection" | "room" | "lighting" | "pose" | "skin_tone" | "realism" | "hair" | "body_placement" | "prop_handling" | "chemistry";

function photoSceneFamily(scene: string | null | undefined): string | null {
  const text = (scene ?? "").toLowerCase();
  if (/sofa|sofá|couch|living room|sala de estar/.test(text)) return "living";
  if (/bedroom|bed|quarto|cama/.test(text)) return "bedroom";
  if (/mirror|espelho/.test(text)) return "mirror";
  if (/kitchen|cozinha/.test(text)) return "kitchen";
  if (/street|walking|rua|caminhando/.test(text)) return "outside";
  if (/selfie/.test(text)) return "selfie";
  return null;
}

async function getMatchingQualityIssues(
  userId: string,
  request: PhotoGenerationRequest
): Promise<Set<PhotoQualityIssue>> {
  const scene = photoSceneFamily(request.scene);
  if (!scene) return new Set();
  // Read feedback from actual SAVED photos only. No model call or analysis.
  const { data, error } = await (supabase as any)
    .from("photo_generation_requests")
    .select("subject_type,scene,context_snapshot")
    .eq("user_id", userId)
    .eq("subject_type", request.subject_type)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(16);
  if (error) {
    console.warn("Could not read free photo-quality feedback:", error);
    return new Set();
  }
  const allowed = new Set<PhotoQualityIssue>([
    "face_alloah", "face_dominic", "tattoos", "wardrobe", "anatomy",
    "connection", "room", "lighting", "pose", "skin_tone", "realism",
    "hair", "body_placement", "prop_handling", "chemistry"
  ]);
  const issues = new Set<PhotoQualityIssue>();
  for (const row of (data ?? []) as Array<{
    scene?: string | null;
    context_snapshot?: Record<string, unknown> | null;
  }>) {
    if (photoSceneFamily(row.scene) !== scene) continue;
    const review = row.context_snapshot?.photo_quality_review;
    if (!review || typeof review !== "object" || Array.isArray(review)) continue;
    const rejected = (review as { issues?: unknown }).issues;
    if (!Array.isArray(rejected)) continue;
    for (const issue of rejected) {
      if (allowed.has(issue as PhotoQualityIssue)) issues.add(issue as PhotoQualityIssue);
    }
  }
  return issues;
}

/**
 * Free, scene-matched lessons from previously SAVED user-reviewed photos.
 * Never triggers a model call, a rerun, or a second charged generation.
 */
function photoQualityCorrectionInstruction(issues: Set<PhotoQualityIssue>): string | null {
  if (!issues.size) return null;
  const guidance = [
    issues.has("face_alloah") ? "Preserve Alloah's real facial geometry from her identity photos; do not substitute a generic similar-looking face." : null,
    issues.has("face_dominic") ? "Preserve Dominic's real facial geometry from his identity photos over inspiration or styling." : null,
    issues.has("skin_tone") ? "Preserve each person's complexion and undertone from real identity photos, without borrowing skin color from inspiration or room references." : null,
    issues.has("realism") ? "Avoid AI-looking glamour: use handheld phone perspective, realistic skin texture, natural asymmetry and relaxed expressions." : null,
    issues.has("hair") ? "Preserve the current hairstyle when a Current Look hair image is attached. Do not infer that an old portrait shows today\'s haircut or color." : null,
    issues.has("body_placement") ? "Honor the explicit relative positions of both people, including lap, above/below and direction of the embrace; never swap them." : null,
    issues.has("prop_handling") ? "Show the stated prop only once; attach it to a plausible real hand and preserve any explicitly named holder." : null,
    issues.has("chemistry") ? "Show unforced, mutually attentive interaction and credible touch without vacant stares or artificial symmetry." : null,
    issues.has("tattoos") ? "Respect the attached real tattoo anchors; do not invent, mirror, relocate or erase a visible permanent tattoo." : null,
    issues.has("wardrobe") ? "Match every selected real garment's cut, color, fit, trousers and footwear from the Currently Wearing images." : null,
    issues.has("anatomy") ? "Check hand and limb counts, plausible grips and physically correct contact between bodies." : null,
    issues.has("connection") ? "Avoid staged couple posing: keep believable eye lines, facial muscles and casual touch." : null,
    issues.has("room") ? "Match the canonical room photo and furniture orientation; do not invent a different home." : null,
    issues.has("lighting") ? "Match the scene's true local light, time of day and plausible phone exposure; no dramatic grading." : null,
    issues.has("pose") ? "Fulfill the explicitly requested action and body positions before any optional variation." : null,
  ].filter((item): item is string => Boolean(item));
  return guidance.length
    ? "FREE QUALITY FEEDBACK FROM EARLIER SAVED PHOTOS OF A SIMILAR SCENE (the current request still wins): " + guidance.join(" ")
    : null;
}

function chooseProviderReferences(
  request: PhotoGenerationRequest,
  selected: Awaited<ReturnType<typeof getPhotoReferenceBundle>>["selected"],
  canons: VisualCanonRow[],
  maxReferences = MAX_PROVIDER_REFERENCES,
  qualityIssues: Set<PhotoQualityIssue> = new Set()
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
      if (chosen.length >= maxReferences || count <= 0) break;
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

  const takeOrderedIds = (subject: VisualCanonRow["subject"], ids: string[], count: number) => {
    for (const id of ids) {
      if (count <= 0 || chosen.length >= maxReferences) break;
      const previous = chosen.length;
      take((item) => item.reference.subject === subject && item.reference.id === id, 1);
      if (chosen.length > previous) count -= 1;
    }
  };

  const ensureIdentity = (subject: "alloah" | "dominic", minimum: number) => {
    const groups = groupsFor(subject);
    const portraitAnchors = new Set(groups.face);
    const tattooOnlyAnchors = new Set([
      ...groups.tattoos,
      ...tattooRegionsFromProfile(canonFor(subject)?.profile ?? {})
        .flatMap((entry) => entry.anchorIds),
    ].filter((id) => !portraitAnchors.has(id)));
    const isFaceEvidence = (item: (typeof pool)[number]) =>
      item.reference.subject === subject &&
      item.reference.reference_kind === "identity" &&
      (item.reference.reference_purposes ?? []).includes("face") &&
      !tattooOnlyAnchors.has(item.reference.id);
    const countFaces = () => chosen.filter(isFaceEvidence).length;
    if (countFaces() >= minimum) return;
    // Canon face anchors can contain a HAIR-only current-look reference.
    // It helps with styling but must never steal a slot reserved for a
    // real face photograph. Hair is scheduled separately below.
    const verifiedFaceAnchorIds = groups.face.filter((id) =>
      pool.some((item) => item.reference.id === id && isFaceEvidence(item))
    );
    takeOrderedIds(subject, verifiedFaceAnchorIds, minimum - countFaces());
    if (countFaces() < minimum) {
      take(isFaceEvidence, minimum - countFaces());
    }
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
  const sceneIntent = analyzePhotoScene(request.scene, request.photo_style, request.subject_type);
  const isFullBodyScene = sceneIntent.framing === "full_body";
  const wantsBody = requestNeedsBody(request);
  const wantsTattoos = requestNeedsTattoos(request);
  const requestedRegions = requestedTattooRegions(request);

  if (request.subject_type === "both") {
    // Two true faces per person always come first. Preserve room and wardrobe
    // slots upstream; only allocate bonus portrait slots when the frame needs them.
    ensureIdentity("alloah", 2);
    ensureIdentity("dominic", 2);

    if (request.use_current_look) {
      // Hair is temporary: a historical face reference cannot establish the
      // hairstyle currently worn. Only separately uploaded Current Look evidence
      // qualifies; do not pretend an old picture is "current".
      for (const subject of ["alloah", "dominic"] as const) {
        take((item) => item.reference.subject === subject &&
          item.reference.reference_kind === "current_look" &&
          item.reference.look_type === "hair" && item.reference.is_current, 1);
      }
      for (const subject of ["alloah", "dominic"] as const) {
        take((item) => item.reference.subject === subject &&
          item.reference.reference_kind === "current_look" && item.reference.is_current, 1);
      }
    }

    if (isFullBodyScene || wantsBody) {
      takeOrderedIds("dominic", groupsFor("dominic").body, 1);
      takeOrderedIds("alloah", groupsFor("alloah").body, 1);
      take((item) => item.reference.reference_kind === "identity" &&
        (item.reference.reference_purposes ?? []).includes("body") &&
        (item.reference.subject === "alloah" || item.reference.subject === "dominic"), 2);
    }

    if (wantsTattoos || requestedRegions.length) {
      takeOrderedIds("dominic", tattooRegionAnchorIds(canonFor("dominic"), requestedRegions),
        qualityIssues.has("tattoos") ? 3 : 2);
      if (!requestedRegions.length) takeOrderedIds("dominic", groupsFor("dominic").tattoos, 1);
    }
    if (wantsProfile) {
      takeOrderedIds("dominic", groupsFor("dominic").profile, 1);
      takeOrderedIds("alloah", groupsFor("alloah").profile, 1);
    }

    // Wide frames need bodies and garments, close frames need recognizable
    // faces. Explicit full-body instruction remains authoritative.
    ensureIdentity("alloah", isFullBodyScene ? 2 :
      qualityIssues.has("face_alloah") || qualityIssues.has("skin_tone") ? 4 : 3);
    ensureIdentity("dominic", isFullBodyScene ? 2 :
      qualityIssues.has("face_dominic") || qualityIssues.has("skin_tone") ? 4 : 3);
    takeFallbackAnchors("alloah", 1);
    takeFallbackAnchors("dominic", 1);
  } else {
    const subject = request.subject_type === "me" ? "alloah" : "dominic";
    const groups = groupsFor(subject);
    ensureIdentity(subject, isFullBodyScene ? 2 : 3);
    if (request.use_current_look) {
      take((item) => item.reference.subject === subject &&
        item.reference.reference_kind === "current_look" &&
        item.reference.look_type === "hair" && item.reference.is_current, 1);
      take((item) => item.reference.subject === subject &&
        item.reference.reference_kind === "current_look" && item.reference.is_current, 1);
    }
    if (isFullBodyScene || wantsBody) {
      takeOrderedIds(subject, groups.body, 1);
      take((item) => item.reference.subject === subject &&
        item.reference.reference_kind === "identity" &&
        (item.reference.reference_purposes ?? []).includes("body"), 1);
    }
    if (subject === "dominic" && (wantsTattoos || requestedRegions.length)) {
      takeOrderedIds(subject, tattooRegionAnchorIds(canonFor("dominic"), requestedRegions),
        qualityIssues.has("tattoos") ? 4 : 3);
      takeOrderedIds(subject, groups.tattoos, 1);
    }
    if (wantsProfile) takeOrderedIds(subject, groups.profile, 1);
    ensureIdentity(subject, isFullBodyScene ? 3 :
      qualityIssues.has(subject === "alloah" ? "face_alloah" : "face_dominic") ||
      qualityIssues.has("skin_tone") ? 5 : 4);
    takeFallbackAnchors(subject, 2);
    take((item) => item.reference.subject === subject && identityUseful(item), 2);
  }

  // Pinterest pictures contain strangers, not Alloah/Dominic.
  // Only use them when a user-provided tag or descriptive title specifically
  // matches the scene. Never treat generic upload notes as a match.
  if (request.subject_type === "both") {
    const excluded = new Set(["alloah","dominic","photo","couple","scene","image","reference","references","people","natural","style","iphone","flirty","daily","life"]);
    const words = requestText(request).split(/[^a-z]+/)
      .filter((word) => word.length > 3 && !excluded.has(word));
    const inspiration = pool.filter((item) => item.reference.subject === "couple")
      .map((item) => ({
        item,
        score: words.filter((word) =>
          [item.reference.title ?? "", ...(item.reference.tags ?? [])]
            .join(" ").toLowerCase().includes(word)
        ).length,
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score);
    if (inspiration.length && chosen.length < maxReferences - 2) {
      take((item) => item.reference.id === inspiration[0].item.reference.id, 1);
    }
  }

  // Finish a couple scene fairly, alternating the two actual people even when
  // neither Visual Canon has finished its optional analysis. This is especially
  // important with large libraries (11 vs 43 identity photos currently).
  if (request.subject_type === "both") {
    while (chosen.length < maxReferences) {
      const before = chosen.length;
      for (const subject of ["alloah", "dominic"] as const) {
        take(
          (item) => item.reference.subject === subject &&
            item.reference.reference_kind !== "pose" &&
            item.reference.reference_kind !== "scene",
          1
        );
      }
      if (before === chosen.length) break;
    }
  } else {
    take(
      (item) => item.reference.subject === (request.subject_type === "me" ? "alloah" : "dominic"),
      maxReferences - chosen.length
    );
  }

  return chosen.slice(0, maxReferences);
}

function tattooRegionInstruction(
  request: PhotoGenerationRequest,
  canons: VisualCanonRow[],
  availableReferenceIds: Set<string>
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
    requested.has(entry.region) &&
    entry.anchorIds.some((id) => availableReferenceIds.has(id))
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
      "EXACT CLOTHING PHOTOS TAKE PRECEDENCE OVER GENERIC TEXT: preserve the garment's actual fit, leg width, hem, fabric, color and shape. A baggy or relaxed jean must stay baggy, not skinny or tight. Shoes must remain shoes, not flip-flops. Samba means a low-top sneaker, not sandals.",
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

export function generatePhotoProviderPreview(
  input: GeneratePreviewInput & { auditOnly: true }
): Promise<PhotoReferenceAudit>;
export function generatePhotoProviderPreview(
  input: GeneratePreviewInput & { auditOnly?: false }
): Promise<PhotoProviderPreview>;
export async function generatePhotoProviderPreview({
  userId,
  request,
  sourceImageDataUrl,
  background = false,
  auditOnly = false,
}: GeneratePreviewInput): Promise<PhotoProviderPreview | PhotoReferenceAudit> {
  const [{ data: sessionData }, bundle, canons, wardrobeContexts, homeCanon, qualityIssues] =
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
      getMatchingQualityIssues(userId, request),
    ]);

  const accessToken = sessionData.session?.access_token;

  if (!accessToken) {
    throw new Error("Your session expired. Please sign in again.");
  }

  // A stale saved Currently Wearing selection must not silently turn into
  // random historical clothes. Stop BEFORE reserving or spending any credits.
  if (request.use_current_look) {
    for (const owner of wardrobeOwnersForRequest(request.subject_type)) {
      const selection = await getWearingSelection({ userId, owner });
      if (!selection?.clothingIds?.length) continue; // No outfit chosen yet.
      const context = wardrobeContexts.find((item) => item.owner === owner);
      if (!context || context.clothing.length !== selection.clothingIds.length ||
          context.clothing.some((item) => !item.imageUrl)) {
        const label = owner === "alloah" ? "Alloah" : "Dominic";
        throw new Error(label + "'s Currently Wearing outfit is incomplete or has missing images. Re-select the saved pieces in Wardrobe before generating. No credits used.");
      }
    }
  }

  // Current wardrobe contains ONLY the user's explicitly selected items.
  // Pack each person's exact clothing cutouts into small visual boards so
  // faces and mapped tattoos keep their own independent reference slots.
  const clothingWithPhotos = request.use_current_look
    ? wardrobeContexts.flatMap((context) =>
        context.clothing
          .filter((piece) => Boolean(piece.imageUrl))
          .map((piece) => ({ owner: context.owner, piece }))
      )
    : [];
  const owners = wardrobeOwnersForRequest(request.subject_type);

  // One free, local garment board can hold six ACTUAL clothing cutouts.
  // Split long outfits into additional boards instead of silently cropping
  // off the last currently-worn items (particularly trousers and shoes).
  const ownersWithClothing = owners.filter((owner) =>
    clothingWithPhotos.some((item) => item.owner === owner)
  );
  const batches = ownersWithClothing.flatMap((owner) => {
    const pieces = clothingWithPhotos.filter((item) => item.owner === owner)
      .map((item) => item.piece);
    const result: Array<{ owner: WardrobeOwner; pieces: typeof pieces; part: number }> = [];
    for (let index = 0; index < pieces.length; index += 6) {
      result.push({ owner, pieces: pieces.slice(index, index + 6), part: Math.floor(index / 6) + 1 });
    }
    return result;
  });
  // Four boards still leave 9-10 image slots for both faces, current hair,
  // tattoos and a physical room. More cannot be represented faithfully.
  if (batches.length > 4) {
    throw new Error(
      "Currently Wearing has too many clothing pieces to show accurately. " +
      "Select a smaller outfit in Wardrobe. No credits used."
    );
  }
  const boardResults = await Promise.all(batches.map(async ({ owner, pieces, part }) => {
    try {
      const boardUrl = await makeCurrentlyWearingBoard(owner, pieces);
      return boardUrl ? { owner, pieces, part, boardUrl } : null;
    } catch (error) {
      console.warn("Could not prepare exact Currently Wearing garment photos:", error);
      return null;
    }
  }));
  const useBoards = batches.length > 0 && boardResults.every(Boolean);
  // Without the canvas board, a small outfit can still be transmitted in full
  // using individual signed cutouts. Never silently drop the pants or shoes.
  if (!useBoards && clothingWithPhotos.length > 5) {
    throw new Error(
      "Could not assemble all Currently Wearing photos on this device. " +
      "Try again or reduce the number of selected pieces. No credits used."
    );
  }
  const clothingReferences: ProviderReferencePayload[] = useBoards
    ? boardResults.filter((item): item is NonNullable<typeof item> => item !== null)
        .map(({ owner, pieces, part, boardUrl }) => ({
          id: "wardrobe-board-" + owner + "-" + part,
          url: boardUrl,
          subject: "wardrobe",
          title: owner.toUpperCase() + " Currently Wearing: " +
            pieces.map((piece) => piece.title).join(" / ").slice(0, 180),
          description: "EXACT CURRENTLY WORN " + owner.toUpperCase() +
            " CLOTHING BOARD " + part + ". Each labeled panel is a separate REAL cutout, not invented styling. " +
            pieces.map((piece) => piece.category + ": " + piece.title).join(" | ") +
            ". Only match the panel to its proper category and owner. Preserve fit and footwear type. NEVER copy any face or body from this board.",
          purposes: ["wardrobe", "clothing", owner, "currently_wearing_board", "garment_count:" + pieces.length],
          strength: "primary",
          referenceKind: "detail",
          lookType: null,
          isCurrent: true,
        }))
    : clothingWithPhotos.map(({ owner, piece }) => ({
        id: "wardrobe-" + piece.id,
        url: piece.imageUrl!,
        subject: "wardrobe",
        title: piece.title,
        description: `EXACT CURRENTLY WORN ${owner.toUpperCase()} CLOTHING: ${piece.title} (${piece.category}). Copy the real cut, silhouette, width, fabric, color and footwear type visible in this image. Do not change baggy jeans into skinny jeans or sneakers into sandals.${piece.note ? " Details: " + piece.note : ""}`,
        purposes: ["wardrobe", "clothing", owner, piece.category],
        strength: "primary",
        referenceKind: "detail",
        lookType: null,
        isCurrent: true,
      }));

  const includeFloorPlan = Boolean(homeCanon) && clothingReferences.length === 0;
  const homeImageSlots = homeCanon ? (includeFloorPlan ? 2 : 1) : 0;
  const selectedReferences = chooseProviderReferences(
    request,
    bundle.selected,
    canons.filter(canon => canon.subject !== "couple"),
    Math.max(1, MAX_PROVIDER_REFERENCES - homeImageSlots - clothingReferences.length - (sourceImageDataUrl ? 1 : 0)),
    qualityIssues
  );

  const references: ProviderReferencePayload[] = selectedReferences.map(cleanReferencePayload);
  references.push(...clothingReferences);

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
    if (includeFloorPlan) {
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

  const sceneIntent = analyzePhotoScene(
    request.scene, request.photo_style, request.subject_type
  );
  const sceneLocation = homeCanon?.room ??
    (sceneIntent.outdoors ? "outside" : null);
  const explicitlyDescribed = Boolean(request.scene?.trim());
  // Only adjust the GENERATOR'S COPY of context, not Dominic's persisted
  // live state. Old activity/location text must not contradict a new scene.
  const cleanedContext = {
    ...(request.context_snapshot ?? {}),
    ...(sceneLocation ? { location: sceneLocation } : {}),
    ...(explicitlyDescribed ? { activity: null, dominicState: null } : {}),
  };
  const promptRequest = explicitlyDescribed
    ? { ...request, context_snapshot: cleanedContext }
    : request;

  const response = await fetch("/api/photo-engine", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      userId,
      request: {
        ...promptRequest,
        adjustment_instruction: [
          request.adjustment_instruction,
          currentOverrideInstruction(request, canons),
          tattooRegionInstruction(request, canons, new Set(selectedReferences.map((item) => item.reference.id))),
          wardrobeInstruction(request, wardrobeContexts),
          homeCanon?.instruction ?? null,
          photoQualityCorrectionInstruction(qualityIssues),
        ]
          .filter((value): value is string => Boolean(value))
          .join(" ") || null,
      },
      references,
      canons: canonPayload(canons.filter(canon => canon.subject !== "couple")),
      sourceImageDataUrl: sourceImageDataUrl ?? null,
      background,
      auditOnly,
    }),
  });

  const body = (await response.json().catch(() => null)) as
    | ((PhotoProviderPreview | PhotoReferenceAudit) & { error?: string })
    | null;

  if (!response.ok) {
    throw new Error(
      body?.error || `Photo provider failed with status ${response.status}.`
    );
  }

  if (auditOnly) {
    const audited = body as PhotoReferenceAudit | null;
    if (audited?.auditOnly === true && audited.noCreditsUsed === true) return audited;
    throw new Error("Reference audit did not finish; no image was generated.");
  }

  if (background && response.status === 202 && (body as any)?.requestId === request.id) {
    return { status: "queued", requestId: request.id } as unknown as PhotoProviderPreview;
  }

  const preview = body as PhotoProviderPreview | null;
  if (!preview?.dataUrl || !preview.mimeType) {
    throw new Error("The image provider returned no image.");
  }
  return {
    ...preview,
    feature: {
      ...(preview.feature ?? {}),
      featureData: {
        ...(preview.feature?.featureData ?? {}),
        identityReferenceUsage,
        identityFeedbackVersion: 1,
      },
    },
  };
}

export async function auditPhotoProviderReferences(input: {
  userId: string;
  request: PhotoGenerationRequest;
}): Promise<PhotoReferenceAudit> {
  const report = await generatePhotoProviderPreview({ ...input, background: false, auditOnly: true });
  if (!("auditOnly" in report) || report.auditOnly !== true) throw new Error("The audit returned an invalid response.");
  return report;
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

/** Enqueues one paid photo; the Supabase worker saves it directly to Gallery. */
export async function enqueuePhotoProviderJob(input: Omit<GeneratePreviewInput, "background" | "auditOnly">): Promise<{ status: "queued"; requestId: string }> {
  const result = await generatePhotoProviderPreview({ ...input, background: true });
  if ((result as any).status !== "queued") throw new Error("Photo job was not accepted.");
  return result as unknown as { status: "queued"; requestId: string };
}
