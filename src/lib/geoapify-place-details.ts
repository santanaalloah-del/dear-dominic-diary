import { supabase } from "@/integrations/supabase/client";
import type { DiarioItem } from "@/lib/diario-world";
import type { DiscoveredPlace } from "@/lib/nyc-place-discovery";

const db = supabase as any;

const DETAIL_FRESHNESS_MS =
  7 * 24 * 60 * 60 * 1000;

export type GeoapifyPlaceDetails = {
  providerPlaceId: string | null;
  name: string | null;
  brand: string | null;
  description: string | null;
  openingHours: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  wheelchair: boolean | null;
  internetAccess: boolean | null;
  smoking: boolean | null;
  cuisine: string | null;
  diet: string | null;
  reservation: string | null;
  commercialType: string | null;
  clothesType: string | null;
  categories: string[];
  fetchedAt: string;
};

export type PlaceOpeningState = {
  label: "Open now" | "Closed now";
  isOpen: boolean;
};

function clean(
  value: unknown
): string | null {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const normalized =
    value.trim();

  return normalized ||
    null;
}

function nullableBoolean(
  value: unknown
): boolean | null {
  return typeof value === "boolean"
    ? value
    : null;
}

function detailsFeature(
  payload: any
) {
  const features =
    Array.isArray(
      payload?.features
    )
      ? payload.features
      : [];

  return (
    features.find(
      (
        feature: any
      ) =>
        feature?.properties
          ?.feature_type ===
        "details"
    ) ??
    features[0] ??
    null
  );
}

export async function fetchGeoapifyPlaceDetails({
  apiKey,
  place,
}: {
  apiKey: string;
  place: DiscoveredPlace;
}): Promise<GeoapifyPlaceDetails | null> {
  const params =
    new URLSearchParams({
      lang: "en",
      apiKey,
    });

  const persistedProviderId =
    clean(
      place.raw
        ?.geoapifyPlaceId
    );

  const providerPlaceId =
    !place.placeId.startsWith(
      "diario:"
    )
      ? place.placeId
      : persistedProviderId;

  if (providerPlaceId) {
    params.set(
      "id",
      providerPlaceId
    );
  } else {
    params.set(
      "lat",
      String(
        place.latitude
      )
    );

    params.set(
      "lon",
      String(
        place.longitude
      )
    );
  }

  const response =
    await fetch(
      `https://api.geoapify.com/v2/place-details?${params.toString()}`
    );

  if (!response.ok) {
    throw new Error(
      `Geoapify Place Details failed (${response.status}).`
    );
  }

  const payload =
    await response.json();

  const feature =
    detailsFeature(
      payload
    );

  if (!feature) {
    return null;
  }

  const properties =
    feature.properties ??
    {};

  const categories =
    Array.isArray(
      properties.categories
    )
      ? properties.categories.filter(
          (
            category: unknown
          ): category is string =>
            typeof category ===
            "string"
        )
      : [];

  const catering =
    properties.catering &&
    typeof properties.catering ===
      "object"
      ? properties.catering
      : {};

  const commercial =
    properties.commercial &&
    typeof properties.commercial ===
      "object"
      ? properties.commercial
      : {};

  const contact =
    properties.contact &&
    typeof properties.contact ===
      "object"
      ? properties.contact
      : {};

  const brandDetails =
    properties.brand_details &&
    typeof properties.brand_details ===
      "object"
      ? properties.brand_details
      : {};

  return {
    providerPlaceId:
      providerPlaceId ??
      clean(
        properties.place_id
      ),
    name:
      clean(
        properties.name
      ),
    brand:
      clean(
        properties.brand
      ),
    description:
      clean(
        properties.description
      ),
    openingHours:
      clean(
        properties.opening_hours
      ),
    website:
      clean(
        properties.website
      ) ??
      clean(
        contact.website
      ) ??
      clean(
        brandDetails.website
      ),
    phone:
      clean(
        contact.phone
      ) ??
      clean(
        properties.phone
      ),
    email:
      clean(
        contact.email
      ),
    wheelchair:
      nullableBoolean(
        properties.wheelchair
      ),
    internetAccess:
      nullableBoolean(
        properties.internet_access
      ),
    smoking:
      nullableBoolean(
        properties.smoking
      ),
    cuisine:
      clean(
        catering.cuisine
      ),
    diet:
      clean(
        catering.diet
      ),
    reservation:
      clean(
        catering.reservation
      ),
    commercialType:
      clean(
        commercial.type
      ),
    clothesType:
      clean(
        commercial.clothes
      ),
    categories,
    fetchedAt:
      new Date()
        .toISOString(),
  };
}

