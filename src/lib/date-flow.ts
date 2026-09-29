import {
  supabase,
} from "@/integrations/supabase/client";

import {
  createMemory,
  type DiarioItem,
} from "@/lib/diario-world";

const db =
  supabase as any;

export type DateFlowState =
  | "idea"
  | "planned"
  | "live"
  | "past";

export type DateLookRole =
  | "alloah"
  | "dominic";

export type DateConnectedThing = {
  item:
    DiarioItem;

  relation:
    string;

  role?:
    DateLookRole;
};

function cleanString(
  value: unknown
) {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

async function getDateItem({
  userId,
  dateId,
}: {
  userId: string;
  dateId: string;
}): Promise<DiarioItem> {
  const {
    data,
    error,
  } =
    await db
      .from(
        "diario_items"
      )
      .select("*")
      .eq(
        "user_id",
        userId
      )
      .eq(
        "id",
        dateId
      )
      .eq(
        "kind",
        "date"
      )
      .single();

  if (error) {
    throw error;
  }

  return data as DiarioItem;
}

export function getDateFlowState(
  date: DiarioItem
): DateFlowState {
  const explicit =
    date.data
      ?.flow_state;

  if (
    explicit ===
      "idea" ||
    explicit ===
      "planned" ||
    explicit ===
      "live" ||
    explicit ===
      "past"
  ) {
    return explicit;
  }

  if (
    date.event_at
  ) {
    return "past";
  }

  if (
    date.planned_for
  ) {
    return "planned";
  }

  return "idea";
}

export async function createDateIdea({
  userId,
  title,
  place,
  note,
  itinerary,
}: {
  userId: string;
  title: string;
  place?: string;
  note?: string;
  itinerary?: string;
}): Promise<DiarioItem> {
  const cleanTitle =
    title.trim();

  if (
    !cleanTitle
  ) {
    throw new Error(
      "A Date idea needs a title."
    );
  }

  const {
    data,
    error,
  } =
    await db
      .from(
        "diario_items"
      )
      .insert({
        user_id:
          userId,

        kind:
          "date",

        owner:
          "shared",

        status:
          "active",

        title:
          cleanTitle,

        body:
          note?.trim() ||
          null,

        event_at:
          null,

        planned_for:
          null,

        data: {
          place:
            place?.trim() ||
            null,

          itinerary:
            itinerary?.trim() ||
            null,

          flow_state:
            "idea",
        },
      })
      .select("*")
      .single();

  if (
    error
  ) {
    throw error;
  }

  return data as DiarioItem;
}

export async function createPlannedDate({
  userId,
  title,
  place,
  plannedFor,
  note,
  itinerary,
}: {
  userId: string;
  title: string;
  place: string;
  plannedFor: string;
  note?: string;
  itinerary?: string;
}): Promise<DiarioItem> {
  const cleanTitle =
    title.trim();

  const cleanPlace =
    place.trim();

  if (
    !cleanTitle
  ) {
    throw new Error(
      "A Date needs a title."
    );
  }

  if (
    !cleanPlace
  ) {
    throw new Error(
      "A planned Date needs a place."
    );
  }

  if (
    Number.isNaN(
      new Date(
        plannedFor
      ).getTime()
    )
  ) {
    throw new Error(
      "The Date needs a valid time."
    );
  }

  const {
    data,
    error,
  } =
    await db
      .from(
        "diario_items"
      )
      .insert({
        user_id:
          userId,

        kind:
          "date",

        owner:
          "shared",

        status:
          "active",

        title:
          cleanTitle,

        body:
          note?.trim() ||
          null,

        event_at:
          null,

        planned_for:
          plannedFor,

        data: {
          place:
            cleanPlace,

          itinerary:
            itinerary?.trim() ||
            null,

          flow_state:
            "planned",
        },
      })
      .select("*")
      .single();

  if (
    error
  ) {
    throw error;
  }

  return data as DiarioItem;
}

export async function updateDateDetails({
  userId,
  dateId,
  title,
  place,
  plannedFor,
  note,
  itinerary,
}: {
  userId: string;
  dateId: string;
  title: string;
  place?: string;
  plannedFor?: string | null;
  note?: string;
  itinerary?: string;
}): Promise<DiarioItem> {
  const current =
    await getDateItem({
      userId,
      dateId,
    });

  const currentState =
    getDateFlowState(
      current
    );

  let nextState =
    currentState;

  if (
    currentState ===
      "idea" &&
    plannedFor
  ) {
    nextState =
      "planned";
  }

  if (
    currentState ===
      "planned" &&
    !plannedFor
  ) {
    nextState =
      "idea";
  }

  const {
    data,
    error,
  } =
    await db
      .from(
        "diario_items"
      )
      .update({
        title:
          title.trim() ||
          current.title ||
          "Untitled Date",

        body:
          note?.trim() ||
          null,

        planned_for:
          plannedFor ||
          null,

        data: {
          ...(
            current.data ??
            {}
          ),

          place:
            place?.trim() ||
            null,

          itinerary:
            itinerary?.trim() ||
            null,

          flow_state:
            nextState,
        },
      })
      .eq(
        "user_id",
        userId
      )
      .eq(
        "id",
        dateId
      )
      .eq(
        "kind",
        "date"
      )
      .select("*")
      .single();

  if (
    error
  ) {
    throw error;
  }

  return data as DiarioItem;
}

export async function startDate({
  userId,
  dateId,
}: {
  userId: string;
  dateId: string;
}): Promise<DiarioItem> {
  const current =
    await getDateItem({
      userId,
      dateId,
    });

  const now =
    new Date()
      .toISOString();

  const {
    data,
    error,
  } =
    await db
      .from(
        "diario_items"
      )
      .update({
        event_at:
          current.event_at ??
          now,

        data: {
          ...(
            current.data ??
            {}
          ),

          flow_state:
            "live",

          started_at:
            current.data
              ?.started_at ??
            now,
        },
      })
      .eq(
        "user_id",
        userId
      )
      .eq(
        "id",
        dateId
      )
      .eq(
        "kind",
        "date"
      )
      .select("*")
      .single();

  if (
    error
  ) {
    throw error;
  }

  return data as DiarioItem;
}

export async function saveDateLiveNote({
  userId,
  dateId,
  note,
}: {
  userId: string;
  dateId: string;
  note: string;
}): Promise<DiarioItem> {
  const current =
    await getDateItem({
      userId,
      dateId,
    });

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
            current.data ??
            {}
          ),

          live_note:
            note.trim() ||
            null,
        },
      })
      .eq(
        "user_id",
        userId
      )
      .eq(
        "id",
        dateId
      )
      .select("*")
      .single();

  if (
    error
  ) {
    throw error;
  }

  return data as DiarioItem;
}

