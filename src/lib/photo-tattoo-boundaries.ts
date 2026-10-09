/**
 * Photo Engine: permanent body ink is skin evidence, never wardrobe design.
 * Pure, zero-credit logic shared by selection and prompt assembly.
 */
export type TattooLocation = "face" | "neck" | "chest" | "abdomen" | "back" |
  "left_arm" | "right_arm" | "left_hand" | "right_hand" |
  "left_leg" | "right_leg" | "other";

/** Scene instructions override incidental chat memories or former outfits. */
export function tattooSceneText(request: {
  scene?: string | null;
  shot_type?: string | null;
  adjustment_instruction?: string | null;
}) {
  return [request.scene, request.shot_type, request.adjustment_instruction]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ")
    .toLowerCase();
}

/**
 * A saved shirt or other top covers chest, abdomen and back tattoos.
 * Keep face/neck/forearm/hand evidence available if actually visible.
 * A specifically bare-torso scene still allows torso ink.
 */
export function visibleTattooRegions(
  regions: TattooLocation[],
  options: { hasTop: boolean; scene: string }
): TattooLocation[] {
  const explicitBareTorso = /\b(shirtless|topless|bare[- ]chest|bare[- ]torso|sem camisa|sem blusa)\b/i.test(options.scene);
  const torsoCovered = options.hasTop && !explicitBareTorso;
  if (!torsoCovered) return regions;
  return regions.filter((region) =>
    region !== "chest" && region !== "abdomen" && region !== "back"
  );
}

export const TATTOO_FABRIC_BOUNDARY =
  "MATERIAL SEPARATION — TATTOOS ARE IN HUMAN SKIN ONLY, NEVER CLOTHING. " +
  "The ink belongs to anatomical skin locations and stays beneath sleeves, shirts, " +
  "trousers or any garment that covers those locations. Never transfer the shapes, " +
  "symbols, numbers, lettering or tattoo lines from person reference images to " +
  "fabric prints, logos or patterns. A solid-color garment shown in the exact " +
  "Current Wearing board stays solid-colored even when reference faces/bodies " +
  "have ink. A garment with a real printed design keeps ONLY the design visibly " +
  "shown on its own clothing board. Never tattoo through fabric.";
