import { supabase } from "@/integrations/supabase/client";
import type { DiarioItem } from "@/lib/diario-world";

const db = supabase as any;

export type MapBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export type PlaceShortcut = {
  key: string;
  label: string;
  categories: string[];
  placeType: string;
  searchTerms: string[];
};

export type DiscoveredPlace = {
  placeId: string;
  name: string;
  address: string;
  neighborhood: string;
  latitude: number;
  longitude: number;
  categories: string[];
  placeType: string;
  shortcutKey: string | null;
  website: string | null;
  phone: string | null;
  raw: Record<string, unknown>;
};

export const NYC_BOUNDS: MapBounds = {
  west: -74.2591,
  south: 40.4774,
  east: -73.7004,
  north: 40.9176,
};

export const NYC_CENTER = {
  latitude: 40.7128,
  longitude: -74.006,
};

export const PLACE_SHORTCUTS: PlaceShortcut[] = [
  {
    key: "coffee",
    label: "Coffee",
    categories: ["catering.cafe.coffee_shop", "catering.cafe.coffee"],
    placeType: "cafe",
    searchTerms: ["coffee", "coffee shop", "coffee shops", "cafe", "café"],
  },
  {
    key: "restaurants",
    label: "Restaurants",
    categories: ["catering.restaurant"],
    placeType: "restaurant",
    searchTerms: ["restaurant", "restaurants", "dinner", "lunch", "food"],
  },
  {
    key: "dessert",
    label: "Dessert",
    categories: [
      "catering.cafe.dessert",
      "catering.cafe.ice_cream",
      "commercial.food_and_drink.bakery",
      "commercial.food_and_drink.chocolate",
    ],
    placeType: "dessert",
    searchTerms: ["dessert", "desserts", "ice cream", "bakery", "cake", "sweet"],
  },
  {
    key: "museums",
    label: "Museums",
    categories: ["entertainment.museum"],
    placeType: "museum",
    searchTerms: ["museum", "museums"],
  },
  {
    key: "parks",
    label: "Parks",
    categories: ["leisure.park", "leisure.park.garden", "leisure.picnic"],
    placeType: "park",
    searchTerms: ["park", "parks", "garden", "picnic"],
  },
  {
    key: "bookstores",
    label: "Bookstores",
    categories: ["commercial.books"],
    placeType: "bookstore",
    searchTerms: ["book", "books", "bookstore", "bookstores"],
  },
  {
    key: "cinema",
    label: "Cinema",
    categories: ["entertainment.cinema"],
    placeType: "cinema",
    searchTerms: ["cinema", "movie", "movies", "film", "theater"],
  },
  {
    key: "art",
    label: "Art",
    categories: ["commercial.art", "entertainment.culture.gallery"],
    placeType: "gallery",
    searchTerms: ["art", "gallery", "galleries"],
  },
  {
    key: "vintage",
    label: "Vintage",
    categories: ["commercial.second_hand", "commercial.antiques"],
    placeType: "store",
    searchTerms: ["vintage", "thrift", "second hand", "antiques"],
  },
  {
    key: "shopping",
    label: "Clothes",
    categories: ["commercial.clothing"],
    placeType: "store",
    searchTerms: ["clothes", "clothing", "shopping", "fashion", "store"],
  },
  {
    key: "records",
    label: "Records",
    categories: ["commercial.video_and_music", "commercial.hobby.music"],
    placeType: "store",
    searchTerms: ["record", "records", "vinyl", "music store"],
  },
  {
    key: "arcade",
    label: "Arcade",
    categories: ["entertainment.amusement_arcade", "commercial.hobby.games"],
    placeType: "activity",
    searchTerms: ["arcade", "games", "game"],
  },
  {
    key: "flowers",
    label: "Flowers",
    categories: ["commercial.florist"],
    placeType: "store",
    searchTerms: ["flowers", "flower", "florist"],
  },
  {
    key: "things-to-do",
    label: "Things to do",
    categories: ["entertainment", "leisure"],
    placeType: "activity",
    searchTerms: ["things to do", "something to do", "activity", "activities"],
  },
];

