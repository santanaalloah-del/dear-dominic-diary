import { createFileRoute } from "@tanstack/react-router";

const DEFAULT_RESPONSES_MODEL = "gpt-5.5";
const DEFAULT_IMAGE_MODEL = "gpt-image-2.5-sunburst";
const MAX_REFERENCES = 10;
const MAX_REFERENCE_BYTES = 8 * 1024 * 1024;
const MAX_SOURCE_DATA_URL = 12 * 1024 * 1024;

type ProviderReference = {
  id?: string;
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

type VisualCanonPayload = {
  subject: "alloah" | "dominic" | "couple";
  profile: Record<string, unknown>;
  anchorReferenceIds: string[];
  analysisVersion: number;
  lastAnalyzedAt: string | null;
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
  canons?: VisualCanonPayload[];
  sourceImageDataUrl?: string | null;
};

type OpenAIImageCall = {
  type?: string;
  result?: string;
  revised_prompt?: string | null;
};

type OpenAIResponseShape = {
  id?: string;
  error?: {
    message?: string;
    type?: string;
    code?: string;
  } | null;
  output?: OpenAIImageCall[];
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
      signal: AbortSignal.timeout(20_000),
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
    return "Alloah only. Every attached Alloah identity reference depicts the same person. Preserve her exact recognizable identity.";
  }

  if (subject === "dominic") {
    return "Dominic only. Every attached Dominic identity reference depicts the same person. Preserve his exact recognizable identity.";
  }

  return "Alloah and Dominic together. Preserve them as two distinct, recognizable people. Do not blend their facial traits.";
}

function styleDescription(style: string) {
  const styles: Record<string, string> = {
    natural_iphone:
      "ordinary modern iPhone-like personal photo, natural processing, believable imperfections, not professionally staged",
    selfie:
      "casual handheld phone selfie with believable arm, phone and perspective geometry",
    mirror:
      "casual mirror photo with natural perspective, reflections and phone placement",
    candid:
      "back-camera candid where the subject is not performing for the camera",
    flash:
      "direct phone-flash snapshot with realistic falloff and ordinary exposure",
    disposable:
      "casual disposable-camera feeling with mild grain and imperfect exposure",
    memory_like:
      "personal memory-like snapshot, realistic and intimate rather than cinematic",
  };

  return styles[style] ?? styles.natural_iphone;
}

function safeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function canonBlock(canons: VisualCanonPayload[]) {
  if (!canons.length) return null;

  const blocks = canons.map((canon) => {
    const profile = canon.profile ?? {};

    const identitySummary =
      typeof profile.identity_summary === "string"
        ? profile.identity_summary
        : null;

    const stableTraits = safeStringArray(profile.stable_traits);
    const distinctiveDetails = safeStringArray(profile.distinctive_details);
    const tattoosOrMarks = safeStringArray(profile.tattoos_or_marks);
    const generationRules = safeStringArray(profile.generation_rules);
    const avoidMistakes = safeStringArray(profile.avoid_mistakes);
    const uncertainties = safeStringArray(profile.uncertainties);

    return [
      `SUBJECT: ${canon.subject}`,
      identitySummary ? `Identity summary: ${identitySummary}` : null,
      stableTraits.length
        ? `Stable traits: ${stableTraits.join(" | ")}`
        : null,
      distinctiveDetails.length
        ? `Distinctive details: ${distinctiveDetails.join(" | ")}`
        : null,
      tattoosOrMarks.length
        ? `Tattoos / marks: ${tattoosOrMarks.join(" | ")}`
        : null,
      generationRules.length
        ? `Generation rules: ${generationRules.join(" | ")}`
        : null,
      avoidMistakes.length
        ? `Avoid mistakes: ${avoidMistakes.join(" | ")}`
        : null,
      uncertainties.length
        ? `Uncertainties: ${uncertainties.join(" | ")}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");
  });

  return [
    "LEARNED VISUAL CANON",
    "The canon is a summary of the attached references, not a substitute for them.",
    "Use the actual attached images as the primary visual evidence for identity.",
    "Use the canon to distinguish stable identity from historical or temporary styling.",
    "Do not average conflicting historical looks into a new generic person.",
    blocks.join("\n\n"),
  ].join("\n\n");
}

function buildPrompt(
  request: RequestShape,
  references: ProviderReference[],
  canons: VisualCanonPayload[],
  hasSourceImage: boolean
) {
  const referenceGuide = references.map((reference, index) => {
    const purposes = reference.purposes?.length
      ? reference.purposes.join(", ")
      : "identity";

    return `Image ${index + (hasSourceImage ? 2 : 1)}: subject=${
      reference.subject
    }; purposes=${purposes}; strength=${reference.strength}; current=${
      reference.isCurrent ? "yes" : "no"
    }${reference.lookType ? `; current-look type=${reference.lookType}` : ""}${
      reference.description ? `; note=${reference.description}` : ""
    }`;
  });

  return [
    "EDIT/GENERATE ONE photorealistic personal phone photograph using the attached images as visual references.",
    "",
    "ABSOLUTE PRIORITY — IDENTITY",
    subjectDescription(request.subject_type),
    "The attached identity photos are photographs of the SAME real subject for that person, taken at different moments, angles, expressions and styling.",
    "Preserve the person's recognizable facial identity from the actual images: facial geometry, proportions, eye shape and spacing, nose structure, lips, jaw, cheekbones, hair texture, skin appearance, body proportions, tattoos, piercings and other persistent visible details.",
    "Do NOT invent a merely similar attractive person. Do NOT beautify the face into a generic AI model. Do NOT widen, soften, feminize, masculinize, age, de-age or otherwise reinterpret the face unless the request explicitly asks for it.",
    "When several references differ, infer the stable identity shared across them. Treat temporary hair color, clothing, makeup, jewelry and other styling as temporary rather than changing the underlying identity.",
    hasSourceImage
      ? "Image 1 is the existing generated preview being adjusted. Preserve scene continuity while correcting it toward the identity shown in the remaining identity references."
      : null,
    canonBlock(canons),
    "",
    "SCENE",
    request.scene ? request.scene : "Create a believable everyday moment.",
    request.mood ? `Mood: ${request.mood}.` : null,
    request.adjustment_instruction
      ? `Requested adjustment: ${request.adjustment_instruction}`
      : null,
    "",
    "CAMERA / REALISM",
    `Photo style: ${styleDescription(request.photo_style)}.`,
    request.shot_type ? `Requested shot: ${request.shot_type}.` : null,
    "Make it look like a real personal photo someone actually took or sent in chat.",
    "Natural skin texture, ordinary exposure, plausible phone optics, believable anatomy and perspective.",
    "Avoid cinematic grading, studio lighting, fashion-editorial posing, fake depth-of-field, plastic skin, excessive symmetry, uncanny anatomy and generic AI glamour.",
    "",
    "REFERENCE MAP",
    referenceGuide.length ? referenceGuide.join("\n") : "No identity images attached.",
    "",
    "FINAL CHECK BEFORE RENDERING",
    "The person in the result must still be recognizably the SAME person shown in the identity references. Identity fidelity matters more than making the scene prettier.",
  ]
    .filter((part) => part !== null && part !== undefined)
    .join("\n");
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

        const openAIKey = envValue("OPENAI_API_KEY");

        if (!openAIKey) {
          return jsonError(
            "OPENAI_API_KEY is not configured on the server yet.",
            503
          );
        }

        const responsesModel =
          envValue("OPENAI_RESPONSES_MODEL") || DEFAULT_RESPONSES_MODEL;
        const imageModel =
          envValue("OPENAI_IMAGE_MODEL") || DEFAULT_IMAGE_MODEL;
        const imageQuality =
          envValue("OPENAI_IMAGE_QUALITY") || "max";

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

        const canons = Array.isArray(body.canons)
          ? body.canons.filter(
              (canon): canon is VisualCanonPayload =>
                Boolean(
                  canon &&
                    typeof canon === "object" &&
                    (canon.subject === "alloah" ||
                      canon.subject === "dominic" ||
                      canon.subject === "couple") &&
                    canon.profile &&
                    typeof canon.profile === "object"
                )
            )
          : [];

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
          canons,
          Boolean(sourceDataUrl)
        );

        const imageInputs = [
          ...(sourceDataUrl
            ? [
                {
                  type: "input_image",
                  image_url: sourceDataUrl,
                  detail: "high",
                },
              ]
            : []),
          ...attachedReferences.map((item) => ({
            type: "input_image",
            image_url: item.dataUrl,
            detail: "high",
          })),
        ];

        if (!imageInputs.length) {
          return jsonError(
            "No usable identity reference images reached the native OpenAI provider.",
            400
          );
        }

        let providerResponse: Response;

        try {
          providerResponse = await fetch(
            "https://api.openai.com/v1/responses",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${openAIKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: responsesModel,
                input: [
                  {
                    role: "user",
                    content: [
                      {
                        type: "input_text",
                        text: prompt,
                      },
                      ...imageInputs,
                    ],
                  },
                ],
                tools: [
                  {
                    type: "image_generation",
                    model: imageModel,
                    action: "edit",
                    quality: imageQuality,
                    size: "1024x1536",
                    output_format: "png",
                    background: "opaque",
                  },
                ],
                tool_choice: {
                  type: "image_generation",
                },
              }),
              signal: AbortSignal.timeout(180_000),
            }
          );
        } catch (error) {
          return jsonError(
            error instanceof Error
              ? `OpenAI native image request failed: ${error.message}`
              : "OpenAI native image request timed out.",
            504
          );
        }

        const providerJson = (await providerResponse
          .json()
          .catch(() => null)) as OpenAIResponseShape | null;

        if (!providerResponse.ok) {
          return jsonError(
            providerJson?.error?.message ||
              `OpenAI native image generation failed (${providerResponse.status}).`,
            502
          );
        }

        const imageCall = providerJson?.output?.find(
          (item) =>
            item?.type === "image_generation_call" &&
            typeof item.result === "string"
        );

        const imageBase64 = imageCall?.result;

        if (!imageBase64) {
          return jsonError(
            "OpenAI returned no generated image for this request.",
            502
          );
        }

        const revisedPrompt =
          typeof imageCall.revised_prompt === "string"
            ? imageCall.revised_prompt
            : null;

        return Response.json({
          dataUrl: `data:image/png;base64,${imageBase64}`,
          mimeType: "image/png",
          provider: "openai-native-responses",
          model: imageModel,
          prompt: revisedPrompt || prompt,
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
              nativeOpenAI: true,
              responsesModel,
              imageModel,
              imageQuality,
              responseId: providerJson?.id ?? null,
              canonConnected: canons.length > 0,
              canonSubjects: canons.map((canon) => canon.subject),
              referenceCount:
                attachedReferences.length + (sourceDataUrl ? 1 : 0),
              revisedPrompt,
            },
          },
        });
      },
    },
  },
});
