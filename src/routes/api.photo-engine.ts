import { createFileRoute } from "@tanstack/react-router";
import { buildPhotoContextPrompt } from "@/lib/photo-prompt-context";
import {
  buildPhotoVariationPlan,
  photoVariationInstruction,
  type PhotoVariationPlan,
} from "@/lib/photo-variation-plan";

const IMAGE_MODEL = "bytedance-seed/seedream-4.5";
const MAX_REFERENCES = 14;
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
  background?: boolean;
  checkConnection?: boolean;
  auditOnly?: boolean;
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
  allowedHosts: Set<string>
): Promise<string | null> {
  try {
    const url = new URL(reference.url);

    if (
      url.protocol !== "https:" ||
      !allowedHosts.has(url.host)
    ) {
      return null;
    }

    const response = await fetch(url, {
      headers: { Accept: "image/*" },
      signal: AbortSignal.timeout(12_000),
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
    "The canon summarizes the attached references; the actual images remain the primary evidence for identity.",
    "Use the canon to separate stable identity from historical or temporary styling.",
    "Do not average conflicting historical looks into a new generic person.",
    blocks.join("\n\n"),
  ].join("\n\n");
}

function buildPrompt(
  request: RequestShape,
  references: ProviderReference[],
  canons: VisualCanonPayload[],
  hasSourceImage: boolean,
  variationPlan: PhotoVariationPlan
) {
  const referenceGuide = references.map((reference, index) => {
    const purposes = reference.purposes?.length
      ? reference.purposes.join(", ")
      : "identity";

    const isInspiration = reference.subject === "couple" || ["pose", "style"].includes(reference.referenceKind);
    const role = reference.subject === "wardrobe"
      ? "EXACT CURRENT CLOTHING IMAGE — CLOTHES ONLY, NEVER FACE IDENTITY"
      : isInspiration
        ? "OPTIONAL POSE/COMPOSITION INSPIRATION — NOT THESE PEOPLE'S IDENTITY"
        : reference.subject === "shared_home"
          ? "REAL ROOM REFERENCE"
          : "PERSON IDENTITY";
    return `Image ${index + (hasSourceImage ? 2 : 1)}: ROLE=${role}; subject=${
      reference.subject
    }; purposes=${purposes}; strength=${reference.strength}; current=${
      reference.isCurrent ? "yes" : "no"
    }${reference.lookType ? `; current-look type=${reference.lookType}` : ""}${
      reference.description ? `; note=${reference.description}` : ""
    }`;
  });

  return [
    "Generate ONE photorealistic personal phone photograph. Attached images have DIFFERENT ROLES: personal identity, optional Pinterest-inspired composition, and real room references.",
    "",
    "ABSOLUTE PRIORITY — IDENTITY FIDELITY",
    subjectDescription(request.subject_type),
    "Only Alloah identity references depict Alloah; only Dominic identity references depict Dominic. Those images show each subject at different times, angles, expressions and styling.",
    "Use identity images of Alloah and Dominic to preserve each person's recognizable facial geometry and proportions: face shape, eyes, nose, lips, jaw, cheekbones, hair, skin, body proportions, tattoos, piercings and persistent marks.",
    "Do NOT invent a merely similar attractive person. Do NOT beautify the face into a generic AI model. Do NOT average the references into a new face.",
    "If identity references differ in temporary styling, infer the stable identity shared across them. Hair color, clothing, makeup, jewelry and styling may be historical unless marked current.",
    "PINTEREST / US / COUPLE INSPIRATION: These are photos of OTHER people, never photographs of Alloah and Dominic together. They only suggest possible poses, candid energy, distance, framing or general mood. You may combine, vary or completely ignore their compositions. NEVER transfer Pinterest faces, bodies, skin, clothes, or exact staging to Alloah or Dominic.",
    "A scene description and the characters' authentic identity override Pinterest inspirations. The inspiration is not a mandatory template or a demand to reconstruct any reference.",
    "EXPLICIT SCENE OVERRIDES VARIATION: First fulfill WHO is doing WHAT, WHERE, and the described relative body positions. Never substitute a different pose for the requested action. Do not invent coats, sleeves, gloves or layers to hide anatomy. Clothing worn on an arm must connect to the same person's selected garment at the shoulder.",
    "HANDS AND OBJECTS: Show a small named prop only once and in a physically coherent grip; do not duplicate, cross, or deform it. Prioritize accurate people, arms and hands over decorative prop details.",
    "NATURAL CONNECTION: For an affectionate interaction, show believable attention between partners instead of vacant eyes or forced symmetrical poses.",
    "CANONICAL ROOM GEOMETRY: Preserve the actual location and orientation of the sofa relative to walls, windows, doors and major furniture from the attached room photo. Never move furniture to improve composition. Vary only the plausible phone-camera position.",
    "WARDROBE VISUAL CANON: Wardrobe references contain the real Currently Wearing garment cutouts. A wardrobe board may show separate labeled panels for each person: top, bottom, outerwear and shoes. Interpret each panel as its own exact garment; NEVER as a person. Apply pieces to the correct owner, preserving silhouette, fit, construction, fabric and color. Do not replace wide/baggy jeans with slim jeans, or sneakers with sandals. Even if shoes or trousers are partly out of frame, NEVER invent a contradictory outfit. The real face references govern identity.",
    "FRAMING FOR TWO PEOPLE: Unless explicitly requesting a rear view or extremely wide establishing shot, show recognizable faces for BOTH people at a size that makes their identity evaluable. Preserve the scene and room but do not let the entire apartment dominate the image.",
    hasSourceImage
      ? "Image 1 is an existing generated preview being adjusted. Preserve scene continuity while correcting the person toward the identity references."
      : null,
    canonBlock(canons),
buildPhotoContextPrompt(request),
"",
"SCENE",
    request.scene || "Create a believable everyday moment.",
    request.mood ? `Mood: ${request.mood}.` : null,
    request.adjustment_instruction
      ? `Requested adjustment: ${request.adjustment_instruction}`
      : null,

    photoVariationInstruction(variationPlan),
    
    "",
    "CAMERA / REALISM",
    `Photo style: ${styleDescription(request.photo_style)}.`,
    request.shot_type ? `Requested shot: ${request.shot_type}.` : null,
    "The result should look like a real personal photo someone actually took or sent in chat.",
    "Use natural skin texture, ordinary exposure, plausible phone optics, believable anatomy and perspective.",
    "Avoid cinematic grading, studio lighting, fashion-editorial posing, fake depth-of-field, plastic skin, excessive symmetry and generic AI glamour.",
    "LIGHTING MUST MATCH THE ROOM AND TIME: dark indoor evenings need soft available household light, believable shadows and natural skin tones, not daytime windows, harsh flash or theatrical spotlight unless asked.",
    "",
    "REFERENCE MAP",
    referenceGuide.length ? referenceGuide.join("\n") : "No visual references.",
    "",
    "FINAL CHECK",
    "Identity fidelity matters more than prettiness. The person in the result must remain recognizably the SAME person shown in the identity references.",
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

        if (!body.userId || (!body.checkConnection && !body.request?.id)) {
          return jsonError("Missing Photo Engine request.", 400);
        }

        const verified = await verifyUser(request, body.userId);

        if (!verified) {
          return jsonError("Unauthorized Photo Engine request.", 401);
        }

        // Zero-credit end-to-end check: verified browser session -> Vercel ->
        // authenticated Supabase worker. No photo job, ledger reservation or AI call.
        if (body.checkConnection === true) {
          const workerUrl = envValue("SUPABASE_URL") || verified.supabaseUrl;
          try {
            const check = await fetch(workerUrl + "/functions/v1/photo-background-worker", {
              method: "POST",
              headers: {
                Authorization: request.headers.get("authorization") || "",
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ checkConnection: true }),
              signal: AbortSignal.timeout(12000),
            });
            const answer = (await check.json().catch(() => null)) as { error?: string; ok?: boolean; databaseReady?: boolean } | null;
            if (!check.ok || !answer?.ok || answer.databaseReady !== true) {
              return jsonError(
                "Photo connection HTTP " + check.status + ": " + (answer?.error || "Worker did not verify database permissions"),
                503
              );
            }
            return Response.json({ ok: true, message: "Photo worker and database permissions verified. No credits used." });
          } catch {
            return jsonError("Photo worker connection timed out or could not be reached. No credits used.", 503);
          }
        }

        if (!body.request?.id) return jsonError("Missing Photo Engine request.", 400);

        const openRouterKey = envValue("OPENROUTER_API_KEY");

        if (!openRouterKey && body.auditOnly !== true) {
          return jsonError(
            "OPENROUTER_API_KEY is not configured on the server yet.",
            503
          );
        }

        const sourceDataUrl = body.sourceImageDataUrl
          ? validateDataUrl(body.sourceImageDataUrl)
          : null;

        const referenceLimit = sourceDataUrl
          ? Math.max(1, MAX_REFERENCES - 1)
          : MAX_REFERENCES;

        const isRightNow =
          body.request.mode === "chat_photo" &&
          body.request.context_snapshot?.custom &&
          typeof body.request.context_snapshot.custom === "object" &&
          (body.request.context_snapshot.custom as Record<string, unknown>).requestedFrom === "dominic-right-now";

        const requestedReferences = body.references ?? [];
        const rightNowHomeScene = requestedReferences.find(
          (reference) =>
            reference.subject === "shared_home" &&
            reference.referenceKind === "scene" &&
            reference.purposes?.includes("environment")
        );
        const rightNowIdentity = requestedReferences
          .filter((reference) => reference.subject !== "shared_home")
          .slice(0, 6);

        const references = (
          isRightNow
            ? [...rightNowIdentity, ...(rightNowHomeScene ? [rightNowHomeScene] : [])]
            : requestedReferences
        ).slice(0, referenceLimit);

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

        const allowedHosts = new Set([
          new URL(verified.supabaseUrl).host,
          new URL(request.url).host,
        ]);

        const storageHost = new URL(verified.supabaseUrl).host;
        const resolved = await Promise.all(
          references.map(async (reference) => {
            let dataUrl: string | null = null;
            // The worker can safely forward signed Supabase Storage URLs to
            // OpenRouter, preserving full resolution without large JSON bodies.
            // App-hosted room references are converted here, because the worker
            // intentionally does not fetch arbitrary external hostnames.
            if (
              reference.subject === "wardrobe" &&
              reference.url.startsWith("data:image/jpeg;base64,") &&
              reference.url.length <= MAX_REFERENCE_BYTES * 4 / 3
            ) {
              // Per-user boards are assembled locally from EXACT saved cutouts.
              // Admit ONLY bounded JPEG garment boards, never arbitrary URLs.
              dataUrl = validateDataUrl(reference.url);
            } else if (body.background === true) {
              try {
                const u = new URL(reference.url);
                if (
                  u.protocol === "https:" &&
                  u.host === storageHost &&
                  u.pathname.startsWith("/storage/v1/")
                ) {
                  dataUrl = reference.url;
                } else {
                  dataUrl = await referenceToDataUrl(reference, allowedHosts);
                }
              } catch {
                dataUrl = null;
              }
            } else {
              dataUrl = await referenceToDataUrl(reference, allowedHosts);
            }
            return { reference, dataUrl };
          })
        );

        const attachedReferences = resolved.filter(
          (
            item
          ): item is {
            reference: ProviderReference;
            dataUrl: string;
          } => Boolean(item.dataUrl)
        );

       const variationPlan = buildPhotoVariationPlan(body.request);

const prompt = buildPrompt(
  body.request,
  attachedReferences.map((item) => item.reference),
  canons,
  Boolean(sourceDataUrl),
  variationPlan
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

        // Store the refs that actually reached the paid image provider, not
        // every ID in the reference library. This lets Gallery feedback work.
        // Avoid paid generations with missing identities; a successful room
        // or outfit image alone is not evidence of the real person's face.
        const requiredPeople = body.request.subject_type === "both"
          ? ["alloah", "dominic"]
          : [body.request.subject_type === "me" ? "alloah" : "dominic"];
        for (const subject of requiredPeople) {
          if (!attachedReferences.some(({ reference }) =>
            reference.subject === subject && reference.referenceKind === "identity"
          )) {
            return jsonError("Missing usable " + subject + " identity images. Check private reference access before generating. No credits used.", 400);
          }
        }

        const identityReferenceUsage = attachedReferences
          .filter(({ reference }) =>
            (reference.subject === "alloah" || reference.subject === "dominic") &&
            reference.referenceKind === "identity"
          )
          .map(({ reference }) => ({
            id: reference.id,
            subject: reference.subject,
            purposes: reference.purposes ?? [],
            strength: reference.strength,
            referenceKind: reference.referenceKind,
            isCurrent: reference.isCurrent,
          }));
        const photoEvidenceSummary = {
          identityReferenceUsage,
          identityFeedbackVersion: 1,
          selectionVersion: 2,
          referenceCount: inputReferences.length,
          identityCount: identityReferenceUsage.length,
          wardrobeCount: attachedReferences.filter(({ reference }) => reference.subject === "wardrobe").length,
          homeCount: attachedReferences.filter(({ reference }) => reference.subject === "shared_home").length,
          tattooReferenceCount: attachedReferences.filter(({ reference }) =>
            reference.subject === "dominic" && reference.purposes?.includes("tattoos")
          ).length,
          canonSubjects: canons.filter((canon) => canon.subject !== "couple").map((canon) => canon.subject),
        };

        if (!inputReferences.length) {
          return jsonError(
            "No usable identity reference images reached OpenRouter.",
            400
          );
        }

        // Strictly read-only audit. Authenticate and resolve EXACTLY the same
        // image references as generation, then return roles/counts WITHOUT
        // claiming the request, reserving budget or calling OpenRouter.
        if (body.auditOnly === true) {
          const people: Record<string, { faceReferences: number; currentHairReferences: number; tattooReferences: number }> = {};
          const outfits: Record<string, { imageCount: number; items: string[] }> = {};
          const warnings: string[] = [];
          const referenceIds = new Set(attachedReferences.map(({ reference }) => reference.id));
          for (const person of requiredPeople) {
            const photos = attachedReferences.filter(({ reference }) => reference.subject === person);
            people[person] = {
              faceReferences: photos.filter(({ reference }) =>
                reference.referenceKind === "identity" && reference.purposes?.includes("face")
              ).length,
              currentHairReferences: photos.filter(({ reference }) =>
                reference.isCurrent && reference.purposes?.includes("hair")
              ).length,
              tattooReferences: photos.filter(({ reference }) =>
                reference.purposes?.includes("tattoos")
              ).length,
            };
            if (people[person].faceReferences < 2) {
              warnings.push(person + " has fewer than two usable face images.");
            }
            const wardrobe = attachedReferences.filter(({ reference }) =>
              reference.subject === "wardrobe" && reference.purposes?.includes(person)
            );
            outfits[person] = {
              imageCount: wardrobe.length,
              items: wardrobe.map(({ reference }) => reference.title || "Clothing"),
            };
            if (body.request.use_current_look && wardrobe.length === 0) {
              warnings.push(person + " has no Currently Wearing visual reference. Select an outfit in Wardrobe.");
            }
          }
          const tattooRegions: string[] = [];
          for (const canon of canons.filter((item) => item.subject === "dominic")) {
            const regions = Array.isArray(canon.profile.tattoo_regions) ? canon.profile.tattoo_regions : [];
            for (const region of regions) {
              if (!region || typeof region !== "object") continue;
              const row = region as { region?: unknown; anchor_ids?: unknown };
              if (typeof row.region === "string" && Array.isArray(row.anchor_ids) &&
                  row.anchor_ids.some((id) => typeof id === "string" && referenceIds.has(id))) {
                tattooRegions.push(row.region);
              }
            }
          }
          const requestedCount = references.length + (sourceDataUrl ? 1 : 0);
          if (attachedReferences.length < references.length) {
            warnings.push((references.length - attachedReferences.length) + " references could not be loaded. Unavailable images are not sent to the generator.");
          }
          if (!attachedReferences.some(({ reference }) =>
              reference.subject === "shared_home" && reference.purposes?.includes("environment"))) {
            const scene = [body.request.scene || "", String(body.request.context_snapshot?.location || "")].join(" ").toLowerCase();
            if (/home|apartment|living|bedroom|kitchen|sofa|couch|house|casa|sala|sofá|quarto/.test(scene)) {
              warnings.push("No actual room image could be loaded for this home scene.");
            }
          }
          return Response.json({
            auditOnly: true,
            noCreditsUsed: true,
            referenceCount: inputReferences.length,
            people,
            outfits,
            homeReferences: attachedReferences.filter(({ reference }) =>
              reference.subject === "shared_home").length,
            canonSubjects: canons.filter((canon) => canon.subject !== "couple").map((canon) => canon.subject),
            tattooRegions,
            warnings,
            scene: {
              pose: variationPlan.poseType,
              framing: variationPlan.framing,
              lighting: variationPlan.lightingType,
              expression: variationPlan.expression,
            },
            referenceRoles: attachedReferences.map(({ reference }) => ({
              subject: reference.subject,
              title: reference.title,
              purposes: reference.purposes ?? [],
            })),
            requestedCount,
          });
        }

        // Protect expensive manual photos with the same server-side monthly ledger.
        const budgetUrl = envValue("SUPABASE_URL") || import.meta.env.VITE_SUPABASE_URL;
        const budgetKey = envValue("SUPABASE_SERVICE_ROLE_KEY");
        if (!budgetUrl || !budgetKey) return jsonError("Photo budget is not configured.", 503);
        const budgetRpc = async (name: string, body: Record<string, unknown>) => {
          const res = await fetch(`${budgetUrl}/rest/v1/rpc/${name}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", apikey: budgetKey, Authorization: `Bearer ${budgetKey}` },
            body: JSON.stringify(body)
          });
          if (!res.ok) throw new Error("AI budget service unavailable");
          return res.json();
        };
        if (body.background === true) {
          const result = await fetch(budgetUrl + "/functions/v1/photo-background-worker", {
            method: "POST",
            headers: {
              // Forward the already-verified Supabase user session to the worker.
              Authorization: request.headers.get("authorization") || "",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId: body.userId,
              requestId: body.request.id,
              prompt,
              inputReferences,
              model: IMAGE_MODEL,
              feature: {
                poseType: variationPlan.poseType,
                cameraAngle: variationPlan.cameraAngle,
                framing: variationPlan.framing,
                expression: variationPlan.expression,
                lightingType: variationPlan.lightingType,
                compositionType: variationPlan.compositionType,
                locationCategory: body.request.context_snapshot?.location ?? null,
                featureData: photoEvidenceSummary,
              },
            }),
          });
          if (!result.ok) {
            const workerError = (await result.json().catch(() => null)) as { error?: string } | null;
            console.error("Photo worker dispatch HTTP", result.status, workerError?.error || "Unknown error");
            // A rejected dispatch must not leave a request permanently queued.
            // Only transition an untouched queued request; never overwrite a worker
            // that has already claimed it, or an image already saved to Gallery.
            await fetch(`${budgetUrl}/rest/v1/photo_generation_requests?id=eq.${encodeURIComponent(body.request.id)}&user_id=eq.${encodeURIComponent(body.userId)}&status=eq.queued`, {
              method: "PATCH",
              headers: {
                apikey: budgetKey,
                Authorization: `Bearer ${budgetKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                status: "failed",
                error_message: "Background photo dispatch failed before generation. No automatic retry was made.",
                updated_at: new Date().toISOString(),
              }),
            }).catch(() => null);
            return jsonError("Photo worker HTTP " + result.status + ": " + (workerError?.error || "No details provided") + ". No automatic retry was made.", 503);
          }
          return Response.json({ status: "queued", requestId: body.request.id }, { status: 202 });
        }
        // Atomically claim this request before any paid image call.
        // A repeated POST or a reconnect must not generate a second image.
        // A service-role-only database RPC claims exactly one queued job.
        const claimResponse = await fetch(`${budgetUrl}/rest/v1/rpc/claim_photo_job`, {
          method: "POST",
          headers: {
            apikey: budgetKey,
            Authorization: `Bearer ${budgetKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ p_request_id: body.request.id, p_user_id: body.userId }),
        });
        if (!claimResponse.ok) return jsonError("Photo request could not be claimed.", 503);
        const claimed = await claimResponse.json();
        if (claimed !== true) {
          return jsonError("This photo request has already started. Check Gallery before requesting another.", 409);
        }
        let budgetId: string | null;
        try {
          budgetId = await budgetRpc("reserve_ai_budget", {
            p_source: "vercel-photo-engine", p_estimated_usd: 0.06
          });
        } catch {
          return jsonError("Photo budget is temporarily unavailable; no provider call was made.", 503);
        }
        if (!budgetId) {
          await fetch(`${budgetUrl}/rest/v1/photo_generation_requests?id=eq.${encodeURIComponent(body.request.id)}&user_id=eq.${encodeURIComponent(body.userId)}&status=eq.generating`, {
            method: "PATCH",
            headers: {
              apikey: budgetKey,
              Authorization: `Bearer ${budgetKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              status: "failed",
              error_message: "Monthly photo budget reached. No image was charged.",
              updated_at: new Date().toISOString(),
            }),
          }).catch(() => null);
          return jsonError("Monthly photo budget reached.", 429);
        }
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
                model: IMAGE_MODEL,
                prompt,
                n: 1,
                aspect_ratio: "3:4",
                resolution: "2K",
                input_references: inputReferences,
              }),
              signal: AbortSignal.timeout(75_000),
            }
          );
        } catch (error) {
          await budgetRpc("settle_ai_budget", { p_id: budgetId });
          return jsonError(
            error instanceof Error
              ? `OpenRouter image request failed: ${error.message}`
              : "OpenRouter image request timed out.",
            504
          );
        }

        const providerJson = (await providerResponse
          .json()
          .catch(() => null)) as Record<string, any> | null;
        // A provider-side failure can still be billed. Keep a conservative
        // reservation unless OpenRouter reports an actual charge.
        const providerCost = providerJson?.usage?.cost;
        await budgetRpc("settle_ai_budget", {
          p_id: budgetId,
          ...(typeof providerCost === "number" && Number.isFinite(providerCost) && providerCost >= 0
            ? { p_actual_usd: providerCost }
            : {}),
        });

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
          model: IMAGE_MODEL,
          prompt,
         feature: {
  poseType: variationPlan.poseType,
  cameraAngle: variationPlan.cameraAngle,
  framing: variationPlan.framing,
  expression: variationPlan.expression,
  lightingType: variationPlan.lightingType,
            locationCategory:
              typeof body.request.context_snapshot?.location === "string"
                ? String(body.request.context_snapshot.location)
                : null,
compositionType: variationPlan.compositionType,
           featureData: {
              openRouterImageApi: true,
              identityProvider: "bytedance-via-openrouter",
              imageModel: IMAGE_MODEL,
              quality: "2K",
              canonConnected: canons.length > 0,
              canonSubjects: canons.map((canon) => canon.subject),
              referenceCount: inputReferences.length,
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
