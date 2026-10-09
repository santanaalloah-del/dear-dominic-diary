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

  const seedBase = hashString(
    [
      request.id,
      request.mode ?? "",
      request.photo_style ?? "",
      request.scene ?? "",
      request.subject_type ?? "",
    ].join("|")
  );

  const pools = stylePools(request.photo_style);

  // The user's explicit action overrides the randomized anti-repeat pose.
  // Otherwise a request to lie down can turn into standing/reaching/sitting.
  const sceneText = (request.scene ?? "").toLowerCase();
  const explicitPose = /\b(lying|laying|laid|reclining|reclined|deitad[oa]s?|deitados|deitadas)\b/.test(sceneText)
    ? "lying_relaxed"
    : /\b(walking|walk together|andando|caminhando|passeando)\b/.test(sceneText)
      ? "walking_together"
      : /\b(sitting|seated|sentad[oa]s?)\b/.test(sceneText)
        ? "relaxed_seated"
        : /\b(standing|em pé|de pé)\b/.test(sceneText)
          ? "standing"
          : null;
  const poseType = explicitPose ?? choose(
    pools.poses,
    safeStrings(avoid.poses),
    seedBase,
    "relaxed_seated"
  );

  const cameraAngle = choose(
    pools.cameraAngles,
    safeStrings(avoid.cameraAngles),
    seedBase >>> 3,
    "eye_level"
  );

  const framing = choose(
    pools.framings,
    safeStrings(avoid.framings),
    seedBase >>> 6,
    "waist_up"
  );

  const expression = choose(
    expressionPool(request.mode, request.mood),
    safeStrings(anti.recentExpressions),
    seedBase >>> 9,
    "neutral_soft"
  );

  // Indoor night scenes must never randomly receive daytime/streetlight or
  // harsh flash unless the user explicitly asks for flash.
  const night = /night|late/.test(String(context.timeOfDay ?? "").toLowerCase());
  const indoor = /living|bedroom|kitchen|bathroom|home|apartment|sofa|couch|room|quarto|sala|sofá|casa/.test(
    [String(context.location ?? ""), sceneText].join(" ").toLowerCase()
  );
  const lightingType = night && indoor && request.photo_style !== "flash"
    ? choose(["warm_lamp", "low_light_phone", "soft_room_lighting"], safeStrings(anti.recentLightingTypes), seedBase >>> 12, "warm_lamp")
    : choose(
        lightingPool(request.photo_style, context),
        safeStrings(anti.recentLightingTypes),
        seedBase >>> 12,
        "window_daylight"
      );

  const compositionType = choose(
    pools.compositions,
    safeStrings(avoid.compositions),
    seedBase >>> 15,
    "off_center"
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
    "Treat these as natural photographic directions, not rigid studio posing.",
    "Identity fidelity, the user's explicitly requested body positions and interactions, and the real apartment lighting always OVERRIDE any shot variation. If a suggested pose conflicts with the scene, ignore the suggestion.",
  ].join(" ");
}
