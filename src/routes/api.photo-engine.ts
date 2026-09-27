import { createFileRoute } from "@tanstack/react-router";

const DEFAULT_MODEL = "gemini-3-pro-image";
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

type InlinePart = {
  inlineData: {
    mimeType: string;
    data: string;
  };
};

type PlannedFeature = {
  poseType: string | null;
  cameraAngle: string | null;
  framing: string | null;
  expression: string | null;
  lightingType: string | null;
  locationCategory: string | null;
  compositionType: string | null;
  featureData: Record<string, unknown>;
};

type CameraVariant = {
  label: string;
  poseType: string;
  cameraAngle: string;
  framing: string;
  expression: string;
  lightingType: string;
  compositionType: string;
  aspectRatio: "3:4" | "4:3";
};

const CAMERA_VARIANTS: CameraVariant[] = [
  {
    label: "off-center back-camera candid caught mid-movement",
    poseType: "candid movement",
    cameraAngle: "eye level back camera",
    framing: "imperfect medium shot",
    expression: "natural mid-moment",
    lightingType: "available room light",
    compositionType: "off-center imperfect crop",
    aspectRatio: "3:4",
  },
  {
    label: "wide everyday phone photo with environmental context",
    poseType: "relaxed full body",
    cameraAngle: "slightly wide eye level",
    framing: "wide full body",
    expression: "unposed neutral-soft",
    lightingType: "natural ambient light",
    compositionType: "wide lived-in composition",
    aspectRatio: "4:3",
  },
  {
    label: "cropped close phone photo with imperfect edges",
    poseType: "close casual",
    cameraAngle: "slightly above eye level",
    framing: "cropped close-up",
    expression: "small spontaneous expression",
    lightingType: "soft available light",
    compositionType: "tight imperfect crop",
    aspectRatio: "3:4",
  },
  {
    label: "side-profile candid while looking away from the camera",
    poseType: "side profile",
    cameraAngle: "side angle",
    framing: "medium candid",
    expression: "looking away",
    lightingType: "window or ambient light",
    compositionType: "negative space side composition",
    aspectRatio: "3:4",
  },
  {
    label: "slightly low-angle phone shot with casual body language",
    poseType: "casual standing or sitting",
    cameraAngle: "low angle",
    framing: "three-quarter body",
    expression: "unposed",
    lightingType: "mixed available light",
    compositionType: "low-angle off-center",
    aspectRatio: "3:4",
  },
  {
    label: "messy mirror photo with believable phone obstruction",
    poseType: "mirror pose",
    cameraAngle: "mirror eye level",
    framing: "three-quarter mirror",
    expression: "casual self-aware",
    lightingType: "bathroom or bedroom light",
    compositionType: "mirror asymmetry",
    aspectRatio: "3:4",
  },
  {
    label: "direct flash night snapshot with slight motion blur",
    poseType: "night candid",
    cameraAngle: "eye level flash",
    framing: "medium snapshot",
    expression: "playful spontaneous",
    lightingType: "direct phone flash",
    compositionType: "flash snapshot",
    aspectRatio: "3:4",
  },
  {
    label: "photo from behind with the subject partly turning back",
    poseType: "from behind",
    cameraAngle: "rear three-quarter",
    framing: "full or three-quarter body",
    expression: "partial glance back",
    lightingType: "natural ambient light",
    compositionType: "rear candid composition",
    aspectRatio: "4:3",
  },
  {
    label: "casual overhead phone photo from nearby",
    poseType: "relaxed seated or lying pose",
    cameraAngle: "overhead",
    framing: "medium overhead",
    expression: "soft candid",
    lightingType: "soft indoor light",
    compositionType: "overhead asymmetry",
    aspectRatio: "3:4",
  },
];

function envValue(name: string) {
  return process.env[name]?.trim() || "";
}

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function antiRepeatTerms(request: RequestShape) {
  const snapshot = request.anti_repeat_snapshot ?? {};
  const avoid =
    snapshot && typeof snapshot === "object" && "avoid" in snapshot
      ? (snapshot.avoid as Record<string, unknown>)
      : {};

  return [
    ...stringArray(avoid?.poses),
    ...stringArray(avoid?.cameraAngles),
    ...stringArray(avoid?.framings),
    ...stringArray(avoid?.locations),
    ...stringArray(avoid?.compositions),
  ].map((item) => item.toLowerCase());
}

