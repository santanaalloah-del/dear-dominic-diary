import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

import { identityFeedbackBoost } from "@/lib/photo-identity-feedback";

import type {
  CurrentLookType,
  DiarioItem,
  GalleryPhoto,
  VisualReference,
  VisualReferencePurpose,
  VisualReferenceStrength,
  VisualReferenceSubject,
  VisualReferenceWithUrl,
} from "@/lib/diario-world";

const db =
  supabase as unknown as SupabaseClient<any>;

const MEDIA_BUCKET = "diario-media";


// ============================================================
// TYPES
// ============================================================

export type PhotoSubject =
  | "me"
  | "dominic"
  | "both";

export type PhotoGenerationMode =
  | "request"
  | "surprise"
  | "chat_context"
  | "chat_photo"
  | "memory"
  | "daily_life"
  | "spontaneous"
  | "adjust";

export type PhotoSourceContext =
  | "manual"
  | "chat"
  | "memory"
  | "calendar"
  | "timeline"
  | "spontaneous";

export type PhotoStyle =
  | "natural_iphone"
  | "selfie"
  | "mirror"
  | "candid"
  | "flash"
  | "disposable"
  | "memory_like";

export type PhotoCloseness =
  | "casual"
  | "sweet"
  | "romantic"
  | "flirty"
  | "intimate";

export type PhotoSpontaneity =
  | "low"
  | "medium"
  | "high";

export type PhotoRequestStatus =
  | "queued"
  | "preparing"
  | "generating"
  | "completed"
  | "failed";


export type PhotoGenerationRequest = {
  id: string;
  user_id: string;

  photo_item_id: string | null;

  parent_request_id: string | null;
  parent_photo_item_id: string | null;

  batch_id: string | null;
  batch_index: number | null;

  mode: PhotoGenerationMode;
  subject_type: PhotoSubject;

  source_context: PhotoSourceContext;

  scene: string | null;
  mood: string | null;
  shot_type: string | null;

  photo_style: PhotoStyle;

  closeness_level: PhotoCloseness | null;
  spontaneity_level: PhotoSpontaneity | null;

  use_current_look: boolean;

  avoid_recent_poses: boolean;
  avoid_recent_locations: boolean;
  avoid_recent_compositions: boolean;

  context_snapshot: Record<string, unknown>;
  anti_repeat_snapshot: Record<string, unknown>;

  reference_ids: string[];

  adjustment_instruction: string | null;

  provider: string | null;
  provider_model: string | null;
  provider_job_id: string | null;

  final_prompt: string | null;

  status: PhotoRequestStatus;

  error_message: string | null;

  created_at: string;
  updated_at: string;
};


export type PhotoGenerationFeature = {
  id: string;
  user_id: string;

  photo_item_id: string;
  request_id: string | null;

  pose_type: string | null;
  camera_angle: string | null;
  framing: string | null;
  expression: string | null;
  lighting_type: string | null;
  location_category: string | null;
  composition_type: string | null;

  feature_data: Record<string, unknown>;

  created_at: string;
};


export type PhotoFeatureInput = {
  poseType?: string | null;
  cameraAngle?: string | null;
  framing?: string | null;
  expression?: string | null;
  lightingType?: string | null;
  locationCategory?: string | null;
  compositionType?: string | null;

  featureData?: Record<string, unknown>;
};


export type PhotoContextSnapshot = {
  source?: PhotoSourceContext;

  conversationId?: string | null;
  memoryId?: string | null;
  calendarDate?: string | null;

  location?: string | null;
  activity?: string | null;
  mood?: string | null;

  timeOfDay?: string | null;
  localTime?: string | null;

  dominicState?: Record<string, unknown> | null;

  conversationSummary?: string | null;

  custom?: Record<string, unknown>;
};


export type ReferenceBundle = {
  alloah: VisualReferenceWithUrl[];
  dominic: VisualReferenceWithUrl[];
  couple: VisualReferenceWithUrl[];

  currentLook: {
    alloah: VisualReferenceWithUrl[];
    dominic: VisualReferenceWithUrl[];
  };

  selected: VisualReferenceWithUrl[];
};


