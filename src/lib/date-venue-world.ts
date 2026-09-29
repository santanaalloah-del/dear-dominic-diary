import { supabase } from "@/integrations/supabase/client";

import type {
  DiarioItem,
} from "@/lib/diario-world";

import type {
  VenueSourceTier,
  VenueWorldCatalog,
  VenueWorldItem,
} from "@/lib/venue-world";

const db = supabase as any;

export type DateVenueActor =
  | "alloah"
  | "dominic";

export type DateVenueAction =
  | "ordered"
  | "bought";

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

function cleanString(
  value: unknown
): string | null {
  return typeof value === "string"
    ? value.trim() || null
    : null;
}

function isActor(
  value: unknown
): value is DateVenueActor {
  return (
    value === "alloah" ||
    value === "dominic"
  );
}

function isAction(
  value: unknown
): value is DateVenueAction {
  return (
    value === "ordered" ||
    value === "bought"
  );
}

function readPurchase(
  value: unknown
): DateVenuePurchase | null {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return null;
  }

  const raw =
    value as Record<
      string,
      unknown
    >;

  const id =
    cleanString(
      raw.id
    );

  const actor =
    raw.actor;

  const action =
    raw.action;

  const itemId =
    cleanString(
      raw.itemId
    );

  const itemName =
    cleanString(
      raw.itemName
    );

  const itemKind =
    cleanString(
      raw.itemKind
    ) as
      | VenueWorldItem["kind"]
      | null;

  const section =
    cleanString(
      raw.section
    );

  const sourceTier =
    cleanString(
      raw.sourceTier
    ) as
      | VenueSourceTier
      | null;

  const sourceLabel =
    cleanString(
      raw.sourceLabel
    );

  const placeId =
    cleanString(
      raw.placeId
    );

  const placeName =
    cleanString(
      raw.placeName
    );

  const happenedAt =
    cleanString(
      raw.happenedAt
    );

  if (
    !id ||
    !isActor(actor) ||
    !isAction(action) ||
    !itemId ||
    !itemName ||
    !itemKind ||
    !section ||
    !sourceTier ||
    !sourceLabel ||
    !placeId ||
    !placeName ||
    !happenedAt
  ) {
    return null;
  }

  const priceUsdCents =
    typeof raw.priceUsdCents ===
      "number" &&
    Number.isFinite(
      raw.priceUsdCents
    )
      ? Math.max(
          0,
          Math.round(
            raw.priceUsdCents
          )
        )
      : null;

  return {
    id,

    actor,

    action,

    itemId,

    itemName,

    itemKind,

    section,

    description:
      cleanString(
        raw.description
      ),

    priceUsdCents,

    sourceTier,

    sourceLabel,

    placeId,

    placeName,

    happenedAt,
  };
}

export function readDateVenueWorld(
  date: DiarioItem | null
): DateVenueWorld {
  const raw =
    date?.data
      ?.venueWorld;

  if (
    !raw ||
    typeof raw !== "object" ||
    Array.isArray(raw)
  ) {
    return {
      schemaVersion: 1,
      purchases: [],
    };
  }

  const value =
    raw as Record<
      string,
      unknown
    >;

  const purchases =
    Array.isArray(
      value.purchases
    )
      ? value.purchases
          .map(
            readPurchase
          )
          .filter(
            (
              purchase
            ): purchase is DateVenuePurchase =>
              purchase !==
              null
          )
      : [];

  return {
    schemaVersion: 1,
    purchases,
  };
}

async function persistDateVenueWorld({
  userId,
  date,
  venueWorld,
}: {
  userId: string;

  date: DiarioItem;

  venueWorld: DateVenueWorld;
}): Promise<DiarioItem> {
  const {
    data,
    error,
  } =
    await db
      .from(
        "diario_items"
      )
      .update({
        data: {
          ...(
            date.data ??
            {}
          ),

          venueWorld,
        },
      })
      .eq(
        "user_id",
        userId
      )
      .eq(
        "id",
        date.id
      )
      .eq(
        "kind",
        "date"
      )
      .select
