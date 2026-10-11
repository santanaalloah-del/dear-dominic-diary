import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { collectChatMenu, menuItemsInText } from "../src/lib/date-chat-menu.ts";
const m = (id: number, content: string, at = "2026-10-11T15:45:00Z", role = "assistant") => ({
  id,
  content,
  created_at: at,
  role,
});
const date: any = {
  id: "date",
  data: {
    flow_state: "live",
    chat_source_message_id: "3",
    date_experience: {
      events: [
        { id: "start", type: "date_started", happenedAt: "2026-10-11T14:50:00Z" },
        {
          id: "arrival",
          type: "arrived",
          placeName: "Bakery · outdoor terrace",
          happenedAt: "2026-10-11T15:39:43.145Z",
        },
      ],
    },
  },
};
const lines = [
  m(
    1,
    "the bakery does almond croissants and strong espresso, or we could hit the café with eggs and fresh toast.",
    "2026-10-11T14:46:00Z",
  ),
  m(
    2,
    "bakery with almond croissants it is. i’m getting an iced americano.",
    "2026-10-11T14:49:00Z",
  ),
  m(3, "lets go!", "2026-10-11T14:50:00Z", "user"),
  m(
    4,
    "i'll get two almond croissants and our coffees. what kind of coffee you want?",
    "2026-10-11T15:39:43.145709Z",
  ),
  m(
    5,
    "they got these warm ham and melted gruyère toasties on sourdough, or scrambled eggs with herbed butter and warm bread. which one before i go order?",
  ),
  m(6, "gruyère toastie it is."),
  m(
    7,
    "*he comes back carrying two glasses of iced coffee and a stand with our order number* toastie and two warm almond croissants on their way. drink some cold brew.",
  ),
];
describe("saved narrative menu", () => {
  it("recovers current options without alternative venue items or invented prices/orders", () => {
    const menu = collectChatMenu(date, lines.slice(0, 6));
    assert.deepEqual(
      menu.stops[0]!.items.map((x) => x.name),
      [
        "almond croissants",
        "strong espresso",
        "iced americano",
        "coffee",
        "warm ham and melted gruyère toasties on sourdough",
        "scrambled eggs with herbed butter and warm bread",
      ],
    );
    assert.equal(menu.stops[0]!.orders.length, 0);
    assert.equal(JSON.stringify(menu).includes("price"), false);
  });
  it("records exact explicit confirmation once and preserves all Date events", () => {
    const snapshot = JSON.stringify(date);
    const menu = collectChatMenu(date, lines);
    assert.equal(menu.stops[0]!.orders.length, 1);
    assert.equal(menu.stops[0]!.orders[0]!.text, lines[6]!.content);
    const withMenu = { ...date, data: { ...date.data, chat_menu: menu } };
    assert.deepEqual(collectChatMenu(withMenu, lines), menu);
    assert.equal(JSON.stringify(date), snapshot);
  });
  it("keeps separate arrival identities and excludes walking messages", () => {
    const moved = structuredClone(date);
    moved.data.date_experience.events.push(
      { id: "left", type: "walking", happenedAt: "2026-10-11T16:00:00Z" },
      { id: "second", type: "arrived", placeName: "Café", happenedAt: "2026-10-11T16:20:00Z" },
    );
    const menu = collectChatMenu(moved, [
      ...lines,
      m(8, "they have blueberry muffins", "2026-10-11T16:10:00Z"),
      m(9, "they have orange juice", "2026-10-11T16:21:00Z"),
    ]);
    assert.equal(
      menu.stops[0]!.items.some((x) => x.name.includes("juice")),
      false,
    );
    assert.deepEqual(
      menu.stops[1]!.items.map((x) => x.name),
      ["orange juice"],
    );
  });
  it("does not use user wishes or future/negated orders as confirmation", () => {
    const menu = collectChatMenu(date, [
      m(1, "i ordered coffee?"),
      m(2, "if i ordered coffee"),
      m(3, "i didn't order coffee"),
      m(4, "i will order coffee"),
      m(5, "i want chocolate muffins", undefined, "user"),
    ]);
    assert.equal(menu.stops[0]!.orders.length, 0);
    assert.equal(
      menu.stops[0]!.items.some((x) => x.name.includes("muffin")),
      false,
    );
  });
  it("does not infer unavailable or imaginary food", () => {
    assert.deepEqual(
      menuItemsInText(
        "they don't have almond croissants. imagine a latte. yesterday we had orange juice.",
      ),
      [],
    );
  });
});
