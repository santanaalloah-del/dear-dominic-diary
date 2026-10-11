import { describe, expect, test } from "bun:test";
import { observeDateConversation, type DateChatLine } from "../src/lib/date-chat-observation";

const ts = (minute: number) => new Date(Date.UTC(2026, 9, 11, 14, minute, 0)).toISOString();
const m = (id: number, role: "user" | "assistant", content: string, minute: number): DateChatLine =>
  ({ id, role, content, created_at: ts(minute) });
const now = new Date("2026-10-11T17:12:40Z");

describe("no-cost Date observation from saved conversation", () => {
  const dialogue: DateChatLine[] = [
    m(1530, "assistant", "brunch works. there's that bakery with outdoor tables that does almond croissants", 44),
    m(1531, "user", "u choose! i just want to eat!!", 45),
    m(1532, "assistant", "bakery with the almond croissants it is", 46),
    m(1533, "assistant", "let's go feed you before you get mean", 47),
    m(1534, "user", "i’m never mean! lets go!", 48),
    m(1535, "assistant", "he pulls the door shut behind us, taking your hand", 49),
    m(1538, "assistant", "he leads you down the sunlit sidewalk toward the corner bakery", 50),
    m(1542, "assistant", "he pulls out a wicker chair at one of the small outdoor tables under the shade", 53),
  ];

  test("recognizes mid-message, unpunctuated lets go and the actual bakery arrival", () => {
    const observed = observeDateConversation(dialogue, now);
    expect(observed?.acceptanceId).toBe("1534");
    expect(observed?.locationMode).toBe("place");
    expect(observed?.venueLabel).toBe("Bakery · outdoor terrace");
  });

  test("does not create a Date on the invitation alone", () => {
    expect(observeDateConversation(dialogue.slice(0, 4), now)).toBeNull();
  });

  test("does not start a Date while still getting dressed or showering", () => {
    expect(observeDateConversation([
      m(1, "assistant", "we should get coffee and croissants", 12),
      m(2, "user", "lets go i need to finish showering", 13),
      m(3, "assistant", "take your time, get your towel", 14),
    ], now)).toBeNull();
  });

  test("does not infer walking from a future or fictional plan", () => {
    expect(observeDateConversation([
      m(1, "assistant", "we could go to the bakery for coffee", 12),
      m(2, "user", "maybe let's go tomorrow", 13),
      m(3, "assistant", "he pulls the door shut behind us", 14),
    ], now)).toBeNull();
  });

  test("records walking before venue arrival", () => {
    const observed = observeDateConversation(dialogue.slice(0, 7), now);
    expect(observed?.locationMode).toBe("walking");
    expect(observed?.venueLabel).toBeNull();
  });

  test("does not resurrect yesterday's date", () => {
    const yesterday = dialogue.map((line) => ({
      ...line,
      created_at: new Date(new Date(line.created_at).getTime() - 86_400_000).toISOString(),
    }));
    expect(observeDateConversation(yesterday, now)).toBeNull();
  });

  test("ends on explicit user homecoming, not just Dominic mentioning home", () => {
    const observed = observeDateConversation([...dialogue, m(1546, "user", "we're back home.", 55)], now);
    expect(observed?.finished).toBe(true);
    expect(observed?.acceptanceId).toBe("1534");
  });
});
