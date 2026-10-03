import { supabase } from "@/integrations/supabase/client";

export type WardrobeOwner = "alloah" | "dominic";

export const WARDROBE_WEARING_CHANGED_EVENT =
  "diario:wardrobe-wearing-changed";

function notifyWearingChanged(
  owner: WardrobeOwner
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(
      WARDROBE_WEARING_CHANGED_EVENT,
      {
        detail: {
          owner,
        },
      }
    )
  );
}

export type WearingSelection = {
  lookId: string | null;
  clothingIds: string[];
  updatedAt: string;
};

export type WardrobePhotoContext = {
  owner: WardrobeOwner;
  lookId: string | null;
  lookTitle: string | null;
  lookNote: string | null;
  clothing: Array<{
    id: string;
    title: string;
    category: string;
    note: string | null;
  }>;
  updatedAt: string;
};

type SettingsRow = {
  user_id: string;
  data: Record<string, unknown> | null;
};

type DiarioItemRow = {
  id: string;
  owner: string;
  kind: string;
  status: string;
  title: string | null;
  body: string | null;
  data: Record<string, unknown> | null;
};

function emptySelection(): WearingSelection | null {
  return null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function parseSelection(value: unknown): WearingSelection | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return emptySelection();
  }

  const raw = value as Record<string, unknown>;
  const lookId = typeof raw.lookId === "string" ? raw.lookId : null;
  const clothingIds = stringArray(raw.clothingIds);
  const updatedAt =
    typeof raw.updatedAt === "string" ? raw.updatedAt : new Date(0).toISOString();

  if (!lookId && clothingIds.length === 0) return null;

  return {
    lookId,
    clothingIds,
    updatedAt,
  };
}

function wardrobeMapFromData(data: Record<string, unknown> | null | undefined) {
  const raw =
    data?.wardrobe_wearing &&
    typeof data.wardrobe_wearing === "object" &&
    !Array.isArray(data.wardrobe_wearing)
      ? (data.wardrobe_wearing as Record<string, unknown>)
      : {};

  return {
    alloah: parseSelection(raw.alloah),
    dominic: parseSelection(raw.dominic),
  } as Record<WardrobeOwner, WearingSelection | null>;
}

async function loadSettingsRow(userId: string): Promise<SettingsRow | null> {
  const { data, error } = await (supabase as any)
    .from("diario_settings")
    .select("user_id,data")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as SettingsRow | null;
}

async function saveOwnerSelection({
  userId,
  owner,
  selection,
}: {
  userId: string;
  owner: WardrobeOwner;
  selection: WearingSelection | null;
}) {
  const current = await loadSettingsRow(userId);
  const currentData =
    current?.data && typeof current.data === "object" ? current.data : {};
  const currentMap = wardrobeMapFromData(currentData);

  const nextMap = {
    ...currentMap,
    [owner]: selection,
  };

  const { error } = await (supabase as any)
    .from("diario_settings")
    .upsert(
      {
        user_id: userId,
        data: {
          ...currentData,
          wardrobe_wearing: nextMap,
        },
      },
      { onConflict: "user_id" }
    );

  if (error) throw error;

  notifyWearingChanged(
    owner
  );

  return selection;
}

async function getActiveLook({
  userId,
  owner,
  lookId,
}: {
  userId: string;
  owner: WardrobeOwner;
  lookId: string;
}): Promise<DiarioItemRow> {
  const { data, error } = await (supabase as any)
    .from("diario_items")
    .select("id,owner,kind,status,title,body,data")
    .eq("user_id", userId)
    .eq("id", lookId)
    .eq("owner", owner)
    .eq("kind", "look")
    .eq("status", "active")
    .single();

  if (error) throw error;
  return data as DiarioItemRow;
}

async function getLookClothingIds({
  userId,
  lookId,
}: {
  userId: string;
  lookId: string;
}) {
  const { data, error } = await (supabase as any)
    .from("diario_links")
    .select("target_item_id")
    .eq("user_id", userId)
    .eq("source_item_id", lookId)
    .eq("relation", "contains");

  if (error) throw error;

  return (data ?? [])
    .map((item: { target_item_id?: unknown }) => item.target_item_id)
    .filter((id: unknown): id is string => typeof id === "string");
}

async function validateClothingIds({
  userId,
  owner,
  clothingIds,
}: {
  userId: string;
  owner: WardrobeOwner;
  clothingIds: string[];
}) {
  const uniqueIds = Array.from(new Set(clothingIds));
  if (!uniqueIds.length) return [];

  const { data, error } = await (supabase as any)
    .from("diario_items")
    .select("id")
    .eq("user_id", userId)
    .eq("owner", owner)
    .eq("kind", "clothing")
    .eq("status", "active")
    .in("id", uniqueIds);

  if (error) throw error;

  const valid = new Set(
    (data ?? [])
      .map((item: { id?: unknown }) => item.id)
      .filter((id: unknown): id is string => typeof id === "string")
  );

  return uniqueIds.filter((id) => valid.has(id));
}

