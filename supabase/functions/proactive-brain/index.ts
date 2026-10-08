import { createClient } from "npm:@supabase/supabase-js@2";

const TIME_ZONE = "America/Sao_Paulo";

const PROACTIVE_MODEL =
  Deno.env.get("GEMINI_PROACTIVE_MODEL") ||
  Deno.env.get("CHAT_MODEL") ||
  "google/gemini-3.8-flash";

const PROACTIVE_ENABLED =
  Deno.env.get("PROACTIVE_ENABLED") === "true";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type ProactiveDecision = {
  decision: "send" | "skip" | "reschedule";
  reason: string;
  message: string | null;
  reschedule_minutes: number | null;
  measured_cost_usd?: number | null;
};

class GeminiHttpError extends Error {
  status: number;
  retryAfterSeconds: number | null;

  constructor(
    status: number,
    message: string,
    retryAfterSeconds: number | null = null,
  ) {
    super(message);
    this.name = "GeminiHttpError";
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

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

function getBrazilDateTime(date = new Date()) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);
}

function clampRescheduleMinutes(value: unknown) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return 90;
  }

  return Math.min(
    720,
    Math.max(30, Math.round(value)),
  );
}

function extractGeminiText(payload: any) {
  const parts =
    payload?.candidates?.[0]?.content?.parts;

  if (!Array.isArray(parts)) {
    throw new Error(
      "Gemini returned no content.",
    );
  }

  const text = parts
    .map((part: any) => part?.text)
    .filter(
      (value: unknown) =>
        typeof value === "string",
    )
    .join("")
    .trim();

  if (!text) {
    throw new Error(
      "Gemini returned an empty response.",
    );
  }

  return text;
}

function parseRetryAfterSeconds(
  response: Response,
  bodyText: string,
) {
  const header =
    response.headers.get("retry-after");

  if (header) {
    const seconds = Number(header);

    if (Number.isFinite(seconds)) {
      return Math.max(
        1,
        Math.ceil(seconds),
      );
    }
  }

  try {
    const parsed = JSON.parse(bodyText);

    const details =
      parsed?.error?.details;

    if (Array.isArray(details)) {
      for (const detail of details) {
        const retryDelay =
          detail?.retryDelay;

        if (
          typeof retryDelay === "string"
        ) {
          const match =
            retryDelay.match(
              /^([\d.]+)s$/,
            );

          if (match) {
            return Math.max(
              1,
              Math.ceil(
                Number(match[1]),
              ),
            );
          }
        }
      }
    }
  } catch {
    // Ignore malformed provider body.
  }

  return null;
}

