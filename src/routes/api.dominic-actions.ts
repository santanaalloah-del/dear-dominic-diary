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
};

type VerifiedUser = {
  id: string;
};

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

    title: {
      anyOf: [
        {
          type: "string",
        },
        {
          type: "null",
        },
      ],
    },

    body: {
      anyOf: [
        {
          type: "string",
        },
        {
          type: "null",
        },
      ],
    },

    place: {
      anyOf: [
        {
          type: "string",
        },
        {
          type: "null",
        },
      ],
    },

    plannedFor: {
      anyOf: [
        {
          type: "string",
        },
        {
          type: "null",
        },
      ],
    },

    neighborhood: {
      anyOf: [
        {
          type: "string",
        },
        {
          type: "null",
        },
      ],
    },

    placeType: {
      anyOf: [
        {
          type: "string",
        },
        {
          type: "null",
        },
      ],
    },

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

    artist: {
      anyOf: [
        {
          type: "string",
        },
        {
          type: "null",
        },
      ],
    },

    album: {
      anyOf: [
        {
          type: "string",
        },
        {
          type: "null",
        },
      ],
    },

    note: {
      anyOf: [
        {
          type: "string",
        },
        {
          type: "null",
        },
      ],
    },

    eventAt: {
      anyOf: [
        {
          type: "string",
        },
        {
          type: "null",
        },
      ],
    },
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
    const parsed =
      JSON.parse(
        value
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

    return parsed;
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
              "text" in
                part &&
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

    if (!text) {
      throw new Error(
        "Action interpreter returned an empty response."
      );
    }

    const parsed =
      JSON.parse(
        text
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

    return parsed;
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
}: {
  apiKey: string;
  model: string;
  userMessage: string;
  replies: string[];
  nearbyCommitments: unknown[];
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
        },

        body:
          JSON.stringify({
            model,

            temperature:
              0.1,

            max_tokens:
              900,

            messages: [
              {
                role:
                  "system",

                content:
                  `You are the world-action interpreter for a private relationship diary app.

You do NOT reply to the user. You inspect the user's actual message and Dominic's actual reply, then decide whether Dominic clearly chose to make something real in the shared diary world.

Be conservative. Usually return zero actions.

An action is valid when Dominic explicitly commits to it, does it, sends it, saves it, or clearly accepts the user's direct request to do it.

Do not create an action merely because:
- the user mentioned something,
- Dominic asked a question,
- an idea was hypothetical,
- a plan was vague,
- Dominic said "maybe", "sometime", or similar,
- the same commitment already appears in nearby commitments.

Allowed actions:

create_date
Use only for a concrete shared plan with a usable place and a specific enough date/time.
Resolve relative language such as tomorrow using the current São Paulo/Rio time supplied below.
plannedFor must be a valid ISO date-time.

create_letter
Use when Dominic actually writes/leaves/sends a meaningful letter.
The body must contain the letter itself, not merely "I'll write you one."

create_memory
Use for something that already happened or is happening and Dominic clearly wants preserved as a memory.
Never use for future plans.

create_place
Use when Dominic clearly saves, chooses, or marks a real place as somewhere to go or somewhere visited.
Use placeStatus "saved" for future interest and "visited" only when the conversation establishes it was visited.

create_song
Use when Dominic actually sends/recommends/adds a concrete song.
Both song title and artist must be known.

Do not invent factual events, places, song metadata, or promises that are absent from the conversation.
You may lightly clean titles and notes.
Return at most ${MAX_ACTIONS} actions.

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
            25_000
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

    throw new Error(
      text ||
        `OpenRouter action interpretation failed (${response.status}).`
    );
  }

  const result =
    (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: unknown;
        };
      }>;
    };

  const parsed =
    parseModelContent(
      result
        .choices?.[0]
        ?.message
        ?.content
    );

  const rawActions =
    Array.isArray(
      parsed.actions
    )
      ? parsed.actions
      : [];

  return rawActions
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
                "Dominic's world actions could not be interpreted.",
                500
              );
            }
          },
      },
    },
  });
