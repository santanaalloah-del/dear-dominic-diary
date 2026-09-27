import { supabase } from "@/integrations/supabase/client";
import {
  getPhotoReferenceBundle,
  type PhotoFeatureInput,
  type PhotoGenerationRequest,
} from "@/lib/photo-engine";

export type PhotoProviderPreview = {
  dataUrl: string;
  mimeType: string;
  provider: string;
  model: string;
  prompt: string;
  feature: PhotoFeatureInput;
};

type GeneratePreviewInput = {
  userId: string;
  request: PhotoGenerationRequest;
  sourceImageDataUrl?: string | null;
};

type ProviderReferencePayload = {
  url: string;
  subject: string;
  title: string | null;
  description: string | null;
  purposes: string[];
  strength: string;
  referenceKind: string;
  lookType: string | null;
  isCurrent: boolean;
};

function cleanReferencePayload(
  item: Awaited<ReturnType<typeof getPhotoReferenceBundle>>["selected"][number]
): ProviderReferencePayload {
  return {
    url: item.url,
    subject: item.reference.subject,
    title: item.reference.title,
    description: item.reference.description,
    purposes: item.reference.reference_purposes ?? [],
    strength: item.reference.reference_strength ?? "supporting",
    referenceKind: item.reference.reference_kind ?? "identity",
    lookType: item.reference.look_type ?? null,
    isCurrent: Boolean(item.reference.is_current),
  };
}


function chooseProviderReferences(
  request: PhotoGenerationRequest,
  selected: Awaited<ReturnType<typeof getPhotoReferenceBundle>>["selected"]
) {
  const requestedIds = new Set(request.reference_ids ?? []);
  const pool = selected.filter(
    (item) => requestedIds.size === 0 || requestedIds.has(item.reference.id)
  );
  const chosen: typeof pool = [];
  const used = new Set<string>();

  const take = (
    predicate: (item: (typeof pool)[number]) => boolean,
    count: number
  ) => {
    for (const item of pool) {
      if (chosen.length >= 10 || count <= 0) break;
      if (used.has(item.reference.id) || !predicate(item)) continue;
      chosen.push(item);
      used.add(item.reference.id);
      count -= 1;
    }
  };

  const identityUseful = (item: (typeof pool)[number]) => {
    const purposes = item.reference.reference_purposes ?? [];
    return (
      item.reference.reference_strength === "primary" ||
      purposes.includes("face") ||
      purposes.includes("body") ||
      purposes.includes("hair") ||
      purposes.includes("tattoos")
    );
  };

  if (request.subject_type === "both") {
    take((item) => item.reference.subject === "alloah" && item.reference.is_current, 2);
    take((item) => item.reference.subject === "alloah" && identityUseful(item), 2);
    take((item) => item.reference.subject === "dominic" && item.reference.is_current, 2);
    take((item) => item.reference.subject === "dominic" && identityUseful(item), 2);
    take((item) => item.reference.subject === "couple", 2);
  } else {
    const subject = request.subject_type === "me" ? "alloah" : "dominic";
    take((item) => item.reference.subject === subject && item.reference.is_current, 3);
    take((item) => item.reference.subject === subject && identityUseful(item), 5);
  }

  take(() => true, 10 - chosen.length);
  return chosen.slice(0, 10);
}

export async function generatePhotoProviderPreview({
  userId,
  request,
  sourceImageDataUrl,
}: GeneratePreviewInput): Promise<PhotoProviderPreview> {
  const [{ data: sessionData }, bundle] = await Promise.all([
    supabase.auth.getSession(),
    getPhotoReferenceBundle({
      userId,
      subjectType: request.subject_type,
      useCurrentLook: request.use_current_look,
    }),
  ]);

  const accessToken = sessionData.session?.access_token;

  if (!accessToken) {
    throw new Error("Your session expired. Please sign in again.");
  }

  const references = chooseProviderReferences(
    request,
    bundle.selected
  ).map(cleanReferencePayload);

  const response = await fetch("/api/photo-engine", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      userId,
      request,
      references,
      sourceImageDataUrl: sourceImageDataUrl ?? null,
    }),
  });

  const body = (await response.json().catch(() => null)) as
    | (PhotoProviderPreview & { error?: string })
    | null;

  if (!response.ok) {
    throw new Error(
      body?.error || `Photo provider failed with status ${response.status}.`
    );
  }

  if (!body?.dataUrl || !body?.mimeType) {
    throw new Error("The image provider returned no image.");
  }

  return body;
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, encoded] = dataUrl.split(",", 2);
  const match = header.match(/^data:([^;]+);base64$/i);

  if (!match || !encoded) {
    throw new Error("Invalid generated image data.");
  }

  const binary = window.atob(encoded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: match[1] });
}
