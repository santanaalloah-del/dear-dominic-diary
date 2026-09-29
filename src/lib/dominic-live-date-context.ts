import { supabase } from "@/integrations/supabase/client";
import { getLiveDateExperience, readDateExperience } from "@/lib/date-experience";
import { readDateVenueWorld } from "@/lib/date-venue-world";
import { readVenueWorldCatalog } from "@/lib/venue-world";

const db = supabase as any;

export type DominicLiveDateContext = {
  active: true;
  dateId: string;
  title: string;
  locationMode: "place" | "walking" | "between_places";
  currentPlaceId: string | null;
  currentPlaceName: string | null;
  venueSourceLabel: string | null;
  availableVenueItems: Array<{
    id: string;
    name: string;
    kind: string;
    section: string;
    priceUsdCents: number | null;
  }>;
  recentEvents: Array<{
    type: string;
    happenedAt: string;
    placeName: string | null;
    note: string | null;
  }>;
  recentVenueActions: Array<{
    actor: "alloah" | "dominic";
    action: "ordered" | "bought";
    itemName: string;
    placeName: string;
    happenedAt: string;
  }>;
};

async function loadCurrentPlace(
  userId: string,
  placeId: string | null
) {
  if (!placeId) return null;

  const { data, error } = await db
    .from("diario_items")
    .select("*")
    .eq("user_id", userId)
    .eq("id", placeId)
    .eq("kind", "place")
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

export async function loadDominicLiveDateContext(
  userId: string
): Promise<DominicLiveDateContext | null> {
  const date = await getLiveDateExperience(userId);
  if (!date) return null;

  const experience = readDateExperience(date);
  const venueWorld = readDateVenueWorld(date);

  const currentPlace =
    experience.currentLocationMode === "walking"
      ? null
      : await loadCurrentPlace(userId, experience.currentPlaceId);

  const catalog = readVenueWorldCatalog(currentPlace);

  return {
    active: true,
    dateId: date.id,
    title: date.title ?? "Our Date",
    locationMode: experience.currentLocationMode,
    currentPlaceId: experience.currentPlaceId,
    currentPlaceName:
      experience.currentLocationMode === "walking"
        ? null
        : experience.currentPlaceName ??
          (typeof date.data?.place === "string" ? date.data.place : null),
    venueSourceLabel: catalog?.sourceLabel ?? null,
    availableVenueItems:
      catalog?.items.map((item) => ({
        id: item.id,
        name: item.name,
        kind: item.kind,
        section: item.section,
        priceUsdCents: item.priceUsdCents ?? null,
      })) ?? [],
    recentEvents: experience.events.slice(-8).map((entry) => ({
      type: entry.type,
      happenedAt: entry.happenedAt,
      placeName: entry.placeName,
      note: entry.note,
    })),
    recentVenueActions: venueWorld.purchases.slice(-8).map((purchase) => ({
      actor: purchase.actor,
      action: purchase.action,
      itemName: purchase.itemName,
      placeName: purchase.placeName,
      happenedAt: purchase.happenedAt,
    })),
  };
}

export function liveDateContextForPrompt(
  context: DominicLiveDateContext | null
): string | null {
  if (!context) return null;

  const place =
    context.locationMode === "walking"
      ? "walking / between places"
      : context.currentPlaceName ?? "together";

  return [
    `[ACTIVE DATE MODE]`,
    `Date: ${context.title}`,
    `Current context: ${place}`,
    `Location mode: ${context.locationMode}`,
    context.venueSourceLabel
      ? `Venue source: ${context.venueSourceLabel}`
      : null,
    context.availableVenueItems.length
      ? `Available venue items: ${context.availableVenueItems
          .map((item) => `${item.name} [id=${item.id}; kind=${item.kind}]`)
          .join(", ")}`
      : `Available venue items: none supplied. Do not invent venue inventory.`,
    context.recentEvents.length
      ? `Recent Date events: ${context.recentEvents
          .map(
            (event) =>
              `${event.type}${event.placeName ? ` (${event.placeName})` : ""}`
          )
          .join(", ")}`
      : null,
    context.recentVenueActions.length
      ? `Recent orders/purchases: ${context.recentVenueActions
          .map(
            (action) =>
              `${action.actor} ${action.action} ${action.itemName} at ${action.placeName}`
          )
          .join(", ")}`
      : null,
    `Treat this as the physical situation Dominic and Alloah are currently sharing. Do not talk as if Dominic is somewhere else unless the conversation explicitly establishes that.`,
    `Only treat the supplied available venue items as actionable inventory. Never invent an item or item ID.`,
  ]
    .filter(Boolean)
    .join("\n");
}
