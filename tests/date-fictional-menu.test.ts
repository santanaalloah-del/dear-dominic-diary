import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  fictionalMenuForStop, menuMentionMatches, readFictionalMenuChoices,
  readFictionalMenuOrders,
} from "../src/lib/date-fictional-menu.ts";
import { collectChatMenu } from "../src/lib/date-chat-menu.ts";

describe("free in-world Date menus", () => {
  it("offers a complete bakery menu even before Dominic mentions an item", () => {
    const menu = fictionalMenuForStop("Bakery · outdoor terrace");
    assert.equal(menu.kind, "bakery");
    assert.ok(menu.items.length >= 20);
    assert.ok(menu.items.some((item) => item.name === "Almond croissant"));
    assert.ok(menu.items.some((item) => item.name === "Iced latte"));
    assert.ok(menu.items.every((item) => !("price" in item)));
    assert.ok(menu.items.every((item) => item.id.startsWith("bakery:")));
  });

  it("uses different templates for later venues without extra AI", () => {
    assert.equal(fictionalMenuForStop("Little Italian Restaurant").kind, "restaurant");
    assert.equal(fictionalMenuForStop("Neighborhood cocktail bar").kind, "bar");
    assert.equal(fictionalMenuForStop("Cinema").kind, "cinema");
    assert.equal(fictionalMenuForStop("Bookshop").kind, "general");
    assert.notDeepEqual(
      fictionalMenuForStop("Cinema").items.map((item) => item.name),
      fictionalMenuForStop("Bakery").items.map((item) => item.name),
    );
  });

  it("recognizes Dominic's variants and keeps fictional selections separate from chat", () => {
    assert.ok(menuMentionMatches("almond croissants", "Almond croissant"));
    assert.ok(menuMentionMatches("warm ham and melted gruyère toasties on sourdough", "Warm ham & Gruyère toastie on sourdough"));
    assert.ok(!menuMentionMatches("espresso", "Orange juice"));
    const date: any = {
      id: "date",
      data: {
        flow_state: "live",
        date_experience: {
          events: [{ id: "arrival", type: "arrived", placeName: "Bakery", happenedAt: "2026-10-11T15:00:00Z" }],
        },
        chat_menu: { version: 1, stops: [{
          id: "arrival", name: "Bakery", items: [], orders: [],
          myPicks: ["bakery:iced-latte"],
          manualOrders: [{ itemId: "bakery:almond-croissant", itemName: "Almond croissant", at: "2026-10-11T15:01:00Z" }],
        }] },
      },
    };
    const original = JSON.stringify(date);
    const replay = collectChatMenu(date, [
      { id: 1, role: "assistant", content: "Almond croissants and iced americano?", created_at: "2026-10-11T15:03:00Z" },
    ]);
    assert.equal(JSON.stringify(date), original);
    assert.deepEqual(readFictionalMenuChoices(replay.stops[0]!), ["bakery:iced-latte"]);
    assert.equal(readFictionalMenuOrders(replay.stops[0]!).length, 1);
    assert.equal(replay.stops[0]!.items.length, 2);
    assert.equal(replay.stops[0]!.orders.length, 0);
  });
});
