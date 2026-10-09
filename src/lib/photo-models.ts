/**
 * Photo Engine pricing and model selection.
 * Provider charges are external and variable: figures below are DISPLAY estimates
 * based on this app's previous completed images, never a per-call spending cap.
 */
export type PhotoModelTier = "economy" | "fidelity";

export const PHOTO_MODEL_IDS = {
  economy: "bytedance-seed/seedream-4.5",
  fidelity: "openai/gpt-image-2.5-sunburst",
} as const;

export const PHOTO_MODEL_REFERENCE_LIMITS = {
  economy: 14,
  fidelity: 16,
} as const;

export const PHOTO_MODEL_BUDGET_RESERVATION_USD = {
  economy: 0.06,
  fidelity: 0.50,
} as const;

export function photoTierFromSnapshot(snapshot: unknown): PhotoModelTier {
  if (!snapshot || typeof snapshot !== "object") return "economy";
  const custom = (snapshot as Record<string, unknown>).custom;
  if (!custom || typeof custom !== "object") return "economy";
  const options = custom as Record<string, unknown>;
  return options.requestedFrom === "photo-engine-screen" &&
    options.photoModel === "sunburst" &&
    options.photoCostConsent === true
    ? "fidelity"
    : "economy";
}