function chooseVariant(request: RequestShape) {
  const avoided = antiRepeatTerms(request);
  const start = hashString(
    `${request.id}:${request.mode}:${request.adjustment_instruction ?? ""}`
  ) % CAMERA_VARIANTS.length;

  for (let offset = 0; offset < CAMERA_VARIANTS.length; offset += 1) {
    const variant = CAMERA_VARIANTS[(start + offset) % CAMERA_VARIANTS.length];
    const searchable = `${variant.label} ${variant.poseType} ${variant.cameraAngle} ${variant.framing} ${variant.compositionType}`.toLowerCase();

    if (!avoided.some((term) => term && searchable.includes(term))) {
      return variant;
    }
  }

  return CAMERA_VARIANTS[start];
}

function subjectDescription(subject: RequestShape["subject_type"]) {
  if (subject === "me") {
    return "Alloah only. Preserve her identity consistently from her references: long dark/black layered hair with bangs unless Current Look overrides it, large dark eyes, nose ring, rosy fair/light-medium skin, gold necklace when supported, arm tattoo when visible.";
  }

  if (subject === "dominic") {
    return "Dominic only. Preserve his identity consistently from his references: dark curly hair unless Current Look overrides it, lean/slender athletic build, tan/medium skin, small face tattoo near the eye/cheek, tattoos across neck/arms/chest/torso/hands where visible, alternative/grunge styling when supported.";
  }

  return "Alloah and Dominic together as two clearly separate people. Preserve each identity independently; never merge or average their facial features. Alloah: long dark layered hair with bangs unless Current Look overrides it, large dark eyes, nose ring, rosy fair/light-medium skin. Dominic: dark curly hair unless Current Look overrides it, lean/slender athletic build, tan/medium skin, small face tattoo near eye/cheek and extensive tattoos where visible.";
}

function closenessDescription(value: string | null) {
  switch (value) {
    case "sweet":
      return "Warm affectionate closeness, small natural touches, still candid.";
    case "romantic":
      return "Romantic but believable private affection, not posed like an engagement shoot.";
    case "flirty":
      return "Playful flirtation and chemistry, fully non-explicit and natural.";
    case "intimate":
      return "Soft private intimacy and tenderness, fully non-explicit, with realistic personal-space closeness.";
    default:
      return "Casual everyday closeness with relaxed body language.";
  }
}

function styleDescription(style: string) {
  const descriptions: Record<string, string> = {
    natural_iphone:
      "ordinary modern phone photo, believable iPhone-like processing, slight imperfection, no professional-camera polish",
    selfie:
      "casual handheld selfie, believable arm/phone geometry, imperfect framing",
    mirror:
      "casual mirror photo, phone naturally visible, real mirror perspective",
    candid:
      "back-camera candid, subject not performing for the camera",
    flash:
      "direct phone flash snapshot, believable falloff and minor motion imperfection",
    disposable:
      "cheap disposable-camera feeling, small grain and imperfect exposure without heavy retro stylization",
    memory_like:
      "memory-like personal snapshot, emotionally soft but still photographic and not cinematic",
  };

  return descriptions[style] ?? descriptions.natural_iphone;
}

function contextLine(request: RequestShape) {
  const context = request.context_snapshot ?? {};
  const values = [
    request.scene ? `Scene requested: ${request.scene}` : null,
    request.mood ? `Mood: ${request.mood}` : null,
    typeof context.activity === "string" ? `Current activity: ${context.activity}` : null,
    typeof context.location === "string" ? `Current location: ${context.location}` : null,
    typeof context.timeOfDay === "string" ? `Time of day: ${context.timeOfDay}` : null,
    typeof context.conversationSummary === "string" && context.conversationSummary.trim()
      ? `Recent conversation context:\n${context.conversationSummary.slice(0, 5000)}`
      : null,
  ].filter(Boolean);

  if (request.mode === "surprise" && !request.scene) {
    values.push(
      "Surprise mode: invent one mundane, specific, plausible moment consistent with the context. Prefer domestic or ordinary life over a dramatic event."
    );
  }

  if (request.mode === "daily_life") {
    values.push(
      "Daily Life mode: this image belongs to a set of ordinary lived-in photos. Make this frame feel distinct from the others, like something casually captured during the day."
    );
  }

  if (request.mode === "memory") {
    values.push(
      "Memory mode: make the image feel personally remembered, not fantasy-like; subtle softness is okay but identity and physical details stay realistic."
    );
  }

  if (request.mode === "chat_context" || request.mode === "chat_photo") {
    values.push(
      "Chat-photo mode: the result should feel like a photo someone would actually send in a private message, not a formal portrait."
    );
  }

  return values.join("\n");
}