export type AntiRepetitionSnapshot = {
  recentPoseTypes: string[];
  recentCameraAngles: string[];
  recentFramings: string[];
  recentExpressions: string[];
  recentLightingTypes: string[];
  recentLocations: string[];
  recentCompositions: string[];

  avoid: {
    poses: string[];
    cameraAngles: string[];
    framings: string[];
    locations: string[];
    compositions: string[];
  };

  prefer: string[];
};


// ============================================================
// HELPERS
// ============================================================

function unique(values: Array<string | null | undefined>) {
  return [
    ...new Set(
      values.filter(
        (value): value is string =>
          typeof value === "string" &&
          value.trim().length > 0
      )
    ),
  ];
}


function safeFileName(fileName: string) {
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}


async function signedReference(
  reference: VisualReference
): Promise<VisualReferenceWithUrl | null> {
  const {
    data,
    error,
  } = await db.storage
    .from(reference.storage_bucket)
    .createSignedUrl(
      reference.storage_path,
      60 * 60
    );

  if (error || !data?.signedUrl) {
    console.error(
      "Could not create photo-engine reference URL:",
      error
    );

    return null;
  }

  return {
    reference,
    url: data.signedUrl,
  };
}


// ============================================================
// VISUAL REFERENCE ENGINE
// ============================================================

export async function updatePhotoReference({
  userId,
  referenceId,
  purposes,
  strength,
  referenceKind,
  metadata,
}: {
  userId: string;
  referenceId: string;

  purposes?: VisualReferencePurpose[];
  strength?: VisualReferenceStrength;

  referenceKind?:
    | "identity"
    | "scene"
    | "pose"
    | "style"
    | "detail";

  metadata?: Record<string, unknown>;
}): Promise<VisualReference> {
  const {
    data: current,
    error: currentError,
  } = await db
    .from("visual_references")
    .select("*")
    .eq("id", referenceId)
    .eq("user_id", userId)
    .single();

  if (currentError) {
    throw currentError;
  }

  const nextMetadata = {
    ...((current?.metadata ?? {}) as Record<
      string,
      unknown
    >),
    ...(metadata ?? {}),
  };

  const {
    data,
    error,
  } = await db
    .from("visual_references")
    .update({
      ...(purposes
        ? {
            reference_purposes:
              purposes,
          }
        : {}),

      ...(strength
        ? {
            reference_strength:
              strength,
          }
        : {}),

      ...(referenceKind
        ? {
            reference_kind:
              referenceKind,
          }
        : {}),

      metadata:
        nextMetadata,

      updated_at:
        new Date().toISOString(),
    })
    .eq("id", referenceId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as VisualReference;
}


// ============================================================
// CURRENT LOOK
// ============================================================

export async function setCurrentLook({
  userId,
  subject,
  lookType,
  files,
  title,
  description,
}: {
  userId: string;

  subject:
    | "alloah"
    | "dominic";

  lookType: CurrentLookType;

  files: File[];

  title?: string;
  description?: string;
}): Promise<VisualReferenceWithUrl[]> {
  if (files.length === 0) {
    throw new Error(
      "Choose at least one reference image."
    );
  }

  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      throw new Error(
        "Current look references must be images."
      );
    }
  }

  const now =
    new Date().toISOString();

  const lookGroupId =
    crypto.randomUUID();

  // Close the previous active look.
  const {
    error: closeError,
  } = await db
    .from("visual_references")
    .update({
      is_current: false,
      active_until: now,
      updated_at: now,
    })
    .eq("user_id", userId)
    .eq("subject", subject)
    .eq(
      "reference_kind",
      "current_look"
    )
    .eq(
      "look_type",
      lookType
    )
    .eq("is_current", true);

  if (closeError) {
    throw closeError;
  }

  const created: VisualReferenceWithUrl[] =
    [];

  try {
    for (
      let index = 0;
      index < files.length;
      index++
    ) {
      const file =
        files[index];

      const cleanName =
        safeFileName(
          file.name ||
            `${lookType}-${index + 1}.jpg`
        );

      const storagePath =
        `${userId}/references/current-look/` +
        `${lookGroupId}/` +
        `${crypto.randomUUID()}-${cleanName}`;

      const {
        error: uploadError,
      } = await db.storage
        .from(MEDIA_BUCKET)
        .upload(
          storagePath,
          file,
          {
            upsert: false,
            contentType: file.type,
            cacheControl: "3600",
          }
        );

      if (uploadError) {
        throw uploadError;
      }

      const purposes: VisualReferencePurpose[] =
        lookType === "nails"
          ? ["nails", "hands"]
          : lookType === "hair"
            ? ["hair"]
            : lookType === "makeup"
              ? ["makeup", "face"]
              : lookType === "jewelry"
                ? ["jewelry"]
                : lookType ===
                    "phone_case"
                  ? ["phone_case"]
                  : lookType ===
                      "clothing"
                    ? ["clothing"]
                    : ["detail"];

      const {
        data: inserted,
        error: insertError,
      } = await db
        .from("visual_references")
        .insert({
          user_id: userId,

          subject,

          title:
            title?.trim() ||
            `Current ${lookType.replace(
              /_/g,
              " "
            )}`,

          description:
            description?.trim() ||
            null,

          storage_bucket:
            MEDIA_BUCKET,

          storage_path:
            storagePath,

          source:
            "current_look",

          tags: [
            "current",
            lookType,
          ],

          is_favorite:
            false,

          is_active:
            true,

          reference_kind:
            "current_look",

          reference_purposes:
            purposes,

          reference_strength:
            "primary",

          look_type:
            lookType,

          look_group_id:
            lookGroupId,

          is_current:
            true,

          active_from:
            now,

          active_until:
            null,

          metadata: {
            group_index:
              index,
            group_size:
              files.length,
          },
        })
        .select("*")
        .single();

      if (insertError) {
        await db.storage
          .from(MEDIA_BUCKET)
          .remove([
            storagePath,
          ]);

        throw insertError;
      }

      const reference =
        inserted as VisualReference;

      const withUrl =
        await signedReference(
          reference
        );

      if (withUrl) {
        created.push(
          withUrl
        );
      }
    }
  } catch (error) {
    // Current Look replacement should fail loudly.
    // Previous images remain archived, never deleted.
    throw error;
  }

  return created;
}