export function readPersistedPlaceDetails(
  place: DiarioItem | null
): GeoapifyPlaceDetails | null {
  if (!place) {
    return null;
  }

  const stored =
    place.data
      ?.geoapifyDetails;

  if (
    !stored ||
    typeof stored !==
      "object"
  ) {
    return null;
  }

  const value =
    stored as Record<
      string,
      unknown
    >;

  const fetchedAt =
    clean(
      value.fetchedAt
    );

  if (!fetchedAt) {
    return null;
  }

  return {
    providerPlaceId:
      clean(
        value.providerPlaceId
      ),
    name:
      clean(
        value.name
      ),
    brand:
      clean(
        value.brand
      ),
    description:
      clean(
        value.description
      ),
    openingHours:
      clean(
        value.openingHours
      ),
    website:
      clean(
        value.website
      ),
    phone:
      clean(
        value.phone
      ),
    email:
      clean(
        value.email
      ),
    wheelchair:
      nullableBoolean(
        value.wheelchair
      ),
    internetAccess:
      nullableBoolean(
        value.internetAccess
      ),
    smoking:
      nullableBoolean(
        value.smoking
      ),
    cuisine:
      clean(
        value.cuisine
      ),
    diet:
      clean(
        value.diet
      ),
    reservation:
      clean(
        value.reservation
      ),
    commercialType:
      clean(
        value.commercialType
      ),
    clothesType:
      clean(
        value.clothesType
      ),
    categories:
      Array.isArray(
        value.categories
      )
        ? value.categories.filter(
            (
              category: unknown
            ): category is string =>
              typeof category ===
              "string"
          )
        : [],
    fetchedAt,
  };
}

export function placeDetailsAreFresh(
  details:
    GeoapifyPlaceDetails | null
): boolean {
  if (!details) {
    return false;
  }

  const fetched =
    new Date(
      details.fetchedAt
    ).getTime();

  if (
    Number.isNaN(
      fetched
    )
  ) {
    return false;
  }

  return (
    Date.now() -
      fetched <
    DETAIL_FRESHNESS_MS
  );
}

function unionStrings(
  first: unknown,
  second: string[]
): string[] {
  const base =
    Array.isArray(first)
      ? first.filter(
          (
            value: unknown
          ): value is string =>
            typeof value ===
            "string"
        )
      : [];

  return Array.from(
    new Set([
      ...base,
      ...second,
    ])
  );
}

