import { supabase } from "@/integrations/supabase/client";

export type ChatStickerOwner =
  | "alloah"
  | "dominic"
  | "shared";

export type ChatStickerAsset = {
  id: string;
  owner: ChatStickerOwner;
  label: string;
  storagePath: string;
  url: string | null;
  createdAt: string;
};

type StickerRecord = {
  id?: unknown;
  owner?: unknown;
  label?: unknown;
  storagePath?: unknown;
  createdAt?: unknown;
};

type SettingsRow = {
  user_id: string;
  data: Record<string, unknown> | null;
};

const db = supabase as any;

function cleanString(
  value: unknown
): string | null {
  return typeof value === "string"
    ? value.trim() || null
    : null;
}

function isOwner(
  value: unknown
): value is ChatStickerOwner {
  return (
    value === "alloah" ||
    value === "dominic" ||
    value === "shared"
  );
}

function parseSticker(
  value: unknown
): Omit<ChatStickerAsset, "url"> | null {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return null;
  }

  const raw =
    value as StickerRecord;

  const id =
    cleanString(raw.id);

  const path =
    cleanString(
      raw.storagePath
    );

  const createdAt =
    cleanString(
      raw.createdAt
    );

  if (
    !id ||
    !path ||
    !createdAt ||
    !isOwner(raw.owner)
  ) {
    return null;
  }

  return {
    id,
    owner:
      raw.owner,
    label:
      cleanString(
        raw.label
      ) ??
      "Sticker",
    storagePath:
      path,
    createdAt,
  };
}

async function loadSettings(
  userId: string
): Promise<SettingsRow | null> {
  const {
    data,
    error,
  } =
    await db
      .from("diario_settings")
      .select("user_id,data")
      .eq("user_id",userId)
      .maybeSingle();

  if (error) {
    throw error;
  }

  return data as
    | SettingsRow
    | null;
}

function recordsFromData(
  data:
    Record<string, unknown> | null
) {
  return Array.isArray(
    data?.chat_stickers
  )
    ? data!
        .chat_stickers
        .map(parseSticker)
        .filter(
          (
            sticker
          ): sticker is Omit<
            ChatStickerAsset,
            "url"
          > =>
            Boolean(sticker)
        )
    : [];
}

async function signedUrl(
  storagePath: string
) {
  const {
    data,
    error,
  } =
    await db.storage
      .from("diario-media")
      .createSignedUrl(
        storagePath,
        60 * 60
      );

  if (error) {
    console.error(
      "Could not create sticker URL:",
      error
    );

    return null;
  }

  return data?.signedUrl ??
    null;
}

export async function getChatStickers(
  userId: string
): Promise<ChatStickerAsset[]> {
  const settings =
    await loadSettings(
      userId
    );

  const records =
    recordsFromData(
      settings?.data ??
      null
    );

  return Promise.all(
    records.map(
      async (
        sticker
      ) => ({
        ...sticker,
        url:
          await signedUrl(
            sticker.storagePath
          ),
      })
    )
  );
}

export async function uploadChatSticker({
  userId,
  owner,
  file,
  label,
}: {
  userId: string;
  owner:
    ChatStickerOwner;
  file: File;
  label?: string;
}): Promise<ChatStickerAsset> {
  if (
    !file.type
      .startsWith(
        "image/"
      )
  ) {
    throw new Error(
      "A sticker must be an image."
    );
  }

  const extension =
    (
      file.name
        .split(".")
        .pop() ||
      "png"
    )
      .replace(
        /[^a-z0-9]/gi,
        ""
      )
      .toLowerCase() ||
    "png";

  const id =
    crypto.randomUUID();

  const storagePath =
    `${userId}/stickers/${owner}/${id}.${extension}`;

  const {
    error:
      uploadError,
  } =
    await db.storage
      .from("diario-media")
      .upload(
        storagePath,
        file,
        {
          cacheControl:
            "3600",
          upsert:
            false,
          contentType:
            file.type,
        }
      );

  if (uploadError) {
    throw uploadError;
  }

  try {
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

    const current =
      recordsFromData(
        currentData
      );

    const record = {
      id,
      owner,
      label:
        label?.trim() ||
        file.name
          .replace(
            /.[^.]+$/,
            ""
          )
          .trim() ||
        "Sticker",
      storagePath,
      createdAt:
        new Date()
          .toISOString(),
    };

    const {
      error,
    } =
      await db
        .from("diario_settings")
        .upsert(
          {
            user_id:
              userId,
            data: {
              ...currentData,
              chat_stickers: [
                record,
                ...current,
              ].slice(
                0,
                80
              ),
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

    return {
      ...record,
      url:
        await signedUrl(
          storagePath
        ),
    };
  } catch (
    error
  ) {
    await db.storage
      .from("diario-media")
      .remove([
        storagePath,
      ]);

    throw error;
  }
}

export async function removeChatSticker({
  userId,
  stickerId,
}: {
  userId: string;
  stickerId: string;
}) {
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

  const current =
    recordsFromData(
      currentData
    );

  const next =
    current.filter(
      (
        sticker
      ) =>
        sticker.id !==
        stickerId
    );

  const {
    error,
  } =
    await db
      .from("diario_settings")
      .upsert(
        {
          user_id:
            userId,
          data: {
            ...currentData,
            chat_stickers:
              next,
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
