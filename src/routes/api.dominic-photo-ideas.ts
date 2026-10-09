import { createFileRoute } from "@tanstack/react-router";

/**
 * Optional once-a-day BACKGROUND photo-idea check.
 * No OpenRouter, no images, no booking of paid generation, no memory creation.
 * The user must explicitly enable backgroundSuggestions in Chat.
 * Vercel Cron signs requests with CRON_SECRET.
 */
function envValue(name: string) {
  return process.env[name]?.trim() || "";
}
function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}
function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
function dayKey(now: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
}
const LIMITS = { rare: 1, balanced: 2, often: 4 } as const;
const PRIVATE = new Set(["sleeping", "napping", "showering", "getting_dressed", "driving"]);
const ALLOWED = new Set([
  "making_coffee", "cooking", "eating", "washing_dishes", "cleaning",
  "doing_laundry", "watching_something", "listening_to_music", "playing_guitar",
  "writing_music", "recording", "reading", "scrolling", "relaxing",
  "getting_ready", "leaving_home", "coming_home", "walking",
  "getting_food", "shopping", "at_a_cafe", "with_friends",
  "working", "at_the_studio", "rehearsing", "backstage",
]);
const ROOMS: Record<string, string> = {
  living: "living room", kitchen: "kitchen",
  bedroom: "bedroom", bathroom: "bathroom",
};

export const Route = createFileRoute("/api/dominic-photo-ideas")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = envValue("CRON_SECRET") || envValue("DOMINIC_CRON_SECRET");
        const header = request.headers.get("authorization") || "";
        const supplied = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
        if (!secret || supplied !== secret) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const now = new Date();
        const nowIso = now.toISOString();
        const today = dayKey(now);
        const { data: rows, error } = await supabaseAdmin
          .from("diario_settings")
          .select("user_id,data")
          .contains("data", {
            spontaneous_photo_state: { enabled: true, backgroundSuggestions: true },
          })
          .limit(200);

        if (error) {
          console.error("Photo idea scheduler could not read opt-in settings:", error.message);
          return Response.json({ error: "Scheduler unavailable" }, { status: 503 });
        }

        let suggested = 0;
        let notified = 0;
        let skipped = 0;
        for (const row of rows ?? []) {
          try {
            const data = object(row.data);
            const state = object(data.spontaneous_photo_state);
            const frequency = state.frequency === "rare" || state.frequency === "often"
              ? state.frequency : "balanced";
            const dayLimit = LIMITS[frequency];
            const count = state.dayKey === today && typeof state.offersToday === "number"
              ? state.offersToday : 0;
            if (count >= dayLimit || !state.enabled || !state.backgroundSuggestions) {
              skipped++;
              continue;
            }
            const until = text(state.cooldownUntil);
            if (until && Date.parse(until) > now.getTime()) {
              skipped++;
              continue;
            }
            const pending = object(state.pending);
            if (pending.status === "pending" && text(pending.expiresAt) &&
                Date.parse(String(pending.expiresAt)) > now.getTime()) {
              skipped++;
              continue;
            }

            // A live state must actually exist, be recent, and describe a safe
            // activity. Never manufacture being together or another location.
            const { data: live, error: liveError } = await supabaseAdmin
              .from("active_context")
              .select("activity,place,state,last_activity_at")
              .eq("user_id", row.user_id)
              .eq("context_type", "dominic_live_state")
              .eq("source_id", "dominic")
              .eq("source_type", "dominic_life_loop")
              .eq("status", "active")
              .order("last_activity_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            if (liveError || !live || !live.last_activity_at ||
                now.getTime() - Date.parse(live.last_activity_at) > 6 * 60 * 60 * 1000) {
              skipped++;
              continue;
            }
            const liveState = object(live.state);
            const activity = text(liveState.activity) ?? text(live.activity);
            const place = text(liveState.location) ?? text(live.place);
            if (!activity || !place || !ALLOWED.has(activity) || PRIVATE.has(activity)) {
              skipped++;
              continue;
            }
            const stateStartedAt = text(liveState.updated_at) ?? live.last_activity_at;
            const evaluationKey = stateStartedAt + "|background|" + today;
            if (state.lastEvaluatedStateStartedAt === evaluationKey) {
              skipped++;
              continue;
            }
            const locationAllowed = state.useLocationContext !== false;
            const actualRoom = locationAllowed ? ROOMS[place] : undefined;
            const currentActivity = activity.replaceAll("_", " ");
            const scene = "A natural, unposed iPhone photo of Dominic in an ordinary " +
              currentActivity + " moment, genuinely doing what he is doing right now. " +
              (actualRoom ? "Use the REAL " + actualRoom +
                " of the shared apartment, its reference photograph and true furniture positions. "
                : "Do not invent a venue, address or someone's presence. ") +
              "A brief, imperfectly framed everyday snapshot, not a studio pose.";
            const nowMs = now.getTime();
            const idea = {
              id: crypto.randomUUID(),
              status: "pending",
              subjectType: "dominic",
              photoStyle: "natural_iphone",
              note: "He thought of a little photo to send you.",
              createdAt: nowIso,
              expiresAt: new Date(nowMs + 4 * 60 * 60 * 1000).toISOString(),
              stateStartedAt,
              sourceActivity: activity,
              sourceLocation: locationAllowed ? place : "private",
              scene,
              mood: text(liveState.mood) || "everyday",
              conversationSummary: null,
            };
            const nextState = {
              ...state,
              pending: idea,
              lastEvaluatedStateStartedAt: evaluationKey,
              dayKey: today,
              offersToday: count + 1,
            };
            const { error: updateError } = await supabaseAdmin.rpc(
              "upsert_spontaneous_photo_state",
              { p_user_id: row.user_id, p_state: nextState }
            );
            if (updateError) throw updateError;
            suggested++;

            // Push is a SECOND explicit opt-in and contains no private scene,
            // person images, location, chat messages or API credentials.
            if (state.notifyOffApp === true) {
              const { error: pushError } = await supabaseAdmin
                .from("push_outbox")
                .insert({
                  user_id: row.user_id,
                  title: "Dominic",
                  body: "I thought of a little photo. Want to see the idea?",
                  notification_type: "dominic_proactive",
                  target_route: "/?screen=chat",
                  status: "pending",
                  metadata: { source: "dominic_photo_idea", idea_id: idea.id },
                });
              if (!pushError) notified++;
              else console.warn("Optional photo-idea push not queued:", pushError.message);
            }
          } catch (cause) {
            skipped++;
            console.error("Background photo-idea check failed:", cause);
          }
        }

        return Response.json({
          ok: true, checked: rows?.length ?? 0,
          suggested, notified, skipped, at: nowIso, paidImageCalls: 0,
        });
      },
    },
  },
});
