import { supabase } from "@/integrations/supabase/client";
import type { DiarioItem } from "@/lib/diario-world";
import type { DiscoveredPlace } from "@/lib/nyc-place-discovery";

const db = supabase as any;

export type VenueSourceTier =
  | "real_live"
  | "real_reference"
  | "in_world";

export type VenueWorldItemKind =
  | "drink"
  | "food"
  | "dessert"
  | "snack"
  | "product"
  | "clothing"
  | "accessory"
  | "souvenir"
  | "ticket"
  | "activity"
  | "other";

export type VenueWorldItem = {
  id: string;
  section: string;
  name: string;
  description: string | null;
  kind: VenueWorldItemKind;
  priceUsdCents: number | null;
  sourceTier: VenueSourceTier;
};

export type VenueWorldDominicPick = {
  itemId: string;
  note: string | null;
};

export type VenueWorldCatalog = {
  schemaVersion: 2;

  sourceTier: VenueSourceTier;
  sourceLabel: string;
  sourceUrl: string | null;
  notice: string;
  generatedAt: string;

  items: VenueWorldItem[];

  dominicPicks: VenueWorldDominicPick[];

  alloahPickIds: string[];
};

export type VenueWorldPlaceContext = {
  name: string;
  placeType: string;
  neighborhood: string | null;
  address: string | null;
  categories: string[];
  cuisine: string | null;
  description: string | null;
};

function cleanString(
  value: unknown
): string | null {
  return typeof value === "string"
    ? value.trim() || null
    : null;
}

function uniqueStrings(
  values: string[]
) {
  return Array.from(
    new Set(values)
  );
}

function readItem(
  value: unknown
): VenueWorldItem | null {
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
    cleanString(raw.id);

  const section =
    cleanString(raw.section);

  const name =
    cleanString(raw.name);

  const kind =
    cleanString(
      raw.kind
    ) as
      | VenueWorldItemKind
      | null;

  const sourceTier =
    cleanString(
      raw.sourceTier
    ) as
      | VenueSourceTier
      | null;

  if (
    !id ||
    !section ||
    !name ||
    !kind ||
    !sourceTier
  ) {
    return null;
  }

  const price =
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
    section,
    name,

    description:
      cleanString(
        raw.description
      ),

    kind,

    priceUsdCents:
      price,

    sourceTier,
  };
}

function readDominicPick(
  value: unknown
): VenueWorldDominicPick | null {
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

  const itemId =
    cleanString(
      raw.itemId
    );

  if (!itemId) {
    return null;
  }

  return {
    itemId,

    note:
      cleanString(
        raw.note
      ),
  };
}

function readAlloahPickIds(
  value: Record<
    string,
    unknown
  >
) {
  const modern =
    Array.isArray(
      value.alloahPickIds
    )
      ? value.alloahPickIds
          .map(cleanString)
          .filter(
            (
              item
            ): item is string =>
              item !== null
          )
      : [];

  if (modern.length) {
    return uniqueStrings(
      modern
    );
  }

  /*
   * Backwards compatibility:
   * Venue World v1 stored one choice
   * as alloahPickId.
   */
  const legacy =
    cleanString(
      value.alloahPickId
    );

  return legacy
    ? [legacy]
    : [];
}

function readDominicPicks(
  value: Record<
    string,
    unknown
  >
) {
  const modern =
    Array.isArray(
      value.dominicPicks
    )
      ? value.dominicPicks
          .map(
            readDominicPick
          )
          .filter(
            (
              pick
            ): pick is VenueWorldDominicPick =>
              pick !== null
          )
      : [];

  if (modern.length) {
    const seen =
      new Set<string>();

    return modern.filter(
      (pick) => {
        if (
          seen.has(
            pick.itemId
          )
        ) {
          return false;
        }

        seen.add(
          pick.itemId
        );

        return true;
      }
    );
  }

  /*
   * Backwards compatibility:
   * Venue World v1 stored only
   * one Dominic choice.
   */
  const legacy =
    readDominicPick(
      value.dominicPick
    );

  return legacy
    ? [legacy]
    : [];
}

