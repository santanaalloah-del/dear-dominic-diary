import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type DiarioOwner =
  | "alloah"
  | "dominic"
  | "shared";

export type DiarioItemKind =
  | "diary"
  | "letter"
  | "photo"
  | "video"
  | "album"
  | "date"
  | "place"
  | "keepsake"
  | "clothing"
  | "look"
  | "song"
  | "story_memory"
  | "note"
  | "plan"
  | "home_object"
  | "home_change";

export type DiarioItem = {
  id: string;
  user_id: string;
  kind: DiarioItemKind;
  owner: DiarioOwner;
  status: string;
  title: string | null;
  body: string | null;
  event_at: string | null;
  planned_for: string | null;
  data: any;
  created_at: string;
  updated_at: string;
};

type SaveDiaryPageInput = {
  id?: string | undefined;
  userId: string;
  owner: "alloah" | "dominic";
  body: string;
  localDate: string;
  eventAt: string;
};

const diarioSupabase =
  supabase as unknown as SupabaseClient<any>;

export async function getDiaryPages(
  userId: string,
  owner: "alloah" | "dominic"
): Promise<DiarioItem[]> {
  const { data, error } = await diarioSupabase
    .from("diario_items")
    .select("*")
    .eq("user_id", userId)
    .eq("kind", "diary")
    .eq("owner", owner)
    .eq("status", "active")
    .order("event_at", {
      ascending: false,
      nullsFirst: false,
    });

  if (error) {
    throw error;
  }

  return (data ?? []) as DiarioItem[];
}

export async function saveDiaryPage({
  id,
  userId,
  owner,
  body,
  localDate,
  eventAt,
}: SaveDiaryPageInput): Promise<DiarioItem> {
  const cleanBody = body.trim();

  if (!cleanBody) {
    throw new Error(
      "A diary page cannot be empty."
    );
  }

  const values = {
    user_id: userId,
    kind: "diary",
    owner,
    status: "active",
    title: null,
    body: cleanBody,
    event_at: eventAt,
    data: {
      local_date: localDate,
    },
  };

  if (id) {
    const { data, error } = await diarioSupabase
      .from("diario_items")
      .update(values)
      .eq("id", id)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return data as DiarioItem;
  }

  const { data, error } = await diarioSupabase
    .from("diario_items")
    .insert(values)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as DiarioItem;
}