export async function persistGeoapifyPlaceDetails({
  userId,
  place,
  details,
}: {
  userId: string;
  place: DiarioItem;
  details: GeoapifyPlaceDetails;
}): Promise<DiarioItem> {
  const nextData = {
    ...(place.data ?? {}),
    geoapifyDetails:
      details,
    detailsFetchedAt:
      details.fetchedAt,
    geoapifyPlaceId:
      place.data
        ?.geoapifyPlaceId ??
      details.providerPlaceId,
    website:
      place.data
        ?.website ??
      details.website,
    phone:
      place.data
        ?.phone ??
      details.phone,
    categories:
      unionStrings(
        place.data
          ?.categories,
        details.categories
      ),
  };

  const {
    data,
    error,
  } = await db
    .from(
      "diario_items"
    )
    .update({
      data: nextData,
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

export function friendlyPlaceCategory({
  placeType,
  details,
}: {
  placeType: string;
  details:
    GeoapifyPlaceDetails | null;
}): string {
  const cuisine =
    details?.cuisine
      ?.split(/[;,]/)
      .map(
        (
          value
        ) =>
          value.trim()
      )
      .filter(Boolean)[0];

  if (
    placeType ===
      "restaurant" &&
    cuisine
  ) {
    return `${titleCase(
      cuisine
    )} restaurant`;
  }

  if (
    placeType ===
      "store" &&
    details?.clothesType
  ) {
    return `${titleCase(
      details.clothesType
    )} shop`;
  }

  if (
    placeType ===
      "store" &&
    details?.commercialType
  ) {
    return titleCase(
      details.commercialType
    );
  }

  const labels:
    Record<
      string,
      string
    > = {
      cafe: "Café",
      restaurant:
        "Restaurant",
      dessert:
        "Dessert",
      museum:
        "Museum",
      park:
        "Park",
      bookstore:
        "Bookstore",
      cinema:
        "Cinema",
      gallery:
        "Gallery",
      store:
        "Shop",
      activity:
        "Things to do",
      place:
        "Place",
    };

  return (
    labels[
      placeType
    ] ??
    titleCase(
      placeType
    )
  );
}

function titleCase(
  value: string
): string {
  return value
    .replace(
      /[:_;-]+/g,
      " "
    )
    .split(/\s+/)
    .filter(Boolean)
    .map(
      (
        word
      ) =>
        word
          .charAt(0)
          .toUpperCase() +
        word
          .slice(1)
          .toLowerCase()
    )
    .join(" ");
}

export function humanizeProviderValue(
  value: string
): string {
  return value
    .split(/[;,]/)
    .map(
      (
        item
      ) =>
        titleCase(
          item.trim()
        )
    )
    .filter(Boolean)
    .join(" · ");
}

export function humanizeOpeningHours(
  value: string
): string {
  const dayNames:
    Record<
      string,
      string
    > = {
      Mo: "Mon",
      Tu: "Tue",
      We: "Wed",
      Th: "Thu",
      Fr: "Fri",
      Sa: "Sat",
      Su: "Sun",
    };

  return value
    .replace(
      /\b(Mo|Tu|We|Th|Fr|Sa|Su)\b/g,
      (
        match
      ) =>
        dayNames[
          match
        ] ??
        match
    )
    .replace(
      /;/g,
      " · "
    );
}

const DAY_INDEX:
  Record<
    string,
    number
  > = {
    Su: 0,
    Sun: 0,
    Mo: 1,
    Mon: 1,
    Tu: 2,
    Tue: 2,
    We: 3,
    Wed: 3,
    Th: 4,
    Thu: 4,
    Fr: 5,
    Fri: 5,
    Sa: 6,
    Sat: 6,
  };

type ParsedRule = {
  days: Set<number>;
  off: boolean;
  ranges: Array<{
    start: number;
    end: number;
  }>;
};

function timeToMinutes(
  value: string
): number | null {
  const match =
    value.match(
      /^(\d{1,2}):(\d{2})$/
    );

  if (!match) {
    return null;
  }

  const hour =
    Number(
      match[1]
    );

  const minute =
    Number(
      match[2]
    );

  if (
    minute < 0 ||
    minute > 59 ||
    hour < 0 ||
    hour > 24 ||
    (
      hour === 24 &&
      minute !== 0
    )
  ) {
    return null;
  }

  return (
    hour * 60 +
    minute
  );
}

function parseDayToken(
  token: string
): Set<number> | null {
  const days =
    new Set<number>();

  const parts =
    token.split(",");

  for (
    const part of parts
  ) {
    const trimmed =
      part.trim();

    if (!trimmed) {
      return null;
    }

    if (
      trimmed.includes(
        "-"
      )
    ) {
      const [
        startCode,
        endCode,
      ] =
        trimmed.split(
          "-"
        );

      const start =
        DAY_INDEX[
          startCode
        ];

      const end =
        DAY_INDEX[
          endCode
        ];

      if (
        start ===
          undefined ||
        end ===
          undefined
      ) {
        return null;
      }

      let current =
        start;

      for (
        let safety = 0;
        safety < 7;
        safety += 1
      ) {
        days.add(
          current
        );

        if (
          current ===
          end
        ) {
          break;
        }

        current =
          (
            current +
            1
          ) %
          7;
      }

      continue;
    }

    const day =
      DAY_INDEX[
        trimmed
      ];

    if (
      day ===
      undefined
    ) {
      return null;
    }

    days.add(
      day
    );
  }

  return days;
}

function parseOpeningHours(
  value: string
): ParsedRule[] | null {
  const normalized =
    value.trim();

  if (
    normalized ===
    "24/7"
  ) {
    return [
      {
        days:
          new Set([
            0, 1, 2, 3,
            4, 5, 6,
          ]),
        off: false,
        ranges: [
          {
            start: 0,
            end: 1440,
          },
        ],
      },
    ];
  }

  if (
    /PH|SH|sunrise|sunset|week|unknown|\+|"/i.test(
      normalized
    )
  ) {
    return null;
  }

  const rules:
    ParsedRule[] = [];

  for (
    const rawRule of normalized.split(
      ";"
    )
  ) {
    const rule =
      rawRule.trim();

    if (!rule) {
      continue;
    }

    const match =
      rule.match(
        /^((?:Mo|Mon|Tu|Tue|We|Wed|Th|Thu|Fr|Fri|Sa|Sat|Su|Sun)(?:-(?:Mo|Mon|Tu|Tue|We|Wed|Th|Thu|Fr|Fri|Sa|Sat|Su|Sun))?(?:,(?:Mo|Mon|Tu|Tue|We|Wed|Th|Thu|Fr|Fri|Sa|Sat|Su|Sun)(?:-(?:Mo|Mon|Tu|Tue|We|Wed|Th|Thu|Fr|Fri|Sa|Sat|Su|Sun))?)*)\s+(.+)$/
      );

    if (!match) {
      return null;
    }

    const days =
      parseDayToken(
        match[1]
      );

    if (!days) {
      return null;
    }

    const times =
      match[2].trim();

    if (
      times ===
        "off" ||
      times ===
        "closed"
    ) {
      rules.push({
        days,
        off: true,
        ranges: [],
      });

      continue;
    }

    const ranges: Array<{
      start: number;
      end: number;
    }> = [];

    for (
      const rawRange of times.split(
        ","
      )
    ) {
      const [
        startValue,
        endValue,
      ] =
        rawRange
          .trim()
          .split("-");

      const start =
        timeToMinutes(
          startValue
        );

      const end =
        timeToMinutes(
          endValue
        );

      if (
        start === null ||
        end === null
      ) {
        return null;
      }

      ranges.push({
        start,
        end,
      });
    }

    rules.push({
      days,
      off: false,
      ranges,
    });
  }

  return rules.length
    ? rules
    : null;
}

function newYorkNowParts(
  date = new Date()
): {
  day: number;
  minutes: number;
} {
  const formatter =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:
          "America/New_York",
        weekday:
          "short",
        hour:
          "2-digit",
        minute:
          "2-digit",
        hour12:
          false,
      }
    );

  const parts =
    formatter.formatToParts(
      date
    );

  const weekday =
    parts.find(
      (
        part
      ) =>
        part.type ===
        "weekday"
    )?.value;

  const hour =
    Number(
      parts.find(
        (
          part
        ) =>
          part.type ===
          "hour"
      )?.value ??
        "0"
    );

  const minute =
    Number(
      parts.find(
        (
          part
        ) =>
          part.type ===
          "minute"
      )?.value ??
        "0"
    );

  const dayLookup:
    Record<
      string,
      number
    > = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };

  return {
    day:
      dayLookup[
        weekday ??
          "Sun"
      ] ?? 0,
    minutes:
      hour * 60 +
      minute,
  };
}

