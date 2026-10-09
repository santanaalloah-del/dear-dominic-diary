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
  // Passive solo moments are not "hands busy", posed fashion sitting, or
  // activities invented just to make a more photogenic picture.
  const quietSoloMoment = request.subject_type !== "both" &&
    /\b(relaxing|relaxed|lounging|chilling|resting|doing nothing special|taking it easy|doing nothing|watching something|just hanging out)\b/i.test(sceneText) &&
    (!sceneIntent.pose || sceneIntent.pose === "relaxed_seated" ||
     sceneIntent.pose === "relaxed_phone_selfie");
  const poseType = quietSoloMoment &&
    (!sceneIntent.pose || sceneIntent.pose === "relaxed_seated")
    ? (request.photo_style === "selfie" ? "relaxed_phone_selfie" : "lounging_unposed")
    : sceneIntent.pose ?? choose(
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
  const kitchenAngles = [
    "from_counter_side",
    "casual_kitchen_doorway",
    "over_shoulder_at_counter",
    "handheld_side_angle",
    "diagonal_from_kitchen",
    "eye_level",
  ];
  const nonSelfieCouple = request.subject_type === "both" &&
    request.photo_style !== "selfie" && request.photo_style !== "mirror";
  const naturalAngles = nonSelfieCouple && sceneIntent.room === "living"
    ? couchAnglePool
    : nonSelfieCouple && sceneIntent.room === "kitchen"
      ? kitchenAngles : pools.cameraAngles;
  const cameraAngle = sceneIntent.cameraAngle ?? choose(
    naturalAngles, recentAngles, seedBase >>> 3, "eye_level"
  );

  // Show two recognizable people, not tiny faces in an accidental room-wide
  // shot. An expressly requested full-body / wide photo always wins.
  const intimateCloseUp = request.subject_type === "both" && sceneIntent.affectionate;
  // A picture of TWO people is not an outfit lookbook. Neither is a photo
  // of one person. Full-body and establishing shots are reserved for direct
  // scene/shot-type requests, not randomized from a camera pool.
  const casualFramings = ["head_and_shoulders", "chest_up", "waist_up", "three_quarter"];
  const naturalCoupleFramings = casualFramings;
  const explicitFullBodyShot = /\b(full.?body|whole.?body|outfit|lookbook|head.?to.?toe)\b/i.test(request.shot_type ?? "");
  const explicitWideShot = /\b(environment|establishing|wide|room)\b/i.test(request.shot_type ?? "");
  const requestedOverride = safeObject(context.custom).framingOverride;
  const approvedFramings = new Set([
    "close_up", "head_and_shoulders", "chest_up", "waist_up",
    "three_quarter", "full_body", "environmental_wide",
  ]);
  const manualFraming = typeof requestedOverride === "string" &&
    approvedFramings.has(requestedOverride) ? requestedOverride : null;
  // A user-selected crop wins over random composition and persists from
  // the free audit into the paid request.
  const requestedShotFraming = manualFraming ?? sceneIntent.framing ??
    (explicitFullBodyShot ? "full_body" : explicitWideShot ? "environmental_wide" : null);
  const recentFramings = [
    ...safeStrings(anti.recentFramings).slice(0, 2),
    ...safeStrings(avoid.framings),
  ];
  const framing = requestedShotFraming ??
    (quietSoloMoment
      ? choose(["chest_up", "waist_up", "close_up"], recentFramings,
          seedBase >>> 6, "chest_up")
    : sceneIntent.pose === "making_coffee_candid"
      ? choose(["waist_up", "three_quarter", "medium_wide", "chest_up"],
          recentFramings, seedBase >>> 6, "waist_up")
    : intimateCloseUp
      ? choose(
          sceneIntent.pose === "reclining_on_partner"
            ? ["waist_up", "chest_up", "three_quarter"]
            : ["chest_up", "waist_up", "head_and_shoulders", "three_quarter"],
          recentFramings, seedBase >>> 6, "three_quarter"
        )
      : choose(
          request.photo_style === "mirror"
            ? pools.framings
            : request.photo_style === "selfie"
              ? pools.framings.filter(value => value !== "environmental_wide" && value !== "full_body")
              : naturalCoupleFramings,
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
      (quietSoloMoment
        ? choose(["resting_face_unperformed", "soft_unforced_half_smile",
                  "looking_off_to_side_at_home", "quiet_thoughtful"],
                 safeStrings(anti.recentExpressions), seedBase >>> 9,
                 "resting_face_unperformed")
      : sceneIntent.pose === "making_coffee_candid"
        ? choose(["naturally_focused_on_activity", "quiet_glance_at_partner",
                  "mid_conversation_while_working", "looking_down_at_coffee"],
                 safeStrings(anti.recentExpressions), seedBase >>> 9,
                 "naturally_focused_on_activity")
      : isTogether && affection
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

/**
 * The camera plan is a real composition constraint, NOT a styling adjective.
 * A clothing board includes shoes, but the model must NOT zoom out to show
 * them in a close or waist-up photograph. Full body is an intentional choice.
 */
export function photoFramingBoundary(framing: string): string {
  switch (framing) {
    case "close_up":
      return "TIGHT CLOSE-UP: only faces, hair, neck and edges of shoulders in view; legs, waists, shoes and most of the room are OFF FRAME. Faces dominate the actual pixels.";
    case "head_and_shoulders":
      return "HEAD-AND-SHOULDERS CROP: show heads and shoulders only; NO waist, legs, shoes or full outfits.";
    case "chest_up":
      return "CHEST-UP CROP: frame from heads to upper chest; everything below the chest is outside the picture.";
    case "waist_up":
      return "WAIST-UP CROP: frame from head to near the waist. Include hands or an activity prop if plausible; CUT OFF trousers below the hips and ALL footwear.";
    case "three_quarter":
      return "THREE-QUARTER CROP: frame from head to roughly mid-thigh or knees, with natural cut edges. Do not show shoes or an entire head-to-toe outfit.";
    case "medium_wide":
      return "MEDIUM-WIDE CROP: show two people and enough real environment to orient the moment, but normally crop near the knees; do not pull back to a symmetrical floor-to-ceiling full-body portrait.";
    case "full_body":
      return "INTENTIONAL FULL-BODY CROP: show head-to-toe outfits because the user explicitly requested or selected it; preserve exact footwear and pants.";
    case "environmental_wide":
      return "INTENTIONAL ESTABLISHING SHOT: show the wider setting because it was requested; keep human subjects recognizable, never a generic catalog pose.";
    default:
      return "Natural medium crop around the meaningful interaction, with an imperfect camera edge. Do not default to full body.";
  }
}

/**
 * Strict geometric crop instructions. Merely saying "close_up" previously
 * produced head-to-toe staged kitchen portraits despite the free audit.
 * The model still has limitations, but it now receives camera-space rules
 * BEFORE any optional details are described.
 */
export function photoFramingContract(plan: PhotoVariationPlan, style: string, subject: string) {
  const crop: Record<string, string> = {
    close_up: "TIGHT CLOSE-UP: faces and upper shoulders fill the frame. Do NOT include legs, knees, feet or a head-to-toe view. Background is partial.",
    head_and_shoulders: "HEAD AND SHOULDERS ONLY: crop below the upper chest. No waist, trousers or shoes in view.",
    chest_up: "CHEST-UP SNAPSHOT: crop below the chest or upper ribs. Legs and shoes entirely outside the frame.",
    waist_up: "WAIST-UP SNAPSHOT: crop around waists or hips. NO visible knees or shoes; do not step backward to show entire bodies.",
    three_quarter: "THREE-QUARTER SNAPSHOT: crop around mid-thigh or above the knees. Feet and complete full outfits are NOT required.",
    medium_wide: "MEDIUM-WIDE CANDID: show upper bodies, active hands and enough of the real setting to explain the activity; frame cuts off lower legs or feet. Not a head-to-toe portrait.",
    full_body: "FULL-BODY PHOTO: visible shoes allowed because the full-body framing was selected. Keep the physical action and human proportions natural.",
    environmental_wide: "ENVIRONMENTAL WIDE: the actual room or scene may fill much of the image; people remain naturally proportioned and situated.",
  };
  const isSelfie = style === "selfie" || style === "mirror";
  const candid = !isSelfie && (style === "natural_iphone" || style === "candid");
  return [
    "NON-NEGOTIABLE COMPOSITION / CAMERA CROP:",
    crop[plan.framing] ?? crop.waist_up,
    "Keep the chosen camera angle: " + humanize(plan.cameraAngle) + ". Camera moves through physically reachable space; the apartment furniture does NOT move.",
    candid && subject === "both"
      ? "A natural observation of two people IN THE MIDDLE of doing something. One can be in partial profile or naturally partly cropped. They do not stop, stand shoulder-to-shoulder, pose for a group portrait or present objects toward the lens. Focus and eyes follow the shared task, not the photographer."
      : candid
      ? "Capture an unperformed moment, not a person posed for a head-to-toe outfit check."
      : "Follow the requested selfie, mirror or consciously posed photo format when specified.",
    "The visible crops determine which clothes, shoes, tattoos and furniture need to appear. Never back the camera up just to display all saved references.",
  ].filter(Boolean).join(" ");
}

export function photoVariationInstruction(
  plan: PhotoVariationPlan
) {
  return [
    "BINDING SHOT PLAN — this describes the FINAL PIXELS, not suggestions:",
    `Action / pose: ${humanize(plan.poseType)}.`,
    `Camera viewpoint: ${humanize(plan.cameraAngle)}.`,
    `Selected crop: ${humanize(plan.framing)}. ${photoFramingBoundary(plan.framing)}`,
    `Expression: ${humanize(plan.expression)}.`,
    `Room-matched light: ${humanize(plan.lightingType)}.`,
    `Composition: ${humanize(plan.compositionType)}.`,
    "A casual photographer can change their own phone position and accidentally crop a sleeve, shoe, tattoo, arm or background. They CANNOT move real furniture, replace real clothes or change the requested activity.",
    "Do not step back to fit wardrobe-board shoes or every tattoo, or to recreate a complete catalog view of the reference room. Those are REFERENCE IMAGES, not the intended final crop.",
    "For candid shots the actors are occupied with each other or the activity, not performing for the camera. An explicitly requested selfie, mirror shot, full-body shot or posed portrait still wins.",
  ].join(" ");
}
