import {
  createFileRoute,
} from "@tanstack/react-router";

const DEFAULT_MODEL =
  "google/gemini-3.8-flash";

const MAX_ACTIONS = 2;

type ActionType =
  | "create_date"
  | "create_letter"
  | "create_memory"
  | "create_place"
  | "create_song";

type DominicWorldAction =
  | {
      type: "create_date";
      title: string;
      place: string;
      plannedFor: string;
      note?: string;
    }
  | {
      type: "create_letter";
      title: string;
      body: string;
    }
  | {
      type: "create_memory";
      title: string;
      body?: string;
      eventAt?: string;
    }
  | {
      type: "create_place";
      title: string;
      neighborhood?: string;
      placeType?: string;
      placeStatus:
        | "saved"
        | "visited";
      note?: string;
    }
  | {
      type: "create_song";
      title: string;
      artist: string;
      album?: string;
      note?: string;
    };

type RequestBody = {
  userId?: string;
  userMessage?: string;
  replies?: string[];
  nearbyCommitments?: unknown[];
  liveDateContext?: unknown;
};

type VerifiedUser = {
  id: string;
};

const nullableStringSchema = {
  anyOf: [
    {
      type: "string",
    },
    {
      type: "null",
    },
  ],
} as const;

const ACTION_ITEM_SCHEMA = {
  type: "object",
  additionalProperties: false,

  required: [
    "type",
    "title",
    "body",
    "place",
    "plannedFor",
    "neighborhood",
    "placeType",
    "placeStatus",
    "artist",
    "album",
    "note",
    "eventAt",
  ],

  properties: {
    type: {
      type: "string",

      enum: [
        "create_date",
        "create_letter",
        "create_memory",
        "create_place",
        "create_song",
      ],
    },

    title:
      nullableStringSchema,

    body:
      nullableStringSchema,

    place:
      nullableStringSchema,

    plannedFor:
      nullableStringSchema,

    neighborhood:
      nullableStringSchema,

    placeType:
      nullableStringSchema,

    placeStatus: {
      anyOf: [
        {
          type: "string",

          enum: [
            "saved",
            "visited",
          ],
        },

        {
          type: "null",
        },
      ],
    },

    artist:
      nullableStringSchema,

    album:
      nullableStringSchema,

    note:
      nullableStringSchema,

    eventAt:
      nullableStringSchema,
  },
} as const;

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,

  required: [
    "actions",
  ],

  properties: {
    actions: {
      type: "array",

      maxItems:
        MAX_ACTIONS,

      items:
        ACTION_ITEM_SCHEMA,
    },
  },
} as const;

function envValue(
  name: string
) {
  return (
    process.env[
      name
    ]?.trim() ||
    ""
  );
}

function jsonError(
  message: string,
  status: number
) {
  return Response.json(
    {
      error:
        message,
    },
    {
      status,
    }
  );
}

function cleanString(
  value: unknown
) {
  return typeof value ===
    "string"
    ? value.trim() ||
        null
    : null;
}

function validDate(
  value: string
) {
  return !Number.isNaN(
    new Date(
      value
    ).getTime()
  );
}

