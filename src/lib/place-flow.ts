import {
  supabase,
} from "@/integrations/supabase/client";

import type {
  DiarioItem,
} from "@/lib/diario-world";

const db =
  supabase as any;

export type PlaceStatus =
  | "saved"
  | "visited";

export type PlaceDateConnection = {
  date:
    DiarioItem;

  relation:
    string;

  direction:
    | "incoming"
    | "outgoing";
};

function clean(
  value:
    unknown
) {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

export function placeStatusOf(
  place:
    DiarioItem
): PlaceStatus {
  return place.data
    ?.placeStatus ===
    "visited"
    ? "visited"
    : "saved";
}

export async function updatePlaceDetails({
  userId,
  place,
  title,
  neighborhood,
  placeType,
  note,
}: {
  userId:
    string;

  place:
    DiarioItem;

  title:
    string;

  neighborhood:
    string;

  placeType:
    string;

  note:
    string;
}): Promise<DiarioItem> {
  const nextTitle =
    clean(
      title
    ) ||
    clean(
      place.title
    ) ||
    "Untitled place";

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
          nextTitle,

        body:
          clean(
            note
          ) ||
          null,

        data: {
          ...(
            place.data ??
            {}
          ),

          neighborhood:
            clean(
              neighborhood
            ) ||
            null,

          placeType:
            clean(
              placeType
            ) ||
            "place",
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

  if (
    error
  ) {
    throw error;
  }

  return data as DiarioItem;
}

export async function getPlaceDates({
  userId,
  placeId,
}: {
  userId:
    string;

  placeId:
    string;
}): Promise<
  PlaceDateConnection[]
> {
  const [
    incomingResult,
    outgoingResult,
  ] =
    await Promise.all([
      db
        .from(
          "diario_links"
        )
        .select(
          "source_item_id,target_item_id,relation"
        )
        .eq(
          "user_id",
          userId
        )
        .eq(
          "target_item_id",
          placeId
        )
        .in(
          "relation",
          [
            "at_place",
            "contains",
          ]
        ),

      db
        .from(
          "diario_links"
        )
        .select(
          "source_item_id,target_item_id,relation"
        )
        .eq(
          "user_id",
          userId
        )
        .eq(
          "source_item_id",
          placeId
        )
        .in(
          "relation",
          [
            "at_place",
            "contains",
          ]
        ),
    ]);

  if (
    incomingResult.error
  ) {
    throw incomingResult.error;
  }

  if (
    outgoingResult.error
  ) {
    throw outgoingResult.error;
  }

  const incoming =
    incomingResult.data ??
    [];

  const outgoing =
    outgoingResult.data ??
    [];

  const ids =
    Array.from(
      new Set([
        ...incoming
          .map(
            (
              link: any
            ) =>
              link
                .source_item_id
          ),

        ...outgoing
          .map(
            (
              link: any
            ) =>
              link
                .target_item_id
          ),
      ])
    ).filter(
      Boolean
    );

  if (
    ids.length ===
    0
  ) {
    return [];
  }

  const {
    data:
      dateRows,
    error:
      dateError,
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
        "date"
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
    dateError
  ) {
    throw dateError;
  }

  const dateMap =
    new Map(
      (
        dateRows ??
        []
      ).map(
        (
          date:
            DiarioItem
        ) => [
          date.id,
          date,
        ]
      )
    );

  const connections:
    PlaceDateConnection[] =
      [];

  incoming.forEach(
    (
      link:
        any
    ) => {
      const date =
        dateMap.get(
          link
            .source_item_id
        );

      if (
        !date
      ) {
        return;
      }

      connections.push({
        date,

        relation:
          link.relation,

        direction:
          "incoming",
      });
    }
  );

  outgoing.forEach(
    (
      link:
        any
    ) => {
      const date =
        dateMap.get(
          link
            .target_item_id
        );

      if (
        !date
      ) {
        return;
      }

      if (
        connections.some(
          (
            existing
          ) =>
            existing
              .date
              .id ===
            date.id
        )
      ) {
        return;
      }

      connections.push({
        date,

        relation:
          link.relation,

        direction:
          "outgoing",
      });
    }
  );

  return connections.sort(
    (
      first,
      second
    ) => {
      const firstMoment =
        first.date
          .event_at ??
        first.date
          .planned_for ??
        first.date
          .created_at;

      const secondMoment =
        second.date
          .event_at ??
        second.date
          .planned_for ??
        second.date
          .created_at;

      return (
        new Date(
          secondMoment
        ).getTime() -
        new Date(
          firstMoment
        ).getTime()
      );
    }
  );
}

export async function getPlaceDateCandidates(
  userId:
    string
): Promise<
  DiarioItem[]
> {
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
        "kind",
        "date"
      )
      .eq(
        "status",
        "active"
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
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

export async function toggleDatePlace({
  userId,
  place,
  date,
}: {
  userId:
    string;

  place:
    DiarioItem;

  date:
    DiarioItem;
}): Promise<{
  connected:
    boolean;

  place:
    DiarioItem;
}> {
  const [
    directResult,
    reverseResult,
  ] =
    await Promise.all([
      db
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
          date.id
        )
        .eq(
          "target_item_id",
          place.id
        )
        .in(
          "relation",
          [
            "at_place",
            "contains",
          ]
        ),

      db
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
          place.id
        )
        .eq(
          "target_item_id",
          date.id
        )
        .in(
          "relation",
          [
            "at_place",
            "contains",
          ]
        ),
    ]);

  if (
    directResult.error
  ) {
    throw directResult.error;
  }

  if (
    reverseResult.error
  ) {
    throw reverseResult.error;
  }

  const existingIds =
    [
      ...(
        directResult.data ??
        []
      ),

      ...(
        reverseResult.data ??
        []
      ),
    ]
      .map(
        (
          row: any
        ) =>
          row.id
      )
      .filter(
        Boolean
      );

  if (
    existingIds.length >
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
        .in(
          "id",
          existingIds
        );

    if (
      deleteError
    ) {
      throw deleteError;
    }

    return {
      connected:
        false,

      place,
    };
  }

  const {
    error:
      linkError,
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
            date.id,

          target_item_id:
            place.id,

          relation:
            "at_place",

          data: {},
        },
        {
          onConflict:
            "user_id,source_item_id,target_item_id,relation",
        }
      );

  if (
    linkError
  ) {
    throw linkError;
  }

  const existingPlaceText =
    clean(
      date.data
        ?.place
    );

  if (
    !existingPlaceText &&
    place.title
  ) {
    const {
      error:
        dateUpdateError,
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

            place:
              place.title,
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
        );

    if (
      dateUpdateError
    ) {
      throw dateUpdateError;
    }
  }

  let updatedPlace =
    place;

  if (
    date.event_at &&
    placeStatusOf(
      place
    ) !==
      "visited"
  ) {
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
            place.event_at ??
            date.event_at,

          data: {
            ...(
              place.data ??
              {}
            ),

            placeStatus:
              "visited",
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

    if (
      error
    ) {
      throw error;
    }

    updatedPlace =
      data as DiarioItem;
  }

  return {
    connected:
      true,

    place:
      updatedPlace,
  };
}