export async function finishDate({
  userId,
  dateId,
  summary,
}: {
  userId: string;
  dateId: string;
  summary?: string;
}): Promise<DiarioItem> {
  const current =
    await getDateItem({
      userId,
      dateId,
    });

  const now =
    new Date()
      .toISOString();

  const {
    data,
    error,
  } =
    await db
      .from(
        "diario_items"
      )
      .update({
        event_at:
          current.event_at ??
          now,

        data: {
          ...(
            current.data ??
            {}
          ),

          flow_state:
            "past",

          started_at:
            current.data
              ?.started_at ??
            current.event_at ??
            now,

          finished_at:
            now,

          summary:
            summary?.trim() ||
            null,
        },
      })
      .eq(
        "user_id",
        userId
      )
      .eq(
        "id",
        dateId
      )
      .eq(
        "kind",
        "date"
      )
      .select("*")
      .single();

  if (
    error
  ) {
    throw error;
  }

  return data as DiarioItem;
}

export async function setDateLook({
  userId,
  dateId,
  role,
  lookId,
}: {
  userId: string;
  dateId: string;
  role: DateLookRole;
  lookId: string | null;
}): Promise<DiarioItem> {
  const current =
    await getDateItem({
      userId,
      dateId,
    });

  const {
    error:
      deleteError,
  } =
    await db
      .from(
        "diario_links"
      )
      .delete()
      .eq(
        "user_id",
        userId
      )
      .eq(
        "source_item_id",
        dateId
      )
      .eq(
        "relation",
        "date_look"
      )
      .contains(
        "data",
        {
          role,
        }
      );

  if (
    deleteError
  ) {
    throw deleteError;
  }

  if (
    lookId
  ) {
    const {
      error:
        linkError,
    } =
      await db
        .from(
          "diario_links"
        )
        .insert({
          user_id:
            userId,

          source_item_id:
            dateId,

          target_item_id:
            lookId,

          relation:
            "date_look",

          data: {
            role,
          },
        });

    if (
      linkError
    ) {
      throw linkError;
    }
  }

  const dataKey =
    role ===
      "alloah"
      ? "alloah_look_id"
      : "dominic_look_id";

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
            current.data ??
            {}
          ),

          [dataKey]:
            lookId,
        },
      })
      .eq(
        "user_id",
        userId
      )
      .eq(
        "id",
        dateId
      )
      .select("*")
      .single();

  if (
    error
  ) {
    throw error;
  }

  return data as DiarioItem;
}

