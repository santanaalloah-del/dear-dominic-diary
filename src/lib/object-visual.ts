import { supabase } from "@/integrations/supabase/client";

const MEDIA_BUCKET = "diario-media";

export type GeneratedObjectVisual = {
  storageBucket: string;
  storagePath: string;
  url: string;
  provider: string | null;
  model: string | null;
};

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, payload] = dataUrl.split(",");
  const mimeType =
    header.match(/^data:([^;]+);base64$/)?.[1] || "image/png";
  const binary = atob(payload || "");
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
}

function extensionFor(mimeType: string) {
  if (mimeType.includes("webp")) return "webp";
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return "jpg";
  return "png";
}

export async function generateObjectVisual({
  userId,
  name,
  kind,
  description,
  placeName,
  section,
}: {
  userId: string;
  name: string;
  kind: string;
  description?: string | null;
  placeName?: string | null;
  section?: string | null;
}): Promise<GeneratedObjectVisual> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token;

  if (!token) {
    throw new Error("Your session ended before the object image could be made.");
  }

  const response = await fetch("/api/object-visual", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId,
      item: {
        name,
        kind,
        description: description ?? null,
        placeName: placeName ?? null,
        section: section ?? null,
      },
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        dataUrl?: string;
        mimeType?: string;
        provider?: string;
        model?: string;
        error?: string;
      }
    | null;

  if (!response.ok || !payload?.dataUrl) {
    throw new Error(
      payload?.error || "The object image could not be generated."
    );
  }

  const mimeType = payload.mimeType || "image/png";
  const blob = dataUrlToBlob(payload.dataUrl);
  const storagePath =
    `${userId}/generated-objects/${crypto.randomUUID()}.${extensionFor(
      mimeType
    )}`;

  const { error: uploadError } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(storagePath, blob, {
      upsert: false,
      contentType: mimeType,
      cacheControl: "3600",
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data: signed, error: signedError } = await supabase.storage
    .from(MEDIA_BUCKET)
    .createSignedUrl(storagePath, 60 * 60);

  if (signedError || !signed?.signedUrl) {
    throw signedError ?? new Error("The generated object image could not be opened.");
  }

  return {
    storageBucket: MEDIA_BUCKET,
    storagePath,
    url: signed.signedUrl,
    provider: payload.provider ?? null,
    model: payload.model ?? null,
  };
}

export async function signedObjectVisualUrl({
  storageBucket,
  storagePath,
}: {
  storageBucket?: string | null;
  storagePath?: string | null;
}): Promise<string | null> {
  if (!storageBucket || !storagePath) return null;

  const { data, error } = await supabase.storage
    .from(storageBucket)
    .createSignedUrl(storagePath, 60 * 60);

  if (error || !data?.signedUrl) {
    console.error("Could not sign object visual:", error);
    return null;
  }

  return data.signedUrl;
}
