import { createClient } from "npm:@supabase/supabase-js@2";

const TIME_ZONE = "America/Sao_Paulo";

const PROACTIVE_ENABLED = true; // User requested spontaneous Dominic messages.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type LocalDate = {
  year: number;
  month: number;
  day: number;
};

type WindowDefinition = {
  name: string;
  startHour: number;
  endHour: number;
};

const WINDOWS: WindowDefinition[] = [
  {
    name: "late_morning",
    startHour: 10,
    endHour: 12,
  },
  {
    name: "afternoon",
    startHour: 14,
    endHour: 17,
  },
  {
    name: "evening",
    startHour: 18,
    endHour: 22,
  },
];

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    },
  );
}

function randomInt(
  min: number,
  max: number,
) {
  return (
    Math.floor(
      Math.random() *
        (max - min + 1),
    ) + min
  );
}

function shuffle<T>(
  items: T[],
) {
  const copy = [...items];

  for (
    let i = copy.length - 1;
    i > 0;
    i--
  ) {
    const j = Math.floor(
      Math.random() * (i + 1),
    );

    [copy[i], copy[j]] = [
      copy[j],
      copy[i],
    ];
  }

  return copy;
}

function getLocalDate(
  date = new Date(),
): LocalDate {
  const formatter =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      },
    );

  const parts =
    formatter.formatToParts(
      date,
    );

  const get = (
    type: string,
  ) =>
    parts.find(
      (part) =>
        part.type === type,
    )?.value ?? "";

  return {
    year: Number(
      get("year"),
    ),
    month: Number(
      get("month"),
    ),
    day: Number(
      get("day"),
    ),
  };
}

/*
 * Brazil currently uses UTC-03:00
 * for America/Sao_Paulo.
 *
 * All real-world Diário scheduling
 * uses this master clock.
 */
function localToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
) {
  return new Date(
    Date.UTC(
      year,
      month - 1,
      day,
      hour + 3,
      minute,
      0,
      0,
    ),
  );
}

function getLocalHour(date = new Date()) {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    hour12: false,
  }).format(date);
  return Number(hour);
}

function addCalendarDays(
  date: LocalDate,
  amount: number,
): LocalDate {
  const result =
    new Date(
      Date.UTC(
        date.year,
        date.month - 1,
        date.day + amount,
      ),
    );

  return {
    year:
      result.getUTCFullYear(),
    month:
      result.getUTCMonth() + 1,
    day:
      result.getUTCDate(),
  };
}

function createOpportunityTime(
  date: LocalDate,
  window: WindowDefinition,
) {
  const hour =
    randomInt(
      window.startHour,
      window.endHour,
    );

  const minute =
    randomInt(0, 59);

  return localToUtc(
    date.year,
    date.month,
    date.day,
    hour,
    minute,
  );
}

/*
 * Give Dominic one genuine chance to initiate each Brazil calendar day.
 * The brain still decides whether he has something natural to say;
 * an opportunity is never an automatic message.
 */
function chooseOpportunityCount() {
  return 1;
}