export async function getWearingSelection({
  userId,
  owner,
}: {
  userId: string;
  owner: WardrobeOwner;
}): Promise<WearingSelection | null> {
  const settings = await loadSettingsRow(userId);
  return wardrobeMapFromData(settings?.data)[owner];
}

export async function setWearingLook({
  userId,
  owner,
  lookId,
}: {
  userId: string;
  owner: WardrobeOwner;
  lookId: string;
}): Promise<WearingSelection> {
  await getActiveLook({ userId, owner, lookId });
  const clothingIds = await getLookClothingIds({ userId, lookId });

  const selection: WearingSelection = {
    lookId,
    clothingIds,
    updatedAt: new Date().toISOString(),
  };

  await saveOwnerSelection({ userId, owner, selection });
  return selection;
}

export async function setWearingClothing({
  userId,
  owner,
  clothingIds,
}: {
  userId: string;
  owner: WardrobeOwner;
  clothingIds: string[];
}): Promise<WearingSelection | null> {
  const validIds = await validateClothingIds({ userId, owner, clothingIds });

  if (!validIds.length) {
    await saveOwnerSelection({ userId, owner, selection: null });
    return null;
  }

  const selection: WearingSelection = {
    lookId: null,
    clothingIds: validIds,
    updatedAt: new Date().toISOString(),
  };

  await saveOwnerSelection({ userId, owner, selection });
  return selection;
}

export async function clearWearing({
  userId,
  owner,
}: {
  userId: string;
  owner: WardrobeOwner;
}) {
  await saveOwnerSelection({ userId, owner, selection: null });
}

export async function getWardrobePhotoContext({
  userId,
  owner,
}: {
  userId: string;
  owner: WardrobeOwner;
}): Promise<WardrobePhotoContext | null> {
  const selection = await getWearingSelection({ userId, owner });
  if (!selection) return null;

  const lookPromise = selection.lookId
    ? (supabase as any)
        .from("diario_items")
        .select("id,title,body")
        .eq("user_id", userId)
        .eq("id", selection.lookId)
        .eq("owner", owner)
        .eq("kind", "look")
        .eq("status", "active")
        .maybeSingle()
    : Promise.resolve({ data: null, error: null });

  const clothingPromise = selection.clothingIds.length
    ? (supabase as any)
        .from("diario_items")
        .select("id,title,body,data")
        .eq("user_id", userId)
        .eq("owner", owner)
        .eq("kind", "clothing")
        .eq("status", "active")
        .in("id", selection.clothingIds)
    : Promise.resolve({ data: [], error: null });

  const [lookResult, clothingResult] = await Promise.all([
    lookPromise,
    clothingPromise,
  ]);

  if (lookResult.error) throw lookResult.error;
  if (clothingResult.error) throw clothingResult.error;

  const look = lookResult.data as
    | { id: string; title: string | null; body: string | null }
    | null;

  const clothingRows = (clothingResult.data ?? []) as Array<{
    id: string;
    title: string | null;
    body: string | null;
    data: Record<string, unknown> | null;
  }>;

  const clothingById = new Map(clothingRows.map((item) => [item.id, item]));

  const clothing = selection.clothingIds
    .map((id) => clothingById.get(id) ?? null)
    .filter(
      (
        item
      ): item is {
        id: string;
        title: string | null;
        body: string | null;
        data: Record<string, unknown> | null;
      } => item !== null
    )
    .map((item) => ({
      id: item.id,
      title: item.title?.trim() || "Untitled clothing",
      category:
        typeof item.data?.category === "string" ? item.data.category : "other",
      note: item.body?.trim() || null,
    }));

  if (!look && !clothing.length) return null;

  return {
    owner,
    lookId: look?.id ?? null,
    lookTitle: look?.title?.trim() || null,
    lookNote: look?.body?.trim() || null,
    clothing,
    updatedAt: selection.updatedAt,
  };
}

export async function getWardrobePhotoContexts({
  userId,
  owners,
}: {
  userId: string;
  owners: WardrobeOwner[];
}) {
  const contexts = await Promise.all(
    Array.from(new Set(owners)).map((owner) =>
      getWardrobePhotoContext({ userId, owner })
    )
  );

  return contexts.filter(
    (context): context is WardrobePhotoContext => Boolean(context)
  );
}