function referenceInstruction(reference: ProviderReference, index: number) {
  const purposes = reference.purposes.length
    ? reference.purposes.join(", ")
    : "general identity/detail";
  const current = reference.isCurrent
    ? `CURRENT LOOK${reference.lookType ? ` (${reference.lookType})` : ""}: this overrides older styling when they conflict.`
    : "Historical/canonical reference.";
  const detailOnly = reference.strength === "detail_only"
    ? "Use ONLY the tagged purposes from this image. Ignore unrelated styling, especially old hair/clothes/colors."
    : "Use the tagged purposes as the reason this image is included.";

  return `Reference ${index + 1}: subject=${reference.subject}; strength=${reference.strength}; purposes=${purposes}. ${current} ${detailOnly}${reference.description ? ` Note: ${reference.description.slice(0, 500)}` : ""}`;
}

function buildPrompt(
  request: RequestShape,
  references: ProviderReference[],
  variant: CameraVariant,
  hasSourceImage: boolean
) {
  const snapshot = request.anti_repeat_snapshot ?? {};
  const avoid =
    snapshot && typeof snapshot === "object" && "avoid" in snapshot
      ? (snapshot.avoid as Record<string, unknown>)
      : {};
  const prefer =
    snapshot && typeof snapshot === "object" && "prefer" in snapshot
      ? stringArray(snapshot.prefer)
      : [];

  const lines = [
    "Generate ONE believable personal photograph for a private diary/life-simulation app.",
    "The priority is consistent identity and an ordinary real-life phone-photo feeling, not beauty-editorial polish.",
    subjectDescription(request.subject_type),
    `Photo language: ${styleDescription(request.photo_style)}.`,
    request.subject_type === "both" ? closenessDescription(request.closeness_level) : null,
    `Chosen camera variation for this attempt: ${variant.label}. Follow this unless it conflicts with identity fidelity.`,
    contextLine(request),
    hasSourceImage
      ? "The FIRST image input is the current preview being adjusted. Treat it as the source image to edit: preserve the people, identity, core scene and continuity unless the adjustment explicitly asks for a change."
      : null,
    request.adjustment_instruction
      ? `Adjustment requested: ${request.adjustment_instruction.slice(0, 2000)}`
      : null,
    "Reference hierarchy: Current Look and primary identity references are strict. Supporting references reinforce consistency. Detail-only references must never override unrelated traits.",
    "If an older reference conflicts with Current Look, use Current Look. A historical blonde-hair reference, for example, must not make Dominic blonde when it is tagged only for tattoos/details.",
    "Keep tattoos, piercings, face details, hair, hands and body proportions consistent with the relevant references when visible.",
    "Avoid generic AI glamour: no studio setup, no cinematic color grade, no fashion-campaign pose, no plastic skin, no excessive bokeh, no impossible symmetry.",
    "Allow realistic phone-photo flaws: slightly imperfect crop, mild motion blur when appropriate, mixed household light, casual posture, objects partly cut off, believable skin texture.",
    "Hands and anatomy must be plausible: five fingers when visible, no duplicated limbs, no fused bodies, no duplicated jewelry or tattoos.",
    "Do not add captions, typography, logos, watermarks, UI, borders, collage layouts or fake timestamps.",
    stringArray(avoid?.poses).length
      ? `Avoid repeated poses: ${stringArray(avoid.poses).join(", ")}.`
      : null,
    stringArray(avoid?.cameraAngles).length
      ? `Avoid repeated camera angles: ${stringArray(avoid.cameraAngles).join(", ")}.`
      : null,
    stringArray(avoid?.framings).length
      ? `Avoid repeated framings: ${stringArray(avoid.framings).join(", ")}.`
      : null,
    stringArray(avoid?.locations).length
      ? `Avoid repeatedly using these location categories unless context requires one: ${stringArray(avoid.locations).join(", ")}.`
      : null,
    stringArray(avoid?.compositions).length
      ? `Avoid repeated compositions: ${stringArray(avoid.compositions).join(", ")}.`
      : null,
    prefer.length ? `Freshness hints: ${prefer.join(", ")}.` : null,
    references.length
      ? "The following image references are attached after this prompt. Read the text label before each image and obey its purposes/strength."
      : "No image references were available. Do not invent distinctive tattoos or identity details that are not described above.",
  ].filter(Boolean);

  return lines.join("\n\n");
}