export function getPlaceOpeningState(
  openingHours:
    string | null
): PlaceOpeningState | null {
  if (!openingHours) {
    return null;
  }

  const rules =
    parseOpeningHours(
      openingHours
    );

  if (!rules) {
    return null;
  }

  const {
    day,
    minutes,
  } =
    newYorkNowParts();

  const previousDay =
    (
      day +
      6
    ) %
    7;

  for (
    const rule of rules
  ) {
    if (rule.off) {
      continue;
    }

    if (
      rule.days.has(
        day
      )
    ) {
      for (
        const range of rule.ranges
      ) {
        if (
          range.end >=
          range.start
        ) {
          if (
            minutes >=
              range.start &&
            minutes <
              range.end
          ) {
            return {
              label:
                "Open now",
              isOpen:
                true,
            };
          }
        } else if (
          minutes >=
          range.start
        ) {
          return {
            label:
              "Open now",
            isOpen:
              true,
          };
        }
      }
    }

    if (
      rule.days.has(
        previousDay
      )
    ) {
      for (
        const range of rule.ranges
      ) {
        if (
          range.end <
            range.start &&
          minutes <
            range.end
        ) {
          return {
            label:
              "Open now",
            isOpen:
              true,
          };
        }
      }
    }
  }

  return {
    label:
      "Closed now",
    isOpen:
      false,
  };
}

export function safeExternalUrl(
  value: string | null
): string | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(
      value
    ).toString();
  } catch {
    try {
      return new URL(
        `https://${value}`
      ).toString();
    } catch {
      return null;
    }
  }
}
