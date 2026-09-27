import { createFileRoute } from "@tanstack/react-router";

const DEFAULT_CANON_MODEL = "google/gemini-3.8-flash";
const BATCH_SIZE = 12;
const MAX_REFERENCES = 60;

type CanonSubject = "alloah" | "dominic" | "couple";

type CanonReferenceInput = {
  id: string;
  url: string;
  subject: string;
  title?: string | null;
  description?: string | null;
  purposes?: string[];
  strength?: string | null;
  referenceKind?: string | null;
  lookType?: string | null;
  isCurrent?: boolean;
  createdAt?: string | null;
};

type CanonRequestBody = {
  userId?: string;
  subject?: CanonSubject;
  references?: CanonReferenceInput[];
  force?: boolean;
};

type ExistingCanon = {
  id: string;
  user_id: string;
  subject: CanonSubject;
  status: string;
  profile: Record<string, unknown>;
  reference_ids: string[];
  provider: string | null;
  model: string | null;
  analysis_version: number;
  last_error: string | null;
  last_analyzed_at: string | null;
};

type VerifiedUser = {
  id: string;
  authHeader: string;
  supabaseUrl: string;
  publishableKey: string;
};

type OpenRouterResult = {
  parsed: Record<string, unknown>;
  cost: number | null;
};

const REFERENCE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "quality_score",
    "identity_score",
    "best_for",
    "temporal_role",
    "visible_facts",
    "conflicts_or_uncertainties",
  ],
  properties: {
    id: { type: "string" },
    quality_score: { type: "integer", minimum: 0, maximum: 100 },
    identity_score: { type: "integer", minimum: 0, maximum: 100 },
    best_for: {
      type: "array",
      items: {
        type: "string",
        enum: [
          "face",
          "profile",
          "eyes",
          "nose",
          "mouth",
          "hair",
          "skin",
          "body",
          "tattoos",
          "piercings",
          "hands",
          "jewelry",
          "clothing",
          "pose",
          "couple",
          "other",
        ],
      },
    },
    temporal_role: {
      type: "string",
      enum: ["current", "historical", "unknown"],
    },
    visible_facts: {
      type: "array",
      items: { type: "string" },
    },
    conflicts_or_uncertainties: {
      type: "array",
      items: { type: "string" },
    },
  },
} as const;

const BATCH_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "reference_assessments",
    "stable_observations",
    "variable_observations",
    "distinctive_details",
    "uncertainties",
  ],
  properties: {
    reference_assessments: {
      type: "array",
      items: REFERENCE_SCHEMA,
    },
    stable_observations: {
      type: "array",
      items: { type: "string" },
    },
    variable_observations: {
      type: "array",
      items: { type: "string" },
    },
    distinctive_details: {
      type: "array",
      items: { type: "string" },
    },
    uncertainties: {
      type: "array",
      items: { type: "string" },
    },
  },
} as const;

const FINAL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "subject",
    "identity_summary",
    "stable_traits",
    "changeable_traits",
    "distinctive_details",
    "tattoos_or_marks",
    "generation_rules",
    "avoid_mistakes",
    "anchor_reference_ids",
    "reference_roles",
    "uncertainties",
  ],
  properties: {
    subject: {
      type: "string",
      enum: ["alloah", "dominic", "couple"],
    },
    identity_summary: { type: "string" },
    stable_traits: {
      type: "array",
      items: { type: "string" },
    },
    changeable_traits: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "trait",
          "current_or_preferred",
          "other_variants",
          "evidence_reference_ids",
        ],
        properties: {
          trait: { type: "string" },
          current_or_preferred: {
            anyOf: [{ type: "string" }, { type: "null" }],
          },
          other_variants: {
            type: "array",
            items: { type: "string" },
          },
          evidence_reference_ids: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
    },
    distinctive_details: {
      type: "array",
      items: { type: "string" },
    },
    tattoos_or_marks: {
      type: "array",
      items: { type: "string" },
    },
    generation_rules: {
      type: "array",
      items: { type: "string" },
    },
    avoid_mistakes: {
      type: "array",
      items: { type: "string" },
    },
    anchor_reference_ids: {
      type: "array",
      items: { type: "string" },
    },
    reference_roles: {
      type: "array",
      items: REFERENCE_SCHEMA,
    },
    uncertainties: {
      type: "array",
      items: { type: "string" },
    },
  },
} as const;