Deno.serve(async (req) => {
  if (
    req.method === "OPTIONS"
  ) {
    return new Response(
      "ok",
      {
        headers: corsHeaders,
      },
    );
  }

  if (!PROACTIVE_ENABLED) {
    return jsonResponse({
      ok: true,
      processed: false,
      reason:
        "Proactive system is disabled.",
    });
  }

  try {
    const supabaseUrl =
      Deno.env.get(
        "SUPABASE_URL",
      );

    const serviceRoleKey =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY",
      );

    if (
      !supabaseUrl ||
      !serviceRoleKey
    ) {
      throw new Error(
        "Missing Supabase server environment variables.",
      );
    }

    const supabase =
      createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            persistSession:
              false,
            autoRefreshToken:
              false,
          },
        },
      );

    /*
     * Discover Diário universes
     * instead of hardcoding Alloah's UUID.
     *
     * character_config is preserved
     * across the future universe reset,
     * so it is a stable source.
     */
    const {
      data: characters,
      error:
        charactersError,
    } = await supabase
      .from(
        "character_config",
      )
      .select("user_id")
      .eq("name", "Dominic");

    if (charactersError) {
      throw charactersError;
    }

    const userIds = [
      ...new Set(
        (characters ?? [])
          .map(
            (row: any) =>
              row.user_id,
          )
          .filter(Boolean),
      ),
    ];

    if (!userIds.length) {
      return jsonResponse({
        ok: true,
        processed: false,
        reason:
          "No Dominic universe found.",
      });
    }

    const now = new Date();

    const today =
      getLocalDate(now);

    let created = 0;
    let alreadyExists = 0;
    let quietDays = 0;

    /*
     * Only today + tomorrow.
     *
     * Short horizon means Dominic's
     * future is not pre-written days
     * or weeks in advance.
     */
    for (
      const userId of userIds
    ) {
      for (
        let offset = 0;
        offset < 2;
        offset++
      ) {
        const targetDate =
          addCalendarDays(
            today,
            offset,
          );

        const targetDateKey =
          `${targetDate.year}-${String(targetDate.month).padStart(2, "0")}-${String(targetDate.day).padStart(2, "0")}`;

        const nextDate =
          addCalendarDays(
            targetDate,
            1,
          );

        const dayStart =
          localToUtc(
            targetDate.year,
            targetDate.month,
            targetDate.day,
            0,
            0,
          );

        const dayEnd =
          localToUtc(
            nextDate.year,
            nextDate.month,
            nextDate.day,
            0,
            0,
          );

        /*
         * A generated date is stored inside context as schedule_date.
         * This value never changes even if proactive-brain later
         * reschedules the event because of timing or provider retry.
         *
         * For old events created before schedule_date existed,
         * we temporarily fall back to scheduled_for so deployment
         * does not create a burst of duplicate legacy opportunities.
         */
        let {
          data: existing,
          error:
            existingError,
        } = await supabase
          .from(
            "proactive_events",
          )
          .select(
            "id, status, scheduled_for, context",
          )
          .eq(
            "user_id",
            userId,
          )
          .contains(
            "context",
            {
              generated_by:
                "proactive-scheduler",
              schedule_date:
                targetDateKey,
            },
          )
          .neq(
            "status",
            "cancelled",
          );

        if (existingError) {
          throw existingError;
        }

        if (
          (existing?.length ?? 0) ===
          0
        ) {
          const {
            data:
              legacyExisting,
            error:
              legacyExistingError,
          } = await supabase
            .from(
              "proactive_events",
            )
            .select(
              "id, status, scheduled_for, context",
            )
            .eq(
              "user_id",
              userId,
            )
            .contains(
              "context",
              {
                generated_by:
                  "proactive-scheduler",
              },
            )
            .gte(
              "scheduled_for",
              dayStart.toISOString(),
            )
            .lt(
              "scheduled_for",
              dayEnd.toISOString(),
            )
            .neq(
              "status",
              "cancelled",
            );

          if (legacyExistingError) {
            throw legacyExistingError;
          }

          existing =
            legacyExisting ?? [];
        }

        if (existingError) {
          throw existingError;
        }

        if (
          (existing?.length ?? 0) >
          0
        ) {
          alreadyExists +=
            existing?.length ??
            0;

          continue;
        }

        /*
         * For TODAY only:
         * avoid creating fresh proactive
         * opportunities immediately after
         * a real conversation.
         *
         * Scheduler doesn't interpret the
         * conversation; it only respects
         * recent activity.
         */
        if (offset === 0) {
          const {
            data:
              recentMessage,
            error:
              recentMessageError,
          } = await supabase
            .from("messages")
            .select(
              "created_at",
            )
            .eq(
              "user_id",
              userId,
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              },
            )
            .limit(1)
            .maybeSingle();

          if (
            recentMessageError
          ) {
            throw recentMessageError;
          }

          if (
            recentMessage
              ?.created_at
          ) {
            const lastMessageAt =
              new Date(
                recentMessage
                  .created_at,
              );

            const hoursSince =
              (
                now.getTime() -
                lastMessageAt.getTime()
              ) /
              3_600_000;

            /*
             * If they talked within the
             * last 90 minutes, don't
             * manufacture a new opportunity
             * for today.
             */
            if (
              hoursSince >= 0 &&
              hoursSince < 1.5
            ) {
              quietDays++;
              continue;
            }
          }
        }

        const opportunityCount =
          chooseOpportunityCount();

        if (
          opportunityCount === 0
        ) {
          /*
           * Important:
           * zero opportunities is not an
           * error. Some days can simply
           * stay quiet.
           *
           * We do not insert a fake marker.
           * A future scheduler run may
           * reconsider while still inside
           * the short horizon.
           */
          quietDays++;
          continue;
        }

        const eligibleWindows =
          offset === 0
            ? WINDOWS.filter(
                (window) =>
                  window.endHour >
                  getLocalHour(now),
              )
            : WINDOWS;

        if (!eligibleWindows.length) {
          quietDays++;
          continue;
        }

        const selectedWindows =
          shuffle(eligibleWindows)
            .slice(
              0,
              Math.min(
                opportunityCount,
                eligibleWindows.length,
              ),
            )
            .sort(
              (a, b) =>
                a.startHour -
                b.startHour,
            );

        const rows =
          selectedWindows
            .map(
              (window) => {
                const scheduledFor =
                  createOpportunityTime(
                    targetDate,
                    window,
                  );

                return {
                  user_id:
                    userId,

                  event_type:
                    "conversation_opportunity",

                  status:
                    "pending",

                  scheduled_for:
                    scheduledFor.toISOString(),

                  context: {
                    time_zone:
                      TIME_ZONE,

                    schedule_date:
                      targetDateKey,

                    window:
                      window.name,

                    purpose:
                      "natural_proactive_contact",

                    generated_by:
                      "proactive-scheduler",

                    architecture:
                      "brain2",
                  },
                };
              },
            )
            /*
             * Never schedule an opportunity
             * in the past.
             */
            .filter(
              (row) =>
                new Date(
                  row.scheduled_for,
                ) > now,
            );

        if (!rows.length) {
          quietDays++;
          continue;
        }

        const {
          error:
            insertError,
        } = await supabase
          .from(
            "proactive_events",
          )
          .insert(rows);

        if (insertError) {
          throw insertError;
        }

        created +=
          rows.length;
      }
    }

    // Process any opportunity that is due now. The scheduler only creates
    // opportunities; without this handoff the brain would never send them.
    let brainHandoff: unknown = null;
    try {
      const brainResponse = await fetch(
        `${supabaseUrl}/functions/v1/proactive-brain`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceRoleKey}`,
            apikey: serviceRoleKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ source: "proactive-scheduler" }),
        },
      );
      brainHandoff = {
        status: brainResponse.status,
        body: (await brainResponse.text()).slice(0, 1200),
      };
    } catch (brainError) {
      brainHandoff = {
        error: brainError instanceof Error ? brainError.message : String(brainError),
      };
    }

    return jsonResponse({
      ok: true,
      processed: true,
      architecture: "brain2",
      time_zone: TIME_ZONE,
      universes: userIds.length,
      created,
      already_exists: alreadyExists,
      quiet_days: quietDays,
      brain_handoff: brainHandoff,
      note: "Opportunities are scheduled and due opportunities are handed to the proactive brain.",
    });
  } catch (error) {
    console.error(
      "proactive-scheduler:",
      error,
    );

    let errorMessage =
      "Unknown error";

    if (
      error instanceof Error
    ) {
      errorMessage =
        error.message;
    } else if (
      typeof error ===
      "string"
    ) {
      errorMessage =
        error;
    } else {
      try {
        errorMessage =
          JSON.stringify(
            error,
          );
      } catch {
        errorMessage =
          String(error);
      }
    }

    return jsonResponse(
      {
        ok: false,
        error:
          errorMessage,
      },
      500,
    );
  }
});