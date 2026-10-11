import { supabase } from "@/integrations/supabase/client";
import type { DiarioItem } from "./diario-world";
import { readChatMenu, type ChatMenuStop } from "./date-chat-menu";
import { readDateExperience } from "./date-experience";

export type FictionalMenuItem = { id: string; name: string; description: string; section: string };
export type FictionalMenuTemplate = { kind: string; title: string; items: FictionalMenuItem[] };
export type FictionalMenuOrder = { itemId: string; itemName: string; at: string };
type MenuItemTuple = [string, string, string];

const templates: Record<string, { title: string; sections: Record<string, MenuItemTuple[]> }> = {
  bakery: {
    title: "Our little café",
    sections: {
      "From the oven": [
        ["almond-croissant", "Almond croissant", "Buttery layers, almond cream and a dusting of sugar."],
        ["butter-croissant", "Butter croissant", "Golden, flaky and still warm."],
        ["pain-au-chocolat", "Pain au chocolat", "Flaky pastry with dark chocolate tucked inside."],
        ["cinnamon-roll", "Cinnamon roll", "Soft, fragrant spirals with a little glaze."],
        ["blueberry-muffin", "Blueberry muffin", "Tender crumb and blueberries."],
        ["lemon-loaf", "Lemon loaf", "A bright slice with a delicate citrus glaze."],
        ["chocolate-cookie", "Chocolate cookie", "Soft-centered with pockets of chocolate."],
      ],
      "Coffee & drinks": [
        ["espresso", "Strong espresso", "A short, rich shot."],
        ["iced-americano", "Iced americano", "Espresso poured over cool water and ice."],
        ["coffee", "Coffee", "Freshly brewed, simple and comforting."],
        ["cold-brew", "Cold brew", "Slow-steeped, smooth and cold."],
        ["cappuccino", "Cappuccino", "Espresso under a cloud of warm milk foam."],
        ["iced-latte", "Iced latte", "Espresso, milk and plenty of ice."],
        ["hot-chocolate", "Hot chocolate", "Warm, rich and not too sweet."],
        ["orange-juice", "Orange juice", "Bright and freshly squeezed."],
        ["tea", "Tea", "A quiet pot of black or herbal tea."],
      ],
      "From the kitchen": [
        ["ham-gruyere-toastie", "Warm ham & Gruyère toastie on sourdough", "Warm ham and melted Gruyère on toasted sourdough."],
        ["scrambled-eggs", "Scrambled eggs with herbed butter & warm bread", "Soft eggs, herbed butter and a warm slice."],
        ["avocado-toast", "Avocado toast", "Sourdough, lemon, herbs and a little crunch."],
        ["breakfast-sandwich", "Breakfast sandwich", "Egg, cheese and a toasted roll."],
        ["grilled-cheese", "Grilled cheese", "Melted cheese between crisp sourdough slices."],
        ["yogurt-bowl", "Yogurt & fruit bowl", "Creamy yogurt, fruit and toasted granola."],
      ],
    },
  },
  restaurant: {
    title: "The house menu",
    sections: {
      "To begin": [
        ["bread", "Warm bread & butter", "A little basket to share."],
        ["tomato-salad", "Heirloom tomato salad", "Tomatoes, basil and olive oil."],
        ["crispy-potatoes", "Crispy potatoes", "Golden potatoes with herbed dip."],
      ],
      "From the kitchen": [
        ["house-pasta", "House pasta", "A comforting pasta with the house sauce."],
        ["roasted-chicken", "Roasted chicken", "Herbs, pan juices and seasonal vegetables."],
        ["mushroom-risotto", "Mushroom risotto", "Slow-stirred rice with mushrooms."],
        ["grilled-cheese-sandwich", "Toasted cheese & tomato sandwich", "Crisp bread and a melty filling."],
      ],
      "Something sweet": [
        ["chocolate-cake", "Chocolate cake", "A rich slice to finish."],
        ["creme-brulee", "Crème brûlée", "Vanilla custard with a crisp sugar top."],
      ],
      "To drink": [
        ["sparkling-lemonade", "Sparkling lemonade", "Lemon, bubbles and plenty of ice."],
        ["iced-tea", "Iced tea", "A tall chilled glass."],
        ["espresso", "Espresso", "A little after-dinner coffee."],
      ],
    },
  },
  bar: {
    title: "Drinks & little bites",
    sections: {
      "A drink for the evening": [
        ["citrus-spritz", "Citrus spritz", "A light sparkling citrus cocktail."],
        ["ginger-highball", "Ginger highball", "Bright ginger and ice."],
        ["house-mocktail", "House mocktail", "Seasonal fruit and sparkling water."],
        ["iced-tea", "Iced tea", "A refreshing glass with lemon."],
        ["sparkling-water", "Sparkling water", "Chilled with a slice of citrus."],
      ],
      "To share": [
        ["fries", "Crispy fries", "Hot, salted and perfect for sharing."],
        ["olives", "Marinated olives", "Olives, citrus peel and herbs."],
        ["grilled-cheese", "Grilled cheese bites", "Small toasted cheese sandwiches."],
        ["flatbread", "Tomato & basil flatbread", "Crisp edges and fresh herbs."],
      ],
    },
  },
  cinema: {
    title: "The cinema counter",
    sections: {
      "For the film": [
        ["butter-popcorn", "Butter popcorn", "Warm popcorn with buttery salt."],
        ["sweet-popcorn", "Sweet popcorn", "A little sweetness for the screening."],
        ["chocolate", "Chocolate", "Something small for the second act."],
        ["gummies", "Fruit gummies", "Soft, bright little sweets."],
      ],
      "To drink": [
        ["soda", "Soda", "A cold fountain drink."],
        ["lemonade", "Lemonade", "Lemon, sugar and ice."],
        ["water", "Bottled water", "Still water for the movie."],
      ],
    },
  },
  general: {
    title: "A little in-world menu",
    sections: {
      "Something small": [
        ["pastry", "Fresh pastry", "A little bite for the visit."],
        ["sandwich", "Toasted sandwich", "A warm, simple sandwich."],
        ["cookie", "Chocolate cookie", "Something sweet."],
      ],
      "To drink": [
        ["coffee", "Coffee", "A warm cup."],
        ["tea", "Tea", "A little pause."],
        ["water", "Water", "Something refreshing."],
      ],
    },
  },
};