export async function getDateCandidateItems(
  userId: string
): Promise<DiarioItem[]> {
  const {
    data,
    error,
  } =
    await db
      .from(
        "diario_items"
      )
      .select("*")
      .eq(
        "user_id",
        userId
      )
      .eq(
        "status",
        "active"
      )
      .in(
        "kind",
        [
          "photo",
          "song",
          "place",
          "keepsake",
          "look",
          "letter",
        ]
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      )
      .limit(
        80
      );

  if (
    error
  ) {
    throw error;
  }

  return (
    data ??
    []
  ) as DiarioItem[];
}

export async function getDateConnectedThings({
  userId,
  dateId,
}: {
  userId: string;
  dateId: string;
}): Promise<
  DateConnectedThing[]
> {
  const {
    data:
      links,
    error:
      linkError,
  } =
    await db
      .from(
        "diario_links"
      )
      .select(
        "target_item_id,relation,data"
      )
      .eq(
        "user_id",
        userId
      )
      .eq(
        "source_item_id",
        dateId
      )
      .in(
        "relation",
        [
          "contains",
          "date_look",
        ]
      );

  if (
    linkError
  ) {
    throw linkError;
  }

  const rows =
    links ??
    [];

  const ids =
    Array.from(
      new Set(
        rows
          .map(
            (
              link: any
            ) =>
              link
                .target_item_id
          )
          .filter(
            Boolean
          )
      )
    );

  if (
    ids.length ===
    0
  ) {
    return [];
  }

  const {
    data:
      items,
    error:
      itemError,
  } =
    await db
      .from(
        "diario_items"
      )
      .select("*")
      .eq(
        "user_id",
        userId
      )
      .eq(
        "status",
        "active"
      )
      .in(
        "id",
        ids
      );

  if (
    itemError
  ) {
    throw itemError;
  }

  const itemMap =
    new Map(
      (
        items ??
        []
      ).map(
        (
          item: DiarioItem
        ) => [
          item.id,
          item,
        ]
      )
    );

  return rows
    .map(
      (
        link: any
      ): DateConnectedThing | null => {
        const item =
          itemMap.get(
            link
              .target_item_id
          );

        if (
          !item
        ) {
          return null;
        }

        const role =
          link
            .data
            ?.role;

        return {
          item,

          relation:
            link
              .relation,

          role:
            role ===
              "alloah" ||
            role ===
              "dominic"
              ? role
              : undefined,
        };
      }
    )
    .filter(
      (
        item: DateConnectedThing | null
      ): item is DateConnectedThing =>
        item !==
        null
    );
}