function parseDataUrl(dataUrl: string): InlinePart | null {
  if (!dataUrl || dataUrl.length > MAX_SOURCE_DATA_URL) return null;
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;

  return {
    inlineData: {
      mimeType: match[1],
      data: match[2],
    },
  };
}

async function referenceToInlinePart(
  reference: ProviderReference,
  allowedHost: string
): Promise<InlinePart | null> {
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

    const mimeType = response.headers.get("content-type")?.split(";")[0]?.trim();
    if (!mimeType?.startsWith("image/")) return null;

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!bytes.length || bytes.length > MAX_REFERENCE_BYTES) return null;

    return {
      inlineData: {
        mimeType,
        data: Buffer.from(bytes).toString("base64"),
      },
    };
  } catch {
    return null;
  }
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
  return user.id && user.id === userId ? { id: user.id, supabaseUrl } : null;
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

        const geminiKey = envValue("GEMINI_API_KEY");
        if (!geminiKey) {
          return jsonError(
            "GEMINI_API_KEY is not configured on the server yet.",
            503
          );
        }

        const model = envValue("GEMINI_IMAGE_MODEL") || DEFAULT_MODEL;
        const sourcePart = body.sourceImageDataUrl
          ? parseDataUrl(body.sourceImageDataUrl)
          : null;
        const referenceLimit = sourcePart
          ? Math.max(1, MAX_REFERENCES - 1)
          : MAX_REFERENCES;
        const references = (body.references ?? []).slice(0, referenceLimit);
        const variant = chooseVariant(body.request);
        const prompt = buildPrompt(
          body.request,
          references,
          variant,
          Boolean(sourcePart)
        );

        const allowedHost = new URL(verified.supabaseUrl).host;
        const referenceParts = await Promise.all(
          references.map((reference) =>
            referenceToInlinePart(reference, allowedHost)
          )
        );

        const parts: Array<{ text: string } | InlinePart> = [{ text: prompt }];

        if (sourcePart) {
          parts.push({
            text: "SOURCE PREVIEW TO ADJUST — preserve continuity unless the adjustment says otherwise.",
          });
          parts.push(sourcePart);
        }

        references.forEach((reference, index) => {
          const inline = referenceParts[index];
          if (!inline) return;
          parts.push({ text: referenceInstruction(reference, index) });
          parts.push(inline);
        });

        let providerResponse: Response;

        try {
          providerResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(model)}:generateContent`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": geminiKey,
              },
              body: JSON.stringify({
                contents: [{ role: "user", parts }],
                generationConfig: {
                  responseModalities: ["IMAGE"],
                  responseFormat: {
                    image: {
                      aspectRatio: variant.aspectRatio,
                      imageSize: "1K",
                    },
                  },
                },
              }),
              signal: AbortSignal.timeout(55_000),
            }
          );
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Image provider timed out.";
          return jsonError(message, 504);
        }

        const providerJson = (await providerResponse.json().catch(() => null)) as
          | Record<string, any>
          | null;

        if (!providerResponse.ok) {
          const providerMessage =
            providerJson?.error?.message ||
            `Gemini image generation failed (${providerResponse.status}).`;
          return jsonError(providerMessage, 502);
        }

        const outputParts = providerJson?.candidates?.[0]?.content?.parts ?? [];
        const imagePart = outputParts.find(
          (part: any) => part?.inlineData?.data || part?.inline_data?.data
        );
        const inlineData = imagePart?.inlineData ?? imagePart?.inline_data;

        if (!inlineData?.data) {
          return jsonError("Gemini returned no image for this request.", 502);
        }

        const mimeType =
          inlineData.mimeType || inlineData.mime_type || "image/png";

        const feature: PlannedFeature = {
          poseType: variant.poseType,
          cameraAngle: variant.cameraAngle,
          framing: variant.framing,
          expression: variant.expression,
          lightingType: variant.lightingType,
          locationCategory:
            typeof body.request.context_snapshot?.location === "string"
              ? String(body.request.context_snapshot.location)
              : null,
          compositionType: variant.compositionType,
          featureData: {
            planned: true,
            cameraVariation: variant.label,
            aspectRatio: variant.aspectRatio,
            referenceCount: referenceParts.filter(Boolean).length,
          },
        };

        return Response.json({
          dataUrl: `data:${mimeType};base64,${inlineData.data}`,
          mimeType,
          provider: "google-gemini",
          model,
          prompt,
          feature,
        });
      },
    },
  },
});
