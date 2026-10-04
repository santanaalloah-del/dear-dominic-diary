import { createFileRoute } from "@tanstack/react-router";

function envValue(name: string) {
  return process.env[name]?.trim() || "";
}

export const Route = createFileRoute("/api/dominic-heartbeat")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = envValue("DOMINIC_CRON_SECRET");
        const auth = request.headers.get("authorization")?.trim();
        const supplied =
          request.headers.get("x-dominic-cron-secret")?.trim() ||
          (auth?.startsWith("Bearer ") ? auth.slice(7).trim() : "");

        if (!secret || supplied !== secret) {
          return Response.json({ error: "Unauthorized." }, { status: 401 });
        }

        const { supabaseAdmin } =
          await import("@/integrations/supabase/client.server");

        const now = new Date().toISOString();
        const { data: events, error } =
          await supabaseAdmin
            .from("proactive_events")
            .select("id,user_id,status,scheduled_for,context,decision_reason")
            .eq("event_type", "dominic_state_checkin")
            .in("status", ["pending", "ready"])
            .lte("scheduled_for", now)
            .order("scheduled_for", { ascending: true })
            .limit(50);

        if (error) throw error;

        const touchedUsers = new Set<string>();
        let promoted = 0;

        for (const event of events ?? []) {
          touchedUsers.add(event.user_id);

          if (event.status === "pending") {
            const { error: updateError } =
              await supabaseAdmin
                .from("proactive_events")
                .update({
                  status: "ready",
                  processed_at: now,
                  decision_reason:
                    event.decision_reason ??
                    "Background heartbeat promoted the due initiative for contextual generation.",
                  context: {
                    ...(event.context &&
                    typeof event.context === "object" &&
                    !Array.isArray(event.context)
                      ? event.context
                      : {}),
                    background_heartbeat_at: now,
                    requires_contextual_generation: true,
                  },
                })
                .eq("id", event.id)
                .eq("status", "pending");

            if (!updateError) promoted += 1;
          }
        }

        return Response.json({
          ok: true,
          checked: events?.length ?? 0,
          promoted,
          users: touchedUsers.size,
          at: now,
        });
      },
    },
  },
});
