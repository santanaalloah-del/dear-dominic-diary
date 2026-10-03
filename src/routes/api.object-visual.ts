import { createFileRoute } from "@tanstack/react-router";

const IMAGE_MODEL = "openai/gpt-image-2.5-sunburst";

type ObjectVisualBody = {
  userId?: string;
  item?: {
    name?: string;
    kind?: string;
    description?: string | null;
    placeName?: string | null;
    section?: string | null;
  };
};

function envValue(name: string) {
  return process.env[name]?.trim() || "";
}

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
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

  return user.id && user.id === userId ? { id: user.id } : null;
}

function visualLanguage(kind: string) {
  const byKind: Record<string, string> = {
    food:
      "realistic plated food or takeaway item, appetizing but ordinary and believable",
    drink:
      "realistic drink in its natural cup, glass, can or bottle",
    dessert:
      "realistic dessert or sweet treat, ordinary café presentation",
    snack:
      "realistic snack or small treat, believable packaging or serving",
    ticket:
      "realistic small paper ticket or pass, generic markings only and no readable text",
    receipt:
      "realistic folded receipt or little paper slip, no readable text",
    flower:
      "realistic single flower or small bouquet",
    gift:
      "realistic small gift or wrapped object",
    souvenir:
      "realistic small souvenir or memento",
    purchase:
      "realistic small purchased object",
    clothing:
      "realistic clothing item laid flat or isolated",
    object:
      "realistic small everyday object",
  };

  return byKind[kind] ?? byKind.object;
}

export const Route = createFileRoute("/api/object-visual")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: ObjectVisualBody;

        try {
          body = (await request.json()) as ObjectVisualBody;
        } catch {
          return jsonError("Invalid JSON body.", 400);
        }

        if (!body.userId || !body.item?.name) {
          return jsonError("Missing object visual request.", 400);
        }

        const verified = await verifyUser(request, body.userId);

        if (!verified) {
          return jsonError("Unauthorized object visual request.", 401);
        }

        const openRouterKey = envValue("OPENROUTER_API_KEY");

        if (!openRouterKey) {
          return jsonError(
            "OPENROUTER_API_KEY is not configured on the server yet.",
            503
          );
        }

        const itemName = body.item.name.trim();
        const kind = body.item.kind?.trim().toLowerCase() || "object";
        const description = body.item.description?.trim() || "";
        const placeName = body.item.placeName?.trim() || "";

        const prompt = [
          "Generate ONE clean, photorealistic isolated object image for a private scrapbook diary app.",
          `Object: ${itemName}.`,
          `Type: ${kind}.`,
          `Visual interpretation: ${visualLanguage(kind)}.`,
          description ? `Description: ${description}.` : null,
          placeName ? `It came from: ${placeName}.` : null,
          "",
          "COMPOSITION",
          "Show the item alone, centered, fully visible, with natural proportions and believable materials.",
          "No people, no hands, no faces, no scene, no table, no room, no decorative props.",
          "Use a transparent background. Keep a little breathing room around the object.",
          "Do not add typography, labels, logos, captions, watermarks or readable text.",
          "If the real item would normally contain branding or writing, simplify it into plausible generic details rather than inventing readable words.",
          "",
          "STYLE",
          "Natural everyday realism, like a carefully cut-out phone photo of the actual thing from that day.",
          "Not glossy ecommerce, not 3D render, not illustration, not iconography.",
        ]
          .filter(Boolean)
          .join("\n");

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
                aspect_ratio: "1:1",
                quality: "medium",
                background: "transparent",
              }),
              signal: AbortSignal.timeout(180_000),
            }
          );
        } catch (error) {
          return jsonError(
            error instanceof Error
              ? `Object image request failed: ${error.message}`
              : "Object image request timed out.",
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
              `Object image generation failed (${providerResponse.status}).`,
            502
          );
        }

        const image = providerJson?.data?.[0];
        const imageBase64 = image?.b64_json;

        if (!imageBase64 || typeof imageBase64 !== "string") {
          return jsonError("The image provider returned no object image.", 502);
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
        });
      },
    },
  },
});