export async function toggleDateContainedItem({
  userId,
  dateId,
  itemId,
}: {
  userId: string;
  dateId: string;
  itemId: string;
}): Promise<boolean> {
  const {
    data:
      existing,
    error:
      existingError,
  } =
    await db
      .from(
        "diario_links"
      )
      .select("id")
      .eq(
        "user_id",
        userId
      )
      .eq(
        "source_item_id",
        dateId
      )
      .eq(
        "target_item_id",
        itemId
      )
      .eq(
        "relation",
        "contains"
      )
      .limit(1);

  if (
    existingError
  ) {
    throw existingError;
  }

  if (
    (
      existing ??
      []
    ).length >
    0
  ) {
    const {
      error:
        deleteError,
    } =
      await db
        .from(
          "diario_links"
        )
        .delete()
        .eq(
          "user_id",
          userId
        )
        .eq(
          "source_item_id",
          dateId
        )
        .eq(
          "target_item_id",
          itemId
        )
        .eq(
          "relation",
          "contains"
        );

    if (
      deleteError
    ) {
      throw deleteError;
    }

    return false;
  }

  const {
    error:
      insertError,
  } =
    await db
      .from(
        "diario_links"
      )
      .insert({
        user_id:
          userId,

        source_item_id:
          dateId,

        target_item_id:
          itemId,

        relation:
          "contains",

        data: {},
      });

  if (
    insertError
  ) {
    throw insertError;
  }

  return true;
}

export async function createMemoryFromDate({
  userId,
  date,
}: {
  userId: string;
  date: DiarioItem;
}): Promise<DiarioItem> {
  const {
    data:
      existingLinks,
    error:
      linkError,
  } =
    await db
      .from(
        "diario_links"
      )
      .select(
        "source_item_id"
      )
      .eq(
        "user_id",
        userId
      )
      .eq(
        "target_item_id",
        date.id
      )
      .eq(
        "relation",
        "contains"
      );

  if (
    linkError
  ) {
    throw linkError;
  }

  const sourceIds =
    (
      existingLinks ??
      []
    )
      .map(
        (
          link: any
        ) =>
          link
            .source_item_id
      )
      .filter(
        Boolean
      );

  if (
    sourceIds.length >
    0
  ) {
    const {
      data:
        existingMemories,
      error:
        memoryError,
    } =
      await db
        .from(
          "diario_items"
        )
        .select("*")
        .eq(
          "user_id",
          userId
        )
        .eq(
          "kind",
          "story_memory"
        )
        .eq(
          "status",
          "active"
        )
        .in(
          "id",
          sourceIds
        )
        .limit(1);

    if (
      memoryError
    ) {
      throw memoryError;
    }

    if (
      existingMemories?.[0]
    ) {
      return existingMemories[0] as DiarioItem;
    }
  }

  const summary =
    cleanString(
      date.data
        ?.summary
    ) ||
    cleanString(
      date.data
        ?.live_note
    ) ||
    cleanString(
      date.body
    );

  const memory =
    await createMemory({
      userId,

      title:
        date.title ??
        "Our Date",

      body:
        summary ||
        `A Date at ${
          cleanString(
            date.data
              ?.place
          ) ||
          "a place we shared"
        }.`,

      eventAt:
        date.event_at ??
        date.planned_for ??
        new Date()
          .toISOString(),
    });

  const {
    error:
      connectionError,
  } =
    await db
      .from(
        "diario_links"
      )
      .upsert(
        {
          user_id:
            userId,

          source_item_id:
            memory.id,

          target_item_id:
            date.id,

          relation:
            "contains",

          data: {
            origin:
              "date_summary",
          },
        },
        {
          onConflict:
            "user_id,source_item_id,target_item_id,relation",
        }
      );

  if (
    connectionError
  ) {
    throw connectionError;
  }

  return memory;
}
