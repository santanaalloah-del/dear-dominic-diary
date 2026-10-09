import { analyzePhotoScene } from "@/lib/photo-scene-intent";

type VariationRequest = {
  id: string;
  mode?: string | null;
  subject_type?: string | null;
  photo_style?: string | null;
  shot_type?: string | null;
  scene?: string | null;
  mood?: string | null;
  context_snapshot?: Record<string, unknown> | null;
  anti_repeat_snapshot?: Record<string, unknown> | null;
};

export type PhotoVariationPlan = {
  poseType: string;
  cameraAngle: string;
  framing: string;
  expression: string;
  lightingType: string;
  compositionType: string;
};

function safeObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function safeStrings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0
      )
    : [];
}

function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function rotate<T>(values: T[], seed: number) {
  if (!values.length) return values;

  const offset = seed % values.length;

  return [...values.slice(offset), ...values.slice(0, offset)];
}

function choose(
  values: string[],
  avoid: string[],
  seed: number,
  fallback: string
) {
  const avoidSet = new Set(avoid);
  const rotated = rotate(values, seed);

  return (
    rotated.find((value) => !avoidSet.has(value)) ??
    rotated[0] ??
    fallback
  );
}

function stylePools(style: string | null | undefined) {
  switch (style) {
    case "selfie":
      return {
        poses: [
          "relaxed_selfie",
          "half_turned_selfie",
          "leaning_selfie",
          "mid_laugh_selfie",
          "casual_sitting_selfie",
        ],
        cameraAngles: [
          "eye_level",
          "slightly_above",
          "slightly_below",
        ],
        framings: [
          "close_up",
          "head_and_shoulders",
          "chest_up",
          "waist_up",
        ],
        compositions: [
          "off_center",
          "cropped_edge",
          "centered_casual",
          "negative_space",
        ],
      };

    case "mirror":
      return {
        poses: [
          "standing_relaxed",
          "half_turned",
          "leaning",
          "weight_on_one_leg",
          "hands_busy",
        ],
        cameraAngles: [
          "mirror_eye_level",
          "mirror_chest_height",
          "mirror_waist_height",
        ],
        framings: [
          "waist_up",
          "three_quarter",
          "full_body",
          "environmental_wide",
        ],
        compositions: [
          "mirror_reflection",
          "off_center",
          "cropped_edge",
          "doorway_frame",
        ],
      };

    case "candid":
      return {
        poses: [
          "looking_away",
          "hands_busy",
          "walking_mid_step",
          "reaching_for_something",
          "relaxed_seated",
          "half_turned",
        ],
        cameraAngles: [
          "eye_level",
          "shoulder_height",
          "waist_height",
          "slightly_below",
        ],
        framings: [
          "chest_up",
          "waist_up",
          "three_quarter",
          "full_body",
          "environmental_wide",
        ],
        compositions: [
          "off_center",
          "foreground_obstruction",
          "cropped_edge",
          "doorway_frame",
          "negative_space",
        ],
      };

    default:
      return {
        poses: [
          "relaxed_seated",
          "standing_casual",
          "half_turned",
          "leaning",
          "looking_away",
          "hands_busy",
          "walking_mid_step",
          "reaching_for_something",
        ],
        cameraAngles: [
          "eye_level",
          "slightly_above",
          "slightly_below",
          "shoulder_height",
          "waist_height",
        ],
        framings: [
          "close_up",
          "head_and_shoulders",
          "chest_up",
          "waist_up",
          "three_quarter",
          "full_body",
          "environmental_wide",
        ],
        compositions: [
          "off_center",
          "centered_casual",
          "cropped_edge",
          "negative_space",
          "foreground_obstruction",
          "doorway_frame",
          "over_shoulder",
        ],
      };
  }
}

function expressionPool(mode: string | null | undefined, mood: string | null | undefined) {
  const moodText = (mood ?? "").toLowerCase();

  if (moodText.includes("playful") || mode === "surprise") {
    return [
      "playful",
      "half_smile",
      "mid_laugh",
      "mid_sentence",
      "distracted",
    ];
  }

  if (
    moodText.includes("tired") ||
    moodText.includes("sleep") ||
    moodText.includes("late")
  ) {
    return [
      "sleepy",
      "neutral_soft",
      "distracted",
      "half_smile",
    ];
  }

  if (
    mode === "daily_life" ||
    mode === "spontaneous" ||
    mode === "chat_photo"
  ) {
    return [
      "distracted",
      "neutral_soft",
      "half_smile",
      "focused",
      "mid_sentence",
      "mid_laugh",
    ];
  }

  return [
    "neutral_soft",
    "half_smile",
    "focused",
    "playful",
    "mid_sentence",
    "mid_laugh",
  ];
}

