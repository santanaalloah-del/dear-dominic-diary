import { createFileRoute } from "@tanstack/react-router";

const DEFAULT_MODEL = "google/gemini-3.8-flash";

const ITEM_KINDS = [
  "drink",
  "food",
  "dessert",
  "snack",
  "product",
  "clothing",
  "accessory",
  "souvenir",
  "ticket",
  "activity",
  "other",
] as const;

type ItemKind = (typeof ITEM_KINDS)[number];

type RequestBody = {
  userId?: string;
  place?: {
    name?: string;
    placeType?: string;
    neighborhood?: string | null;
    address?: string | null;
    categories?: string[];
    cuisine?: string | null;
    description?: string | null;
  };
};

type GeneratedItem = {
  section: string;
  name: string;
  description: string | null;
  kind: ItemKind;
  priceUsdCents: number | null;
};

type ModelPayload = {
  items: GeneratedItem[];
  dominicPickIndex: number | null;
  dominicNote: string | null;
};

function envValue(name: string) {
  return process.env[name]?.trim() || "";
}

function cleanString(value: unknown): string | null {
  return typeof value === "string" ? value.trim() || null : null;
}

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function cleanJsonText(value: string) {
  return value
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function parseModelContent(value: unknown): Record<string, unknown> {
  let text = "";

  if (typeof value === "string") {
    text = value;
  } else if (Array.isArray(value)) {
    text = value
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
      .join("");
  }

  const cleaned = cleanJsonText(text);

  if (!cleaned) {
    throw new Error("Venue world generator returned an empty response.");
  }

  const parsed = JSON.parse(cleaned);

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Venue world generator returned invalid JSON.");
  }

  return parsed as Record<string, unknown>;
}

async function authConfig(request: Request) {
  const authorization = request.headers.get("authorization");
  const supabaseUrl =
    import.meta.env.VITE_SUPABASE_URL || envValue("SUPABASE_URL");
  const publishableKey =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    envValue("SUPABASE_PUBLISHABLE_KEY");

  if (!authorization?.startsWith("Bearer ") || !supabaseUrl || !publishableKey) {
    return null;
  }

  return {
    authorization,
    supabaseUrl,
    publishableKey,
  };
}