export function readVenueWorldCatalog(
  place: DiarioItem | null
): VenueWorldCatalog | null {
  const raw =
    place?.data
      ?.venueWorld;

  if (
    !raw ||
    typeof raw !== "object" ||
    Array.isArray(raw)
  ) {
    return null;
  }

  const value =
    raw as Record<
      string,
      unknown
    >;

  const items =
    Array.isArray(
      value.items
    )
      ? value.items
          .map(readItem)
          .filter(
            (
              item
            ): item is VenueWorldItem =>
              item !== null
          )
      : [];

  const sourceTier =
    cleanString(
      value.sourceTier
    ) as
      | VenueSourceTier
      | null;

  const sourceLabel =
    cleanString(
      value.sourceLabel
    );

  const notice =
    cleanString(
      value.notice
    );

  const generatedAt =
    cleanString(
      value.generatedAt
    );

  if (
    !sourceTier ||
    !sourceLabel ||
    !notice ||
    !generatedAt ||
    !items.length
  ) {
    return null;
  }

  const itemIds =
    new Set(
      items.map(
        (item) =>
          item.id
      )
    );

  const dominicPicks =
    readDominicPicks(
      value
    ).filter(
      (pick) =>
        itemIds.has(
          pick.itemId
        )
    );

  const alloahPickIds =
    readAlloahPickIds(
      value
    ).filter(
      (itemId) =>
        itemIds.has(
          itemId
        )
    );

  return {
    schemaVersion: 2,

    sourceTier,

    sourceLabel,

    sourceUrl:
      cleanString(
        value.sourceUrl
      ),

    notice,

    generatedAt,

    items,

    dominicPicks,

    alloahPickIds,
  };
}

export async function persistVenueWorldCatalog({
  userId,
  place,
  catalog,
}: {
  userId: string;
  place: DiarioItem;
  catalog: VenueWorldCatalog;
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
            place.data ??
            {}
          ),

          venueWorld:
            catalog,
        },
      })
      .eq(
        "user_id",
        userId
      )
      .eq(
        "id",
        place.id
      )
      .eq(
        "kind",
        "place"
      )
      .select("*")
      .single();

  if (error) {
    throw error;
  }

  return data as DiarioItem;
}

export async function toggleVenueWorldAlloahPick({
  userId,
  place,
  catalog,
  itemId,
}: {
  userId: string;
  place: DiarioItem;
  catalog: VenueWorldCatalog;
  itemId: string;
}): Promise<DiarioItem> {
  const alreadyPicked =
    catalog.alloahPickIds.includes(
      itemId
    );

  const alloahPickIds =
    alreadyPicked
      ? catalog.alloahPickIds.filter(
          (currentId) =>
            currentId !==
            itemId
        )
      : [
          ...catalog.alloahPickIds,
          itemId,
        ];

  return persistVenueWorldCatalog({
    userId,
    place,

    catalog: {
      ...catalog,
      alloahPickIds,
    },
  });
}

export async function setVenueWorldAlloahPicks({
  userId,
  place,
  catalog,
  itemIds,
}: {
  userId: string;
  place: DiarioItem;
  catalog: VenueWorldCatalog;
  itemIds: string[];
}): Promise<DiarioItem> {
  const validIds =
    new Set(
      catalog.items.map(
        (item) =>
          item.id
      )
    );

  return persistVenueWorldCatalog({
    userId,
    place,

    catalog: {
      ...catalog,

      alloahPickIds:
        uniqueStrings(
          itemIds
        ).filter(
          (itemId) =>
            validIds.has(
              itemId
            )
        ),
    },
  });
}

export async function setVenueWorldDominicPicks({
  userId,
  place,
  catalog,
  picks,
}: {
  userId: string;
  place: DiarioItem;
  catalog: VenueWorldCatalog;
  picks: VenueWorldDominicPick[];
}): Promise<DiarioItem> {
  const validIds =
    new Set(
      catalog.items.map(
        (item) =>
          item.id
      )
    );

  const seen =
    new Set<string>();

  const dominicPicks =
    picks.filter(
      (pick) => {
        if (
          !validIds.has(
            pick.itemId
          ) ||
          seen.has(
            pick.itemId
          )
        ) {
          return false;
        }

        seen.add(
          pick.itemId
        );

        return true;
      }
    );

  return persistVenueWorldCatalog({
    userId,
    place,

    catalog: {
      ...catalog,
      dominicPicks,
    },
  });
}

