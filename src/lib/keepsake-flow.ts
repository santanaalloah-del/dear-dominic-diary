import {
  supabase,
} from "@/integrations/supabase/client";

import type {
  DiarioItem,
} from "@/lib/diario-world";

const db =
  supabase as any;

export type KeepsakeConnectionKind =
  | "date"
  | "story_memory"
  | "place";

export type KeepsakeConnection = {
  item:
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

export function keepsakeLocationOf(
  keepsake:
    DiarioItem
):
  | "home"
  | "stored" {
  if (
    keepsake.data
      ?.location ===
    "gone"
  ) {
    return "gone";
  }

  return keepsake.data
    ?.location ===
    "stored"
    ? "stored"
    : "home";
}

export async function updateKeepsakeDetails({
  userId,
  keepsake,
  title,
  keepsakeType,
  location,
  room,
  origin,
  note,
  storagePath,
}: {
  userId:
    string;

  keepsake:
    DiarioItem;

  title:
    string;

  keepsakeType:
    string;

  location:
    | "home"
    | "stored"
    | "gone";

  room:
    string;

  origin:
    string;

  note:
    string;

  storagePath?:
    string | null;
}): Promise<DiarioItem> {
  const nextTitle =
    clean(
      title
    ) ||
    clean(
      keepsake.title
    ) ||
    "Untitled keepsake";

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
            keepsake.data ??
            {}
          ),

          keepsakeType:
            clean(
              keepsakeType
            ) ||
            "object",

          location,

          room:
            location ===
            "home"
              ? clean(
                  room
                ) ||
                null
              : null,

          consumed:
            location ===
            "gone",

          origin:
            clean(
              origin
            ) ||
            null,

          ...(storagePath !== undefined
            ? {
                storage_bucket:
                  storagePath
                    ? "diario-media"
                    : null,
                storage_path:
                  storagePath ?? null,
              }
            : {}),
        },
      })
      .eq(
        "user_id",
        userId
      )
      .eq(
        "id",
        keepsake.id
      )
      .eq(
        "kind",
        "keepsake"
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

export async function getKeepsakeConnections({
  userId,
  keepsakeId,
}: {
  userId:
    string;

  keepsakeId:
    string;
}): Promise<
  KeepsakeConnection[]
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
          keepsakeId
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
          keepsakeId
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
        ...incoming.map(
          (
            link: any
          ) =>
            link
              .source_item_id
        ),

        ...outgoing.map(
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
      relatedRows,
    error:
      relatedError,
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
      )
      .in(
        "kind",
        [
          "date",
          "story_memory",
          "place",
        ]
      );

  if (
    relatedError
  ) {
    throw relatedError;
  }

  const itemMap =
    new Map(
      (
        relatedRows ??
        []
      ).map(
        (
          item:
            DiarioItem
        ) => [
          item.id,
          item,
        ]
      )
    );

  const connections:
    KeepsakeConnection[] =
      [];

  incoming.forEach(
    (
      link: any
    ) => {
      const item =
        itemMap.get(
          link
            .source_item_id
        );

      if (
        !item
      ) {
        return;
      }

      connections.push({
        item,

        relation:
          link.relation,

        direction:
          "incoming",
      });
    }
  );

  outgoing.forEach(
    (
      link: any
    ) => {
      const item =
        itemMap.get(
          link
            .target_item_id
        );

      if (
        !item
      ) {
        return;
      }

      if (
        connections.some(
          (
            existing
          ) =>
            existing
              .item
              .id ===
            item.id
        )
      ) {
        return;
      }

      connections.push({
        item,

        relation:
          link.relation,

        direction:
          "outgoing",
      });
    }
  );

  return connections;
}

export async function getKeepsakeConnectionCandidates(
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
        "status",
        "active"
      )
      .in(
        "kind",
        [
          "date",
          "story_memory",
          "place",
        ]
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

export async function toggleKeepsakeConnection({
  userId,
  keepsakeId,
  target,
}: {
  userId:
    string;

  keepsakeId:
    string;

  target:
    DiarioItem;
}): Promise<boolean> {
  const [
    normalResult,
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
          target.id
        )
        .eq(
          "target_item_id",
          keepsakeId
        )
        .eq(
          "relation",
          "contains"
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
          keepsakeId
        )
        .eq(
          "target_item_id",
          target.id
        )
        .eq(
          "relation",
          "contains"
        ),
    ]);

  if (
    normalResult.error
  ) {
    throw normalResult.error;
  }

  if (
    reverseResult.error
  ) {
    throw reverseResult.error;
  }

  const existingIds =
    [
      ...(
        normalResult.data ??
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
      .upsert(
        {
          user_id:
            userId,

          source_item_id:
            target.id,

          target_item_id:
            keepsakeId,

          relation:
            "contains",

          data: {
            origin:
              "keepsake_screen",
          },
        },
        {
          onConflict:
            "user_id,source_item_id,target_item_id,relation",
        }
      );

  if (
    insertError
  ) {
    throw insertError;
  }

  return true;
}