function cleanJsonText(
  value: string
) {
  return value
    .trim()
    .replace(
      /^```json\s*/i,
      ""
    )
    .replace(
      /^```\s*/i,
      ""
    )
    .replace(
      /\s*```$/i,
      ""
    )
    .trim();
}

function parseJsonObject(
  text: string
): Record<
  string,
  unknown
> {
  const cleaned =
    cleanJsonText(
      text
    );

  if (!cleaned) {
    throw new Error(
      "Action interpreter returned an empty response."
    );
  }

  const parsed =
    JSON.parse(
      cleaned
    );

  if (
    !parsed ||
    typeof parsed !==
      "object" ||
    Array.isArray(
      parsed
    )
  ) {
    throw new Error(
      "Action interpreter returned invalid JSON."
    );
  }

  return parsed as Record<
    string,
    unknown
  >;
}

function parseModelContent(
  value: unknown
): Record<
  string,
  unknown
> {
  if (
    typeof value ===
    "string"
  ) {
    return parseJsonObject(
      value
    );
  }

  if (
    Array.isArray(
      value
    )
  ) {
    const text =
      value
        .map(
          (
            part
          ) => {
            if (
              part &&
              typeof part ===
                "object" &&
              "text" in part &&
              typeof (
                part as {
                  text?: unknown;
                }
              ).text ===
                "string"
            ) {
              return (
                part as {
                  text: string;
                }
              ).text;
            }

            return "";
          }
        )
        .join("")
        .trim();

    return parseJsonObject(
      text
    );
  }

  throw new Error(
    "Action interpreter returned an unreadable response."
  );
}

function normalizeAction(
  value: unknown
): DominicWorldAction | null {
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(
      value
    )
  ) {
    return null;
  }

  const raw =
    value as Record<
      string,
      unknown
    >;

  const type =
    cleanString(
      raw.type
    ) as ActionType | null;

  const title =
    cleanString(
      raw.title
    );

  if (
    !type ||
    !title
  ) {
    return null;
  }

  if (
    type ===
    "create_date"
  ) {
    const place =
      cleanString(
        raw.place
      );

    const plannedFor =
      cleanString(
        raw.plannedFor
      );

    if (
      !place ||
      !plannedFor ||
      !validDate(
        plannedFor
      )
    ) {
      return null;
    }

    return {
      type,
      title,
      place,
      plannedFor,

      note:
        cleanString(
          raw.note
        ) ??
        undefined,
    };
  }

  if (
    type ===
    "create_letter"
  ) {
    const body =
      cleanString(
        raw.body
      );

    if (!body) {
      return null;
    }

    return {
      type,
      title,
      body,
    };
  }

  if (
    type ===
    "create_memory"
  ) {
    const eventAt =
      cleanString(
        raw.eventAt
      );

    return {
      type,
      title,

      body:
        cleanString(
          raw.body
        ) ??
        undefined,

      eventAt:
        eventAt &&
        validDate(
          eventAt
        )
          ? eventAt
          : undefined,
    };
  }

  if (
    type ===
    "create_place"
  ) {
    const status =
      cleanString(
        raw.placeStatus
      );

    if (
      status !==
        "saved" &&
      status !==
        "visited"
    ) {
      return null;
    }

    return {
      type,
      title,

      neighborhood:
        cleanString(
          raw.neighborhood
        ) ??
        undefined,

      placeType:
        cleanString(
          raw.placeType
        ) ??
        undefined,

      placeStatus:
        status,

      note:
        cleanString(
          raw.note
        ) ??
        undefined,
    };
  }

  if (
    type ===
    "create_song"
  ) {
    const artist =
      cleanString(
        raw.artist
      );

    if (!artist) {
      return null;
    }

    return {
      type,
      title,
      artist,

      album:
        cleanString(
          raw.album
        ) ??
        undefined,

      note:
        cleanString(
          raw.note
        ) ??
        undefined,
    };
  }

  return null;
}

async function verifyUser(
  request: Request,
  userId: string
): Promise<
  VerifiedUser | null
> {
  const authHeader =
    request.headers.get(
      "authorization"
    );

  const supabaseUrl =
    import.meta.env
      .VITE_SUPABASE_URL ||
    envValue(
      "SUPABASE_URL"
    );

  const publishableKey =
    import.meta.env
      .VITE_SUPABASE_PUBLISHABLE_KEY ||
    envValue(
      "SUPABASE_PUBLISHABLE_KEY"
    );

  if (
    !authHeader?.startsWith(
      "Bearer "
    ) ||
    !supabaseUrl ||
    !publishableKey
  ) {
    return null;
  }

  const response =
    await fetch(
      `${supabaseUrl}/auth/v1/user`,
      {
        headers: {
          Authorization:
            authHeader,

          apikey:
            publishableKey,
        },

        signal:
          AbortSignal.timeout(
            10_000
          ),
      }
    );

  if (
    !response.ok
  ) {
    return null;
  }

  const user =
    (await response.json()) as {
      id?: string;
    };

  if (
    !user.id ||
    user.id !==
      userId
  ) {
    return null;
  }

  return {
    id:
      user.id,
  };
}

async function interpretActions({
  apiKey,
  model,
  userMessage,
  replies,
  nearbyCommitments,
    liveDateContext,
}: {
  apiKey: string;
  model: string;
  userMessage: string;
  replies: string[];
  nearbyCommitments: unknown[];
   liveDateContext: unknown;
}): Promise<
  DominicWorldAction[]
> {
  const now =
    new Date();

  const currentTime =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "America/Sao_Paulo",

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",

        hour:
          "2-digit",

        minute:
          "2-digit",

        second:
          "2-digit",

        hour12:
          false,
      }
    ).format(
      now
    );

  const response =
    await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method:
          "POST",

        headers: {
          Authorization:
            `Bearer ${apiKey}`,

          "Content-Type":
            "application/json",

          "HTTP-Referer":
            "https://dear-dominic-diary.vercel.app",

          "X-Title":
            "Dear Dominic Diary",
        },

        body:
          JSON.stringify({
            model,

            temperature:
              0.1,

            reasoning: {
              effort:
                "low",
            },

            max_tokens:
              2500,

            messages: [
              {
                role:
                  "system",

                content:
                  `You are the world-action interpreter for a private relationship diary app.

You do NOT reply to the user.

You inspect:
1. the user's actual message;
2. Dominic's actual reply;
3. nearby existing commitments.

Then decide whether Dominic clearly made something real in their shared diary world.

Be conservative.
Most ordinary conversations should return zero actions.

An action is valid when Dominic explicitly:
- does something,
- writes something,
- sends something,
- saves something,
- chooses something,
- commits to something concrete,
- or clearly accepts a direct request and actually fulfills it in his reply.

Do not create an action merely because:
- the user mentioned something,
- Dominic asked a question,
- an idea was hypothetical,
- a plan was vague,
- Dominic said "maybe", "sometime", or similar,
- the same commitment already appears in nearby commitments.

Allowed actions:

create_date

Use only for a concrete shared future plan with:
- a usable place;
- and a specific enough date or date/time.

Resolve relative language such as "tomorrow" using the current São Paulo/Rio time supplied below.

plannedFor must be a valid ISO date-time.

create_letter

Use when Dominic actually writes, leaves, or sends a meaningful letter in his reply.

If the user explicitly asks Dominic to write a letter and Dominic actually writes it, create_letter SHOULD be returned.

The body must be the actual letter Dominic wrote.

Preserve the meaning, wording, paragraphs, tone, and sign-off of the letter as faithfully as possible.

If Dominic gave the letter a heading or title, use it as title.

Do not return merely "I'll write you one."

create_memory

Use only for something that already happened or is happening and Dominic clearly chooses to preserve it as a memory.

Never use create_memory for future plans.

create_place

Use when Dominic clearly saves, chooses, or marks a real place as:
- somewhere they want to go;
- or somewhere they actually visited.

Use placeStatus "saved" for future interest.

Use placeStatus "visited" only when the conversation establishes that it was visited.

create_song

Use when Dominic actually sends, recommends, chooses, or adds a concrete song.

Both the song title and artist must be known from the conversation.

General rules:

- Do not invent events.
- Do not invent dates.
- Do not invent places.
- Do not invent song metadata.
- Do not invent promises.
- Do not create diary objects for casual mentions.
- You may lightly clean titles and notes.
- Return at most ${MAX_ACTIONS} actions.
- When an actual letter is present, do not replace its body with a summary.
- When no valid action happened, return {"actions":[]}.

Current São Paulo/Rio local time:
${currentTime}`,
              },

              {
                role:
                  "user",

                content:
                  JSON.stringify(
                    {
                      userMessage,

                      dominicReplies:
                        replies,

                      nearbyCommitments,
                      
                      liveDateContext,
                    }
                  ),
              },
            ],

            response_format: {
              type:
                "json_schema",

              json_schema: {
                name:
                  "dominic_world_actions",

                strict:
                  true,

                schema:
                  RESPONSE_SCHEMA,
              },
            },
          }),

        signal:
          AbortSignal.timeout(
            40_000
          ),
      }
    );

  if (
    !response.ok
  ) {
    const text =
      await response
        .text()
        .catch(
          () => ""
        );

    console.error(
      "OpenRouter action interpreter request failed:",
      {
        status:
          response.status,

        body:
          text,
      }
    );

    throw new Error(
      text ||
        `OpenRouter action interpretation failed (${response.status}).`
    );
  }

  const result =
    (await response.json()) as {
      choices?: Array<{
        finish_reason?:
          string | null;

        message?: {
          content?: unknown;
        };
      }>;

      usage?: unknown;
    };

  const choice =
    result
      .choices?.[0];

  const finishReason =
    choice
      ?.finish_reason ??
    null;

  if (
    finishReason ===
    "length"
  ) {
    console.warn(
      "Dominic action interpreter reached the generation limit.",
      {
        finishReason,
        usage:
          result.usage ??
          null,
      }
    );
  }

  const parsed =
    parseModelContent(
      choice
        ?.message
        ?.content
    );

  const rawActions =
    Array.isArray(
      parsed.actions
    )
      ? parsed.actions
      : [];

  const actions =
    rawActions
      .map(
        normalizeAction
      )
      .filter(
        (
          action
        ): action is DominicWorldAction =>
          action !== null
      )
      .slice(
        0,
        MAX_ACTIONS
      );

  console.log(
    "Dominic world actions interpreted:",
    {
      finishReason,

      actionCount:
        actions.length,

      actionTypes:
        actions.map(
          (
            action
          ) =>
            action.type
        ),
    }
  );

  return actions;
}

export const Route =
  createFileRoute(
    "/api/dominic-actions"
  )({
    server: {
      handlers: {
        POST:
          async ({
            request,
          }) => {
            try {
              const body =
                (await request.json()) as RequestBody;

              const userId =
                cleanString(
                  body.userId
                );

              const userMessage =
                cleanString(
                  body.userMessage
                );

              const replies =
                Array.isArray(
                  body.replies
                )
                  ? body.replies
                      .filter(
                        (
                          reply
                        ): reply is string =>
                          typeof reply ===
                            "string"
                      )
                      .map(
                        (
                          reply
                        ) =>
                          reply.trim()
                      )
                      .filter(
                        Boolean
                      )
                  : [];

              if (
                !userId ||
                !userMessage ||
                replies.length ===
                  0
              ) {
                return Response.json(
                  {
                    actions:
                      [],
                  }
                );
              }

              const verified =
                await verifyUser(
                  request,
                  userId
                );

              if (
                !verified
              ) {
                return jsonError(
                  "Unauthorized.",
                  401
                );
              }

              const apiKey =
                envValue(
                  "OPENROUTER_API_KEY"
                );

              if (
                !apiKey
              ) {
                return jsonError(
                  "OPENROUTER_API_KEY is not configured on the server.",
                  503
                );
              }

              const model =
                envValue(
                  "DOMINIC_ACTION_MODEL"
                ) ||
                DEFAULT_MODEL;

              const actions =
                await interpretActions({
                  apiKey,
                  model,
                  userMessage,
                  replies,

                  nearbyCommitments:
                    Array.isArray(
                      body.nearbyCommitments
                    )
                      ? body.nearbyCommitments
                      : [],

                  liveDateContext:
  body.liveDateContext ?? null,
                });

              return Response.json({
                actions,
              });
            } catch (
              error
            ) {
              console.error(
                "Dominic action interpreter failed:",
                error
              );

              return jsonError(
                error instanceof
                  Error
                  ? error.message
                  : "Dominic's world actions could not be interpreted.",
                500
              );
            }
          },
      },
    },
  });
