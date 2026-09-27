import { createFileRoute } from "@tanstack/react-router";

const DEFAULT_MODEL = "google/gemini-3-pro-image";
const MAX_REFERENCES = 10;
const MAX_REFERENCE_BYTES = 8 * 1024 * 1024;
const MAX_SOURCE_DATA_URL = 12 * 1024 * 1024;

type ProviderReference = {
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

type RequestShape = {
  id: string;
  mode: string;
  subject_type: "me" | "dominic" | "both";
  source_context: string;
  scene: string | null;
  mood: string | null;
  shot_type: string | null;
  photo_style: string;
  closeness_level: string | null;
  spontaneity_level: string | null;
  use_current_look: boolean;
  context_snapshot: Record<string, unknown>;
  anti_repeat_snapshot: Record<string, unknown>;
  adjustment_instruction: string | null;
};

type BodyShape = {
  userId?: string;
  request?: RequestShape;
  references?: ProviderReference[];
  sourceImageDataUrl?: string | null;
};

function envValue(name: string) {
  return process.env[name]?.trim() || "";
}

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function validateDataUrl(dataUrl: string): string | null {
  if (!dataUrl || dataUrl.length > MAX_SOURCE_DATA_URL) return null;

  const match = dataUrl.match(
    /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/i
  );

  return match ? dataUrl : null;
}

async function verifyUser(request: Request, userId: string) {
  const authHeader = request.headers.get("authorization");
  const supabaseUrl =
    import.meta.env.VITE_SUPABASE_URL || envValue("SUPABASE_URL");
  const publishableKey =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    envValue("SUPABASE_PUBLISHABLE_KEY");

  if (!authHeader?.startsWith("Bearer ") || !supabaseUrl || !publishableKey) {
    return null;
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: authHeader,
      apikey: publishableKey,
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) return null;

  const user = (await response.json()) as { id?: string };

  return user.id && user.id === userId
    ? { id: user.id, supabaseUrl }
    : null;
}

async function referenceToDataUrl(
  reference: ProviderReference,
  allowedHost: string
): Promise<string | null> {
  try {
    const url = new URL(reference.url);

    if (url.protocol !== "https:" || url.host !== allowedHost) {
      return null;
    }

    const response = await fetch(url, {
      headers: { Accept: "image/*" },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) return null;

    const mimeType = response.headers
      .get("content-type")
      ?.split(";")[0]
      ?.trim();

    if (!mimeType?.startsWith("image/")) return null;

    const bytes = new Uint8Array(await response.arrayBuffer());

    if (!bytes.length || bytes.length > MAX_REFERENCE_BYTES) {
      return null;
    }

    return `data:${mimeType};base64,${Buffer.from(bytes).toString("base64")}`;
  } catch {
    return null;
  }
}

function subjectDescription(subject: RequestShape["subject_type"]) {
  if (subject === "me") {
    return "Alloah only. Preserve her identity from the attached references.";
  }

  if (subject === "dominic") {
    return "Dominic only. Preserve his identity from the attached references.";
  }

  return "Alloah and Dominic together. Keep them as two distinct people and preserve each identity independently from the attached references.";
}

function styleDescription(style: string) {
  const styles: Record<string, string> = {
    natural_iphone:
      "ordinary modern iPhone-like photo, natural processing, believable imperfections, not professionally staged",
    selfie:
      "casual handheld selfie with believable arm and phone geometry",
    mirror:
      "casual mirror photo with natural perspective and phone placement",
    candid:
      "back-camera candid where the subject is not performing for the camera",
    flash:
      "direct phone-flash snapshot with realistic falloff",
    disposable:
      "casual disposable-camera feeling with mild grain and imperfect exposure",
    memory_like:
      "personal memory-like snapshot, soft but still realistic",
  };

  return styles[style] ?? styles.natural_iphone;
}

function buildPrompt(
  request: RequestShape,
  references: ProviderReference[],
  hasSourceImage: boolean
) {
  const referenceGuide = references.map((reference, index) => {
    const purposes = reference.purposes?.length
      ? reference.purposes.join(", ")
      : "identity";

    return `Reference ${index + 1}: subject=${reference.subject}; strength=${
      reference.strength
    }; purposes=${purposes}; current=${reference.isCurrent ? "yes" : "no"}${
      reference.lookType ? `; look=${reference.lookType}` : ""
    }${reference.description ? `; note=${reference.description}` : ""}`;
  });

  return [
    "Generate ONE believable personal photograph for a private diary/life-simulation app.",
    "Identity fidelity is the highest priority.",
    subjectDescription(request.subject_type),
    `Photo style: ${styleDescription(request.photo_style)}.`,
    request.scene ? `Scene: ${request.scene}` : null,
    request.mood ? `Mood: ${request.mood}` : null,
    request.adjustment_instruction
      ? `Adjustment: ${request.adjustment_instruction}`
      : null,
    hasSourceImage
      ? "The first attached image is the current preview being adjusted. Preserve identity and scene continuity unless the adjustment asks otherwise."
      : null,
    "Current Look references override older styling only for their tagged detail. Primary identity references should strongly preserve facial identity. Supporting references reinforce identity. Detail-only references must not override unrelated facial or hair traits.",
    "Keep face shape, eyes, nose, mouth, jawline, hair, tattoos, piercings, body proportions and other visible identity details consistent with the relevant references.",
    "Avoid generic AI glamour, studio posing, plastic skin, excessive bokeh, cinematic grading, impossible symmetry and anatomy errors.",
    "Keep the result casual, natural, lived-in and phone-photo believable.",
    referenceGuide.length
      ? `REFERENCE ORDER:\n${referenceGuide.join("\n")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export const Route = createFileRoute("/api/photo-engine")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: BodyShape;

        try {
          body = (await request.json()) as BodyShape;
        } catch {
          return jsonError("Invalid JSON body.", 400);
        }

        if (!body.userId || !body.request?.id) {
          return jsonError("Missing Photo Engine request.", 400);
        }

        const verified = await verifyUser(request, body.userId);

        if (!verified) {
          return jsonError("Unauthorized Photo Engine request.", 401);
        }

        const openRouterKey = envValue("OPENROUTER_API_KEY");

        if (!openRouterKey) {
          return jsonError(
            "OPENROUTER_API_KEY is not configured on the server yet.",
            503
          );
        }

        const model =
          envValue("OPENROUTER_IMAGE_MODEL") || DEFAULT_MODEL;

        const sourceDataUrl = body.sourceImageDataUrl
          ? validateDataUrl(body.sourceImageDataUrl)
          : null;

        const referenceLimit = sourceDataUrl
          ? Math.max(1, MAX_REFERENCES - 1)
          : MAX_REFERENCES;

        const references = (body.references ?? []).slice(
          0,
          referenceLimit
        );

        const allowedHost = new URL(verified.supabaseUrl).host;

        const resolved = await Promise.all(
          references.map(async (reference) => ({
            reference,
            dataUrl: await referenceToDataUrl(reference, allowedHost),
          }))
        );

        const attachedReferences = resolved.filter(
          (
            item
          ): item is {
            reference: ProviderReference;
            dataUrl: string;
          } => Boolean(item.dataUrl)
        );

        const prompt = buildPrompt(
          body.request,
          attachedReferences.map((item) => item.reference),
          Boolean(sourceDataUrl)
        );

        const inputReferences = [
          ...(sourceDataUrl
            ? [
                {
                  type: "image_url",
                  image_url: { url: sourceDataUrl },
                },
              ]
            : []),
          ...attachedReferences.map((item) => ({
            type: "image_url",
            image_url: { url: item.dataUrl },
          })),
        ];

        let providerResponse: Response;

        try {
          providerResponse = await fetch(
            "https://openrouter.ai/api/v1/images",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${openRouterKey}`,
                "Content-Type": "application/json",
                "X-Title": "Dear Dominic Diary",
              },
              body: JSON.stringify({
                model,
                prompt,
                n: 1,
                aspect_ratio: "3:4",
                ...(inputReferences.length
                  ? { input_references: inputReferences }
                  : {}),
              }),
              signal: AbortSignal.timeout(75_000),
            }
          );
        } catch (error) {
          return jsonError(
            error instanceof Error
              ? error.message
              : "Image provider timed out.",
            504
          );
        }

        const providerJson = (await providerResponse
          .json()
          .catch(() => null)) as Record<string, any> | null;

        if (!providerResponse.ok) {
          return jsonError(
            providerJson?.error?.message ||
              providerJson?.message ||
              `OpenRouter image generation failed (${providerResponse.status}).`,
            502
          );
        }

        const image = providerJson?.data?.[0];
        const imageBase64 = image?.b64_json;

        if (!imageBase64 || typeof imageBase64 !== "string") {
          return jsonError(
            "OpenRouter returned no image for this request.",
            502
          );
        }

        const mimeType =
          typeof image?.media_type === "string" &&
          image.media_type.startsWith("image/")
            ? image.media_type
            : "image/png";

        return Response.json({
          dataUrl: `data:${mimeType};base64,${imageBase64}`,
          mimeType,
          provider: "openrouter",
          model,
          prompt,
          feature: {
            poseType: null,
            cameraAngle: null,
            framing: null,
            expression: null,
            lightingType: null,
            locationCategory:
              typeof body.request.context_snapshot?.location === "string"
                ? String(body.request.context_snapshot.location)
                : null,
            compositionType: null,
            featureData: {
              restoredRoute: true,
              referenceCount:
                attachedReferences.length + (sourceDataUrl ? 1 : 0),
              openRouterCost:
                typeof providerJson?.usage?.cost === "number"
                  ? providerJson.usage.cost
                  : null,
            },
          },
        });
      },
    },
  },
});