export function getLocalDateKey(
  date = new Date()
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
type CreateLetterInput = {
  userId: string;
  owner: "alloah" | "dominic";
  title: string;
  body: string;
};

export async function getLetters(
  userId: string
): Promise<DiarioItem[]> {
  const { data, error } = await diarioSupabase
    .from("diario_items")
    .select("*")
    .eq("user_id", userId)
    .eq("kind", "letter")
    .eq("status", "active")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return (data ?? []) as DiarioItem[];
}

export async function createLetter({
  userId,
  owner,
  title,
  body,
}: CreateLetterInput): Promise<DiarioItem> {
  const cleanTitle = title.trim();
  const cleanBody = body.trim();

  if (!cleanBody) {
    throw new Error(
      "A letter cannot be empty."
    );
  }

  const { data, error } = await diarioSupabase
    .from("diario_items")
    .insert({
      user_id: userId,
      kind: "letter",
      owner,
      status: "active",
      title:
        cleanTitle || "Untitled letter",
      body: cleanBody,
      event_at:
        new Date().toISOString(),
     data: {
  state: "written",
  opened:
    owner === "alloah",
},
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as DiarioItem;
}
export async function openLetter({
  userId,
  letterId,
}: {
  userId: string;
  letterId: string;
}): Promise<DiarioItem> {
  const {
    data: current,
    error: currentError,
  } = await diarioSupabase
    .from("diario_items")
    .select("*")
    .eq("user_id", userId)
    .eq("id", letterId)
    .eq("kind", "letter")
    .single();

  if (currentError) {
    throw currentError;
  }

  const {
    data,
    error,
  } = await diarioSupabase
    .from("diario_items")
    .update({
      data: {
        ...(current.data ?? {}),
        opened: true,
      },
    })
    .eq("user_id", userId)
    .eq("id", letterId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as DiarioItem;
}
type UploadGalleryPhotoInput = {
  userId: string;
  file: File;
};

export type GalleryPhoto = {
  item: DiarioItem;
  url: string;
};

function safeFileName(fileName: string) {
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}
export async function uploadHomeObjectImage({
  userId,
  file,
}: {
  userId: string;
  file: File;
}): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error(
      "Furniture needs an image file."
    );
  }

  const fileName = safeFileName(
    file.name || "furniture.jpg"
  );

  const storagePath =
    `${userId}/home/${crypto.randomUUID()}-${fileName}`;

  const { error } =
    await diarioSupabase.storage
      .from("diario-media")
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

  if (error) {
    throw error;
  }

  return storagePath;
}
export async function uploadGalleryPhoto({
  userId,
  file,
}: UploadGalleryPhotoInput): Promise<GalleryPhoto> {
  if (!file.type.startsWith("image/")) {
    throw new Error(
      "Only image files can be added to the Gallery right now."
    );
  }

  const fileName = safeFileName(
    file.name || "photo.jpg"
  );

  const storagePath =
    `${userId}/${crypto.randomUUID()}-${fileName}`;

  const {
    error: uploadError,
  } = await diarioSupabase.storage
    .from("diario-media")
    .upload(
      storagePath,
      file,
      {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      }
    );

  if (uploadError) {
    throw uploadError;
  }

  const {
    data: item,
    error: itemError,
  } = await diarioSupabase
    .from("diario_items")
    .insert({
      user_id: userId,
      kind: "photo",
      owner: "alloah",
      status: "active",
      title: file.name || "Photo",
      body: null,
      event_at:
        new Date().toISOString(),
      data: {
        storage_bucket:
          "diario-media",
        storage_path:
          storagePath,
        file_name:
          file.name,
        mime_type:
          file.type,
        size:
          file.size,
        favorite:
          false,
      },
    })
    .select("*")
    .single();

  if (itemError) {
    await diarioSupabase.storage
      .from("diario-media")
      .remove([storagePath]);

    throw itemError;
  }

  const {
    data: signedData,
    error: signedError,
  } = await diarioSupabase.storage
    .from("diario-media")
    .createSignedUrl(
      storagePath,
      60 * 60
    );

  if (signedError) {
    throw signedError;
  }

  return {
    item: item as DiarioItem,
    url: signedData.signedUrl,
  };
}

export async function getGalleryPhotos(
  userId: string
): Promise<GalleryPhoto[]> {
  const {
    data,
    error,
  } = await diarioSupabase
    .from("diario_items")
    .select("*")
    .eq("user_id", userId)
    .eq("kind", "photo")
    .eq("status", "active")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  const items =
    (data ?? []) as DiarioItem[];

  const photos =
    await Promise.all(
      items.map(
        async (
          item
        ): Promise<GalleryPhoto | null> => {
          const storagePath =
            item.data?.storage_path;

          if (
            typeof storagePath !== "string"
          ) {
            return null;
          }

          const {
            data: signedData,
            error: signedError,
          } = await diarioSupabase.storage
            .from("diario-media")
            .createSignedUrl(
              storagePath,
              60 * 60
            );

          if (signedError) {
            console.error(
              "Could not create Gallery photo URL:",
              signedError
            );

            return null;
          }

          return {
            item,
            url:
              signedData.signedUrl,
          };
        }
      )
    );

  return photos.filter(
    (
      photo
    ): photo is GalleryPhoto =>
      photo !== null
  );
}
export async function setGalleryPhotoFavorite({
  userId,
  photo,
  favorite,
}: {
  userId: string;
  photo: DiarioItem;
  favorite: boolean;
}): Promise<DiarioItem> {
  const nextData = {
    ...(photo.data ?? {}),
    favorite,
  };

  const {
    data,
    error,
  } = await diarioSupabase
    .from("diario_items")
    .update({
      data: nextData,
    })
    .eq("id", photo.id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as DiarioItem;
}
type CreateGalleryAlbumInput = {
  userId: string;
  title: string;
};

export async function getGalleryAlbums(
  userId: string
): Promise<DiarioItem[]> {
  const {
    data,
    error,
  } = await diarioSupabase
    .from("diario_items")
    .select("*")
    .eq("user_id", userId)
    .eq("kind", "album")
    .eq("status", "active")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return (data ?? []) as DiarioItem[];
}

export async function createGalleryAlbum({
  userId,
  title,
}: CreateGalleryAlbumInput): Promise<DiarioItem> {
  const cleanTitle = title.trim();

  if (!cleanTitle) {
    throw new Error(
      "An album needs a name."
    );
  }

  const {
    data,
    error,
  } = await diarioSupabase
    .from("diario_items")
    .insert({
      user_id: userId,
      kind: "album",
      owner: "alloah",
      status: "active",
      title: cleanTitle,
      body: null,
      event_at: null,
      data: {},
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as DiarioItem;
}

export async function addPhotoToGalleryAlbum({
  userId,
  albumId,
  photoId,
}: {
  userId: string;
  albumId: string;
  photoId: string;
}): Promise<void> {
  const {
    error,
  } = await diarioSupabase
    .from("diario_links")
    .upsert(
      {
        user_id: userId,
        source_item_id: albumId,
        target_item_id: photoId,
        relation: "contains",
        data: {},
      },
      {
        onConflict:
          "user_id,source_item_id,target_item_id,relation",
      }
    );

  if (error) {
    throw error;
  }
}

export async function getGalleryAlbumPhotoIds({
  userId,
  albumId,
}: {
  userId: string;
  albumId: string;
}): Promise<string[]> {
  const {
    data,
    error,
  } = await diarioSupabase
    .from("diario_links")
    .select("target_item_id")
    .eq("user_id", userId)
    .eq("source_item_id", albumId)
    .eq("relation", "contains");

  if (error) {
    throw error;
  }

  return (data ?? []).map(
    (link: {
      target_item_id: string;
    }) => link.target_item_id
  );
}
export async function removePhotoFromGalleryAlbum({
  userId,
  albumId,
  photoId,
}: {
  userId: string;
  albumId: string;
  photoId: string;
}): Promise<void> {
  const {
    error,
  } = await diarioSupabase
    .from("diario_links")
    .delete()
    .eq("user_id", userId)
    .eq("source_item_id", albumId)
    .eq("target_item_id", photoId)
    .eq("relation", "contains");

  if (error) {
    throw error;
  }
}
type CreateMemoryInput = {
  userId: string;
  title: string;
  body?: string;
  eventAt?: string;
};

export async function getMemories(
  userId: string
): Promise<DiarioItem[]> {
  const {
    data,
    error,
  } = await diarioSupabase
    .from("diario_items")
    .select("*")
    .eq("user_id", userId)
    .eq("kind", "story_memory")
    .eq("status", "active")
    .order("event_at", {
      ascending: false,
      nullsFirst: false,
    });

  if (error) {
    throw error;
  }

  return (data ?? []) as DiarioItem[];
}

export async function createMemory({
  userId,
  title,
  body,
  eventAt,
}: CreateMemoryInput): Promise<DiarioItem> {
  const cleanTitle = title.trim();
  const cleanBody =
    body?.trim() || null;

  if (!cleanTitle) {
    throw new Error(
      "A memory needs a title."
    );
  }

  const {
    data,
    error,
  } = await diarioSupabase
    .from("diario_items")
    .insert({
      user_id: userId,
      kind: "story_memory",
      owner: "shared",
      status: "active",
      title: cleanTitle,
      body: cleanBody,
      event_at:
        eventAt ??
        new Date().toISOString(),
      data: {},
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as DiarioItem;
}
export async function addItemToMemory({
  userId,
  memoryId,
  itemId,
}: {
  userId: string;
  memoryId: string;
  itemId: string;
}): Promise<void> {
  const {
    error,
  } = await diarioSupabase
    .from("diario_links")
    .upsert(
      {
        user_id: userId,
        source_item_id: memoryId,
        target_item_id: itemId,
        relation: "contains",
        data: {},
      },
      {
        onConflict:
          "user_id,source_item_id,target_item_id,relation",
      }
    );

  if (error) {
    throw error;
  }
}

export async function removeItemFromMemory({
  userId,
  memoryId,
  itemId,
}: {
  userId: string;
  memoryId: string;
  itemId: string;
}): Promise<void> {
  const {
    error,
  } = await diarioSupabase
    .from("diario_links")
    .delete()
    .eq("user_id", userId)
    .eq("source_item_id", memoryId)
    .eq("target_item_id", itemId)
    .eq("relation", "contains");

  if (error) {
    throw error;
  }
}

export async function getMemoryItemIds({
  userId,
  memoryId,
}: {
  userId: string;
  memoryId: string;
}): Promise<string[]> {
  const {
    data,
    error,
  } = await diarioSupabase
    .from("diario_links")
    .select("target_item_id")
    .eq("user_id", userId)
    .eq("source_item_id", memoryId)
    .eq("relation", "contains");

  if (error) {
    throw error;
  }

  return (data ?? []).map(
    (link: {
      target_item_id: string;
    }) => link.target_item_id
  );
}
export async function getCalendarItems({
  userId,
  start,
  end,
}: {
  userId: string;
  start: string;
  end: string;
}): Promise<DiarioItem[]> {
  const {
    data,
    error,
  } = await diarioSupabase
    .from("diario_items")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .or(
      `and(event_at.gte.${start},event_at.lt.${end}),and(planned_for.gte.${start},planned_for.lt.${end})`
    );

  if (error) {
    throw error;
  }

  return (
    (data ?? []) as DiarioItem[]
  ).sort((first, second) => {
    const firstDate =
      first.event_at ??
      first.planned_for ??
      first.created_at;

    const secondDate =
      second.event_at ??
      second.planned_for ??
      second.created_at;

    return (
      new Date(firstDate).getTime() -
      new Date(secondDate).getTime()
    );
  });
}
export async function getTimelineItems(
  userId: string
): Promise<DiarioItem[]> {
  const {
    data,
    error,
  } = await diarioSupabase
    .from("diario_items")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .or(
      "event_at.not.is.null,planned_for.not.is.null"
    );

  if (error) {
    throw error;
  }

  return (
    (data ?? []) as DiarioItem[]
  ).sort((first, second) => {
    const firstDate =
      first.event_at ??
      first.planned_for ??
      first.created_at;

    const secondDate =
      second.event_at ??
      second.planned_for ??
      second.created_at;

    return (
      new Date(firstDate).getTime() -
      new Date(secondDate).getTime()
    );
  });
}
type CreateDateInput = {
  userId: string;
  title: string;
  place: string;
  plannedFor: string;
  note?: string;
};

export async function getDates(
  userId: string
): Promise<DiarioItem[]> {
  const {
    data,
    error,
  } = await diarioSupabase
    .from("diario_items")
    .select("*")
    .eq("user_id", userId)
    .eq("kind", "date")
    .eq("status", "active")
    .order("planned_for", {
      ascending: true,
      nullsFirst: false,
    });

  if (error) {
    throw error;
  }

  return (data ?? []) as DiarioItem[];
}

export async function createDate({
  userId,
  title,
  place,
  plannedFor,
  note,
}: CreateDateInput): Promise<DiarioItem> {
  const cleanTitle = title.trim();
  const cleanPlace = place.trim();
  const cleanNote =
    note?.trim() || null;

  if (!cleanTitle) {
    throw new Error(
      "A date needs a title."
    );
  }

  if (!cleanPlace) {
    throw new Error(
      "A date needs a place."
    );
  }

  const {
    data,
    error,
  } = await diarioSupabase
    .from("diario_items")
    .insert({
      user_id: userId,
      kind: "date",
      owner: "shared",
      status: "active",
      title: cleanTitle,
      body: cleanNote,
      event_at: null,
      planned_for: plannedFor,
      data: {
        place: cleanPlace,
      },
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as DiarioItem;
}
export async function markDateAsLived({
  userId,
  dateId,
}: {
  userId: string;
  dateId: string;
}): Promise<DiarioItem> {
  const {
    data,
    error,
  } = await diarioSupabase
    .from("diario_items")
    .update({
      event_at:
        new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("id", dateId)
    .eq("kind", "date")
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as DiarioItem;
}

type CreateKeepsakeInput = {
  userId: string;
  title: string;
  keepsakeType: string;
  location: "home" | "stored";
  room?: string | undefined;
  origin?: string | undefined;
  note?: string | undefined;
};

export async function getKeepsakes(
  userId: string
): Promise<DiarioItem[]> {
  const {
    data,
    error,
  } = await diarioSupabase
    .from("diario_items")
    .select("*")
    .eq("user_id", userId)
    .eq("kind", "keepsake")
    .eq("status", "active")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return (data ?? []) as DiarioItem[];
}

export async function createKeepsake({
  userId,
  title,
  keepsakeType,
  location,
  room,
  origin,
  note,
}: CreateKeepsakeInput): Promise<DiarioItem> {
  const cleanTitle = title.trim();

  if (!cleanTitle) {
    throw new Error(
      "A keepsake needs a name."
    );
  }

  const {
    data,
    error,
  } = await diarioSupabase
    .from("diario_items")
    .insert({
      user_id: userId,
      kind: "keepsake",
      owner: "shared",
      status: "active",
      title: cleanTitle,
      body:
        note?.trim() || null,
      event_at:
        new Date().toISOString(),
      data: {
        keepsakeType:
          keepsakeType.trim() ||
          "object",
        location,
        room:
          room?.trim() || null,
        origin:
          origin?.trim() || null,
      },
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as DiarioItem;
}
export async function updateKeepsakeLocation({
  userId,
  keepsake,
  location,
}: {
  userId: string;
  keepsake: DiarioItem;
  location: "home" | "stored";
}): Promise<DiarioItem> {
  const {
    data,
    error,
  } = await diarioSupabase
    .from("diario_items")
    .update({
      data: {
        ...(keepsake.data ?? {}),
        location,
        room:
          location === "stored"
            ? null
            : keepsake.data?.room ?? null,
      },
    })
    .eq("user_id", userId)
    .eq("id", keepsake.id)
    .eq("kind", "keepsake")
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as DiarioItem;
}

type CreateClothingInput = {
  userId: string;
  owner: "alloah" | "dominic";
  title: string;
  category: string;
  note?: string;
};

type CreateLookInput = {
  userId: string;
  owner: "alloah" | "dominic";
  title: string;
  note?: string;
};

export async function getWardrobeItems(
  userId: string
): Promise<DiarioItem[]> {
  const {
    data,
    error,
  } = await diarioSupabase
    .from("diario_items")
    .select("*")
    .eq("user_id", userId)
    .eq("kind", "clothing")
    .eq("status", "active")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return (data ?? []) as DiarioItem[];
}

export async function createClothing({
  userId,
  owner,
  title,
  category,
  note,
}: CreateClothingInput): Promise<DiarioItem> {
  const cleanTitle = title.trim();

  if (!cleanTitle) {
    throw new Error(
      "Clothing needs a name."
    );
  }

  const {
    data,
    error,
  } = await diarioSupabase
    .from("diario_items")
    .insert({
      user_id: userId,
      kind: "clothing",
      owner,
      status: "active",
      title: cleanTitle,
      body:
        note?.trim() || null,
      event_at:
        new Date().toISOString(),
      data: {
        category:
          category.trim() || "other",
      },
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as DiarioItem;
}

export async function getLooks(
  userId: string
): Promise<DiarioItem[]> {
  const {
    data,
    error,
  } = await diarioSupabase
    .from("diario_items")
    .select("*")
    .eq("user_id", userId)
    .eq("kind", "look")
    .eq("status", "active")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return (data ?? []) as DiarioItem[];
}

export async function createLook({
  userId,
  owner,
  title,
  note,
}: CreateLookInput): Promise<DiarioItem> {
  const cleanTitle = title.trim();

  if (!cleanTitle) {
    throw new Error(
      "A look needs a name."
    );
  }

  const {
    data,
    error,
  } = await diarioSupabase
    .from("diario_items")
    .insert({
      user_id: userId,
      kind: "look",
      owner,
      status: "active",
      title: cleanTitle,
      body:
        note?.trim() || null,
      event_at:
        new Date().toISOString(),
      data: {},
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as DiarioItem;
}
export async function addClothingToLook({
  userId,
  lookId,
  clothingId,
}: {
  userId: string;
  lookId: string;
  clothingId: string;
}): Promise<void> {
  const { error } =
    await diarioSupabase
      .from("diario_links")
      .upsert(
        {
          user_id: userId,
          source_item_id: lookId,
          target_item_id: clothingId,
          relation: "contains",
          data: {},
        },
        {
          onConflict:
            "user_id,source_item_id,target_item_id,relation",
        }
      );

  if (error) {
    throw error;
  }
}

export async function getLookClothingIds({
  userId,
  lookId,
}: {
  userId: string;
  lookId: string;
}): Promise<string[]> {
  const {
    data,
    error,
  } = await diarioSupabase
    .from("diario_links")
    .select("target_item_id")
    .eq("user_id", userId)
    .eq("source_item_id", lookId)
    .eq("relation", "contains");

  if (error) {
    throw error;
  }

  return (data ?? []).map(
    (link: {
      target_item_id: string;
    }) => link.target_item_id
  );
}

type CreateSongInput = {
  userId: string;
  owner:
    | "alloah"
    | "dominic"
    | "shared";
  title: string;
  artist: string;
  album?: string | undefined;
  note?: string | undefined;
  spotifyId?: string | undefined;
  spotifyUri?: string | undefined;
  spotifyUrl?: string | undefined;
  coverUrl?: string | null | undefined;
  durationMs?: number | undefined;
};

export async function getSongs(
  userId: string
): Promise<DiarioItem[]> {
  const {
    data,
    error,
  } = await diarioSupabase
    .from("diario_items")
    .select("*")
    .eq("user_id", userId)
    .eq("kind", "song")
    .eq("status", "active")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return (data ?? []) as DiarioItem[];
}

export async function createSong({
  userId,
  owner,
  title,
  artist,
  album,
  note,
  spotifyId,
  spotifyUri,
  spotifyUrl,
  coverUrl,
  durationMs,
}: CreateSongInput) : Promise<DiarioItem> {
  const cleanTitle = title.trim();
  const cleanArtist = artist.trim();

  if (!cleanTitle) {
    throw new Error(
      "A song needs a title."
    );
  }

  if (!cleanArtist) {
    throw new Error(
      "A song needs an artist."
    );
  }

  const {
    data,
    error,
  } = await diarioSupabase
    .from("diario_items")
    .insert({
      user_id: userId,
      kind: "song",
      owner,
      status: "active",
      title: cleanTitle,
      body:
        note?.trim() || null,
      event_at:
        new Date().toISOString(),
 data: {
  artist: cleanArtist,
  album: album?.trim() || null,
  spotifyId: spotifyId ?? null,
  spotifyUri: spotifyUri ?? null,
  spotifyUrl: spotifyUrl ?? null,
  coverUrl: coverUrl ?? null,
  durationMs: durationMs ?? null,
},
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as DiarioItem;
}
type CreatePlaceInput = {
  userId: string;
  title: string;
  neighborhood?: string;
  placeType?: string;
  placeStatus: "saved" | "visited";
  note?: string;
};

export async function getPlaces(
  userId: string
): Promise<DiarioItem[]> {
  const {
    data,
    error,
  } = await diarioSupabase
    .from("diario_items")
    .select("*")
    .eq("user_id", userId)
    .eq("kind", "place")
    .eq("status", "active")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return (data ?? []) as DiarioItem[];
}

export async function createPlace({
  userId,
  title,
  neighborhood,
  placeType,
  placeStatus,
  note,
}: CreatePlaceInput): Promise<DiarioItem> {
  const cleanTitle = title.trim();

  if (!cleanTitle) {
    throw new Error(
      "A place needs a name."
    );
  }

  const {
    data,
    error,
  } = await diarioSupabase
    .from("diario_items")
    .insert({
      user_id: userId,
      kind: "place",
      owner: "shared",
      status: "active",
      title: cleanTitle,
      body:
        note?.trim() || null,
      event_at:
        placeStatus === "visited"
          ? new Date().toISOString()
          : null,
      planned_for: null,
      data: {
        neighborhood:
          neighborhood?.trim() || null,
        placeType:
          placeType?.trim() || "place",
        placeStatus,
      },
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as DiarioItem;
}
export async function markPlaceAsVisited({
  userId,
  place,
}: {
  userId: string;
  place: DiarioItem;
}): Promise<DiarioItem> {
  const {
    data,
    error,
  } = await diarioSupabase
    .from("diario_items")
    .update({
      event_at:
        place.event_at ??
        new Date().toISOString(),
      data: {
        ...(place.data ?? {}),
        placeStatus: "visited",
      },
    })
    .eq("user_id", userId)
    .eq("id", place.id)
    .eq("kind", "place")
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as DiarioItem;
}

export type DiarioSettings = {
  user_id: string;
  appearance:
    | "system"
    | "light"
    | "dark";
  time_aware: boolean;
  privacy_cover: boolean;
  music_enabled: boolean;
  voice_enabled: boolean;
  data: any;
  created_at: string;
  updated_at: string;
};

export async function getDiarioSettings(
  userId: string
): Promise<DiarioSettings> {
  const {
    data,
    error,
  } = await diarioSupabase
    .from("diario_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    return data as DiarioSettings;
  }

  const {
    data: created,
    error: createError,
  } = await diarioSupabase
    .from("diario_settings")
    .insert({
      user_id: userId,
    })
    .select("*")
    .single();

  if (createError) {
    throw createError;
  }

  return created as DiarioSettings;
}

export async function saveDiarioSettings({
  userId,
  appearance,
  timeAware,
  privacyCover,
  musicEnabled,
  voiceEnabled,
}: {
  userId: string;
  appearance:
    | "system"
    | "light"
    | "dark";
  timeAware: boolean;
  privacyCover: boolean;
  musicEnabled: boolean;
  voiceEnabled: boolean;
}): Promise<DiarioSettings> {
  const {
    data,
    error,
  } = await diarioSupabase
    .from("diario_settings")
    .upsert(
      {
        user_id: userId,
        appearance,
        time_aware: timeAware,
        privacy_cover: privacyCover,
        music_enabled: musicEnabled,
        voice_enabled: voiceEnabled,
      },
      {
        onConflict: "user_id",
      }
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as DiarioSettings;
}
type CreateHomeObjectInput = {
  userId: string;
  title: string;
  room: string;
  objectType: string;
  x: number;
  y: number;
  note?: string;
  imagePath?: string;
  scale?: number;
  orientation?: "front" | "left" | "right";
};

export async function getHomeObjects(
  userId: string
): Promise<DiarioItem[]> {
  const {
    data,
    error,
  } = await diarioSupabase
    .from("diario_items")
    .select("*")
    .eq("user_id", userId)
    .eq("kind", "home_object")
    .eq("status", "active")
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  const items =
    (data ?? []) as DiarioItem[];

  return Promise.all(
    items.map(async (item) => {
      const imagePath =
        item.data?.imagePath;

      if (
        typeof imagePath !== "string" ||
        !imagePath
      ) {
        return item;
      }

      const {
        data: signedData,
        error: signedError,
      } = await diarioSupabase.storage
        .from("diario-media")
        .createSignedUrl(
          imagePath,
          60 * 60
        );

      if (signedError) {
        console.error(
          "Could not load furniture image:",
          signedError
        );

        return item;
      }

      return {
        ...item,
        data: {
          ...item.data,
          imageUrl:
            signedData.signedUrl,
        },
      };
    })
  );
}

export async function createHomeObject({
  userId,
  title,
  room,
  objectType,
  x,
  y,
  note,
  imagePath,
  scale = 1,
  orientation = "front",
}: CreateHomeObjectInput): Promise<DiarioItem> {
  const cleanTitle = title.trim();
  const cleanRoom = room.trim();
  const cleanType = objectType.trim();

  if (!cleanTitle) {
    throw new Error(
      "A home object needs a name."
    );
  }

  if (!cleanRoom) {
    throw new Error(
      "A home object needs a room."
    );
  }

  const safeX = Math.min(
    100,
    Math.max(0, x)
  );

  const safeY = Math.min(
    100,
    Math.max(0, y)
  );

  const safeScale = Math.min(
    2.5,
    Math.max(0.25, scale)
  );

  const {
    data,
    error,
  } = await diarioSupabase
    .from("diario_items")
    .insert({
      user_id: userId,
      kind: "home_object",
      owner: "shared",
      status: "active",
      title: cleanTitle,
      body:
        note?.trim() || null,
      event_at:
        new Date().toISOString(),
      planned_for: null,
      data: {
        room: cleanRoom,
        objectType:
          cleanType || "object",
        location: "displayed",
        x: safeX,
        y: safeY,
        imagePath:
  imagePath?.trim() || null,
        scale: safeScale,
        orientation,
      },
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as DiarioItem;
}

export async function updateHomeObjectPlacement({
  userId,
  objectId,
  room,
  x,
  y,
  scale,
  orientation,
}: {
  userId: string;
  objectId: string;
  room: string;
  x: number;
  y: number;
  scale?: number;
  orientation?: "front" | "left" | "right";
}): Promise<DiarioItem> {
  const {
    data: current,
    error: currentError,
  } = await diarioSupabase
    .from("diario_items")
    .select("*")
    .eq("user_id", userId)
    .eq("id", objectId)
    .eq("kind", "home_object")
    .single();

  if (currentError) {
    throw currentError;
  }

  const safeX = Math.min(
    100,
    Math.max(0, x)
  );

  const safeY = Math.min(
    100,
    Math.max(0, y)
  );

  const currentScale = Number(
    current.data?.scale ?? 1
  );

  const safeScale = Math.min(
    2.5,
    Math.max(
      0.25,
      scale ?? currentScale
    )
  );

  const currentOrientation =
    current.data?.orientation === "left" ||
    current.data?.orientation === "right"
      ? current.data.orientation
      : "front";

  const {
    data,
    error,
  } = await diarioSupabase
    .from("diario_items")
    .update({
      data: {
        ...current.data,
        room,
        x: safeX,
        y: safeY,
        scale: safeScale,
        orientation:
          orientation ??
          currentOrientation,
        location: "displayed",
      },
    })
    .eq("user_id", userId)
    .eq("id", objectId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as DiarioItem;
}

export async function updateHomeObjectAsset({
  userId,
  objectId,
  imageUrl,
}: {
  userId: string;
  objectId: string;
  imageUrl: string;
}): Promise<DiarioItem> {
  const {
    data: current,
    error: currentError,
  } = await diarioSupabase
    .from("diario_items")
    .select("*")
    .eq("user_id", userId)
    .eq("id", objectId)
    .eq("kind", "home_object")
    .single();

  if (currentError) {
    throw currentError;
  }

  const {
    data,
    error,
  } = await diarioSupabase
    .from("diario_items")
    .update({
      data: {
        ...current.data,
        imageUrl:
          imageUrl.trim(),
      },
    })
    .eq("user_id", userId)
    .eq("id", objectId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as DiarioItem;
}

export async function storeHomeObject({
  userId,
  objectId,
}: {
  userId: string;
  objectId: string;
}): Promise<DiarioItem> {
  const {
    data: current,
    error: currentError,
  } = await diarioSupabase
    .from("diario_items")
    .select("*")
    .eq("user_id", userId)
    .eq("id", objectId)
    .eq("kind", "home_object")
    .single();

  if (currentError) {
    throw currentError;
  }

  const {
    data,
    error,
  } = await diarioSupabase
    .from("diario_items")
    .update({
      data: {
        ...current.data,
        location: "stored",
      },
    })
    .eq("user_id", userId)
    .eq("id", objectId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as DiarioItem;
}

export async function restoreHomeObject({
  userId,
  objectId,
  room,
}: {
  userId: string;
  objectId: string;
  room: string;
}): Promise<DiarioItem> {
  const {
    data: current,
    error: currentError,
  } = await diarioSupabase
    .from("diario_items")
    .select("*")
    .eq("user_id", userId)
    .eq("id", objectId)
    .eq("kind", "home_object")
    .single();

  if (currentError) {
    throw currentError;
  }

  const {
    data,
    error,
  } = await diarioSupabase
    .from("diario_items")
    .update({
      data: {
        ...current.data,
        room,
        location: "displayed",
        x: Number(
          current.data?.x ?? 50
        ),
        y: Number(
          current.data?.y ?? 70
        ),
        scale: Number(
          current.data?.scale ?? 1
        ),
        orientation:
          current.data?.orientation ??
          "front",
      },
    })
    .eq("user_id", userId)
    .eq("id", objectId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as DiarioItem;
}