function envValue(name: string) {
  return process.env[name]?.trim() || "";
}

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function uniqueReferences(references: CanonReferenceInput[]) {
  const byId = new Map<string, CanonReferenceInput>();

  for (const reference of references) {
    if (!reference?.id || !reference?.url) continue;
    byId.set(reference.id, reference);
  }

  return Array.from(byId.values()).slice(0, MAX_REFERENCES);
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function cleanArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function parseOpenRouterContent(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Canon Analyzer returned invalid JSON.");
    }
    return parsed as Record<string, unknown>;
  }

  if (Array.isArray(value)) {
    const text = value
      .map((part) => {
        if (
          part &&
          typeof part === "object" &&
          "text" in part &&
          typeof (part as { text?: unknown }).text === "string"
        ) {
          return (part as { text: string }).text;
        }
        return "";
      })
      .join("")
      .trim();

    if (!text) {
      throw new Error("Canon Analyzer returned an empty response.");
    }

    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Canon Analyzer returned invalid JSON.");
    }
    return parsed as Record<string, unknown>;
  }

  throw new Error("Canon Analyzer returned an unreadable response.");
}

async function verifyUser(
  request: Request,
  userId: string
): Promise<VerifiedUser | null> {
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

  if (!user.id || user.id !== userId) {
    return null;
  }

  return {
    id: user.id,
    authHeader,
    supabaseUrl,
    publishableKey,
  };
}

async function loadExistingCanon(
  verified: VerifiedUser,
  subject: CanonSubject
): Promise<ExistingCanon | null> {
  const query = new URL(`${verified.supabaseUrl}/rest/v1/visual_canons`);
  query.searchParams.set("user_id", `eq.${verified.id}`);
  query.searchParams.set("subject", `eq.${subject}`);
  query.searchParams.set("select", "*");
  query.searchParams.set("limit", "1");

  const response = await fetch(query, {
    headers: {
      Authorization: verified.authHeader,
      apikey: verified.publishableKey,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      text || `Could not load the existing visual canon (${response.status}).`
    );
  }

  const rows = (await response.json()) as ExistingCanon[];
  return rows[0] ?? null;
}

async function saveCanon(
  verified: VerifiedUser,
  payload: Record<string, unknown>
) {
  const query = new URL(`${verified.supabaseUrl}/rest/v1/visual_canons`);
  query.searchParams.set("on_conflict", "user_id,subject");

  const response = await fetch(query, {
    method: "POST",
    headers: {
      Authorization: verified.authHeader,
      apikey: verified.publishableKey,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      text || `Could not save the visual canon (${response.status}).`
    );
  }

  const rows = (await response.json()) as ExistingCanon[];
  return rows[0] ?? null;
}

function allowedReference(
  reference: CanonReferenceInput,
  supabaseUrl: string
) {
  try {
    const url = new URL(reference.url);
    const allowedHost = new URL(supabaseUrl).host;
    return url.protocol === "https:" && url.host === allowedHost;
  } catch {
    return false;
  }
}

function referenceMetadataLine(
  reference: CanonReferenceInput,
  index: number
) {
  return [
    `Image ${index + 1}`,
    `reference_id=${reference.id}`,
    `subject=${reference.subject}`,
    `kind=${reference.referenceKind ?? "identity"}`,
    `strength=${reference.strength ?? "unknown"}`,
    `purposes=${cleanArray(reference.purposes).join(", ") || "unspecified"}`,
    `current=${reference.isCurrent === true ? "yes" : "no"}`,
    `look_type=${reference.lookType ?? "none"}`,
    reference.title ? `title=${reference.title}` : null,
    reference.description ? `note=${reference.description}` : null,
  ]
    .filter(Boolean)
    .join("; ");
}

function batchPrompt(
  subject: CanonSubject,
  references: CanonReferenceInput[]
) {
  const name =
    subject === "alloah"
      ? "Alloah"
      : subject === "dominic"
        ? "Dominic"
        : "Alloah and Dominic as a couple";

  const mapping = references
    .map((reference, index) => referenceMetadataLine(reference, index))
    .join("\n");

  return `You are the visual-canon analyzer for a private diary app.

Analyze ALL attached images together as references for ${name}. The goal is identity consistency in future image generation.

Important rules:
- Compare the images with each other. Do not analyze them as unrelated pictures.
- Separate stable identity from temporary or conflicting styling.
- Multiple photos can show different angles, lighting, hair, clothes, tattoos, makeup, or ages. Record useful variation instead of averaging everything into a generic person.
- Use explicit metadata such as current=yes or kind=current_look to decide what is current.
- If chronology is not explicit, do NOT invent which image is newer. Mark the temporal role unknown and describe the variants.
- A reference can be excellent for tattoos/body/hair while being weak for face identity.
- Favor clear, unobstructed, representative face images as identity anchors.
- Do not infer race, ethnicity, nationality, health, personality, or other sensitive attributes. Describe only visible physical details useful for image consistency.
- Do not identify the real-world person. The subject label is supplied by the app.
- Be conservative when two images conflict. Put uncertain claims in conflicts_or_uncertainties.
- Every reference assessment must use the exact reference_id supplied below.

IMAGE ORDER AND METADATA:
${mapping}

Return only the requested structured JSON.`;
}

function synthesisPrompt({
  subject,
  existingProfile,
  batchResults,
  allReferences,
}: {
  subject: CanonSubject;
  existingProfile: Record<string, unknown> | null;
  batchResults: Record<string, unknown>[];
  allReferences: CanonReferenceInput[];
}) {
  const validIds = allReferences.map((reference) => reference.id);

  return `Build the consolidated visual canon for subject "${subject}".

This is a synthesis step. You are not seeing the images directly here; use the image-analysis results below. If an older canon exists, update it rather than blindly replacing useful stable knowledge.

GOAL:
Create a durable identity profile that future image generation can use similarly to how a careful human would compare many photos of the same person.

RULES:
- Stable traits must be supported across multiple useful references where possible.
- Keep meaningful variants instead of averaging conflicts.
- "current_or_preferred" may only claim a current state when explicit current-look metadata supports it. Otherwise use null.
- Anchor references should be the clearest/highest-confidence identity images, not simply the newest uploads.
- A tattoo/detail image should not become a face anchor just because it is high quality.
- generation_rules must be concrete instructions that help preserve identity.
- avoid_mistakes must describe likely failure modes suggested by conflicting/weak references.
- reference_roles must include the useful assessments from the batch analyses, deduplicated by id.
- Only use reference IDs from VALID_REFERENCE_IDS.
- Do not infer sensitive attributes or identify a real-world person.

VALID_REFERENCE_IDS:
${JSON.stringify(validIds)}

EXISTING_CANON:
${existingProfile ? JSON.stringify(existingProfile) : "none"}

NEW_IMAGE_ANALYSES:
${JSON.stringify(batchResults)}

Return only the requested structured JSON.`;
}

async function callOpenRouter({
  apiKey,
  model,
  messages,
  schemaName,
  schema,
}: {
  apiKey: string;
  model: string;
  messages: Array<Record<string, unknown>>;
  schemaName: string;
  schema: Record<string, unknown>;
}): Promise<OpenRouterResult> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-Title": "Dear Dominic Diary",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.1,
      max_tokens: 7000,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: schemaName,
          strict: true,
          schema,
        },
      },
      provider: {
        require_parameters: true,
      },
    }),
    signal: AbortSignal.timeout(90_000),
  });

  const json = (await response.json().catch(() => null)) as
    | Record<string, any>
    | null;

  if (!response.ok) {
    const message =
      json?.error?.message ||
      json?.message ||
      `OpenRouter canon analysis failed (${response.status}).`;
    throw new Error(message);
  }

  const content = json?.choices?.[0]?.message?.content;
  const parsed = parseOpenRouterContent(content);

  return {
    parsed,
    cost:
      typeof json?.usage?.cost === "number"
        ? json.usage.cost
        : null,
  };
}

