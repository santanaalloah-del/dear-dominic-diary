import { supabase } from "@/integrations/supabase/client";
import type { DiarioItem, DiarioItemKind } from "@/lib/diario-world";

const db = supabase as any;

export type ConnectedDiaryView = {
  item: DiarioItem;
  mediaUrl: string | null;
};

export type MemoryConnectionMap = Record<string, ConnectedDiaryView[]>;


export type ConnectedDiaryRelation = {
  relation: string;
  direction: "outgoing" | "incoming";
  view: ConnectedDiaryView;
};

export type ConnectedSourceScreen =
  | "gallery"
  | "letters"
  | "music"
  | "dates"
  | "places"
  | "keepsakes"
  | "wardrobe"
  | "diary"
  | "memories"
  | "chat"
  | "home"
  | "calendar";

function safeObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function itemMoment(item: DiarioItem) {
  return item.event_at ?? item.planned_for ?? item.created_at;
}

function storageInfo(item: DiarioItem) {
  const data = safeObject(item.data);

  const bucket =
    typeof data.storage_bucket === "string"
      ? data.storage_bucket
      : null;

  const path =
    typeof data.storage_path === "string"
      ? data.storage_path
      : null;

  return bucket && path ? { bucket, path } : null;
}

async function mediaUrlForItem(item: DiarioItem): Promise<string | null> {
  const storage = storageInfo(item);

  if (storage) {
    const { data, error } = await db.storage
      .from(storage.bucket)
      .createSignedUrl(storage.path, 60 * 60);

    if (!error && data?.signedUrl) {
      return data.signedUrl;
    }
  }

  const data = safeObject(item.data);

  if (item.kind === "song" && typeof data.coverUrl === "string") {
    return data.coverUrl;
  }

  if (typeof data.imageUrl === "string") {
    return data.imageUrl;
  }

  return null;
}

export async function hydrateDiaryItems(
  items: DiarioItem[]
): Promise<ConnectedDiaryView[]> {
  const views = await Promise.all(
    items.map(async (item) => ({
      item,
      mediaUrl: await mediaUrlForItem(item),
    }))
  );

  return views;
}

async function loadItemsByIds({
  userId,
  ids,
}: {
  userId: string;
  ids: string[];
}): Promise<DiarioItem[]> {
  const uniqueIds = Array.from(new Set(ids));

  if (!uniqueIds.length) return [];

  const { data, error } = await db
    .from("diario_items")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .in("id", uniqueIds);

  if (error) throw error;

  const rows = (data ?? []) as DiarioItem[];
  const byId = new Map(rows.map((item) => [item.id, item]));

  return uniqueIds
    .map((id) => byId.get(id) ?? null)
    .filter((item): item is DiarioItem => item !== null);
}


export async function getConnectedDiaryItem({
  userId,
  itemId,
}: {
  userId: string;
  itemId: string;
}): Promise<ConnectedDiaryView | null> {
  const items = await loadItemsByIds({
    userId,
    ids: [itemId],
  });

  const hydrated = await hydrateDiaryItems(items);

  return hydrated[0] ?? null;
}

export async function getConnectedDiaryRelations({
  userId,
  itemId,
}: {
  userId: string;
  itemId: string;
}): Promise<ConnectedDiaryRelation[]> {
  const { data, error } = await db
    .from("diario_links")
    .select("source_item_id,target_item_id,relation")
    .eq("user_id", userId)
    .or(`source_item_id.eq.${itemId},target_item_id.eq.${itemId}`);

  if (error) throw error;

  const rows = (data ?? []) as Array<{
    source_item_id: string;
    target_item_id: string;
    relation: string;
  }>;

  const relatedIds = Array.from(
    new Set(
      rows
        .map((row) =>
          row.source_item_id === itemId
            ? row.target_item_id
            : row.source_item_id
        )
        .filter(Boolean)
    )
  );

  const relatedItems = await loadItemsByIds({
    userId,
    ids: relatedIds,
  });
  const hydrated = await hydrateDiaryItems(relatedItems);
  const viewById = new Map(
    hydrated.map((view) => [view.item.id, view])
  );

  return rows
    .map((row): ConnectedDiaryRelation | null => {
      const outgoing = row.source_item_id === itemId;
      const relatedId = outgoing
        ? row.target_item_id
        : row.source_item_id;
      const view = viewById.get(relatedId);

      if (!view) return null;

      return {
        relation: row.relation,
        direction: outgoing ? "outgoing" : "incoming",
        view,
      };
    })
    .filter(
      (item): item is ConnectedDiaryRelation =>
        item !== null
    );
}

export async function getMemoryConnectedItems({
  userId,
  memoryId,
}: {
  userId: string;
  memoryId: string;
}): Promise<ConnectedDiaryView[]> {
  const { data, error } = await db
    .from("diario_links")
    .select("target_item_id")
    .eq("user_id", userId)
    .eq("source_item_id", memoryId)
    .eq("relation", "contains");

  if (error) throw error;

  const ids = (data ?? [])
    .map((row: { target_item_id?: unknown }) => row.target_item_id)
    .filter((id: unknown): id is string => typeof id === "string");

  return hydrateDiaryItems(
    await loadItemsByIds({
      userId,
      ids,
    })
  );
}

