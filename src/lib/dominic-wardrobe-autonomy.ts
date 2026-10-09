import { supabase } from "@/integrations/supabase/client";
import type { DominicState } from "@/lib/dominic-state";
import {
  getWearingSelection,
  setWearingClothing,
  setWearingLook,
} from "@/lib/wardrobe-context";

type SettingsRow = {
  user_id: string;
  data: Record<string, unknown> | null;
};

type WardrobeItem = {
  id: string;
  title: string | null;
  data: Record<string, unknown> | null;
};

type AutonomyMarker = {
  stateStartedAt: string;
  activity: string;
  changedAt: string;
  lookId: string | null;
  clothingIds: string[];
};

const db = supabase as any;

const DRESSING_ACTIVITIES = new Set(["getting_dressed", "getting_ready"]);

const SKIP_DAILY_CHANGE = new Set([
  "sleeping", "napping", "showering", "driving", "traveling",
  "performing", "rehearsing", "recording", "at_the_studio",
  "working", "with_friends", "leaving_home",
]);

function rioDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: string) => parts.find(row => row.type === type)?.value ?? "";
  return { day: part("year") + "-" + part("month") + "-" + part("day"), hour: Number(part("hour")) };
}

export function shouldDominicConsiderOutfitChange({
  state, lastChangeAt, now = new Date(),
}: {
  state: Pick<DominicState, "activity" | "location">;
  lastChangeAt: string | null;
  now?: Date;
}) {
  const { day, hour } = rioDateParts(now);
  const lastDay = lastChangeAt && Number.isFinite(Date.parse(lastChangeAt))
    ? rioDateParts(new Date(lastChangeAt)).day : null;
  if (lastDay === day) return false;
  if (DRESSING_ACTIVITIES.has(state.activity)) return true;
  // Simulate a *single* ordinary daily getting-ready decision after waking,
  // even when the world loop skipped the short dressing activity. The first
  // eligible at-home sync for the day is enough; do not force a change while
  // asleep, out, actively performing, driving or working.
  return hour >= 8 && hour <= 21 &&
    state.location !== "out" && !SKIP_DAILY_CHANGE.has(state.activity);
}

function stableHash(
  value: string
) {
  let hash = 2166136261;

  for (
    let index = 0;
    index < value.length;
    index += 1
  ) {
    hash ^=
      value.charCodeAt(
        index
      );

    hash =
      Math.imul(
        hash,
        16777619
      );
  }

  return (
    hash >>> 0
  );
}

function categoryOf(
  item: WardrobeItem
) {
  return typeof item
    .data?.category ===
    "string"
    ? item.data
        .category
    : "other";
}

async function loadSettings(
  userId: string
): Promise<SettingsRow | null> {
  const {
    data,
    error,
  } =
    await db
      .from(
        "diario_settings"
      )
      .select(
        "user_id,data"
      )
      .eq(
        "user_id",
        userId
      )
      .maybeSingle();

  if (error) {
    throw error;
  }

  return data as
    | SettingsRow
    | null;
}

function readMarker(
  data:
    Record<string, unknown> | null
): AutonomyMarker | null {
  const raw =
    data
      ?.dominic_wardrobe_autonomy;

  if (
    !raw ||
    typeof raw !==
      "object" ||
    Array.isArray(raw)
  ) {
    return null;
  }

  const value =
    raw as Record<
      string,
      unknown
    >;

  if (
    typeof value
      .stateStartedAt !==
      "string" ||
    typeof value
      .changedAt !==
      "string" ||
    typeof value
      .activity !==
      "string"
  ) {
    return null;
  }

  return {
    stateStartedAt:
      value.stateStartedAt,
    activity:
      value.activity,
    changedAt:
      value.changedAt,
    lookId:
      typeof value
        .lookId ===
      "string"
        ? value.lookId
        : null,
    clothingIds:
      Array.isArray(
        value.clothingIds
      )
        ? value
            .clothingIds
            .filter(
              (
                id
              ): id is string =>
                typeof id ===
                "string"
            )
        : [],
  };
}

