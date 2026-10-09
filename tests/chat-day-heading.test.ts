import { describe, expect, test } from "bun:test";
import { chatCalendarDayKey, chatDayHeading } from "../src/lib/chat-day-heading";

describe("chat chronological day headings", () => {
  test("groups messages by the Diary local calendar date, not UTC", () => {
    expect(chatCalendarDayKey("2026-10-10T01:30:00Z")).toBe("2026-10-09");
    expect(chatCalendarDayKey("2026-10-10T03:05:00Z")).toBe("2026-10-10");
  });
  test("today and yesterday include the weekday", () => {
    const now = new Date("2026-10-09T22:00:00Z");
    expect(chatDayHeading("2026-10-09T18:00:00Z", now)).toBe("Today · Friday");
    expect(chatDayHeading("2026-10-08T18:00:00Z", now)).toBe("Yesterday · Thursday");
  });
  test("historical dates show weekday and calendar date", () => {
    const now = new Date("2026-10-09T22:00:00Z");
    expect(chatDayHeading("2026-10-06T14:00:00Z", now)).toBe("Tuesday, Oct 6");
    expect(chatDayHeading("2025-10-06T14:00:00Z", now)).toContain("2025");
  });
  test("invalid timestamps never crash Chat", () => {
    expect(chatCalendarDayKey("invalid")).toBe("unknown");
    expect(chatDayHeading("invalid")).toBe("Unknown date");
  });
});
