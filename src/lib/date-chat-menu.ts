import type { DateChatLine } from "./date-chat-observation";
import type { DiarioItem } from "./diario-world";

type Evidence = { messageId: string; text: string; at: string };
export type ChatMenuItem = { id: string; name: string; evidence: Evidence };
export type ChatMenuStop = {
  id: string;
  name: string;
  items: ChatMenuItem[];
  orders: Evidence[];
};
export type ChatMenu = { version: 1; stops: ChatMenuStop[] };
const key = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/croissants\b/g, "croissant")
    .replace(/toasties\b/g, "toastie")
    .replace(/sandwiches\b/g, "sandwich")
    .replace(/coffees\b/g, "coffee")
    .replace(/\s+/g, " ")
    .trim();

// Deliberately bounded food vocabulary: unknown phrases remain in the evidence,
// never expanded into an invented catalogue or interpreted by a paid model.
const food =
  /\b(?:(?:almond|chocolate|butter|plain)\s+croissants?|(?:(?:iced|hot|strong|decaf)\s+)?(?:americano|espresso|latte|cappuccino|coffees?)|cold brew|(?:warm\s+)?ham and (?:melted\s+)?gruyère toasties?(?: on sourdough)?|gruyère toasties?|scrambled eggs(?: with herbed butter and warm bread)?|(?:(?:chicken|cheese|ham|veggie|grilled cheese)\s+)?sandwiches?|(?:chocolate|blueberry|banana)\s+muffins?|(?:orange|apple)\s+juice|(?:green|black|iced)\s+tea)\b/gi;
const unavailable =
  /\b(?:not|never|don't|didn't|no longer|sold out|out of|don't have|do not have|doesn't have|not available|wish|imagine|remember|hate|dislike|yesterday|tomorrow|at home|used to)\b/i;
export function menuItemsInText(text: string): string[] {
  const names = new Map<string, string>();
  // Only spoken text; stage directions are evidence for orders, not menu items.
  for (const sentence of text.replace(/\*[^*]*\*/g, "").split(/[.!?\n]+/)) {
    if (unavailable.test(sentence)) continue;
    for (const match of sentence.matchAll(food)) {
      const name = match[0];
      names.set(key(name), name);
    }
  }
  return [...names.values()];
}
function sameItem(a: string, b: string): boolean {
  return key(a) === key(b) || (/gruyere toastie/.test(key(a)) && /gruyere toastie/.test(key(b)));
}
export function readChatMenu(date: DiarioItem): ChatMenu {
  const raw = date.data?.chat_menu;
  return raw?.version === 1 && Array.isArray(raw.stops)
    ? (raw as ChatMenu)
    : { version: 1, stops: [] };
}

/** Pure replay into existing arrival IDs. Never creates or edits Date events. */
export function collectChatMenu(date: DiarioItem, messages: DateChatLine[]): ChatMenu {
  const previous = readChatMenu(date);
  const result: ChatMenu = structuredClone(previous);
  const events = date.data?.date_experience?.events ?? [];
  const arrivals = events.filter((e: any) => e.type === "arrived");
  const lines = [...messages].sort(
    (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at) || Number(a.id) - Number(b.id),
  );
  const acceptedIndex = lines.findIndex(
    (m) => String(m.id) === String(date.data?.chat_source_message_id),
  );
  for (const arrival of arrivals) {
    let stop = result.stops.find((s) => s.id === arrival.id);
    if (!stop) {
      stop = { id: arrival.id, name: arrival.placeName ?? "This stop", items: [], orders: [] };
      result.stops.push(stop);
    }
    const eventIndex = events.findIndex((e: any) => e.id === arrival.id);
    const next = events
      .slice(eventIndex + 1)
      .find((e: any) => ["left_place", "walking", "arrived", "date_finished"].includes(e.type));
    const start = Date.parse(arrival.happenedAt);
    const end = next ? Date.parse(next.happenedAt) : Infinity;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      if (line.role !== "assistant") continue;
      const at = Date.parse(line.created_at);
      // First stop can recover the selected venue's options mentioned en route.
      // Never do this for later stops or for unrelated/pre-existing Dates.
      const leadIn =
        arrival === arrivals[0] &&
        acceptedIndex >= 0 &&
        i >= Math.max(0, acceptedIndex - 4) &&
        at < start;
      if (!(at >= start && at < end) && !leadIn) continue;
      let text = line.content;
      if (leadIn) {
        text = text.split(/\bor we could\b/i)[0]!;
        if (!/\b(?:bakery|croissants?|americano)\b/i.test(text) || !/^Bakery\b/.test(stop.name))
          continue;
      }
      const evidence = { messageId: String(line.id), text, at: line.created_at };
      for (const name of menuItemsInText(text)) {
        if (!stop.items.some((item) => sameItem(item.name, name))) {
          stop.items.push({ id: `${arrival.id}:${key(name)}`, name, evidence });
        }
      }
      // Keep the exact confirmation; do not guess actors, quantities or prices.
      // Questions, wishes and future ordering never count as a completed order.
      const confirmed =
        /\b(?:i ordered|we ordered|he ordered|she ordered|our order number|the order number|has placed (?:our|the) order|have placed (?:our|the) order)\b/i.test(
          text,
        );
      if (
        !leadIn &&
        confirmed &&
        !/\b(?:if|imagine|pretend|wish|hadn't|haven't|didn't|not yet|yesterday)\b/i.test(text) &&
        !text.includes("?") &&
        !stop.orders.some((o) => o.messageId === evidence.messageId)
      ) {
        stop.orders.push(evidence);
      }
    }
  }
  return result;
}