export async function getCurrentLook({
  userId,
  subject,
  lookType,
}: {
  userId: string;

  subject?:
    | "alloah"
    | "dominic";

  lookType?: CurrentLookType;
}): Promise<VisualReferenceWithUrl[]> {
  let query = db
    .from("visual_references")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .eq(
      "reference_kind",
      "current_look"
    )
    .eq("is_current", true)
    .order("created_at", {
      ascending: false,
    });

  if (subject) {
    query =
      query.eq(
        "subject",
        subject
      );
  }

  if (lookType) {
    query =
      query.eq(
        "look_type",
        lookType
      );
  }

  const {
    data,
    error,
  } = await query;

  if (error) {
    throw error;
  }

  const references =
    (data ??
      []) as VisualReference[];

  const resolved =
    await Promise.all(
      references.map(
        signedReference
      )
    );

  return resolved.filter(
    (
      item
    ): item is VisualReferenceWithUrl =>
      item !== null
  );
}


// ============================================================
// REFERENCE BUNDLE
// ============================================================

async function loadSubjectReferences({
  userId,
  subject,
}: {
  userId: string;
  subject: VisualReferenceSubject;
}) {
  const {
    data,
    error,
  } = await db
    .from("visual_references")
    .select("*")
    .eq("user_id", userId)
    .eq(
      "subject",
      subject
    )
    .eq("is_active", true)
    .order("is_favorite", {
      ascending: false,
    })
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  const resolved =
    await Promise.all(
      (
        (data ??
          []) as VisualReference[]
      ).map(
        signedReference
      )
    );

  return resolved.filter(
    (
      item
    ): item is VisualReferenceWithUrl =>
      item !== null
  );
}


