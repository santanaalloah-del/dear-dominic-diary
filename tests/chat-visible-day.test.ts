import { describe, expect, test } from "bun:test";
import { firstVisibleChatTimestamp } from "../src/lib/chat-visible-day";
import { chatDayHeading } from "../src/lib/chat-day-heading";
const Thu = "2026-10-08T18:00:00.000Z";
const Fri = "2026-10-09T18:00:00.000Z";
describe("one scrolling conversation day, not multiple sticky date bubbles", () => {
  test("selects the FIRST visible bubble (including one clipped by the header)", () => {
    expect(firstVisibleChatTimestamp([
      { timestamp: Thu, top: -180, bottom: 45 },
      { timestamp: Fri, top: 65, bottom: 170 },
    ], 0, 300)).toBe(Thu);
  });
  test("changes to the next day only after the last earlier bubble leaves", () => {
    const before = [
      { timestamp: Thu, top: -220, bottom: -3 },
      { timestamp: Fri, top: 17, bottom: 120 },
    ];
    expect(firstVisibleChatTimestamp(before, 0, 200)).toBe(Fri);
    expect(chatDayHeading(firstVisibleChatTimestamp(before, 0, 200)!, new Date("2026-10-09T22:00:00Z")))
      .toBe("Today · Friday");
  });
  test("does not use offscreen messages or separators when scrolling", () => {
    expect(firstVisibleChatTimestamp([
      { timestamp: Thu, top: -180, bottom: -10 },
      { timestamp: Fri, top: 210, bottom: 275 },
    ], 0, 200)).toBeNull();
  });
  test("handles invalid bounds, broken rectangles, and empty histories", () => {
    expect(firstVisibleChatTimestamp([], 0, 200)).toBeNull();
    expect(firstVisibleChatTimestamp([{ timestamp: Fri, top: NaN, bottom: 100 }], 0, 200)).toBeNull();
    expect(firstVisibleChatTimestamp([{ timestamp: Fri, top: 0, bottom: 100 }], 200, 100)).toBeNull();
  });
  test("skips messages not truly visible at the viewport edge", () => {
    expect(firstVisibleChatTimestamp([
      { timestamp: Thu, top: -50, bottom: 1 },
      { timestamp: Fri, top: 1, bottom: 80 },
    ], 0, 200)).toBe(Fri);
  });
});