async function callGemini(
  apiKey: string,
  systemInstruction: string,
  prompt: string,
): Promise<ProactiveDecision> {
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: PROACTIVE_MODEL,
        max_tokens: 700,
        temperature: 0.7,
        usage: { include: true },
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt },
        ],
      }),
    },
  );

  const bodyText = await response.text();
  if (!response.ok) {
    const retryAfterSeconds = parseRetryAfterSeconds(response, bodyText);
    throw new GeminiHttpError(
      response.status,
      `OpenRouter ${response.status}: ${bodyText || response.statusText}`,
      retryAfterSeconds,
    );
  }

  let payload: any;
  try {
    payload = JSON.parse(bodyText);
  } catch {
    throw new Error("OpenRouter returned invalid JSON envelope.");
  }

  const raw = payload?.choices?.[0]?.message?.content?.trim();
  if (!raw) throw new Error("OpenRouter returned an empty proactive response.");

  const cleaned = raw.replace(/^\`\`\`(?:json)?\\s*/i, "").replace(/\\s*\`\`\`$/i, "").trim();
  let parsed: ProactiveDecision;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`OpenRouter returned invalid proactive JSON: ${raw}`);
  }

  if (!["send", "skip", "reschedule"].includes(parsed.decision)) {
    throw new Error("Provider returned an invalid proactive decision.");
  }
  if (parsed.decision === "send" && !parsed.message?.trim()) {
    throw new Error("Provider chose send but returned an empty message.");
  }
  if (parsed.decision === "skip") {
    parsed.message = null;
    parsed.reschedule_minutes = null;
  }
  if (parsed.decision === "reschedule") {
    parsed.message = null;
    parsed.reschedule_minutes = clampRescheduleMinutes(parsed.reschedule_minutes);
  }
  const price=payload?.usage?.cost;
  parsed.measured_cost_usd=typeof price==="number"&&Number.isFinite(price)&&price>=0&&price<=0.03?price:null;
  return parsed;
}

function formatHistory(
  history: any[],
) {
  if (!history.length) {
    return "(No recent conversation history.)";
  }

  return history
    .map(
      (message: any) =>
        `[${message.created_at}] ${message.role}: ${message.content}`,
    )
    .join("\n");
}

function formatRecentProactive(
  items: any[],
) {
  if (!items.length) {
    return "(No recent proactive sends.)";
  }

  return items
    .map(
      (item: any) =>
        `- ${item.processed_at ?? item.scheduled_for}: ${item.decision_reason ?? "sent"}`,
    )
    .join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
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
        "Proactive brain is currently disabled.",
    });
  }

  try {
    const supabaseUrl =
      Deno.env.get("SUPABASE_URL");

    const serviceRoleKey =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY",
      );

    const geminiApiKey =
      Deno.env.get("OPENROUTER_API_KEY");

    if (
      !supabaseUrl ||
      !serviceRoleKey ||
      !geminiApiKey
    ) {
      throw new Error(
        "Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or OPENROUTER_API_KEY.",
      );
    }

    const supabase =
      createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        },
      );

    const now = new Date();

    /*
     * Find one due opportunity.
     *
     * No hardcoded Alloah UUID:
     * the event itself determines
     * which private universe is processed.
     */
    const {
      data: dueEvents,
      error: dueError,
    } = await supabase
      .from("proactive_events")
      .select("*")
      .eq("status", "pending")
      .not(
        "event_type",
        "in",
        '("life_photo_opportunity","life_profile_photo_opportunity")',
      )
      .lte(
        "scheduled_for",
        now.toISOString(),
      )
      .order(
        "scheduled_for",
        { ascending: true },
      )
      .limit(1);

    if (dueError) {
      throw dueError;
    }

    const event =
      dueEvents?.[0];

    if (!event) {
      return jsonResponse({
        ok: true,
        processed: false,
        reason:
          "No due proactive opportunity.",
      });
    }

    /*
     * Atomic-ish claim.
     * If another invocation claimed it,
     * this invocation exits quietly.
     */
    const {
      data: claimedRows,
      error: claimError,
    } = await supabase
      .from("proactive_events")
      .update({
        status: "processing",
        processed_at:
          now.toISOString(),
      })
      .eq("id", event.id)
      .eq("status", "pending")
      .select(
        "id, user_id, context, scheduled_for",
      );

    if (claimError) {
      throw claimError;
    }

    if (!claimedRows?.length) {
      return jsonResponse({
        ok: true,
        processed: false,
        reason:
          "Opportunity was already claimed.",
      });
    }

    const claimed =
      claimedRows[0];

    const userId =
      claimed.user_id;

    try {
      /*
       * Brain2 is the sole character/world
       * source for proactive behavior.
       */
      const {
        data: promptPack,
        error: promptPackError,
      } = await supabase.rpc(
        "get_brain2_prompt_pack",
        {
          p_user_id: userId,
        },
      );

      if (promptPackError) {
        throw promptPackError;
      }

      if (
        !promptPack?.ready
      ) {
        throw new Error(
          "Brain2 prompt pack is not ready.",
        );
      }

      const staticPrompt =
        promptPack
          ?.static_prompt
          ?.combined ?? "";

      const characterSelf =
        promptPack
          ?.character_self ?? {};

      const canon =
        promptPack?.canon ?? [];

      const runtimeContext =
        promptPack
          ?.runtime_context ?? {};

      /*
       * Conversation.
       *
       * Prefer an explicitly supplied
       * conversation_id in event.context,
       * otherwise use the Dominic chat.
       */
      let conversation:
        | {
            id: number;
            title: string | null;
          }
        | null = null;

      const contextConversationId =
        event?.context
          ?.conversation_id;

      if (
        typeof contextConversationId ===
          "number" ||
        typeof contextConversationId ===
          "string"
      ) {
        const {
          data,
          error,
        } = await supabase
          .from("conversations")
          .select("id, title")
          .eq(
            "user_id",
            userId,
          )
          .eq(
            "id",
            contextConversationId,
          )
          .maybeSingle();

        if (error) {
          throw error;
        }

        conversation = data;
      }

      if (!conversation) {
        const {
          data,
          error,
        } = await supabase
          .from("conversations")
          .select("id, title")
          .eq(
            "user_id",
            userId,
          )
          .eq(
            "title",
            "Dominic",
          )
          .maybeSingle();

        if (error) {
          throw error;
        }

        conversation = data;
      }

      if (!conversation) {
        throw new Error(
          "Dominic conversation not found.",
        );
      }

      const [
        messagesResult,
        recentSentResult,
        profileResult,
      ] = await Promise.all([
        supabase
          .from("messages")
          .select(
            "id, role, content, speaker_name, created_at",
          )
          .eq(
            "user_id",
            userId,
          )
          .eq(
            "conversation_id",
            conversation.id,
          )
          .order(
            "created_at",
            { ascending: false },
          )
          .limit(30),

        supabase
          .from("proactive_events")
          .select(
            "scheduled_for, processed_at, decision_reason, message_id",
          )
          .eq(
            "user_id",
            userId,
          )
          .eq(
            "status",
            "sent",
          )
          .order(
            "processed_at",
            { ascending: false },
          )
          .limit(5),

        supabase
          .from("user_profile")
          .select(
            "name, preferred_name",
          )
          .eq(
            "user_id",
            userId,
          )
          .maybeSingle(),
      ]);

      if (messagesResult.error) {
        throw messagesResult.error;
      }

      if (recentSentResult.error) {
        throw recentSentResult.error;
      }

      if (profileResult.error) {
        throw profileResult.error;
      }

      const history = [
        ...(messagesResult.data ?? []),
      ].reverse();

      const recentSent =
        recentSentResult.data ?? [];

      const profile =
        profileResult.data;

      const alloahName =
        profile?.preferred_name ||
        profile?.name ||
        "Alloah";

      const lastMessage =
        history.at(-1) ?? null;

      const brazilNow =
        getBrazilDateTime(now);

      const systemInstruction = `
${staticPrompt}

PROACTIVE MODE

You are not a second version of Dominic.
You are Dominic's existing Brain2 character model deciding whether he naturally initiates contact.

The same character, canon, knowledge boundaries, relationship continuity, communication style, agency rules, and anti-ChatGPT rules still apply.

This is a private fictional world.

Your job is NOT to maximize engagement.
Your job is NOT to make Alloah feel constantly attended to.
Your job is NOT to prove affection.

Silence is a valid outcome.

A proactive message should happen only when Dominic has a plausible reason to initiate something himself.

DATE INVITATION OPPORTUNITIES
If opportunity_context.source is dominic_date_idea, Dominic has already saved an unconfirmed Date IDEA,
not an agreed Date. He may naturally invite Alloah to that specific idea, or skip/reschedule.
He must not claim she accepted, that anything was booked, that they attended, or that a date/time was agreed.
Use the existing title and motive for inspiration. No quotas and no pressure.

MUSIC OPPORTUNITIES
When opportunity_context.source is dominic_music_autonomy, the track was catalog-verified and selected from your own musical identity.
Saving and sharing are separate. You can still skip or reschedule. If sending, talk naturally about that exact track with your own opinion or reason; do not invent lyrics, past shared listening or her approval.
Use the provided title/artist and URL; do not substitute a different song. Do not mention catalogs, databases, prompts or technical metadata.

IMPORTANT CONTINUITY RULES

- Never invent shared history.
- Never invent a Date, trip, fight, gift, inside joke, sexual experience, promise, conversation, photo, letter, song association, or relationship milestone.
- Never transform undefined canon into a retroactive fact.
- Never claim Dominic perceived private information that he did not have access to.
- Never use information marked as belonging only to Alloah.
- Runtime state may contain stale operational information. Do not assert a current physical location or activity merely because an old world-state value exists.
- Prefer information tied to actual conversation, current Brain2 state, lived events, pending threads, relationship threads, established knowledge, or explicit opportunity context.
- Dominic has his own life, attention, moods, work, interests, and reasons for silence.
- Do not manufacture drama to create a reason to text.
- Do not manufacture jealousy, emergencies, longing, conflict, or sexual tension.
- Do not send merely because the scheduler created an opportunity.
- Do not use proactive messages as routine relationship maintenance.
- Do not mechanically send good morning/good night messages.
- Do not repeatedly send generic "hey", "wyd", "what are you doing", "miss you", or equivalents.
- Do not immediately reopen a conversation that naturally just ended unless Dominic genuinely has a new thought.
- Avoid multiple proactive contacts close together.
- Being physically together NEVER disqualifies Dominic from initiating. It changes the delivery context, not his agency: he can spontaneously suggest a date, share a song, invite Alloah to listen together, propose an activity, show affection, or start a conversation face to face. When together, write natural spoken dialogue and optionally brief *physical actions* in asterisks; do not frame it as a remote text or say he misses someone standing beside him. The app's message feed is also a record of in-person dialogue, so choose send when there is a genuine initiative rather than skipping solely because they are together. He may still choose skip for other natural reasons. Never presume Alloah accepted a date or consented to physical intimacy.
- A tiny spontaneous message is allowed when it is genuinely natural.
- Dominic may also decide not to talk.

REAL CLOCK

Master clock: America/Sao_Paulo.
Current real date/time: ${brazilNow}.

LANGUAGE

All visible messages sent by Dominic must be natural American English.

DECISION

Choose exactly one:

send
Use only if Dominic genuinely has something natural to initiate now.

skip
Use when silence is more believable.

reschedule
Use when the opportunity itself makes sense but the timing does not.

IF SEND

- message contains only the text Dominic actually sends.
- no narration.
- no backend explanation.
- no quotation marks around the whole message.
- usually concise.
- multiple ideas may still be written naturally, but do not generate an essay.

IF SKIP

- message = null
- reschedule_minutes = null

IF RESCHEDULE

- message = null
- reschedule_minutes must be 30–720.
`.trim();

      const prompt = `
PROACTIVE OPPORTUNITY

scheduled_for:
${event.scheduled_for}

opportunity_context:
${JSON.stringify(
  event.context ?? {},
  null,
  2,
)}

PERSON

Alloah's display name:
${alloahName}

BRAIN2 CHARACTER SELF

${JSON.stringify(
  characterSelf,
  null,
  2,
)}

BRAIN2 CANON

${JSON.stringify(
  canon,
  null,
  2,
)}

BRAIN2 RUNTIME CONTEXT

${JSON.stringify(
  runtimeContext,
  null,
  2,
)}

LAST MESSAGE

${
  lastMessage
    ? JSON.stringify(
        lastMessage,
        null,
        2,
      )
    : "(none)"
}

RECENT CONVERSATION

${formatHistory(history)}

RECENT PROACTIVE SENDS

${formatRecentProactive(
  recentSent,
)}

Decide whether Dominic naturally initiates contact now.
`.trim();

      // Spread proactive model spending across the month instead of consuming
      // the full credit balance during the first few days.
      const brazilDateParts = new Intl.DateTimeFormat("en-US",{
        timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"
      }).formatToParts(now);
      const part=(type:string)=>brazilDateParts.find(item=>item.type===type)?.value||"";
      const budgetMonth=part("year")+"-"+part("month")+"-01";
      const brazilDay=Number(part("day"));
      const {data:proactiveRows,error:proactiveError}=await supabase.from("ai_budget_reservations")
        .select("estimated_usd,actual_usd,status").eq("month_start",budgetMonth)
        .eq("source","proactive-brain").neq("status","released");
      if(proactiveError)throw proactiveError;
      const proactiveConsumed=(proactiveRows??[]).reduce((sum,row)=>sum+Number(row.status==="settled"?row.actual_usd??row.estimated_usd:row.estimated_usd),0);
      // Keep a small reserve for invitations motivated by an already-created
      // Date idea or a lived personal moment, without forcing messages.
      const momentSource=event.context?.source;
      const monthlyProactiveAllowance=0.60;
      if(proactiveConsumed+0.03>monthlyProactiveAllowance*brazilDay/31){
        await supabase.from("proactive_events").update({
          status:"pending",scheduled_for:new Date(Date.now()+24*60*60_000).toISOString(),
          processed_at:null,decision_reason:"proactive_monthly_pacing"
        }).eq("id",event.id).eq("status","processing");
        return jsonResponse({ok:true,processed:false,reason:"proactive_monthly_pacing"});
      }

      const { data: budgetReservation, error: budgetError } =
        await supabase.rpc("reserve_ai_budget", {
          p_source: "proactive-brain",
          p_estimated_usd: 0.03,
        });
      if (budgetError) throw budgetError;
      if (!budgetReservation) {
        const scheduledFor = new Date(Date.now() + 24 * 60 * 60_000);
        await supabase.from("proactive_events").update({
          status: "pending",
          scheduled_for: scheduledFor.toISOString(),
          processed_at: null,
          decision_reason: "monthly_ai_budget_exhausted",
        }).eq("id", event.id).eq("status", "processing");
        return jsonResponse({ ok: true, processed: false, decision: "budget_exhausted" });
      }

      let decision: ProactiveDecision;
      try {
        decision = await callGemini(
          geminiApiKey,
          systemInstruction,
          prompt,
        );
        await supabase.rpc("settle_ai_budget",{
          p_id:budgetReservation,
          ...(decision.measured_cost_usd!==null&&decision.measured_cost_usd!==undefined
            ?{p_actual_usd:decision.measured_cost_usd}:{})
        });
      } catch (callError) {
        // Rejects are normally unbilled; timeouts may still be charged.
        await supabase.rpc(callError instanceof GeminiHttpError?"release_ai_budget":"settle_ai_budget",
          {p_id:budgetReservation});
        throw callError;
      }

      /*
       * SKIP
       */
      if (
        decision.decision ===
        "skip"
      ) {
        const {
          error,
        } = await supabase
          .from("proactive_events")
          .update({
            status: "skipped",
            decision_reason:
              decision.reason,
            processed_at:
              new Date()
                .toISOString(),
          })
          .eq(
            "id",
            event.id,
          )
          .eq(
            "status",
            "processing",
          );

        if (error) {
          throw error;
        }

        return jsonResponse({
          ok: true,
          processed: true,
          event_id:
            event.id,
          decision: "skip",
        });
      }

      /*
       * RESCHEDULE
       */
      if (
        decision.decision ===
        "reschedule"
      ) {
        const minutes =
          clampRescheduleMinutes(
            decision
              .reschedule_minutes,
          );

        const scheduledFor =
          new Date(
            Date.now() +
              minutes * 60_000,
          );

        const {
          error,
        } = await supabase
          .from("proactive_events")
          .update({
            status: "pending",
            scheduled_for:
              scheduledFor
                .toISOString(),
            decision_reason:
              decision.reason,
            processed_at: null,
          })
          .eq(
            "id",
            event.id,
          )
          .eq(
            "status",
            "processing",
          );

        if (error) {
          throw error;
        }

        return jsonResponse({
          ok: true,
          processed: true,
          event_id:
            event.id,
          decision:
            "reschedule",
          scheduled_for:
            scheduledFor
              .toISOString(),
        });
      }

      /*
       * SEND
       */
      let message = decision.message!.trim();
      const musicShare=event.context?.source==="dominic_music_autonomy"?event.context?.music:null;
      if(musicShare&&typeof musicShare.url==="string"&&/^https:\/\/open\.spotify\.com\/(track|search)\//.test(musicShare.url)&&!message.includes(musicShare.url)){
        message += "\n\n"+musicShare.url;
      }

      const {
        data: insertedMessage,
        error:
          messageInsertError,
      } = await supabase
        .from("messages")
        .insert({
          conversation_id:
            conversation.id,
          user_id:
            userId,
          role:
            "assistant",
          content:
            message,
          speaker_name:
            "Dominic",
        })
        .select(
          "id, created_at",
        )
        .single();

      if (
        messageInsertError
      ) {
        throw messageInsertError;
      }

      /*
       * A proactive message is something
       * that actually happened in the world,
       * so immediately give it lived-event
       * provenance.
       */
      const {
        error:
          livedEventError,
      } = await supabase.rpc(
        "record_brain2_message_event",
        {
          p_user_id:
            userId,
          p_message_id:
            insertedMessage.id,
        },
      );

      if (livedEventError) {
        throw livedEventError;
      }

      const {
        error:
          conversationUpdateError,
      } = await supabase
        .from("conversations")
        .update({
          updated_at:
            insertedMessage
              .created_at ??
            new Date()
              .toISOString(),
        })
        .eq(
          "id",
          conversation.id,
        )
        .eq(
          "user_id",
          userId,
        );

      if (
        conversationUpdateError
      ) {
        throw conversationUpdateError;
      }

      const {
        error:
          eventUpdateError,
      } = await supabase
        .from("proactive_events")
        .update({
          status: "sent",
          message_id:
            insertedMessage.id,
          decision_reason:
            decision.reason,
          processed_at:
            new Date()
              .toISOString(),
        })
        .eq(
          "id",
          event.id,
        )
        .eq(
          "status",
          "processing",
        );

      if (
        eventUpdateError
      ) {
        throw eventUpdateError;
      }

      /*
       * Push always points to a real,
       * persisted conversation message.
       */
      const {
        error:
          pushOutboxError,
      } = await supabase
        .from("push_outbox")
        .insert({
          user_id:
            userId,
          message_id:
            insertedMessage.id,
          notification_type:
            "message",
          title: "Dominic",
          body: message,
          target_route:
            "chat",
          status:
            "pending",
          metadata: {
            source:
              "proactive-brain",
            proactive_event_id:
              event.id,
          },
        });

      if (
        pushOutboxError
      ) {
        throw pushOutboxError;
      }

      return jsonResponse({
        ok: true,
        processed: true,
        event_id:
          event.id,
        decision: "send",
        message_id:
          insertedMessage.id,
      });
    } catch (
      processingError
    ) {
      console.error(
        "proactive-brain processing:",
        processingError,
      );

      /*
       * Provider quota/outage is not a
       * failed world event. Put the
       * opportunity back into pending.
       */
      // Exhausted credits are not transient. Avoid a paid retry every five minutes.
      if (
        processingError instanceof GeminiHttpError &&
        (processingError.status === 402 || processingError.status === 403)
      ) {
        const scheduledFor = new Date(Date.now() + 24 * 60 * 60_000);
        await supabase
          .from("proactive_events")
          .update({
            status: "pending",
            scheduled_for: scheduledFor.toISOString(),
            processed_at: null,
            decision_reason: `provider_budget_unavailable:${processingError.status}`,
          })
          .eq("id", event.id)
          .eq("status", "processing");
        return jsonResponse({
          ok: true,
          processed: false,
          decision: "budget_retry_later",
          scheduled_for: scheduledFor.toISOString(),
          provider_status: processingError.status,
        });
      }

      if (
        processingError instanceof
          GeminiHttpError &&
        [
          429,
          500,
          502,
          503,
          504,
        ].includes(
          processingError.status,
        )
      ) {
        const retrySeconds =
          processingError
            .retryAfterSeconds ??
          3600;

        /*
         * Avoid hammering Gemini.
         * Even when provider says
         * "retry in 29s", proactive
         * contact is never urgent.
         */
        const retryMinutes =
          Math.max(
            30,
            Math.min(
              720,
              Math.ceil(
                retrySeconds /
                  60,
              ),
            ),
          );

        const scheduledFor =
          new Date(
            Date.now() +
              retryMinutes *
                60_000,
          );

        await supabase
          .from("proactive_events")
          .update({
            status:
              "pending",
            scheduled_for:
              scheduledFor
                .toISOString(),
            processed_at:
              null,
            decision_reason:
              `provider_temporarily_unavailable:${processingError.status}`,
          })
          .eq(
            "id",
            event.id,
          )
          .eq(
            "status",
            "processing",
          );

        return jsonResponse({
          ok: true,
          processed: false,
          event_id:
            event.id,
          decision:
            "provider_retry",
          scheduled_for:
            scheduledFor
              .toISOString(),
          provider_status:
            processingError.status,
        });
      }

      const details =
        processingError instanceof
          Error
          ? processingError
              .message
          : JSON.stringify(
              processingError,
            );

      /*
       * Unknown technical errors also
       * must never leave an event stuck
       * forever in processing.
       */
      await supabase
        .from("proactive_events")
        .update({
          status: "pending",
          processed_at: null,
          decision_reason:
            `processing_error:${details}`,
        })
        .eq(
          "id",
          event.id,
        )
        .eq(
          "status",
          "processing",
        );

      throw processingError;
    }
  } catch (error) {
    console.error(
      "proactive-brain:",
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
      typeof error === "string"
    ) {
      errorMessage = error;
    } else {
      try {
        errorMessage =
          JSON.stringify(error);
      } catch {
        errorMessage =
          String(error);
      }
    }

    return jsonResponse(
      {
        ok: false,
        error: errorMessage,
      },
      500,
    );
  }
});