async function saveMarker({
  userId,
  state,
  lookId,
  clothingIds,
}: {
  userId: string;
  state: DominicState;
  lookId: string | null;
  clothingIds: string[];
}) {
  /*
   * Re-read after changing Wearing. setWearingLook / setWearingClothing
   * also writes diario_settings, so this avoids overwriting that newer map.
   */
  const settings =
    await loadSettings(
      userId
    );

  const currentData =
    settings?.data &&
    typeof settings.data ===
      "object"
      ? settings.data
      : {};

  const marker:
    AutonomyMarker = {
      stateStartedAt:
        state.startedAt,
      activity:
        state.activity,
      changedAt:
        new Date()
          .toISOString(),
      lookId,
      clothingIds,
    };

  const {
    error,
  } =
    await db
      .from(
        "diario_settings"
      )
      .upsert(
        {
          user_id:
            userId,
          data: {
            ...currentData,
            dominic_wardrobe_autonomy:
              marker,
          },
        },
        {
          onConflict:
            "user_id",
        }
      );

  if (error) {
    throw error;
  }
}

async function loadDominicLooks(
  userId: string
): Promise<WardrobeItem[]> {
  const {
    data,
    error,
  } =
    await db
      .from(
        "diario_items"
      )
      .select(
        "id,title,data"
      )
      .eq(
        "user_id",
        userId
      )
      .eq(
        "owner",
        "dominic"
      )
      .eq(
        "kind",
        "look"
      )
      .eq(
        "status",
        "active"
      )
      .order(
        "created_at",
        {
          ascending:
            true,
        }
      );

  if (error) {
    throw error;
  }

  return (
    data ??
    []
  ) as WardrobeItem[];
}

async function loadDominicClothing(
  userId: string
): Promise<WardrobeItem[]> {
  const {
    data,
    error,
  } =
    await db
      .from(
        "diario_items"
      )
      .select(
        "id,title,data"
      )
      .eq(
        "user_id",
        userId
      )
      .eq(
        "owner",
        "dominic"
      )
      .eq(
        "kind",
        "clothing"
      )
      .eq(
        "status",
        "active"
      )
      .order(
        "created_at",
        {
          ascending:
            true,
        }
      );

  if (error) {
    throw error;
  }

  return (
    data ??
    []
  ) as WardrobeItem[];
}

function pickFrom(
  items:
    WardrobeItem[],
  seed:
    number
) {
  if (
    items.length ===
    0
  ) {
    return null;
  }

  return items[
    seed %
      items.length
  ];
}

function buildIndependentPieces(
  items:
    WardrobeItem[],
  seed:
    number
) {
  const byCategory =
    new Map<
      string,
      WardrobeItem[]
    >();

  items.forEach(
    (
      item
    ) => {
      const category =
        categoryOf(
          item
        );

      byCategory.set(
        category,
        [
          ...(
            byCategory.get(
              category
            ) ??
            []
          ),
          item,
        ]
      );
    }
  );

  const pickCategory = (
    category:
      string,
    offset:
      number
  ) =>
    pickFrom(
      byCategory.get(
        category
      ) ??
        [],
      seed +
        offset
    );

  const dress =
    pickCategory(
      "dress",
      11
    );

  const top =
    pickCategory(
      "top",
      17
    );

  const bottom =
    pickCategory(
      "bottom",
      23
    );

  const shoes =
    pickCategory(
      "shoes",
      29
    );

  const outerwear =
    pickCategory(
      "outerwear",
      31
    );

  const accessory =
    pickCategory(
      "accessory",
      37
    );

  const bag =
    pickCategory(
      "bag",
      41
    );

  const base =
    dress &&
    (
      !top ||
      !bottom ||
      seed % 4 === 0
    )
      ? [
          dress,
        ]
      : [
          top,
          bottom,
        ].filter(
          Boolean
        ) as WardrobeItem[];

  const extras =
    [
      shoes,
      seed % 3 !==
        0
        ? outerwear
        : null,
      seed % 2 ===
        0
        ? accessory
        : null,
      seed % 5 ===
        0
        ? bag
        : null,
    ].filter(
      Boolean
    ) as WardrobeItem[];

  const chosen =
    [
      ...base,
      ...extras,
    ];

  if (
    chosen.length >
    0
  ) {
    return Array.from(
      new Set(
        chosen.map(
          (
            item
          ) =>
            item.id
        )
      )
    );
  }

  return items
    .slice(
      0,
      Math.min(
        3,
        items.length
      )
    )
    .map(
      (
        item
      ) =>
        item.id
    );
}

