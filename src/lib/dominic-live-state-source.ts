/** Persisted active_context origins that can describe Dominic's live state.
 * The background autonomy engine and the in-chat life loop use different
 * source_type values; both belong to the same user's live presence.
 */
export const DOMINIC_LIVE_STATE_SOURCES = [
  "dominic_life_loop",
  "autonomy_engine",
] as const;

export function dominicStateOriginForSource(sourceType: string): "event" | "autonomous" {
  return sourceType === "dominic_life_loop" ? "event" : "autonomous";
}