export async function getMemoryConnectionMap({
  userId,
  memoryIds,
}: {
  userId: string;
  memoryIds: string[];
}): Promise<MemoryConnectionMap> {
  const uniqueMemoryIds = Array.from(new Set(memoryIds));

  if (!uniqueMemoryIds.length) return {};

  const { data, error } = await db
    .from("diario_links")
    .select("source_item_id,target_item_id")
    .eq("user_id", userId)
    .eq("relation", "contains")
    .in("source_item_id", uniqueMemoryIds);

  if (error) throw error;

  const rows = (data ?? []) as Array<{
    source_item_id: string;
    target_item_id: string;
  }>;

  const allTargetIds = rows.map((row) => row.target_item_id);
  const allItems = await loadItemsByIds({
    userId,
    ids: allTargetIds,
  });
  const hydrated = await hydrateDiaryItems(allItems);
  const viewById = new Map(
    hydrated.map((view) => [view.item.id, view])
  );

  const result: MemoryConnectionMap = Object.fromEntries(
    uniqueMemoryIds.map((id) => [id, []])
  );

  for (const row of rows) {
    const view = viewById.get(row.target_item_id);
    if (!view) continue;

    result[row.source_item_id] = [
      ...(result[row.source_item_id] ?? []),
      view,
    ];
  }

  return result;
}

const STRUCTURAL_KINDS = new Set<DiarioItemKind>([
  "story_memory",
  "album",
  "home_object",
]);

export async function getConnectableDiaryItems(
  userId: string
): Promise<ConnectedDiaryView[]> {
  const { data, error } = await db
    .from("diario_items")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("event_at", {
      ascending: false,
      nullsFirst: false,
    })
    .order("created_at", {
      ascending: false,
    })
    .limit(250);

  if (error) throw error;

  const items = ((data ?? []) as DiarioItem[])
    .filter((item) => !STRUCTURAL_KINDS.has(item.kind))
    .sort(
      (a, b) =>
        new Date(itemMoment(b)).getTime() -
        new Date(itemMoment(a)).getTime()
    );

  return hydrateDiaryItems(items);
}

export async function getRelatedDiaryItems({
  userId,
  itemId,
}: {
  userId: string;
  itemId: string;
}): Promise<ConnectedDiaryView[]> {
  const { data, error } = await db
    .from("diario_links")
    .select("source_item_id,target_item_id,relation")
    .eq("user_id", userId)
    .or(`source_item_id.eq.${itemId},target_item_id.eq.${itemId}`);

  if (error) throw error;

  const relatedIds = Array.from(
    new Set(
      (data ?? [])
        .flatMap(
          (row: {
            source_item_id?: unknown;
            target_item_id?: unknown;
          }) => [
            row.source_item_id,
            row.target_item_id,
          ]
        )
        .filter(
          (id: unknown): id is string =>
            typeof id === "string" && id !== itemId
        )
    )
  );

  return hydrateDiaryItems(
    await loadItemsByIds({
      userId,
      ids: relatedIds,
    })
  );
}

export function connectedKindLabel(kind: DiarioItemKind) {
  const labels: Partial<Record<DiarioItemKind, string>> = {
    diary: "Diary",
    letter: "Letter",
    photo: "Photo",
    video: "Video",
    album: "Album",
    date: "Date",
    place: "Place",
    keepsake: "Keepsake",
    clothing: "Clothing",
    look: "Outfit",
    song: "Music",
    story_memory: "Memory",
    note: "Note",
    plan: "Plan",
    chat_media: "Chat",
    home_object: "Home",
    home_change: "Home",
  };

  return labels[kind] ?? kind.replaceAll("_", " ");
}

export function connectedMoment(item: DiarioItem) {
  return itemMoment(item);
}


export function connectedSourceScreen(
  kind: DiarioItemKind
): ConnectedSourceScreen | null {
  switch (kind) {
    case "photo":
    case "video":
    case "album":
      return "gallery";

    case "letter":
      return "letters";

    case "song":
      return "music";

    case "date":
      return "dates";

    case "place":
      return "places";

    case "keepsake":
      return "keepsakes";

    case "clothing":
    case "look":
      return "wardrobe";

    case "diary":
      return "diary";

    case "story_memory":
      return "memories";

    case "chat_media":
      return "chat";

    case "home_object":
    case "home_change":
      return "home";

    case "plan":
      return "calendar";

    default:
      return null;
  }
}

export function connectedRelationLabel(
  relation: ConnectedDiaryRelation
) {
  const relatedKind = relation.view.item.kind;

  if (
    relation.direction === "incoming" &&
    relatedKind === "story_memory"
  ) {
    return "In Memory";
  }

  if (
    relation.direction === "incoming" &&
    relatedKind === "date"
  ) {
    return "From Date";
  }

  if (
    relation.direction === "incoming" &&
    relatedKind === "place"
  ) {
    return "At";
  }

  if (
    relation.direction === "incoming" &&
    relatedKind === "chat_media"
  ) {
    return "From Chat";
  }

  if (
    relation.direction === "incoming" &&
    (relatedKind === "look" ||
      relatedKind === "clothing")
  ) {
    return "Wearing";
  }

  if (
    relation.direction === "outgoing" &&
    relation.relation === "contains"
  ) {
    return "Contains";
  }

  return relation.relation
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
}
