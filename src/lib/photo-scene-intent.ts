/**
 * Interpret WHAT the user asked to photograph before random variation.
 *
 * Pure and free: no visual analysis, image provider, browser API or storage.
 * Both the Photo Engine's audit and the paid generation reuse this logic.
 */
export type PhotoRoomKey = "living" | "bedroom" | "kitchen" | "bathroom";
export type PhotoTimeKey = "0200" | "0700" | "1100" | "1740" | "1830" | "1910" | "2100";

export type PhotoSceneIntent = {
  room: PhotoRoomKey | null;
  outdoors: boolean;
  timeKey: PhotoTimeKey | null;
  pose: string | null;
  framing: string | null;
  cameraAngle: string | null;
  composition: string | null;
  expression: string | null;
  selfie: boolean;
  faceAway: boolean;
  affectionate: boolean;
  actionNotes: string[];
  explicitBodyPlacement: boolean;
  propOwnershipAmbiguous: boolean;
};

function normalize(text: string | null | undefined): string {
  return (text ?? "").toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function explicitRoom(text: string): PhotoRoomKey | null {
  // A named room in the user's scene wins over Dominic's current state.
  // Match actual room/object words, not "room" or "living" generically.
  if (/\b(bathroom|bath|shower|restroom|banheiro|chuveiro)\b/.test(text)) return "bathroom";
  if (/\b(kitchen|cozinha|fogao|geladeira|stove|countertop)\b/.test(text)) return "kitchen";
  if (/\b(bedroom|bed|cama|quarto|travesseiro|pillow)\b/.test(text)) return "bedroom";
  if (/\b(living room|living-room|lounge|sofa|couch|sala de estar|sala|sofa)\b/.test(text)) return "living";
  return null;
}

function outsideScene(text: string): boolean {
  return /\b(outside|outdoors|outdoor|street|sidewalk|park|beach|office|workplace|at work|metro|subway|station|shopping mall|restaurant|cinema|city square|cafe|coffee shop|rua|calcada|parque|praia|escritorio|trabalho|estacao|restaurante|cinema|cafeteria|shopping)\b/.test(text);
}

function explicitTimeKey(text: string): PhotoTimeKey | null {
  // Accept 24-hour, 12-hour and Brazilian time notations in user scenes.
  const clock = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)(?:\s*(a\.?m\.?|p\.?m\.?))?/);
  const brazilian = text.match(/\b([01]?\d|2[0-3])h([0-5]\d)?\b/);
  const ampm = text.match(/\b(1[0-2]|0?[1-9])\s*(a\.?m\.?|p\.?m\.?)(?![a-z])/);
  if (clock || brazilian || ampm) {
    let hour = Number(clock?.[1] ?? brazilian?.[1] ?? ampm?.[1]);
    const minute = Number(clock?.[2] ?? brazilian?.[2] ?? 0);
    const meridiem = (clock?.[3] ?? ampm?.[2] ?? "").replaceAll(".", "");
    if (meridiem) hour = (hour % 12) + (meridiem === "pm" ? 12 : 0);
    const minutes = hour * 60 + minute;
    const variants: Array<{ key: PhotoTimeKey; minute: number }> = [
      { key: "0200", minute: 120 }, { key: "0700", minute: 420 },
      { key: "1100", minute: 660 }, { key: "1740", minute: 1060 },
      { key: "1830", minute: 1110 }, { key: "1910", minute: 1150 },
      { key: "2100", minute: 1260 },
    ];
    return variants.reduce((best, candidate) => {
      const dist = Math.abs(candidate.minute - minutes);
      const bestDist = Math.abs(best.minute - minutes);
      return Math.min(dist, 1440 - dist) < Math.min(bestDist, 1440 - bestDist) ? candidate : best;
    }).key;
  }
  if (/\b(midnight|after midnight|middle of the night|madrugada|meia noite)\b/.test(text)) return "0200";
  if (/\b(dawn|sunrise|early morning|amanhecer|cedo de manha)\b/.test(text)) return "0700";
  if (/\b(sunset|dusk|golden hour|por do sol|fim de tarde)\b/.test(text)) return "1830";
  if (/\b(late afternoon|final da tarde|tardinha)\b/.test(text)) return "1740";
  if (/\b(evening|twilight|anoitecer|comeco da noite)\b/.test(text)) return "1910";
  if (/\b(night|nighttime|tonight|late night|noite)\b/.test(text)) return "2100";
  if (/\b(morning|breakfast|manha|cafe da manha)\b/.test(text)) return "1100";
  if (/\b(noon|midday|lunch|afternoon|meio dia|almoco|tarde)\b/.test(text)) return "1100";
  return null;
}