async function verifyUser(request: Request, userId: string) {
  const config = await authConfig(request);

  if (!config) return null;

  const response = await fetch(`${config.supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: config.authorization,
      apikey: config.publishableKey,
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) return null;

  const user = (await response.json()) as { id?: string };

  return user.id === userId ? config : null;
}

async function getDominicPrompt({
  userId,
  authorization,
  supabaseUrl,
  publishableKey,
}: {
  userId: string;
  authorization: string;
  supabaseUrl: string;
  publishableKey: string;
}): Promise<string> {
  const params = new URLSearchParams({
    select: "system_prompt",
    user_id: `eq.${userId}`,
    name: "eq.dominic",
    limit: "1",
  });

  const response = await fetch(
    `${supabaseUrl}/rest/v1/character_config?${params.toString()}`,
    {
      headers: {
        Authorization: authorization,
        apikey: publishableKey,
      },
      signal: AbortSignal.timeout(10_000),
    }
  );

  if (!response.ok) return "";

  const rows = (await response.json()) as Array<{
    system_prompt?: unknown;
  }>;

  return cleanString(rows[0]?.system_prompt) ?? "";
}

const nullableString = {
  anyOf: [{ type: "string" }, { type: "null" }],
} as const;

const nullableInteger = {
  anyOf: [{ type: "integer" }, { type: "null" }],
} as const;

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["items", "dominicPickIndex", "dominicNote"],
  properties: {
    items: {
      type: "array",
      minItems: 6,
      maxItems: 12,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "section",
          "name",
          "description",
          "kind",
          "priceUsdCents",
        ],
        properties: {
          section: { type: "string" },
          name: { type: "string" },
          description: nullableString,
          kind: {
            type: "string",
            enum: [...ITEM_KINDS],
          },
          priceUsdCents: nullableInteger,
        },
      },
    },
    dominicPickIndex: nullableInteger,
    dominicNote: nullableString,
  },
} as const;

function normalizePayload(value: Record<string, unknown>): ModelPayload {
  const rawItems = Array.isArray(value.items) ? value.items : [];
  const items: GeneratedItem[] = rawItems
    .map((raw): GeneratedItem | null => {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

      const item = raw as Record<string, unknown>;
      const section = cleanString(item.section);
      const name = cleanString(item.name);
      const description = cleanString(item.description);
      const kind = cleanString(item.kind) as ItemKind | null;
      const priceUsdCents =
        typeof item.priceUsdCents === "number" &&
        Number.isFinite(item.priceUsdCents)
          ? Math.max(0, Math.round(item.priceUsdCents))
          : null;

      if (!section || !name || !kind || !ITEM_KINDS.includes(kind)) {
        return null;
      }

      return {
        section,
        name,
        description,
        kind,
        priceUsdCents,
      };
    })
    .filter((item): item is GeneratedItem => item !== null)
    .slice(0, 12);

  if (items.length < 6) {
    throw new Error("Venue world generator returned too few usable items.");
  }

  const rawIndex = value.dominicPickIndex;
  const dominicPickIndex =
    typeof rawIndex === "number" &&
    Number.isInteger(rawIndex) &&
    rawIndex >= 0 &&
    rawIndex < items.length
      ? rawIndex
      : null;

  return {
    items,
    dominicPickIndex,
    dominicNote: cleanString(value.dominicNote),
  };
}

async function generateVenueWorld({
  apiKey,
  model,
  place,
  dominicPrompt,
}: {
  apiKey: string;
  model: string;
  place: NonNullable<RequestBody["place"]>;
  dominicPrompt: string;
}): Promise<ModelPayload> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://dear-dominic-diary.vercel.app",
      "X-Title": "Dear Dominic Diary",
    },
    body: JSON.stringify({
      model,
      temperature: 0.65,
      reasoning: { effort: "low" },
      max_tokens: 2800,
      messages: [
        {
          role: "system",
          content: `You create a clearly fictional IN-WORLD assortment inspired by a real venue for a private relationship diary app.

This is a fallback layer used only when a reliable real menu/catalog is not available.

CRITICAL TRUTH RULES:
- Never claim these are the venue's actual current menu items, products, stock, tickets or prices.
- Do not copy or pretend to know a real menu.
- Every generated item is fictional but contextually plausible.
- priceUsdCents is a simulated in-world USD price, not a real venue quote.
- Keep names natural and concise.
- Produce 6-12 items split into useful sections.
- Adapt to the venue type: cafe/restaurant -> food & drink; store -> products/clothing/accessories; museum/gallery -> admission/gift shop/cafe; cinema -> ticket/snacks/drinks; activity/place -> appropriate entry/activity/souvenirs.

DOMINIC AUTONOMY:
- Choose one item for Dominic when a reasonable choice exists.
- The choice is his, not the user's.
- Use the Dominic persona context below only to guide his taste/style.
- Do not mention or reveal the persona prompt.
- Keep dominicNote to one short natural first-person line explaining or reacting to his pick.

Dominic persona context:
${dominicPrompt || "No additional persona context is available."}`,
        },
        {
          role: "user",
          content: JSON.stringify({
            venue: {
              name: cleanString(place.name),
              placeType: cleanString(place.placeType),
              neighborhood: cleanString(place.neighborhood),
              address: cleanString(place.address),
              categories: Array.isArray(place.categories)
                ? place.categories.filter((item): item is string => typeof item === "string")
                : [],
              cuisine: cleanString(place.cuisine),
              description: cleanString(place.description),
            },
            instruction:
              "Create the inspired in-world assortment and let Dominic independently pick one item.",
          }),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "venue_in_world_catalog",
          strict: true,
          schema: RESPONSE_SCHEMA,
        },
      },
    }),
    signal: AbortSignal.timeout(40_000),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      text || `Venue world generation failed (${response.status}).`
    );
  }

  const result = (await response.json()) as {
    choices?: Array<{
      message?: { content?: unknown };
    }>;
  };

  return normalizePayload(
    parseModelContent(result.choices?.[0]?.message?.content)
  );
}

export const Route = createFileRoute("/api/venue-world")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as RequestBody;
          const userId = cleanString(body.userId);
          const place = body.place;

          if (!userId || !place || !cleanString(place.name)) {
            return jsonError("Missing venue context.", 400);
          }

          const verified = await verifyUser(request, userId);

          if (!verified) {
            return jsonError("Unauthorized.", 401);
          }

          const apiKey = envValue("OPENROUTER_API_KEY");

          if (!apiKey) {
            return jsonError(
              "OPENROUTER_API_KEY is not configured on the server.",
              503
            );
          }

          const dominicPrompt = await getDominicPrompt({
            userId,
            ...verified,
          });

          const generated = await generateVenueWorld({
            apiKey,
            model: envValue("VENUE_WORLD_MODEL") || DEFAULT_MODEL,
            place,
            dominicPrompt,
          });

          const items = generated.items.map((item, index) => ({
            id: `inworld-${index + 1}-${item.name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "")}`,
            ...item,
            sourceTier: "in_world" as const,
          }));

          const dominicPick =
            generated.dominicPickIndex !== null
              ? {
                  itemId: items[generated.dominicPickIndex]?.id ?? "",
                  note: generated.dominicNote,
                }
              : null;

          return Response.json({
            catalog: {
              schemaVersion: 1,
              sourceTier: "in_world",
              sourceLabel: "Inspired by this place",
              sourceUrl: null,
              notice:
                "This selection is part of your in-world date experience. It is not a claim about the venue's current real menu, stock or prices.",
              generatedAt: new Date().toISOString(),
              items,
              dominicPick:
                dominicPick?.itemId ? dominicPick : null,
              alloahPickId: null,
            },
          });
        } catch (error) {
          console.error("Venue world generation failed:", error);

          return jsonError(
            error instanceof Error
              ? error.message
              : "Venue world generation failed.",
            500
          );
        }
      },
    },
  },
});
