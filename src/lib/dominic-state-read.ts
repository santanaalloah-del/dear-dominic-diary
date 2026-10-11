/**
 * Persisted Dominic live presence can originate in the life loop OR
 * the autonomous engine. The reader must accept both writer sources.
 * This module is deliberately pure so it can be tested without AI or DB calls.
 */
export const DOMINIC_LIVE_STATE_SOURCES = [
  "dominic_life_loop",
  "autonomy_engine",
] as const;

export function persistedStateTime(
  raw: Record<string, unknown>,
  fallback: string,
): string {
  for (const value of [raw.startedAt, raw.updated_at, fallback]) {
    if (typeof value === "string" && Number.isFinite(Date.parse(value))) {
      return value;
    }
  }
  return fallback;
}

export function persistedNextChangeTime(
  raw: Record<string, unknown>,
  startedAt: string,
): string {
  for (const value of [raw.nextChangeAt, raw.next_change_at]) {
    if (typeof value === "string" && Number.isFinite(Date.parse(value))) {
      return value;
    }
  }
  const started = Date.parse(startedAt);
  return new Date((Number.isFinite(started) ? started : Date.now()) + 20 * 60_000).toISOString();
}