function scoreReference(
  item: VisualReferenceWithUrl
) {
  const ref =
    item.reference;

  let score = 0;

  if (
    ref.reference_strength ===
    "primary"
  ) {
    score += 100;
  }

  if (
    ref.reference_strength ===
    "supporting"
  ) {
    score += 50;
  }

  if (
    ref.reference_strength ===
    "detail_only"
  ) {
    score += 15;
  }

  if (ref.is_favorite) {
    score += 25;
  }

  if ((ref.reference_kind ?? "identity") === "identity") {
  score += identityFeedbackBoost(ref.metadata);
}
  
  if (ref.is_current) {
    score += 150;
  }

  return score;
}


export async function getPhotoReferenceBundle({
  userId,
  subjectType,
  useCurrentLook = true,
}: {
  userId: string;
  subjectType: PhotoSubject;
  useCurrentLook?: boolean;
}): Promise<ReferenceBundle> {
  const [
    alloah,
    dominic,
    couple,
    currentAlloah,
    currentDominic,
  ] =
    await Promise.all([
      subjectType ===
        "dominic"
        ? Promise.resolve([])
        : loadSubjectReferences({
            userId,
            subject:
              "alloah",
          }),

      subjectType ===
        "me"
        ? Promise.resolve([])
        : loadSubjectReferences({
            userId,
            subject:
              "dominic",
          }),

      subjectType ===
        "both"
        ? loadSubjectReferences({
            userId,
            subject:
              "couple",
          })
        : Promise.resolve([]),

      useCurrentLook &&
      subjectType !==
        "dominic"
        ? getCurrentLook({
            userId,
            subject:
              "alloah",
          })
        : Promise.resolve([]),

      useCurrentLook &&
      subjectType !==
        "me"
        ? getCurrentLook({
            userId,
            subject:
              "dominic",
          })
        : Promise.resolve([]),
    ]);

  const all =
    [
      ...alloah,
      ...dominic,
      ...couple,
      ...currentAlloah,
      ...currentDominic,
    ];

  const deduped =
    Array.from(
      new Map(
        all.map(
          (item) => [
            item.reference.id,
            item,
          ]
        )
      ).values()
    );

  // Keep provider payload reasonable.
  // Primary/current references win.
  const selected =
    deduped
      .sort(
        (a, b) =>
          scoreReference(b) -
          scoreReference(a)
      )
      .slice(0, 16);

  return {
    alloah,
    dominic,
    couple,

    currentLook: {
      alloah:
        currentAlloah,
      dominic:
        currentDominic,
    },

    selected,
  };
}


// ============================================================
// ANTI REPETITION
// ============================================================

export async function getAntiRepetitionSnapshot({
  userId,
  limit = 12,
}: {
  userId: string;
  limit?: number;
}): Promise<AntiRepetitionSnapshot> {
  const {
    data,
    error,
  } = await db
    .from(
      "photo_generation_features"
    )
    .select("*")
    .eq("user_id", userId)
    .order("created_at", {
      ascending: false,
    })
    .limit(limit);

  if (error) {
    throw error;
  }

  const features =
    (data ??
      []) as PhotoGenerationFeature[];

  const recentPoseTypes =
    unique(
      features.map(
        (item) =>
          item.pose_type
      )
    );

  const recentCameraAngles =
    unique(
      features.map(
        (item) =>
          item.camera_angle
      )
    );

  const recentFramings =
    unique(
      features.map(
        (item) =>
          item.framing
      )
    );

  const recentExpressions =
    unique(
      features.map(
        (item) =>
          item.expression
      )
    );

  const recentLightingTypes =
    unique(
      features.map(
        (item) =>
          item.lighting_type
      )
    );

  const recentLocations =
    unique(
      features.map(
        (item) =>
          item.location_category
      )
    );

  const recentCompositions =
    unique(
      features.map(
        (item) =>
          item.composition_type
      )
    );

  const countValues = (
    values: Array<
      string | null
    >
  ) => {
    const counts =
      new Map<
        string,
        number
      >();

    for (
      const value of values
    ) {
      if (!value) continue;

      counts.set(
        value,
        (counts.get(value) ??
          0) + 1
      );
    }

    return [
      ...counts.entries(),
    ]
      .sort(
        (a, b) =>
          b[1] - a[1]
      )
      .filter(
        ([, count]) =>
          count >= 2
      )
      .map(
        ([value]) =>
          value
      );
  };

  const avoidPoses =
    countValues(
      features.map(
        (item) =>
          item.pose_type
      )
    );

  const avoidAngles =
    countValues(
      features.map(
        (item) =>
          item.camera_angle
      )
    );

  const avoidFramings =
    countValues(
      features.map(
        (item) =>
          item.framing
      )
    );

  const avoidLocations =
    countValues(
      features.map(
        (item) =>
          item.location_category
      )
    );

  const avoidCompositions =
    countValues(
      features.map(
        (item) =>
          item.composition_type
      )
    );

  const candidateVariety = [
    "wide candid",
    "one person photographing the other",
    "walking shot",
    "side profile",
    "from behind",
    "low angle",
    "full body candid",
    "cropped imperfect phone photo",
    "off-center composition",
    "laughing mid-movement",
    "looking away from camera",
  ];

  const occupied =
    new Set([
      ...recentPoseTypes,
      ...recentCameraAngles,
      ...recentFramings,
      ...recentCompositions,
    ]);

  const prefer =
    candidateVariety
      .filter(
        (candidate) =>
          !occupied.has(
            candidate
          )
      )
      .slice(0, 5);

  return {
    recentPoseTypes,
    recentCameraAngles,
    recentFramings,
    recentExpressions,
    recentLightingTypes,
    recentLocations,
    recentCompositions,

    avoid: {
      poses:
        avoidPoses,
      cameraAngles:
        avoidAngles,
      framings:
        avoidFramings,
      locations:
        avoidLocations,
      compositions:
        avoidCompositions,
    },

    prefer,
  };
}