function lightingPool(
  style: string | null | undefined,
  context: Record<string, unknown>
) {
  if (style === "flash") return ["direct_phone_flash"];

  const timeOfDay =
    typeof context.timeOfDay === "string"
      ? context.timeOfDay.toLowerCase()
      : "";

  if (
    timeOfDay.includes("night") ||
    timeOfDay.includes("late")
  ) {
    return [
      "warm_lamp",
      "low_light_phone",
      "overhead_home",
      "direct_phone_flash",
      "street_light",
    ];
  }

  if (timeOfDay.includes("golden")) {
    return [
      "golden_hour",
      "window_daylight",
      "outdoor_daylight",
      "warm_lamp",
    ];
  }

  return [
    "window_daylight",
    "outdoor_daylight",
    "overhead_home",
    "cafe_ambient",
    "warm_lamp",
  ];
}

export function buildPhotoVariationPlan(
  request: VariationRequest
): PhotoVariationPlan {
  const anti = safeObject(request.anti_repeat_snapshot);
  const avoid = safeObject(anti.avoid);
  const context = safeObject(request.context_snapshot);

  // The free audit sends its validated camera plan with this manual request.
  // Persisting the chosen plan is necessary: free audits use an in-memory ID,
  // while paid generation creates a DIFFERENT database request ID and loads
  // actual anti-repetition history. Otherwise the paid angle could diverge.
  const previewPlan = safeObject(safeObject(context.custom).photoPreviewPlan);
  const planKeys = [
    "poseType", "cameraAngle", "framing",
    "expression", "lightingType", "compositionType",
  ] as const;
  if (request.mode === "request" && planKeys.every((key) =>
    typeof previewPlan[key] === "string" &&
    (previewPlan[key] as string).length > 0 &&
    (previewPlan[key] as string).length <= 70
  )) {
    return {
      poseType: previewPlan.poseType as string,
      cameraAngle: previewPlan.cameraAngle as string,
      framing: previewPlan.framing as string,
      expression: previewPlan.expression as string,
      lightingType: previewPlan.lightingType as string,
      compositionType: previewPlan.compositionType as string,
    };
  }

  // A NEW photo, even with identical short scene text, uses a new seed.
  const seedBase = hashString(
    [request.id, request.mode ?? "", request.photo_style ?? "",
      request.scene ?? "", request.subject_type ?? ""].join("|")
  );

  const pools = stylePools(request.photo_style);

  // Scene meaning comes first: a cooking / cuddling / walking photo must
  // never become a random sitting, standing or looking-away pose.
  const sceneIntent = analyzePhotoScene(
    request.scene, request.photo_style, request.subject_type
  );
  const sceneText = (request.scene ?? "").toLowerCase();
  const poseType = sceneIntent.pose ?? choose(
    pools.poses, safeStrings(avoid.poses), seedBase, "relaxed_seated"
  );
  const recentAngles = [
    ...safeStrings(anti.recentCameraAngles).slice(0, 3),
    ...safeStrings(avoid.cameraAngles),
  ];
  const couchAnglePool = [
    "diagonal_from_room",
    "from_sofa_side",
    "slightly_above_sofa",
    "from_couch_arm",
    "doorway_perspective",
    "eye_level",
  ];
  const naturalAngles = request.subject_type === "both" &&
    sceneIntent.room === "living" && request.photo_style !== "selfie" &&
    request.photo_style !== "mirror"
      ? couchAnglePool
      : pools.cameraAngles;
  const cameraAngle = sceneIntent.cameraAngle ?? choose(
    naturalAngles, recentAngles, seedBase >>> 3, "eye_level"
  );

  // Show two recognizable people, not tiny faces in an accidental room-wide
  // shot. An expressly requested full-body / wide photo always wins.
  const intimateCloseUp = request.subject_type === "both" && sceneIntent.affectionate;
  const naturalCoupleFramings = pools.framings.filter((candidate) =>
    candidate !== "environmental_wide" && candidate !== "full_body"
  );
  const recentFramings = [
    ...safeStrings(anti.recentFramings).slice(0, 2),
    ...safeStrings(avoid.framings),
  ];
  const framing = sceneIntent.framing ??
    (intimateCloseUp
      ? choose(
          sceneIntent.pose === "reclining_on_partner"
            ? ["three_quarter", "medium_wide", "waist_up", "chest_up"]
            : ["chest_up", "waist_up", "three_quarter", "medium_wide"],
          recentFramings, seedBase >>> 6, "three_quarter"
        )
      : choose(
          request.subject_type === "both" && !sceneIntent.faceAway
            ? naturalCoupleFramings
            : pools.framings,
          recentFramings, seedBase >>> 6, "waist_up"
        ));

  const isTogether = request.subject_type === "both";
  const affection = /cudd|hug|embrac|kiss|lying together|laying together|snuggl|abraç|beij|carinh|conchinha|romantic|flirty|intimate/.test([sceneText, request.mood ?? ""].join(" ").toLowerCase());
  // An affectionate interaction need not turn into two posed smiles.
  const coupleExpressions = sceneIntent.pose === "reclining_on_partner"
    ? ["resting_together_unposed", "quiet_look_at_partner",
       "soft_half_smile", "mid_conversation_unposed"]
    : ["mid_conversation_unposed", "soft_attentive_glance_at_partner",
       "gentle_smile_at_partner", "natural_mid_laugh_together",
       "looking_down_at_partner"];
  const expression = sceneIntent.faceAway
    ? "natural_turned_away"
    : sceneIntent.expression ??
      (isTogether && affection
        ? choose(coupleExpressions, safeStrings(anti.recentExpressions),
            seedBase >>> 9, "mid_conversation_unposed")
        : choose(
            expressionPool(request.mode, request.mood),
            safeStrings(anti.recentExpressions),
            seedBase >>> 9,
            "neutral_soft"
          ));

  // Explicit "morning in the kitchen" overrides Dominic's current NIGHT
  // status. Likewise, a street walk stays outside even if he was last home.
  const actualRoomKey = safeObject(context.custom).homeTimeKey;
  const homeTimeKey = typeof actualRoomKey === "string" &&
    ["0200", "0700", "1100", "1740", "1830", "1910", "2100"].includes(actualRoomKey)
      ? actualRoomKey : null;
  // The home photo is chosen by the real local clock or an explicitly
  // requested time; match its illumination instead of a generic mood.
  const statedTime = sceneIntent.timeKey ?? homeTimeKey;
  const night = statedTime
    ? statedTime === "0200" || statedTime === "2100" || statedTime === "1910"
    : /night|late/.test(String(context.timeOfDay ?? "").toLowerCase());
  const indoors = !sceneIntent.outdoors && (
    Boolean(sceneIntent.room) ||
    /living|bedroom|kitchen|bathroom|home|apartment|sofa|couch|room|quarto|sala|sofá|casa/.test(
      [String(context.location ?? ""), sceneText].join(" ").toLowerCase()
    )
  );
  const homeLightChoices = homeTimeKey
    ? homeTimeKey === "0200" || homeTimeKey === "2100" || homeTimeKey === "1910"
      ? ["warm_lamp", "low_light_phone", "soft_room_lighting"]
      : homeTimeKey === "1740" || homeTimeKey === "1830"
        ? ["soft_room_lighting", "warm_lamp"]
        : ["window_daylight", "soft_room_lighting"]
    : null;
  const lightingType = request.photo_style === "flash"
    ? "direct_phone_flash"
    : homeLightChoices
      ? choose(homeLightChoices, safeStrings(anti.recentLightingTypes),
          seedBase >>> 12, homeLightChoices[0])
    : statedTime && (statedTime === "0700" || statedTime === "1100")
      ? choose(indoors ? ["window_daylight", "soft_room_lighting"] : ["outdoor_daylight", "window_daylight"],
          safeStrings(anti.recentLightingTypes), seedBase >>> 12, "window_daylight")
      : statedTime && (statedTime === "1740" || statedTime === "1830")
        ? choose(indoors ? ["warm_lamp", "soft_room_lighting"] : ["golden_hour", "outdoor_daylight"],
            safeStrings(anti.recentLightingTypes), seedBase >>> 12, "warm_lamp")
        : night && indoors
          ? choose(["warm_lamp", "low_light_phone", "soft_room_lighting"],
              safeStrings(anti.recentLightingTypes), seedBase >>> 12, "warm_lamp")
          : night
            ? choose(["street_light", "low_light_phone"],
                safeStrings(anti.recentLightingTypes), seedBase >>> 12, "street_light")
            : choose(
                lightingPool(request.photo_style, context),
                safeStrings(anti.recentLightingTypes), seedBase >>> 12, "window_daylight"
              );

  const recentCompositions = [
    ...safeStrings(anti.recentCompositions).slice(0, 3),
    ...safeStrings(avoid.compositions),
  ];
  const compositionType = sceneIntent.composition ?? choose(
    pools.compositions, recentCompositions, seedBase >>> 15, "off_center"
  );

  return {
    poseType,
    cameraAngle,
    framing,
    expression,
    lightingType,
    compositionType,
  };
}

