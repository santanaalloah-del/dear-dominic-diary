/** Friendly English WhatsApp-style chat day labels in the app's São Paulo timezone. */
const diaryZone = "America/Sao_Paulo";
function validDay(value: string | Date): Date | null {
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}
export function chatCalendarDayKey(value: string | Date): string {
  const date = validDay(value);
  if (!date) return "unknown";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: diaryZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) => parts.find(item => item.type === type)?.value ?? "";
  return [part("year"), part("month"), part("day")].join("-");
}
export function chatDayHeading(value: string, now: Date = new Date()): string {
  const date = validDay(value);
  if (!date) return "Unknown date";
  const key = chatCalendarDayKey(date);
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: diaryZone, weekday: "long",
  }).format(date);
  if (key === chatCalendarDayKey(now)) return `Today · ${weekday}`;
  if (key === chatCalendarDayKey(new Date(now.getTime() - 86_400_000))) {
    return `Yesterday · ${weekday}`;
  }
  const yearChanged = key.slice(0, 4) !== chatCalendarDayKey(now).slice(0, 4);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: diaryZone, weekday: "long", month: "short", day: "numeric",
    ...(yearChanged ? { year: "numeric" as const } : {}),
  }).format(date);
}