// ============================================================
// GENERATION REQUESTS
// ============================================================

export async function createPhotoGenerationRequest({
  userId,
  mode,
  subjectType,
  sourceContext = "manual",

  scene,
  mood,
  shotType,

  photoStyle =
    "natural_iphone",

  closenessLevel,
  spontaneityLevel,

  useCurrentLook = true,

  avoidRecentPoses = true,
  avoidRecentLocations = true,
  avoidRecentCompositions = true,

  contextSnapshot = {},

  parentRequestId,
  parentPhotoItemId,

  batchId,
  batchIndex,

  adjustmentInstruction,
}: {
  userId: string;

  mode: PhotoGenerationMode;
  subjectType: PhotoSubject;

  sourceContext?: PhotoSourceContext;

  scene?: string | null;
  mood?: string | null;
  shotType?: string | null;

  photoStyle?: PhotoStyle;

  closenessLevel?: PhotoCloseness | null;
  spontaneityLevel?: PhotoSpontaneity | null;

  useCurrentLook?: boolean;

  avoidRecentPoses?: boolean;
  avoidRecentLocations?: boolean;
  avoidRecentCompositions?: boolean;

  contextSnapshot?: PhotoContextSnapshot;

  parentRequestId?: string | null;
  parentPhotoItemId?: string | null;

  batchId?: string | null;
  batchIndex?: number | null;

  adjustmentInstruction?: string | null;
}): Promise<PhotoGenerationRequest> {
  const [
    bundle,
    antiRepeat,
  ] =
    await Promise.all([
      getPhotoReferenceBundle({
        userId,
        subjectType,
        useCurrentLook,
      }),

      getAntiRepetitionSnapshot({
        userId,
      }),
    ]);

  const referenceIds =
    bundle.selected.map(
      (item) =>
        item.reference.id
    );

  const {
    data,
    error,
  } = await db
    .from(
      "photo_generation_requests"
    )
    .insert({
      user_id:
        userId,

      mode,

      subject_type:
        subjectType,

      source_context:
        sourceContext,

      scene:
        scene ?? null,

      mood:
        mood ?? null,

      shot_type:
        shotType ?? null,

      photo_style:
        photoStyle,

      closeness_level:
        closenessLevel ??
        null,

      spontaneity_level:
        spontaneityLevel ??
        null,

      use_current_look:
        useCurrentLook,

      avoid_recent_poses:
        avoidRecentPoses,

      avoid_recent_locations:
        avoidRecentLocations,

      avoid_recent_compositions:
        avoidRecentCompositions,

      context_snapshot:
        contextSnapshot,

      anti_repeat_snapshot:
        antiRepeat,

      reference_ids:
        referenceIds,

      parent_request_id:
        parentRequestId ??
        null,

      parent_photo_item_id:
        parentPhotoItemId ??
        null,

      batch_id:
        batchId ??
        null,

      batch_index:
        batchIndex ??
        null,

      adjustment_instruction:
        adjustmentInstruction ??
        null,

      status:
        "queued",
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return (
    data as PhotoGenerationRequest
  );
}


export async function updatePhotoRequest({
  userId,
  requestId,
  values,
}: {
  userId: string;
  requestId: string;

  values: Partial<{
    status: PhotoRequestStatus;

    provider: string | null;
    provider_model: string | null;
    provider_job_id: string | null;

    final_prompt: string | null;

    photo_item_id: string | null;

    error_message: string | null;

    context_snapshot:
      Record<string, unknown>;

    anti_repeat_snapshot:
      Record<string, unknown>;
  }>;
}): Promise<PhotoGenerationRequest> {
  const {
    data,
    error,
  } = await db
    .from(
      "photo_generation_requests"
    )
    .update({
      ...values,

      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "user_id",
      userId
    )
    .eq(
      "id",
      requestId
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return (
    data as PhotoGenerationRequest
  );
}


// ============================================================
// CANONICAL GENERATED PHOTO
// ============================================================

export async function saveGeneratedPhoto({
  userId,
  request,

  blob,
  mimeType =
    "image/jpeg",

  title =
    "Generated photo",

  owner,

  feature,

  extraData = {},
}: {
  userId: string;

  request:
    PhotoGenerationRequest;

  blob: Blob;

  mimeType?: string;

  title?: string;

  owner?:
    | "alloah"
    | "dominic"
    | "shared";

  feature?: PhotoFeatureInput;

  extraData?: Record<
    string,
    unknown
  >;
}): Promise<GalleryPhoto> {
  const extension =
    mimeType.includes("png")
      ? "png"
      : mimeType.includes(
            "webp"
          )
        ? "webp"
        : "jpg";

  const storagePath =
    `${userId}/generated/` +
    `${crypto.randomUUID()}.${extension}`;

  const {
    error: uploadError,
  } = await db.storage
    .from(MEDIA_BUCKET)
    .upload(
      storagePath,
      blob,
      {
        upsert: false,
        contentType:
          mimeType,
        cacheControl:
          "3600",
      }
    );

  if (uploadError) {
    throw uploadError;
  }

  const subjectOwner =
    owner ??
    (request.subject_type ===
    "me"
      ? "alloah"
      : request.subject_type ===
          "dominic"
        ? "dominic"
        : "shared");

  const now =
    new Date().toISOString();

  const {
    data: photoItem,
    error: itemError,
  } = await db
    .from("diario_items")
    .insert({
      user_id:
        userId,

      kind:
        "photo",

      owner:
        subjectOwner,

      status:
        "active",

      title,

      body:
        null,

      event_at:
        now,

      planned_for:
        null,

      data: {
        storage_bucket:
          MEDIA_BUCKET,

        storage_path:
          storagePath,

        source:
          "dominic_photo_engine",

        generated:
          true,

        generation_request_id:
          request.id,

        generation_mode:
          request.mode,

        subject_type:
          request.subject_type,

        scene:
          request.scene,

        mood:
          request.mood,

        shot_type:
          request.shot_type,

        photo_style:
          request.photo_style,

        closeness_level:
          request.closeness_level,

        source_context:
          request.source_context,

        favorite:
          false,

        ...extraData,
      },
    })
    .select("*")
    .single();

  if (itemError) {
    await db.storage
      .from(MEDIA_BUCKET)
      .remove([
        storagePath,
      ]);

    throw itemError;
  }

  const photo =
    photoItem as DiarioItem;

  if (feature) {
    const {
      error:
        featureError,
    } = await db
      .from(
        "photo_generation_features"
      )
      .insert({
        user_id:
          userId,

        photo_item_id:
          photo.id,

        request_id:
          request.id,

        pose_type:
          feature.poseType ??
          null,

        camera_angle:
          feature.cameraAngle ??
          null,

        framing:
          feature.framing ??
          null,

        expression:
          feature.expression ??
          null,

        lighting_type:
          feature.lightingType ??
          null,

        location_category:
          feature.locationCategory ??
          null,

        composition_type:
          feature.compositionType ??
          null,

        feature_data:
          feature.featureData ??
          {},
      });

    if (featureError) {
      console.error(
        "Could not save generated photo features:",
        featureError
      );
    }
  }

  await updatePhotoRequest({
    userId,
    requestId:
      request.id,

    values: {
      status:
        "completed",

      photo_item_id:
        photo.id,

      error_message:
        null,
    },
  });

  const {
    data: signedData,
    error: signedError,
  } = await db.storage
    .from(MEDIA_BUCKET)
    .createSignedUrl(
      storagePath,
      60 * 60
    );

  if (
    signedError ||
    !signedData?.signedUrl
  ) {
    throw (
      signedError ??
      new Error(
        "Could not open generated photo."
      )
    );
  }

  return {
    item:
      photo,

    url:
      signedData.signedUrl,
  };
}


// ============================================================
// PHOTO LINKS
// ============================================================

export async function linkPhotoToItem({
  userId,
  photoId,
  targetItemId,
  relation = "appears_in",
  data = {},
}: {
  userId: string;

  photoId: string;

  targetItemId: string;

  relation?: string;

  data?: Record<
    string,
    unknown
  >;
}) {
  const {
    error,
  } = await db
    .from("diario_links")
    .upsert(
      {
        user_id:
          userId,

        source_item_id:
          targetItemId,

        target_item_id:
          photoId,

        relation,

        data,
      },
      {
        onConflict:
          "user_id,source_item_id,target_item_id,relation",
      }
    );

  if (error) {
    throw error;
  }
}


// ============================================================
// DAILY LIFE BATCH
// ============================================================

export async function createDailyLifeBatch({
  userId,
  subjectType = "both",
  count = 5,
  mood = "everyday",
}: {
  userId: string;

  subjectType?: PhotoSubject;

  count?: number;

  mood?: string;
}) {
  const safeCount =
    Math.min(
      8,
      Math.max(
        1,
        count
      )
    );

  const batchId =
    crypto.randomUUID();

  const requests:
    PhotoGenerationRequest[] =
    [];

  for (
    let index = 0;
    index < safeCount;
    index++
  ) {
    const request =
      await createPhotoGenerationRequest({
        userId,

        mode:
          "daily_life",

        subjectType,

        sourceContext:
          "manual",

        mood,

        photoStyle:
          "natural_iphone",

        spontaneityLevel:
          "high",

        useCurrentLook:
          true,

        batchId,

        batchIndex:
          index,
      });

    requests.push(
      request
    );
  }

  return {
    batchId,
    requests,
  };
}


// ============================================================
// ADJUST / REGENERATE
// ============================================================

export async function createPhotoAdjustmentRequest({
  userId,

  originalRequest,

  originalPhotoId,

  instruction,
}: {
  userId: string;

  originalRequest:
    PhotoGenerationRequest;

  originalPhotoId:
    string;

  instruction:
    string;
}) {
  const cleanInstruction =
    instruction.trim();

  if (!cleanInstruction) {
    throw new Error(
      "Tell the Photo Engine what should change."
    );
  }

  return (
    createPhotoGenerationRequest({
      userId,

      mode:
        "adjust",

      subjectType:
        originalRequest.subject_type,

      sourceContext:
        originalRequest.source_context,

      scene:
        originalRequest.scene,

      mood:
        originalRequest.mood,

      shotType:
        originalRequest.shot_type,

      photoStyle:
        originalRequest.photo_style,

      closenessLevel:
        originalRequest.closeness_level,

      spontaneityLevel:
        originalRequest.spontaneity_level,

      useCurrentLook:
        originalRequest.use_current_look,

      parentRequestId:
        originalRequest.id,

      parentPhotoItemId:
        originalPhotoId,

      adjustmentInstruction:
        cleanInstruction,

      contextSnapshot:
        originalRequest.context_snapshot,
    })
  );
}
