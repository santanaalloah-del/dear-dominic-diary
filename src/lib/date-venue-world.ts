import { supabase } from "@/integrations/supabase/client";
import type { DiarioItem } from "@/lib/diario-world";
import type {
  VenueSourceTier,
  VenueWorldCatalog,
  VenueWorldItem,
} from "@/lib/venue-world";

const db = supabase as any;

export type DateVenueActor = "alloah" | "dominic";
export type DateVenueAction = "ordered" | "bought";

export type DateVenuePurchase = {
  id: string;
  actor: DateVenueActor;
  action: DateVenueAction;
  itemId: string;
  itemName: string;
  itemKind: VenueWorldItem["kind"];
  section: string;
  description: string | null;
  priceUsdCents: number | null;
  sourceTier: VenueSourceTier;
  sourceLabel: string;
  placeId: string;
  placeName: string;
  happenedAt: string;
};

export type DateVenueWorld = {
  schemaVersion: 1;
  purchases: DateVenuePurchase[];
};

function cleanString(value: unknown): string | null {
  return typeof value === "string" ? value.trim() || null : null;
}

function isActor(value: unknown): value is DateVenueActor {
  return value === "alloah" || value === "dominic";
}

function isAction(value: unknown): value is DateVenueAction {
  return value === "ordered" || value === "bought";
}

function readPurchase(value: unknown): DateVenuePurchase | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const raw = value as Record<string, unknown>;
  const id = cleanString(raw.id);
  const actor = raw.actor;
  const action = raw.action;
  const itemId = cleanString(raw.itemId);
  const itemName = cleanString(raw.itemName);
  const itemKind = cleanString(raw.itemKind) as VenueWorldItem["kind"] | null;
  const section = cleanString(raw.section);
  const sourceTier = cleanString(raw.sourceTier) as VenueSourceTier | null;
  const sourceLabel = cleanString(raw.sourceLabel);
  const placeId = cleanString(raw.placeId);
  const placeName = cleanString(raw.placeName);
  const happenedAt = cleanString(raw.happenedAt);

  if (
    !id || !isActor(actor) || !isAction(action) || !itemId || !itemName ||
    !itemKind || !section || !sourceTier || !sourceLabel || !placeId ||
    !placeName || !happenedAt
  ) return null;

  const priceUsdCents =
    typeof raw.priceUsdCents === "number" && Number.isFinite(raw.priceUsdCents)
      ? Math.max(0, Math.round(raw.priceUsdCents))
      : null;

  return {
    id, actor, action, itemId, itemName, itemKind, section,
    description: cleanString(raw.description),
    priceUsdCents, sourceTier, sourceLabel, placeId, placeName, happenedAt,
  };
}

export function readDateVenueWorld(date: DiarioItem | null): DateVenueWorld {
  const raw = date?.data?.venueWorld;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { schemaVersion: 1, purchases: [] };
  }

  const value = raw as Record<string, unknown>;
  const purchases = Array.isArray(value.purchases)
    ? value.purchases.map(readPurchase).filter(
        (purchase): purchase is DateVenuePurchase => purchase !== null
      )
    : [];

  return { schemaVersion: 1, purchases };
}

async function persistDateVenueWorld({
  userId, date, venueWorld,
}: {
  userId: string;
  date: DiarioItem;
  venueWorld: DateVenueWorld;
}): Promise<DiarioItem> {
  const { data, error } = await db
    .from("diario_items")
    .update({ data: { ...(date.data ?? {}), venueWorld } })
    .eq("user_id", userId)
    .eq("id", date.id)
    .eq("kind", "date")
    .select("*")
    .single();

  if (error) throw error;
  return data as DiarioItem;
}

export function venueItemAction(item: VenueWorldItem): DateVenueAction {
  return ["food", "drink", "dessert", "snack"].includes(item.kind)
    ? "ordered"
    : "bought";
}

export function dateVenueActionLabel(purchase: DateVenuePurchase): string {
  const person = purchase.actor === "dominic" ? "Dominic" : "You";
  return purchase.action === "ordered"
    ? `${person} ordered`
    : `${person} bought`;
}

export function venueItemActionLabel(item: VenueWorldItem): string {
  return venueItemAction(item) === "ordered" ? "Order" : "Buy";
}

export function findDateVenuePurchase({
  date, placeId, itemId, actor,
}: {
  date: DiarioItem;
  placeId: string;
  itemId: string;
  actor: DateVenueActor;
}): DateVenuePurchase | null {
  return readDateVenueWorld(date).purchases.find(
    (purchase) =>
      purchase.placeId === placeId &&
      purchase.itemId === itemId &&
      purchase.actor === actor
  ) ?? null;
}