/**
 * Gives Dominic ownership of his current outfit without inventing clothes.
 *
 * It only acts when his world-state says he is actually getting dressed /
 * getting ready, and only once per state transition. If he has saved Looks,
 * he chooses one; otherwise he assembles a small outfit from his own pieces.
 *
 * Creating new clothing remains a separate creative/autonomy action, because
 * that needs an actual visual asset instead of silently fabricating a closet.
 */
export async function syncDominicWardrobeAutonomy({
  userId,
  state,
}: {
  userId: string;
  state: DominicState;
}) {
  const settings =
    await loadSettings(
      userId
    );

  const marker =
    readMarker(
      settings?.data ??
      null
    );

  const [
    current,
    looks,
  ] = await Promise.all([
    getWearingSelection({ userId, owner: "dominic" }),
    loadDominicLooks(userId),
  ]);

  // A manual selection made today should stay in place: Dominic must not
  // overwrite the user's recently curated Currently Wearing outfit when
  // the Chat refreshes. The automatic selector may act another day.
  const lastChoiceAt = [marker?.changedAt, current?.updatedAt]
    .filter((date): date is string => Boolean(date) && Number.isFinite(Date.parse(date)))
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null;
  if (!shouldDominicConsiderOutfitChange({
    state, lastChangeAt: lastChoiceAt,
  })) return;

  const seed = stableHash(
    `${state.startedAt}:${state.activity}:${state.location}`
  );

  if (
    looks.length >
    0
  ) {
    let chosen =
      pickFrom(
        looks,
        seed
      );

    if (
      chosen &&
      looks.length > 1 &&
      current?.lookId ===
        chosen.id
    ) {
      const index =
        looks.findIndex(
          (
            look
          ) =>
            look.id ===
            chosen!.id
        );

      chosen =
        looks[
          (
            index +
            1
          ) %
            looks.length
        ];
    }

    if (!chosen) {
      return;
    }

    const selection =
      await setWearingLook({
        userId,
        owner:
          "dominic",
        lookId:
          chosen.id,
      });

    await saveMarker({
      userId,
      state,
      lookId:
        selection.lookId,
      clothingIds:
        selection.clothingIds,
    });

    return;
  }

  const clothing =
    await loadDominicClothing(
      userId
    );

  if (
    clothing.length ===
    0
  ) {
    return;
  }

  // A daily change should normally result in a DIFFERENT actual outfit.
  // Never invent missing garments to force variety; cycle deterministic,
  // compatible saved choices instead of retaining yesterday's exact set.
  let clothingIds = buildIndependentPieces(clothing, seed);
  for (let offset = 1; offset <= Math.min(12, clothing.length); offset += 1) {
    const oldIds = [...(current?.clothingIds ?? [])].sort().join("|");
    if (clothingIds.length && [...clothingIds].sort().join("|") !== oldIds) break;
    clothingIds = buildIndependentPieces(clothing, seed + offset);
  }

  const selection =
    await setWearingClothing({
      userId,
      owner:
        "dominic",
      clothingIds,
    });

  if (!selection) {
    return;
  }

  await saveMarker({
    userId,
    state,
    lookId:
      null,
    clothingIds:
      selection.clothingIds,
  });
}