async function analyzeBatch({
  apiKey,
  model,
  subject,
  references,
}: {
  apiKey: string;
  model: string;
  subject: CanonSubject;
  references: CanonReferenceInput[];
}) {
  const content: Array<Record<string, unknown>> = [
    {
      type: "text",
      text: batchPrompt(subject, references),
    },
    ...references.map((reference) => ({
      type: "image_url",
      image_url: {
        url: reference.url,
      },
    })),
  ];

  return callOpenRouter({
    apiKey,
    model,
    messages: [
      {
        role: "user",
        content,
      },
    ],
    schemaName: "visual_canon_batch",
    schema: BATCH_SCHEMA as unknown as Record<string, unknown>,
  });
}

async function synthesizeCanon({
  apiKey,
  model,
  subject,
  existingProfile,
  batchResults,
  allReferences,
}: {
  apiKey: string;
  model: string;
  subject: CanonSubject;
  existingProfile: Record<string, unknown> | null;
  batchResults: Record<string, unknown>[];
  allReferences: CanonReferenceInput[];
}) {
  return callOpenRouter({
    apiKey,
    model,
    messages: [
      {
        role: "user",
        content: synthesisPrompt({
          subject,
          existingProfile,
          batchResults,
          allReferences,
        }),
      },
    ],
    schemaName: "visual_canon_profile",
    schema: FINAL_SCHEMA as unknown as Record<string, unknown>,
  });
}

