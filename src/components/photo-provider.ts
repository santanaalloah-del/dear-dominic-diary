import { supabase } from "@/integrations/supabase/client";
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
  const pool = selected.filter(
    (item) => requestedIds.size === 0 || requestedIds.has(item.reference.id)
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
  const [{ data: sessionData }, bundle, canons] = await Promise.all([
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
  ]);

  const accessToken = sessionData.session?.access_token;

  if (!accessToken) {
    throw new Error("Your session expired. Please sign in again.");
  }

  const references = chooseProviderReferences(
    request,
    bundle.selected,
    canons
  ).map(cleanReferencePayload);

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

  return body;
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