export function fictionalMenuForStop(placeName: string): FictionalMenuTemplate {
  const name = placeName.toLowerCase();
  const kind = /(?:bakery|café|cafe|coffee|brunch|patisserie|pastry|boulangerie)/.test(name) ? "bakery"
    : /(?:bar|pub|lounge|cocktail)/.test(name) ? "bar"
    : /(?:cinema|theater|theatre|movie)/.test(name) ? "cinema"
    : /(?:restaurant|bistro|diner|trattoria|dining|pizzeria)/.test(name) ? "restaurant"
    : "general";
  const template = templates[kind]!;
  return {
    kind, title: template.title,
    items: Object.entries(template.sections).flatMap(([section, entries]) =>
      entries.map(([slug, name, description]) =>
        ({ id: kind + ":" + slug, name, description, section }))),
  };
}

export function normalizeMenuName(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/&/g, "and").replace(/\b(?:warm|melted|strong|herbed)\b/g, "")
    .replace(/\btoasties\b/g, "toastie").replace(/\bcroissants\b/g, "croissant")
    .replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}
export function menuMentionMatches(a: string, b: string): boolean {
  const x = normalizeMenuName(a), y = normalizeMenuName(b);
  return x === y ||
    (x.includes("gruyere") && y.includes("gruyere") && x.includes("toastie") && y.includes("toastie")) ||
    (x.startsWith("scrambled eggs") && y.startsWith("scrambled eggs"));
}
export function readFictionalMenuChoices(stop: ChatMenuStop): string[] {
  return Array.isArray(stop.myPicks) ? stop.myPicks.filter((x): x is string => typeof x === "string") : [];
}
export function readFictionalMenuOrders(stop: ChatMenuStop): FictionalMenuOrder[] {
  return Array.isArray(stop.manualOrders)
    ? stop.manualOrders.filter((x): x is FictionalMenuOrder =>
        !!x && typeof x.itemId === "string" && typeof x.itemName === "string" && typeof x.at === "string")
    : [];
}
export type FictionalMenuAction = "toggle_pick" | "confirm_order" | "undo_order";

/** CAS protects the live Date event history from concurrent chat / movement updates. */
export async function updateFictionalMenuChoice({
  userId, dateId, stopId, item, action,
}: {
  userId: string; dateId: string; stopId: string; item: FictionalMenuItem; action: FictionalMenuAction;
}): Promise<DiarioItem> {
  const db = supabase as any;
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data, error } = await db.from("diario_items").select("*")
      .eq("user_id", userId).eq("kind", "date").eq("status", "active")
      .eq("id", dateId).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("This Date is no longer available.");
    const date = data as DiarioItem;
    const experience = readDateExperience(date);
    const arrived = experience.events.find((e) => e.type === "arrived" && e.id === stopId);
    if (!arrived || date.data?.flow_state !== "live" ||
        experience.currentLocationMode !== "place" ||
        [...experience.events].reverse().find((e) => e.type === "arrived")?.id !== stopId) {
      throw new Error("This stop is no longer the current place.");
    }
    const template = fictionalMenuForStop(arrived.placeName || "This stop");
    if (!template.items.some((candidate) => candidate.id === item.id && candidate.name === item.name)) {
      throw new Error("This option is not on the current fictional menu.");
    }
    const menu = structuredClone(readChatMenu(date));
    let stop = menu.stops.find((entry) => entry.id === stopId);
    if (!stop) {
      stop = { id: stopId, name: arrived.placeName || "This stop", items: [], orders: [] };
      menu.stops.push(stop);
    }
    const picks = readFictionalMenuChoices(stop);
    const orders = readFictionalMenuOrders(stop);
    if (action === "toggle_pick") {
      stop.myPicks = picks.includes(item.id) ? picks.filter((id) => id !== item.id) : [...picks, item.id];
    } else if (action === "confirm_order") {
      if (orders.some((entry) => entry.itemId === item.id)) return date;
      stop.manualOrders = [...orders, { itemId: item.id, itemName: item.name, at: new Date().toISOString() }];
      stop.myPicks = picks.filter((id) => id !== item.id);
    } else {
      stop.manualOrders = orders.filter((entry) => entry.itemId !== item.id);
    }
    const { data: updated, error: writeError } = await db.from("diario_items")
      .update({ data: { ...(date.data ?? {}), chat_menu: menu } })
      .eq("user_id", userId).eq("kind", "date").eq("id", dateId)
      .eq("updated_at", date.updated_at).select("*").maybeSingle();
    if (writeError) throw writeError;
    if (updated) return updated as DiarioItem;
  }
  throw new Error("The Date was updated while you were choosing. Please try again.");
}