export const Route = createFileRoute("/api/visual-canon")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: CanonRequestBody;

        try {
          body = (await request.json()) as CanonRequestBody;
        } catch {
          return jsonError("Invalid JSON body.", 400);
        }

        if (!body.userId || !body.subject) {
          return jsonError("Missing visual canon request.", 400);
        }

        if (
          body.subject !== "alloah" &&
          body.subject !== "dominic" &&
          body.subject !== "couple"
        ) {
          return jsonError("Invalid canon subject.", 400);
        }

        const verified = await verifyUser(request, body.userId);

        if (!verified) {
          return jsonError("Unauthorized visual canon request.", 401);
        }

        const openRouterKey = envValue("OPENROUTER_API_KEY");

        if (!openRouterKey) {
          return jsonError(
            "OPENROUTER_API_KEY is not configured on the server.",
            503
          );
        }

        const model =
          envValue("OPENROUTER_CANON_MODEL") || DEFAULT_CANON_MODEL;

        const incoming = uniqueReferences(body.references ?? []).filter(
          (reference) => allowedReference(reference, verified.supabaseUrl)
        );

        if (incoming.length === 0) {
          return jsonError(
            "No valid visual references were provided for analysis.",
            400
          );
        }

        let existing: ExistingCanon | null = null;

        try {
          existing = await loadExistingCanon(verified, body.subject);
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Could not load the visual canon.";
          return jsonError(message, 500);
        }

        const existingIds = new Set(existing?.reference_ids ?? []);
        const incomingIds = new Set(incoming.map((reference) => reference.id));

        const removedReference =
          existing?.reference_ids.some((id) => !incomingIds.has(id)) ?? false;

        const newReferences = incoming.filter(
          (reference) => !existingIds.has(reference.id)
        );

        const requiresFullAnalysis =
          body.force === true ||
          !existing ||
          existing.status !== "ready" ||
          removedReference;

        const referencesToAnalyze = requiresFullAnalysis
          ? incoming
          : newReferences;

        if (
          referencesToAnalyze.length === 0 &&
          existing?.status === "ready"
        ) {
          return Response.json({
            canon: existing,
            reused: true,
            analyzedReferenceCount: 0,
            totalReferenceCount: incoming.length,
          });
        }

        const nextVersion = (existing?.analysis_version ?? 0) + 1;

        try {
          await saveCanon(verified, {
            user_id: verified.id,
            subject: body.subject,
            status: "analyzing",
            profile: existing?.profile ?? {},
            reference_ids: existing?.reference_ids ?? [],
            provider: "openrouter",
            model,
            analysis_version: nextVersion,
            last_error: null,
            updated_at: new Date().toISOString(),
          });
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Could not mark the visual canon as analyzing.";
          return jsonError(message, 500);
        }

        try {
          const batches = chunk(referencesToAnalyze, BATCH_SIZE);

          const batchResponses = await Promise.all(
            batches.map((batch) =>
              analyzeBatch({
                apiKey: openRouterKey,
                model,
                subject: body.subject as CanonSubject,
                references: batch,
              })
            )
          );

          const batchResults = batchResponses.map((result) => result.parsed);

          const synthesis = await synthesizeCanon({
            apiKey: openRouterKey,
            model,
            subject: body.subject,
            existingProfile:
              requiresFullAnalysis || !existing
                ? null
                : existing.profile,
            batchResults,
            allReferences: incoming,
          });

          const totalCost = [
            ...batchResponses.map((result) => result.cost),
            synthesis.cost,
          ].reduce(
            (sum, value) =>
              typeof value === "number" ? sum + value : sum,
            0
          );

          const saved = await saveCanon(verified, {
            user_id: verified.id,
            subject: body.subject,
            status: "ready",
            profile: synthesis.parsed,
            reference_ids: incoming.map((reference) => reference.id),
            provider: "openrouter",
            model,
            analysis_version: nextVersion,
            last_error: null,
            last_analyzed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

          return Response.json({
            canon: saved,
            reused: false,
            analyzedReferenceCount: referencesToAnalyze.length,
            totalReferenceCount: incoming.length,
            batches: batches.length,
            provider: "openrouter",
            model,
            estimatedProviderCost:
              totalCost > 0 ? totalCost : null,
          });
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "The visual canon could not be analyzed.";

          try {
            await saveCanon(verified, {
              user_id: verified.id,
              subject: body.subject,
              status: "error",
              profile: existing?.profile ?? {},
              reference_ids: existing?.reference_ids ?? [],
              provider: "openrouter",
              model,
              analysis_version: nextVersion,
              last_error: message.slice(0, 2000),
              updated_at: new Date().toISOString(),
            });
          } catch {
            // Preserve the original analyzer error.
          }

          return jsonError(message, 502);
        }
      },
    },
  },
});