export function venueWorldPlaceContext({
  place,
  cuisine,
  description,
}: {
  place: DiscoveredPlace;
  cuisine?: string | null;
  description?: string | null;
}): VenueWorldPlaceContext {
  return {
    name:
      place.name,

    placeType:
      place.placeType,

    neighborhood:
      place.neighborhood ||
      null,

    address:
      place.address ||
      null,

    categories:
      place.categories,

    cuisine:
      cuisine?.trim() ||
      null,

    description:
      description?.trim() ||
      null,
  };
}

function item(
  id: string,
  section: string,
  name: string,
  description: string,
  kind: VenueWorldItemKind,
  priceUsdCents: number
): VenueWorldItem {
  return {
    id,
    section,
    name,
    description,
    kind,
    priceUsdCents,
    sourceTier:
      "in_world",
  };
}

export function localInspiredVenueCatalog(
  place: VenueWorldPlaceContext
): VenueWorldCatalog {
  const type =
    place.placeType
      .toLowerCase();

  let items:
    VenueWorldItem[];

  if (
    type ===
    "cafe"
  ) {
    items = [
      item(
        "fallback-1",
        "Coffee",
        "Iced latte",
        "Espresso, milk and ice.",
        "drink",
        650
      ),

      item(
        "fallback-2",
        "Coffee",
        "Cold brew",
        "Slow-brewed coffee over ice.",
        "drink",
        575
      ),

      item(
        "fallback-3",
        "Coffee",
        "Matcha latte",
        "Creamy matcha, hot or iced.",
        "drink",
        700
      ),

      item(
        "fallback-4",
        "Bakery",
        "Butter croissant",
        "Flaky pastry for something small.",
        "food",
        475
      ),

      item(
        "fallback-5",
        "Bakery",
        "Chocolate cookie",
        "Soft-centered chocolate cookie.",
        "dessert",
        425
      ),

      item(
        "fallback-6",
        "Food",
        "Breakfast sandwich",
        "Egg, cheese and a warm roll.",
        "food",
        875
      ),
    ];
  } else if (
    type ===
    "restaurant"
  ) {
    items = [
      item(
        "fallback-1",
        "Starters",
        "Crispy potatoes",
        "Golden potatoes with a house-style dip.",
        "food",
        1100
      ),

      item(
        "fallback-2",
        "Starters",
        "Seasonal salad",
        "A bright seasonal starter.",
        "food",
        1250
      ),

      item(
        "fallback-3",
        "Mains",
        "House pasta",
        "A comforting pasta inspired by the setting.",
        "food",
        2400
      ),

      item(
        "fallback-4",
        "Mains",
        "Roasted chicken plate",
        "Roasted chicken with a simple side.",
        "food",
        2600
      ),

      item(
        "fallback-5",
        "Drinks",
        "Sparkling lemonade",
        "Citrus, bubbles and ice.",
        "drink",
        700
      ),

      item(
        "fallback-6",
        "Dessert",
        "Chocolate dessert",
        "A rich chocolate finish to share or keep.",
        "dessert",
        1050
      ),
    ];
  } else if (
    type ===
      "museum" ||
    type ===
      "gallery"
  ) {
    items = [
      item(
        "fallback-1",
        "Visit",
        "General admission",
        "An in-world admission option for the visit.",
        "ticket",
        2500
      ),

      item(
        "fallback-2",
        "Gift shop",
        "Exhibition postcard",
        "A postcard inspired by the visit.",
        "souvenir",
        350
      ),

      item(
        "fallback-3",
        "Gift shop",
        "Art print",
        "A small print to take home.",
        "souvenir",
        1800
      ),

      item(
        "fallback-4",
        "Gift shop",
        "Museum tote",
        "A simple canvas tote.",
        "accessory",
        2400
      ),

      item(
        "fallback-5",
        "Gift shop",
        "Exhibition book",
        "A compact art book inspired by the venue.",
        "product",
        3200
      ),

      item(
        "fallback-6",
        "Café",
        "Coffee and pastry",
        "A small break during the visit.",
        "food",
        1200
      ),
    ];
  } else if (
    type ===
    "cinema"
  ) {
    items = [
      item(
        "fallback-1",
        "Tickets",
        "Movie ticket",
        "An in-world standard screening ticket.",
        "ticket",
        1900
      ),

      item(
        "fallback-2",
        "Snacks",
        "Popcorn",
        "Classic movie popcorn.",
        "snack",
        950
      ),

      item(
        "fallback-3",
        "Snacks",
        "Candy",
        "Something sweet for the movie.",
        "snack",
        650
      ),

      item(
        "fallback-4",
        "Drinks",
        "Soda",
        "A cold fountain drink.",
        "drink",
        650
      ),

      item(
        "fallback-5",
        "Drinks",
        "Bottled water",
        "Still water for the screening.",
        "drink",
        450
      ),

      item(
        "fallback-6",
        "Extras",
        "Movie poster print",
        "A small in-world souvenir print.",
        "souvenir",
        1600
      ),
    ];
  } else if (
    type ===
    "store"
  ) {
    items = [
      item(
        "fallback-1",
        "Clothing",
        "Soft graphic tee",
        "An easy everyday tee inspired by the shop.",
        "clothing",
        3200
      ),

      item(
        "fallback-2",
        "Clothing",
        "Cardigan",
        "A soft layering piece.",
        "clothing",
        6800
      ),

      item(
        "fallback-3",
        "Accessories",
        "Canvas tote",
        "A simple carry-everywhere tote.",
        "accessory",
        2600
      ),

      item(
        "fallback-4",
        "Accessories",
        "Small hair clip",
        "A small accessory for the day.",
        "accessory",
        1400
      ),

      item(
        "fallback-5",
        "Objects",
        "Mini candle",
        "A small scented object for home.",
        "product",
        2200
      ),

      item(
        "fallback-6",
        "Objects",
        "Postcard set",
        "A little paper souvenir from the stop.",
        "souvenir",
        1200
      ),
    ];
  } else {
    items = [
      item(
        "fallback-1",
        "Things to do",
        "Entry",
        "An in-world entry option for this place.",
        "ticket",
        1800
      ),

      item(
        "fallback-2",
        "Things to do",
        "Small activity",
        "A simple activity inspired by the venue.",
        "activity",
        1500
      ),

      item(
        "fallback-3",
        "Food & drink",
        "Coffee",
        "A coffee break while you're here.",
        "drink",
        550
      ),

      item(
        "fallback-4",
        "Food & drink",
        "Small snack",
        "Something quick to share or keep.",
        "snack",
        650
      ),

      item(
        "fallback-5",
        "Souvenirs",
        "Postcard",
        "A tiny reminder of the stop.",
        "souvenir",
        350
      ),

      item(
        "fallback-6",
        "Souvenirs",
        "Tote",
        "A simple in-world venue tote.",
        "accessory",
        2200
      ),
    ];
  }

  return {
    schemaVersion: 2,

    sourceTier:
      "in_world",

    sourceLabel:
      "Inspired by this place",

    sourceUrl:
      null,

    notice:
      "This selection is part of your in-world date experience. It is not a claim about the venue's current real menu, stock or prices.",

    generatedAt:
      new Date()
        .toISOString(),

    items,

    dominicPicks:
      [],

    alloahPickIds:
      [],
  };
}

export function formatVenuePrice(
  priceUsdCents:
    number | null
): string | null {
  if (
    priceUsdCents ===
    null
  ) {
    return null;
  }

  return new Intl.NumberFormat(
    "en-US",
    {
      style:
        "currency",

      currency:
        "USD",
    }
  ).format(
    priceUsdCents /
      100
  );
}
