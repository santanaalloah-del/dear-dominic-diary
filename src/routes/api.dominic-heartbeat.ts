import { createFileRoute } from "@tanstack/react-router";

const DEFAULT_MODEL = "google/gemini-3.8-flash";

function envValue(name: string) {
  return process.env[name]?.trim() || "";
}

function isDuplicateBackgroundEvent(
  eventContext: unknown,
  marker: string
) {
  if (
    !eventContext ||
    typeof eventContext !== "object" ||
    Array.isArray(eventContext)
  ) {
    return false;
  }

  return Boolean(
    (eventContext as Record<string, unknown>)[
      marker
    ]
  );
}

async function generateInitiative({
  apiKey,
  state,
  presence,
  eventContext,
  recentMessages,
}: {
  apiKey: string;
  state: unknown;
  presence: unknown;
  eventContext: unknown;
  recentMessages: unknown[];
}) {
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
        "X-Title": "Dear Dominic Diary",
      },
      body: JSON.stringify({
        model:
          envValue("DOMINIC_PROACTIVE_MODEL") ||
          DEFAULT_MODEL,
        temperature: 0.75,
        max_tokens: 600,
        messages: [
          {
            role: "system",
            content:
              "Generate one spontaneous initiative from Dominic for a private fictional relationship diary. Use only the supplied live state, physical presence, event context and recent conversation. Dominic may choose silence. If togetherNow is true, write as a co-present spoken interaction and brief body language may use single asterisks. If false, write as remote conversation and never narrate impossible physical contact. Avoid generic check-ins. Do not invent completed events, places, memories, purchases or promises. Return JSON with decision, message and reason.",
          },
          {
            role: "user",
            content: JSON.stringify({
              state,
              presence,
              eventContext,
              recentMessages,
            }),
          },
        ],
        response_format: {
          type: "json_object",
        },
      }),
      signal: AbortSignal.timeout(40_000),
    }
  );

  if (!response.ok) {
    throw new Error(
      "Proactive model request failed."
    );
  }

  const result =
    (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string | null;
        };
      }>;
    };

  const raw =
    result.choices?.[0]?.message?.content?.trim();

  if (!raw) {
    return {
      decision: "skip" as const,
      message: null,
      reason:
        "No natural initiative was generated.",
    };
  }

  const parsed =
    JSON.parse(raw) as {
      decision?: string;
      message?: string | null;
      reason?: string;
    };

  const message =
    parsed.decision === "send" &&
    typeof parsed.message === "string"
      ? parsed.message.trim()
      : "";

  return {
    decision: message ? "send" as const : "skip" as const,
    message: message || null,
    reason:
      typeof parsed.reason === "string" &&
      parsed.reason.trim()
        ? parsed.reason.trim()
        : "Dominic chose from the live context.",
  };
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

        const apiKey =
          envValue("OPENROUTER_API_KEY");

        if (!apiKey) {
          return Response.json(
            {
              error:
                "Proactive model is not configured.",
            },
            { status: 503 }
          );
        }

        const { supabaseAdmin } =
          await import("@/integrations/supabase/client.server");

        const now = new Date().toISOString();

        const { data: events, error } =
          await supabaseAdmin
            .from("proactive_events")
            .select(
              "id,user_id,status,scheduled_for,context,decision_reason"
            )
            .eq(
              "event_type",
              "dominic_state_checkin"
            )
            .in(
              "status",
              ["pending", "ready"]
            )
            .lte(
              "scheduled_for",
              now
            )
            .order(
              "scheduled_for",
              { ascending: true }
            )
            .limit(20);

        if (error) throw error;

        let sent = 0;
        let skipped = 0;
        let failed = 0;

        for (
          const event of
          events ?? []
        ) {
          try {
            if (
              event.status === "ready" &&
              isDuplicateBackgroundEvent(
                event.context,
                "background_generated_at"
              )
            ) {
              continue;
            }

            const lockTime =
              new Date().toISOString();

            const { data: lockedEvent } =
              await supabaseAdmin
                .from("proactive_events")
                .update({
                  status: "processing",
                  processed_at: lockTime,
                  context: {
                    ...(event.context &&
                    typeof event.context === "object" &&
                    !Array.isArray(event.context)
                      ? event.context
                      : {}),
                    background_processing_at:
                      lockTime,
                  },
                })
                .eq("id", event.id)
                .in("status", ["pending", "ready"])
                .select("id")
                .maybeSingle();

            if (!lockedEvent) {
              continue;
            }
            const [
              { data: homeState },
              { data: activeContexts },
              { data: conversations },
            ] =
              await Promise.all([
                supabaseAdmin
                  .from("home_state")
                  .select("state")
                  .eq(
                    "user_id",
                    event.user_id
                  )
                  .maybeSingle(),

                supabaseAdmin
                  .from("active_context")
                  .select(
                    "together_now,place,state,last_activity_at,source_id"
                  )
                  .eq(
                    "user_id",
                    event.user_id
                  )
                  .eq(
                    "status",
                    "active"
                  )
                  .order(
                    "last_activity_at",
                    { ascending: false }
                  )
                  .limit(8),

                supabaseAdmin
                  .from("conversations")
                  .select(
                    "id,title,updated_at"
                  )
                  .eq(
                    "user_id",
                    event.user_id
                  )
                  .order(
                    "updated_at",
                    { ascending: false }
                  ),
              ]);

            const conversation =
              conversations?.find(
                (item) =>
                  item.title
                    ?.toLowerCase()
                    .includes(
                      "dominic"
                    )
              ) ??
              conversations?.[0];

            if (!conversation) {
              await supabaseAdmin
                .from(
                  "proactive_events"
                )
                .update({
                  status:
                    "pending",
                  processed_at:
                    null,
                  scheduled_for:
                    new Date(
                      Date.now() +
                        30 *
                          60_000
                    ).toISOString(),
                  decision_reason:
                    "No Dominic conversation exists yet; retry later.",
                })
                .eq(
                  "id",
                  event.id
                );

              continue;
            }

            const {
              data:
                recentMessages,
            } =
              await supabaseAdmin
                .from("messages")
                .select(
                  "role,speaker_name,content,created_at"
                )
                .eq(
                  "user_id",
                  event.user_id
                )
                .eq(
                  "conversation_id",
                  conversation.id
                )
                .in(
                  "role",
                  ["user", "assistant"]
                )
                .order(
                  "created_at",
                  { ascending: false }
                )
                .limit(24);

            const sharedContext =
              activeContexts?.find(
                (item) =>
                  item
                    .together_now ===
                    true &&
                  item.source_id !==
                    "dominic"
              ) ??
              null;

            const presence = {
              togetherNow:
                Boolean(
                  sharedContext
                ),
              place:
                sharedContext
                  ?.place ??
                null,
              reason:
                sharedContext
                  ? "shared_context"
                  : "separate",
            };

            const generated =
              await generateInitiative({
                apiKey,
                state:
                  homeState?.state ??
                  null,
                presence,
                eventContext:
                  event.context,
                recentMessages: [
                  ...(
                    recentMessages ??
                    []
                  ),
                ].reverse(),
              });

            if (
              generated.decision !==
                "send" ||
              !generated.message
            ) {
              await supabaseAdmin
                .from(
                  "proactive_events"
                )
                .update({
                  status:
                    "skipped",
                  processed_at:
                    now,
                  decision_reason:
                    generated.reason,
                  context: {
                    ...(
                      event.context &&
                      typeof event.context ===
                        "object" &&
                      !Array.isArray(
                        event.context
                      )
                        ? event.context
                        : {}
                    ),
                    background_generated_at:
                      now,
                    delivery_mode:
                      presence
                        .togetherNow
                        ? "co_present"
                        : "remote",
                  },
                })
                .eq(
                  "id",
                  event.id
                );

              skipped += 1;
              continue;
            }

            const {
              data: message,
              error:
                messageError,
            } =
              await supabaseAdmin
                .from("messages")
                .insert({
                  user_id:
                    event.user_id,
                  conversation_id:
                    conversation.id,
                  role:
                    "assistant",
                  speaker_name:
                    "Dominic",
                  content:
                    generated.message,
                  created_at:
                    now,
                })
                .select("id")
                .single();

            if (messageError) {
              throw messageError;
            }

            await supabaseAdmin
              .from(
                "proactive_events"
              )
              .update({
                status:
                  "sent",
                processed_at:
                  now,
                message_id:
                  message.id,
                decision_reason:
                  generated.reason,
                context: {
                  ...(
                    event.context &&
                    typeof event.context ===
                      "object" &&
                    !Array.isArray(
                      event.context
                    )
                      ? event.context
                      : {}
                  ),
                  background_generated_at:
                    now,
                  delivery_mode:
                    presence
                      .togetherNow
                      ? "co_present"
                      : "remote",
                },
              })
              .eq(
                "id",
                event.id
              );

            await supabaseAdmin
              .from(
                "conversations"
              )
              .update({
                updated_at:
                  now,
              })
              .eq(
                "id",
                conversation.id
              )
              .eq(
                "user_id",
                event.user_id
              );

            if (
              !presence.togetherNow
            ) {
              await supabaseAdmin
                .from(
                  "push_outbox"
                )
                .insert({
                  user_id:
                    event.user_id,
                  message_id:
                    message.id,
                  title:
                    "Dominic",
                  body:
                    generated.message.slice(
                      0,
                      180
                    ),
                  notification_type:
                    "dominic_proactive",
                  target_route:
                    "/?screen=chat",
                  status:
                    "pending",
                  metadata: {
                    source:
                      "dominic_proactive_background",
                    proactive_event_id:
                      event.id,
                    interaction_mode:
                      "remote",
                  },
                });
            }

            sent += 1;
          } catch (
            eventError
          ) {
            failed += 1;

            await supabaseAdmin
              .from("proactive_events")
              .update({
                status: "pending",
                processed_at: null,
                scheduled_for:
                  new Date(
                    Date.now() +
                      20 * 60_000
                  ).toISOString(),
                decision_reason:
                  "Background generation failed; retry later.",
                context: {
                  ...(event.context &&
                  typeof event.context === "object" &&
                  !Array.isArray(event.context)
                    ? event.context
                    : {}),
                  background_error_at:
                    new Date().toISOString(),
                },
              })
              .eq("id", event.id)
              .eq("status", "processing");

            console.error(
              "Dominic background initiative failed:",
              event.id,
              eventError
            );
          }
        }

        return Response.json({
          ok: true,
          checked: events?.length ?? 0,
          sent,
          skipped,
          failed,
          at: now,
        });
      },
    },
  },
});