export function analyzePhotoScene(
  scene: string | null | undefined,
  photoStyle: string | null | undefined,
  subjectType: string | null | undefined
): PhotoSceneIntent {
  const text = normalize(scene);
  const style = (photoStyle ?? "").toLowerCase();
  const room = explicitRoom(text);
  const outdoors = !room && outsideScene(text);
  const mirror = /\b(mirror|espelho)\b/.test(text);
  const selfieText = /\b(selfie|selfies|self portrait|autorretrato|autofoto)\b/.test(text);
  const mirrorSelfie = (mirror && (selfieText || /\b(photo|picture|pic|snapshot|foto|fotografia)\b/.test(text)))
    || style === "mirror";
  const selfie = selfieText || mirrorSelfie || style === "selfie";
  const faceAway = /\b(looking away|looking to the side|from behind|rear view|back view|back to camera|turned away|side profile|profile shot|de costas|olhando para o lado|sem mostrar o rosto|rosto escondido)\b/.test(text);
  const affectionate = /\b(cuddling|cuddle|hugging|hug|embracing|embrace|kissing|kiss|snuggling|conchinha|abracando|abraco|beijando|beijo|carinho)\b/.test(text);
  const explicitWide = /\b(wide shot|wide angle|distant shot|long shot|entire room|whole room|plano aberto|ambiente inteiro)\b/.test(text);
  const explicitFullBody = /\b(full.body|whole body|entire body|head to toe|full outfit|complete outfit|outfit from head to toe|corpo inteiro|dos pes a cabeca|look completo|show the shoes|show their shoes|show our shoes|mostrar os sapatos|mostrar os tenis)\b/.test(text);
  const explicitClose = /\b(close.up|headshot|face closeup|close no rosto|somente os rostos|close dos rostos)\b/.test(text);
  const shoesVisible = /\b(full outfits|complete outfits|their outfits|our outfits|showing their clothes and shoes|shoes visible|sneakers visible|tenis visiveis)\b/.test(text);
  const eyesClosed = /\b(eyes closed|sleeping|asleep|dormindo|olhos fechados|cochilando)\b/.test(text);
  const lookingAtCamera = /\b(looking at the camera|facing the camera|both faces visible|faces clearly visible|looking into the camera|olhando para camera|rostos visiveis)\b/.test(text);


  // Resolve relative bodies and object ownership from a SHORT everyday prompt.
  // No paid LLM call is needed; keep the exact scene as the authority.
  const alloahAboveDominic = /\b(?:alloah|i|me)\s+(?:(?:am|is)\s+)?(?:(?:lying|laying|reclining|reclined)\s+)?(?:on top of|straddling|lying across|laying across)\s+(?:dominic|him)\b/.test(text);
  const dominicAboveAlloah = /\b(?:dominic|he)\s+(?:(?:is)\s+)?(?:(?:lying|laying|reclining|reclined)\s+)?(?:on top of|straddling|lying across|laying across)\s+(?:alloah|her|me)\b/.test(text);
  const alloahOnLap = /\b(?:alloah|i|me)\s+(?:(?:am|is)\s+)?(?:on|in|sitting on)\s+(?:dominic'?s|his)\s+lap\b/.test(text);
  const dominicOnLap = /\b(?:dominic|he)\s+(?:(?:is)\s+)?(?:on|in|sitting on)\s+(?:alloah'?s|her|my)\s+lap\b/.test(text);
  const explicitBodyPlacement = alloahAboveDominic || dominicAboveAlloah || alloahOnLap || dominicOnLap;
  const lyingWords = /\b(lying|laying|reclining|reclined|sprawled|deitado|deitada|deitados|deitadas|recostado|recostada)\b/.test(text);
  const explicitUpright = /\b(straddling|sitting|seated|sit on top|sat on top|sentada|sentado|montada|no colo)\b/.test(text);
  // "cuddling on the couch, Alloah on top of Dominic" means reclining
  // close contact, NOT sitting on his lap or perched on the sofa arm.
  const inferredReclined = (lyingWords || (room === "living" && affectionate &&
    /\bon top of\b/.test(text))) && !explicitUpright;
  const alloahReclinedOnDominic = alloahAboveDominic && inferredReclined;
  const dominicReclinedOnAlloah = dominicAboveAlloah && inferredReclined;
  const sharedProp = /\b(?:sharing|share|passing|pass)\s+(?:(?:a|the|one)\s+)?(?:joint|cigarette|phone|drink|cup|bottle)\b/.test(text);
  const namedProp = /\b(joint|cigarette|phone|drink|cup|bottle)\b/.test(text);
  const namedHolder = /\b(?:alloah|dominic|i|he|she)\s+(?:(?:am|is)\s+)?(?:holding|holds|passing|passes|carrying|carries)\s+(?:(?:a|the|one)\s+)?(?:joint|cigarette|phone|drink|cup|bottle)\b/.test(text);
  const propOwnershipAmbiguous = namedProp && sharedProp && !namedHolder;
  const actionNotes = [
    alloahReclinedOnDominic
      ? "Alloah is LYING DOWN lengthwise ON TOP OF Dominic on the couch; both bodies are reclining along the seat cushions, torso to torso in a horizontal cuddle. Dominic is underneath. NOT sitting upright, NOT straddling, NOT perched on the couch arm or back. Preserve correct limbs and believable weight."
      : alloahAboveDominic ? "Alloah is physically on top of Dominic in the explicitly requested pose. Keep their relative positions and avoid moving either person to the couch arm or back." : null,
    dominicReclinedOnAlloah
      ? "Dominic is LYING DOWN lengthwise ON TOP OF Alloah on the couch; both bodies recline along the cushions in a horizontal cuddle. Alloah is underneath. NOT upright, not on the couch arm or back."
      : dominicAboveAlloah ? "Dominic is on top of Alloah in the explicitly requested pose. Keep their relative positions." : null,
    alloahOnLap ? "Alloah is seated on Dominic's lap. Do not reverse their seats or substitute two people sitting side by side." : null,
    dominicOnLap ? "Dominic is seated on Alloah's lap. Do not reverse their seats or substitute two people sitting side by side." : null,
    sharedProp ? "They are SHARING one real object during the moment. Depict only one physical object, passed or held by one believable hand at a time; do not duplicate it or invent extra fingers." : null,
    namedHolder ? "Preserve the explicitly named person holding or passing the object; do not silently transfer ownership." : null,
  ].filter((note): note is string => Boolean(note));

  // A real posture or action beats photographic randomness. Priority matters:
  // "lying on the sofa kissing" is still lying; "walking holding hands"
  // remains walking instead of an unrelated reaching pose.
  let pose: string | null = null;
  if (/\b(sleeping|asleep|dormindo|cochilando|napping)\b/.test(text)) pose = "sleeping_relaxed";
  else if (alloahReclinedOnDominic || dominicReclinedOnAlloah) pose = "reclining_on_partner";
  else if (lyingWords) pose = "lying_relaxed";
  else if (/\b(walking|strolling|walking together|andando|caminhando|passeando|passeio a pe)\b/.test(text)) pose = "walking_together";
  else if (explicitBodyPlacement) pose = "cuddling_close";
  else if (/\b(sitting|seated|senta|sentado|sentada|sentados|sentadas)\b/.test(text)) pose = "relaxed_seated";
  else if (/\b(standing|stand together|em pe|de pe)\b/.test(text)) pose = "standing_relaxed";
  else if (/\b(piggyback|carrying|carregando|no colo)\b/.test(text)) pose = "carrying_partner";
  else if (/\b(cooking|baking|cozinhando|preparing dinner|preparing breakfast|fazendo comida)\b/.test(text)) pose = "cooking_together";
  else if (/\b(dancing|dancando|danca)\b/.test(text)) pose = "dancing_together";
  else if (/\b(reading|lendo|leitura)\b/.test(text)) pose = "reading_relaxed";
  else if (/\b(kissing|kiss|beijando|beijo)\b/.test(text)) pose = "kissing_close";
  else if (/\b(cuddling|cuddle|snuggling|conchinha)\b/.test(text)) pose = "cuddling_close";
  else if (/\b(hugging|hug|embracing|embrace|abracando|abraco)\b/.test(text)) pose = "hugging_close";
  else if (selfie) pose = mirrorSelfie ? "relaxed_mirror_selfie" : "relaxed_phone_selfie";
  else if (faceAway) pose = "looking_away";

  const framing = explicitWide ? "environmental_wide"
    : explicitFullBody || shoesVisible ? "full_body"
    : explicitClose ? "head_and_shoulders"
    : selfie ? (mirrorSelfie ? "three_quarter" : "chest_up")
    : lookingAtCamera ? "chest_up" : null;

  let expression: string | null = null;
  if (eyesClosed) expression = "eyes_closed_restful";
  else if (faceAway) expression = null;
  else if (selfie || lookingAtCamera) {
    expression = subjectType === "both" ? "both_faces_clearly_visible_relaxed" : "face_clearly_visible_relaxed";
  }

  return {
    room, outdoors, timeKey: explicitTimeKey(text), pose, framing,
    cameraAngle: selfie ? (mirrorSelfie ? "mirror_eye_level" : "phone_eye_level") : null,
    composition: selfie ? (mirrorSelfie ? "mirror_reflection" : "centered_casual") : null,
    expression, selfie, faceAway, affectionate,
    actionNotes, explicitBodyPlacement, propOwnershipAmbiguous,
  };
}