function humanize(value: string) {
  return value.replaceAll("_", " ");
}

export function photoVariationInstruction(
  plan: PhotoVariationPlan
) {
  return [
    "SHOT VARIATION PLAN:",
    `Pose direction: ${humanize(plan.poseType)}.`,
    `Camera angle: ${humanize(plan.cameraAngle)}.`,
    `Framing: ${humanize(plan.framing)}.`,
    `Expression: ${humanize(plan.expression)}.`,
    `Lighting: ${humanize(plan.lightingType)}.`,
    `Composition: ${humanize(plan.compositionType)}.`,
    "Take the photograph from the SELECTED camera position, not automatically from the same frontal sofa angle. The perspective and crop may change naturally between photos; physically move the imagined phone camera, never the furniture, people, or requested action.",
    "A medium-wide or angled view may omit minor tattoos, shoes or background details when they are out of frame. Preserve whatever IS visible faithfully; do not zoom out simply to fit every feature.",
    "Treat these as natural photographic directions, not rigid studio posing.",
    "Identity fidelity and the user's explicit action, room and time ALWAYS override variation. Keep attention true to the moment: toward the phone in a selfie, toward each other in an embrace, eyes closed while sleeping, and toward the activity in a candid photograph. Never swap body positions, hands or props.",
  ].join(" ");
}
