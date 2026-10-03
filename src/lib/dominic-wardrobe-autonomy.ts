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

const DRESSING_ACTIVITIES =
  new Set([
    "getting_dressed",
    "getting_ready",
  ]);

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
  if (
    !DRESSING_ACTIVITIES.has(
      state.activity
    )
  ) {
    return;
  }

  const settings =
    await loadSettings(
      userId
    );

  const marker =
    readMarker(
      settings?.data ??
      null
    );

  if (
    marker
      ?.stateStartedAt ===
    state.startedAt
  ) {
    return;
  }

  const seed =
    stableHash(
      `${state.startedAt}:${state.activity}:${state.location}`
    );

  const [
    current,
    looks,
  ] =
    await Promise.all([
      getWearingSelection({
        userId,
        owner:
          "dominic",
      }),
      loadDominicLooks(
        userId
      ),
    ]);

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

  const clothingIds =
    buildIndependentPieces(
      clothing,
      seed
    );

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