export async function recordDateVenuePurchase({
  userId, date, place, catalog, item, actor,
}: {
  userId: string;
  date: DiarioItem;
  place: DiarioItem;
  catalog: VenueWorldCatalog;
  item: VenueWorldItem;
  actor: DateVenueActor;
}): Promise<DiarioItem> {
  const current = readDateVenueWorld(date);

  const existing = current.purchases.find(
    (purchase) =>
      purchase.actor === actor &&
      purchase.itemId === item.id &&
      purchase.placeId === place.id
  );
  if (existing) return date;

  const purchase: DateVenuePurchase = {
    id: crypto.randomUUID(),
    actor,
    action: venueItemAction(item),
    itemId: item.id,
    itemName: item.name,
    itemKind: item.kind,
    section: item.section,
    description: item.description ?? null,
    priceUsdCents: item.priceUsdCents ?? null,
    sourceTier: catalog.sourceTier,
    sourceLabel: catalog.sourceLabel,
    placeId: place.id,
    placeName: place.title ?? "Untitled place",
    happenedAt: new Date().toISOString(),
  };

  return persistDateVenueWorld({
    userId,
    date,
    venueWorld: {
      schemaVersion: 1,
      purchases: [...current.purchases, purchase],
    },
  });
}

export async function removeDateVenuePurchase({
  userId, date, purchaseId,
}: {
  userId: string;
  date: DiarioItem;
  purchaseId: string;
}): Promise<DiarioItem> {
  const current = readDateVenueWorld(date);
  const nextPurchases = current.purchases.filter(
    (purchase) => purchase.id !== purchaseId
  );

  if (nextPurchases.length === current.purchases.length) return date;

  return persistDateVenueWorld({
    userId,
    date,
    venueWorld: { schemaVersion: 1, purchases: nextPurchases },
  });
}

export function dateVenueTotal(date: DiarioItem): number {
  return readDateVenueWorld(date).purchases.reduce(
    (total, purchase) => total + (purchase.priceUsdCents ?? 0),
    0
  );
}

export function dateVenueActorTotal(
  date: DiarioItem,
  actor: DateVenueActor
): number {
  return readDateVenueWorld(date).purchases
    .filter((purchase) => purchase.actor === actor)
    .reduce(
      (total, purchase) => total + (purchase.priceUsdCents ?? 0),
      0
    );
}


export function dateVenuePurchaseLifecycle(
  purchase: DateVenuePurchase
): "kept" | "consumed" {
  return purchase.action === "ordered"
    ? "consumed"
    : "kept";
}

export async function materializeDateVenuePurchase({
  userId,
  date,
  purchase,
}: {
  userId: string;
  date: DiarioItem;
  purchase: DateVenuePurchase;
}): Promise<DiarioItem> {
  const { data: existing, error: existingError } = await db
    .from("diario_items")
    .select("*")
    .eq("user_id", userId)
    .eq("kind", "keepsake")
    .eq("status", "active")
    .eq("data->>source_purchase_id", purchase.id)
    .maybeSingle();

  if (existingError) throw existingError;

  let keepsake = existing as DiarioItem | null;

  if (!keepsake) {
    const lifecycle = dateVenuePurchaseLifecycle(purchase);

    const { data: created, error: createError } = await db
      .from("diario_items")
      .insert({
        user_id: userId,
        kind: "keepsake",
        owner: "shared",
        status: "active",
        title: purchase.itemName,
        body: purchase.description,
        event_at: purchase.happenedAt,
        data: {
          keepsakeType: purchase.itemKind,
          location: lifecycle === "consumed" ? "gone" : "home",
          room: null,
          origin: purchase.placeName,
          source_date_id: date.id,
          source_purchase_id: purchase.id,
          consumed: lifecycle === "consumed",
          date_venue_action: purchase.action,
          price_usd_cents: purchase.priceUsdCents,
        },
      })
      .select("*")
      .single();

    if (createError) throw createError;
    keepsake = created as DiarioItem;
  }

  const { error: linkError } = await db
    .from("diario_links")
    .upsert(
      {
        user_id: userId,
        source_item_id: date.id,
        target_item_id: keepsake.id,
        relation: "contains",
        data: {
          source: "date_venue",
          purchase_id: purchase.id,
        },
      },
      {
        onConflict:
          "user_id,source_item_id,target_item_id,relation",
      }
    );

  if (linkError) throw linkError;

  return keepsake;
}
