import { supabase } from "@/integrations/supabase/client";

export type ChatProfileOwner =
  | "alloah"
  | "dominic";

export type ChatProfile = {
  owner: ChatProfileOwner;
  displayName: string;
  bio: string | null;
  photoPath: string | null;
  photoUrl: string | null;
  updatedAt: string | null;
};

type ProfileRecord = {
  displayName?: unknown;
  bio?: unknown;
  photoPath?: unknown;
  updatedAt?: unknown;
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

function defaultName(
  owner: ChatProfileOwner
) {
  return owner === "dominic"
    ? "Dominic"
    : "Alloah";
}

function readProfileRecord(
  data:
    Record<string, unknown> | null,
  owner:
    ChatProfileOwner
): ProfileRecord {
  const profiles =
    data?.chat_profiles &&
    typeof data.chat_profiles === "object" &&
    !Array.isArray(
      data.chat_profiles
    )
      ? data.chat_profiles as Record<
          string,
          unknown
        >
      : {};

  const raw =
    profiles[owner];

  return raw &&
    typeof raw === "object" &&
    !Array.isArray(raw)
      ? raw as ProfileRecord
      : {};
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

async function signedPhotoUrl(
  path: string | null
) {
  if (!path) {
    return null;
  }

  const {
    data,
    error,
  } =
    await db.storage
      .from("diario-media")
      .createSignedUrl(
        path,
        60 * 60
      );

  if (error) {
    console.error(
      "Could not create chat profile photo URL:",
      error
    );

    return null;
  }

  return data?.signedUrl ??
    null;
}

export async function getChatProfile({
  userId,
  owner,
}: {
  userId: string;
  owner: ChatProfileOwner;
}): Promise<ChatProfile> {
  const settings =
    await loadSettings(
      userId
    );

  const record =
    readProfileRecord(
      settings?.data ?? null,
      owner
    );

  const photoPath =
    cleanString(
      record.photoPath
    );

  return {
    owner,
    displayName:
      cleanString(
        record.displayName
      ) ??
      defaultName(owner),
    bio:
      cleanString(
        record.bio
      ),
    photoPath,
    photoUrl:
      await signedPhotoUrl(
        photoPath
      ),
    updatedAt:
      cleanString(
        record.updatedAt
      ),
  };
}

export async function getChatProfiles(
  userId: string
) {
  const [
    alloah,
    dominic,
  ] =
    await Promise.all([
      getChatProfile({
        userId,
        owner:
          "alloah",
      }),
      getChatProfile({
        userId,
        owner:
          "dominic",
      }),
    ]);

  return {
    alloah,
    dominic,
  };
}

export async function saveChatProfile({
  userId,
  owner,
  displayName,
  bio,
  photoPath,
}: {
  userId: string;
  owner: ChatProfileOwner;
  displayName?: string;
  bio?: string | null;
  photoPath?: string | null;
}): Promise<ChatProfile> {
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

  const currentProfiles =
    currentData
      .chat_profiles &&
    typeof currentData
      .chat_profiles ===
      "object" &&
    !Array.isArray(
      currentData
        .chat_profiles
    )
      ? currentData
          .chat_profiles as Record<
            string,
            unknown
          >
      : {};

  const currentRecord =
    readProfileRecord(
      currentData,
      owner
    );

  const nextRecord = {
    ...currentRecord,
    ...(displayName !==
    undefined
      ? {
          displayName:
            displayName.trim() ||
            defaultName(owner),
        }
      : {}),
    ...(bio !== undefined
      ? {
          bio:
            bio?.trim() ||
            null,
        }
      : {}),
    ...(photoPath !==
    undefined
      ? {
          photoPath:
            photoPath ??
            null,
        }
      : {}),
    updatedAt:
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
            chat_profiles: {
              ...currentProfiles,
              [owner]:
                nextRecord,
            },
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

  const nextPhotoPath =
    cleanString(
      nextRecord.photoPath
    );

  return {
    owner,
    displayName:
      cleanString(
        nextRecord
          .displayName
      ) ??
      defaultName(owner),
    bio:
      cleanString(
        nextRecord.bio
      ),
    photoPath:
      nextPhotoPath,
    photoUrl:
      await signedPhotoUrl(
        nextPhotoPath
      ),
    updatedAt:
      cleanString(
        nextRecord
          .updatedAt
      ),
  };
}

export async function uploadChatProfilePhoto({
  userId,
  owner,
  file,
}: {
  userId: string;
  owner: ChatProfileOwner;
  file: File;
}): Promise<string> {
  if (
    !file.type
      .startsWith(
        "image/"
      )
  ) {
    throw new Error(
      "Profile photo must be an image."
    );
  }

  const extension =
    file.name
      .split(".")
      .pop() ||
    "jpg";

  const safeExtension =
    extension
      .replace(
        /[^a-z0-9]/gi,
        ""
      )
      .toLowerCase() ||
    "jpg";

  const path =
    `${userId}/profiles/${owner}/${crypto.randomUUID()}.${safeExtension}`;

  const {
    error,
  } =
    await db.storage
      .from("diario-media")
      .upload(
        path,
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

  if (error) {
    throw error;
  }

  return path;
}

export async function removeChatProfilePhoto({
  userId,
  owner,
}: {
  userId: string;
  owner: ChatProfileOwner;
}) {
  const current =
    await getChatProfile({
      userId,
      owner,
    });

  if (current.photoPath) {
    const {
      error,
    } =
      await db.storage
        .from("diario-media")
        .remove([
          current.photoPath,
        ]);

    if (error) {
      console.error(
        "Could not remove old chat profile photo:",
        error
      );
    }
  }

  return saveChatProfile({
    userId,
    owner,
    photoPath: null,
  });
}