function normalize(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function keyForPlaceType(place: DiarioItem): string | null {
  const direct = normalize(place.data?.discoveryShortcut);
  if (direct) return direct;

  const placeType = normalize(place.data?.placeType);

  const matching = PLACE_SHORTCUTS.find(
    (shortcut) => shortcut.placeType === placeType
  );

  return matching?.key ?? null;
}

export function getDynamicShortcuts(
  places: DiarioItem[],
  limit = 7
): PlaceShortcut[] {
  const scores = new Map<string, number>();

  PLACE_SHORTCUTS.forEach((shortcut) => scores.set(shortcut.key, 0));

  places.forEach((place) => {
    const key = keyForPlaceType(place);
    if (!key) return;

    const current = scores.get(key) ?? 0;
    const lived = place.data?.placeStatus === "visited";

    scores.set(key, current + (lived ? 2 : 1));
  });

  const daySeed = Math.floor(Date.now() / 86_400_000);

  return [...PLACE_SHORTCUTS]
    .sort((first, second) => {
      const scoreDifference =
        (scores.get(first.key) ?? 0) - (scores.get(second.key) ?? 0);

      if (scoreDifference !== 0) return scoreDifference;

      const firstTie =
        (first.key.charCodeAt(0) + daySeed) % PLACE_SHORTCUTS.length;
      const secondTie =
        (second.key.charCodeAt(0) + daySeed) % PLACE_SHORTCUTS.length;

      return firstTie - secondTie;
    })
    .slice(0, limit);
}

export function getHistoryShortcutKeys(places: DiarioItem[]): string[] {
  const keys: string[] = [];

  places.forEach((place) => {
    const key = keyForPlaceType(place);
    if (key && !keys.includes(key)) keys.push(key);
  });

  return keys.slice(0, 5);
}

export function shortcutForSearchText(
  query: string
): PlaceShortcut | null {
  const normalizedQuery = query.toLowerCase().trim();

  if (!normalizedQuery) return null;

  const cuisineMap: Array<[string, string]> = [
    ["italian", "catering.restaurant.italian"],
    ["japanese", "catering.restaurant.japanese"],
    ["ramen", "catering.fast_food.ramen"],
    ["pizza", "catering.fast_food.pizza"],
    ["kebab", "catering.fast_food.kebab"],
    ["indian", "catering.restaurant.indian"],
    ["french", "catering.restaurant.french"],
  ];

  const cuisine = cuisineMap.find(([term]) =>
    normalizedQuery.includes(term)
  );

  if (cuisine) {
    return {
      key: `search-${cuisine[0]}`,
      label: query.trim(),
      categories: [cuisine[1]],
      placeType: "restaurant",
      searchTerms: [cuisine[0]],
    };
  }

  return (
    PLACE_SHORTCUTS.find((shortcut) =>
      shortcut.searchTerms.some((term) =>
        normalizedQuery.includes(term)
      )
    ) ?? null
  );
}

function buildFilter(bounds: MapBounds): string {
  return `rect:${bounds.west},${bounds.south},${bounds.east},${bounds.north}`;
}

function normaliseGeoapifyFeature(
  feature: any,
  shortcut: PlaceShortcut | null
): DiscoveredPlace | null {
  const properties = feature?.properties ?? {};
  const geometry = feature?.geometry ?? {};
  const coordinates = Array.isArray(geometry.coordinates)
    ? geometry.coordinates
    : [];

  const longitude =
    typeof properties.lon === "number"
      ? properties.lon
      : Number(coordinates[0]);

  const latitude =
    typeof properties.lat === "number"
      ? properties.lat
      : Number(coordinates[1]);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const name =
    normalize(properties.name) ||
    normalize(properties.address_line1) ||
    "Untitled place";

  const neighborhood =
    normalize(properties.neighbourhood) ||
    normalize(properties.suburb) ||
    normalize(properties.district) ||
    normalize(properties.borough) ||
    normalize(properties.city_district) ||
    normalize(properties.city);

  const address =
    normalize(properties.formatted) ||
    [properties.address_line1, properties.address_line2]
      .map(normalize)
      .filter(Boolean)
      .join(", ");

  const categories = Array.isArray(properties.categories)
    ? properties.categories.filter(
        (category: unknown): category is string =>
          typeof category === "string"
      )
    : [];

  const website =
    normalize(properties.website) ||
    normalize(properties.contact?.website) ||
    null;

  const phone =
    normalize(properties.contact?.phone) ||
    normalize(properties.phone) ||
    null;

  return {
    placeId:
      normalize(properties.place_id) ||
      `${name}-${latitude}-${longitude}`,
    name,
    address,
    neighborhood,
    latitude,
    longitude,
    categories,
    placeType: shortcut?.placeType ?? inferPlaceType(categories),
    shortcutKey: shortcut?.key ?? null,
    website,
    phone,
    raw: properties,
  };
}

function inferPlaceType(categories: string[]): string {
  if (categories.some((category) => category.startsWith("catering.cafe"))) {
    return "cafe";
  }

  if (
    categories.some((category) =>
      category.startsWith("catering.restaurant")
    )
  ) {
    return "restaurant";
  }

  if (categories.some((category) => category.startsWith("entertainment.museum"))) {
    return "museum";
  }

  if (categories.some((category) => category.startsWith("leisure.park"))) {
    return "park";
  }

  if (categories.some((category) => category.startsWith("commercial"))) {
    return "store";
  }

  if (categories.some((category) => category.startsWith("entertainment"))) {
    return "activity";
  }

  return "place";
}

export async function searchPlacesByShortcut({
  apiKey,
  shortcut,
  bounds,
  limit = 30,
}: {
  apiKey: string;
  shortcut: PlaceShortcut;
  bounds: MapBounds;
  limit?: number;
}): Promise<DiscoveredPlace[]> {
  const params = new URLSearchParams({
    categories: shortcut.categories.join(","),
    filter: buildFilter(bounds),
    limit: String(limit),
    lang: "en",
    apiKey,
  });

  const response = await fetch(
    `https://api.geoapify.com/v2/places?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(`Geoapify Places search failed (${response.status}).`);
  }

  const payload = await response.json();

  return (payload?.features ?? [])
    .map((feature: any) => normaliseGeoapifyFeature(feature, shortcut))
    .filter(Boolean) as DiscoveredPlace[];
}

export async function searchPlacesByText({
  apiKey,
  query,
  bounds,
  limit = 24,
}: {
  apiKey: string;
  query: string;
  bounds: MapBounds;
  limit?: number;
}): Promise<DiscoveredPlace[]> {
  const knownShortcut = shortcutForSearchText(query);

  if (knownShortcut) {
    return searchPlacesByShortcut({
      apiKey,
      shortcut: knownShortcut,
      bounds,
      limit,
    });
  }

  const centerLongitude = (bounds.west + bounds.east) / 2;
  const centerLatitude = (bounds.south + bounds.north) / 2;

  const params = new URLSearchParams({
    text: query.trim(),
    type: "amenity",
    filter: buildFilter(NYC_BOUNDS),
    bias: `proximity:${centerLongitude},${centerLatitude}`,
    limit: String(Math.min(limit, 20)),
    lang: "en",
    format: "geojson",
    apiKey,
  });

  const response = await fetch(
    `https://api.geoapify.com/v1/geocode/autocomplete?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(`Geoapify place search failed (${response.status}).`);
  }

  const payload = await response.json();

  return (payload?.features ?? [])
    .map((feature: any) => normaliseGeoapifyFeature(feature, null))
    .filter(Boolean) as DiscoveredPlace[];
}

function sameCoordinates(
  firstLatitude: number,
  firstLongitude: number,
  secondLatitude: number,
  secondLongitude: number
): boolean {
  return (
    Math.abs(firstLatitude - secondLatitude) < 0.00008 &&
    Math.abs(firstLongitude - secondLongitude) < 0.00008
  );
}

export function findSavedVersion(
  places: DiarioItem[],
  discovered: DiscoveredPlace
): DiarioItem | null {
  return (
    places.find((place) => {
      const providerId = normalize(place.data?.geoapifyPlaceId);

      if (providerId && providerId === discovered.placeId) {
        return true;
      }

      const latitude = Number(place.data?.latitude);
      const longitude = Number(place.data?.longitude);

      return (
        normalize(place.title).toLowerCase() ===
          discovered.name.toLowerCase() &&
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        sameCoordinates(
          latitude,
          longitude,
          discovered.latitude,
          discovered.longitude
        )
      );
    }) ?? null
  );
}

export async function saveDiscoveredPlace({
  userId,
  place,
}: {
  userId: string;
  place: DiscoveredPlace;
}): Promise<DiarioItem> {
  const { data: existingRows, error: existingError } = await db
    .from("diario_items")
    .select("*")
    .eq("user_id", userId)
    .eq("kind", "place")
    .eq("status", "active");

  if (existingError) throw existingError;

  const existing = findSavedVersion(
    (existingRows ?? []) as DiarioItem[],
    place
  );

  if (existing) return existing;

  const { data, error } = await db
    .from("diario_items")
    .insert({
      user_id: userId,
      kind: "place",
      owner: "shared",
      status: "active",
      title: place.name,
      body: null,
      event_at: null,
      planned_for: null,
      data: {
        placeStatus: "saved",
        placeType: place.placeType,
        neighborhood: place.neighborhood || null,
        address: place.address || null,
        latitude: place.latitude,
        longitude: place.longitude,
        geoapifyPlaceId: place.placeId,
        provider: "geoapify",
        categories: place.categories,
        discoveryShortcut: place.shortcutKey,
        website: place.website,
        phone: place.phone,
        source: "nyc_map",
      },
    })
    .select("*")
    .single();

  if (error) throw error;

  return data as DiarioItem;
}
