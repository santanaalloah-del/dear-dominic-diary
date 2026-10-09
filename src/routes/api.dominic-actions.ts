import {
  createFileRoute,
} from "@tanstack/react-router";
import { persistDominicDateProposal, confirmExistingDominicDateIdea } from "@/lib/date-proposal-server";

const DEFAULT_MODEL =
  "google/gemini-3.8-flash";

const MAX_ACTIONS = 2;

type ActionType =
  | "create_date"
  | "propose_date"
  | "create_letter"
  | "create_memory"
  | "create_place"
  | "create_song"
  | "date_venue_action"
  | "update_profile_photo"
  | "change_live_state";

type DominicWorldAction =
  | {
      type: "create_date";
      title: string;
      place: string;
      plannedFor: string;
      note?: string;
    }
  | {
      type: "propose_date";
      title: string;
      place?: string;
      plannedFor?: string;
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
    }
  | {
      type: "date_venue_action";
      dateId: string;
      itemId: string;
      venueAction: "ordered" | "bought";
    }
  | {
      type: "update_profile_photo";
      photoId: string;
    }
  | {
      type: "change_live_state";
      location: "living" | "bedroom" | "kitchen" | "bathroom" | "hall" | "out";
      activity: string;
      detail?: string;
    };

type RequestBody = {
  userId?: string;
  userMessage?: string;
  replies?: string[];
  nearbyCommitments?: unknown[];
  liveDateContext?: unknown;
  dominicContext?: unknown;
  profilePhotoCandidates?: unknown[];
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
    "dateId",
    "itemId",
    "venueAction",
    "photoId",
    "location",
    "activity",
  ],

  properties: {
    type: {
      type: "string",

      enum: [
        "create_date",
        "propose_date",
        "create_letter",
        "create_memory",
        "create_place",
        "create_song",
        "date_venue_action",
        "update_profile_photo",
        "change_live_state",
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

    dateId:
      nullableStringSchema,

    itemId:
      nullableStringSchema,

    venueAction: {
      anyOf: [
        {
          type: "string",

          enum: [
            "ordered",
            "bought",
          ],
        },

        {
          type: "null",
        },
      ],
    },

    photoId:
      nullableStringSchema,

    location:
      nullableStringSchema,

    activity: {
      anyOf: [
        {
          type: "string",
          enum: ["sleeping","waking_up","showering","getting_dressed","making_coffee","cooking","eating","washing_dishes","cleaning","doing_laundry","watching_something","listening_to_music","playing_guitar","writing_music","recording","reading","scrolling","on_the_phone","relaxing","napping","getting_ready","leaving_home","coming_home","walking","getting_food","shopping","at_a_cafe","with_friends","working","at_the_studio","rehearsing","performing","backstage","traveling","driving","idle"],
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

if (!type) {
  return null;
}

if (
  type ===
  "change_live_state"
) {
  const location =
    cleanString(raw.location);
  const activity =
    cleanString(raw.activity);
  const allowedLocations = [
    "living",
    "bedroom",
    "kitchen",
    "bathroom",
    "hall",
    "out",
  ];

  if (
    !location ||
    !allowedLocations.includes(location) ||
    !activity ||
    !["sleeping","waking_up","showering","getting_dressed","making_coffee","cooking","eating","washing_dishes","cleaning","doing_laundry","watching_something","listening_to_music","playing_guitar","writing_music","recording","reading","scrolling","on_the_phone","relaxing","napping","getting_ready","leaving_home","coming_home","walking","getting_food","shopping","at_a_cafe","with_friends","working","at_the_studio","rehearsing","performing","backstage","traveling","driving","idle"].includes(activity)
  ) {
    return null;
  }

  return {
    type,
    location:
      location as
        | "living"
        | "bedroom"
        | "kitchen"
        | "bathroom"
        | "hall"
        | "out",
    activity,
    detail:
      cleanString(raw.note) ??
      undefined,
  };
}

if (
  type ===
  "update_profile_photo"
) {
  const photoId =
    cleanString(
      raw.photoId
    );

  if (!photoId) {
    return null;
  }

  return {
    type,
    photoId,
  };
}

if (
  type ===
  "date_venue_action"
) {
  const dateId =
    cleanString(
      raw.dateId
    );

  const itemId =
    cleanString(
      raw.itemId
    );

  const venueAction =
    cleanString(
      raw.venueAction
    );

  if (
    !dateId ||
    !itemId ||
    (
      venueAction !== "ordered" &&
      venueAction !== "bought"
    )
  ) {
    return null;
  }

  return {
    type,
    dateId,
    itemId,
    venueAction,
  };
}

const title =
  cleanString(
    raw.title
  );

if (!title) {
  return null;
}
  if (type === "propose_date") {
    return {
      type,
      title,
      place: cleanString(raw.place) ?? undefined,
      plannedFor: (() => {
        const value = cleanString(raw.plannedFor);
        return value && validDate(value) ? value : undefined;
      })(),
      note: cleanString(raw.note) ?? undefined,
    };
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
  dominicContext,
  profilePhotoCandidates,
}: {
  apiKey: string;
  model: string;
  userMessage: string;
  replies: string[];
  nearbyCommitments: unknown[];
   liveDateContext: unknown;
  dominicContext: unknown;
  profilePhotoCandidates: unknown[];
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
              850,

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
3. nearby existing commitments;
4. Dominic's current live state, location, availability, outfit and listening context.

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

propose_date

Use when Dominic makes a real, personally motivated invitation for a specific type of outing or Date, but Alloah has not yet mutually agreed on its place and schedule.
- Persist the invitation as a Date IDEA; do not pretend it was accepted, booked, scheduled or visited.
- A suggested place or activity is enough (e.g. asking her out for coffee, a movie, a walk or dinner). The exact venue and hour may remain unknown.
- This must be Dominic's actual invitation, NOT merely Alloah asking "want to go out?", a vague wish ("somewhere someday"), a hypothetical or empty flirting.
- title: what he genuinely invited her to; place null if unknown; plannedFor a valid ISO string ONLY when suggested day/time was actually explicit; note a concise faithful description of what he offered, including unscheduled daypart hints if needed.
- Do not repeatedly recreate invitations already represented in nearby commitments.

create_date

Use ONLY for an actually mutually agreed shared plan with a usable place AND a precise-enough agreed date/time, not a proposal.
- Do not invent her consent, a venue, a clock time, or a booking.
- If any key element remains unsettled, use propose_date for a real invitation instead.
- Resolve "tomorrow" with the real São Paulo/Rio local time below.
- plannedFor must be valid ISO date-time.
- Avoid duplicating an existing Date.

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

update_profile_photo

Use only when Dominic's actual reply clearly says or unmistakably indicates that he is making one of the supplied profilePhotoCandidates his profile picture now.

The photoId must exactly match an id from profilePhotoCandidates.

Be conservative:
- Do not change his profile picture merely because a photo exists.
- Do not infer a change because the user compliments a photo.
- A request alone is not enough unless Dominic clearly accepts and acts on it in his reply.
- If it is ambiguous which candidate he means, return no update_profile_photo.
- Never invent a photoId.

change_live_state

Use when Dominic's actual reply clearly performs a concrete movement or starts a concrete activity that changes his current live state.

Examples:
- he gets up and goes to the kitchen to make coffee -> location "kitchen", activity "making_coffee";
- he leaves the apartment -> location "out", activity "leaving_home";
- he goes into the bedroom and starts playing guitar -> location "bedroom", activity "playing_guitar".

Do NOT use change_live_state for transient body language or affection such as hugs, kisses, looks, touching, leaning closer, holding hands, or sitting closer.
Do not use it for a vague intention ("I'll make coffee later").
The new state must be directly supported by Dominic's actual reply and must remain physically consistent with dominicContext and liveDateContext.
Use note only for a short concrete detail of the action.

date_venue_action

Use only during an active Date when liveDateContext says locationMode is "place".

Dominic's actual reply must clearly commit to ordering or buying an item now.

The itemId must exactly match an item in liveDateContext.availableVenueItems.

Use the exact liveDateContext.dateId.

Use venueAction "ordered" for food, drink, dessert, or snack items.

Use venueAction "bought" for other item kinds.

Do not use date_venue_action when Dominic merely wants, likes, suggests, considers, or asks about an item.

Do not invent an item, itemId, purchase, or order.

If the item is not present in availableVenueItems, return no date_venue_action.

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

                      dominicContext,

                      profilePhotoCandidates,
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
      ): action is DominicWorldAction => {
        if (!action) {
          return false;
        }

        if (
          action.type ===
          "update_profile_photo"
        ) {
          return (
            Array.isArray(
              profilePhotoCandidates
            ) &&
            profilePhotoCandidates.some(
              (candidate) =>
                candidate &&
                typeof candidate ===
                  "object" &&
                !Array.isArray(
                  candidate
                ) &&
                (
                  candidate as Record<
                    string,
                    unknown
                  >
                ).id ===
                  action.photoId
            )
          );
        }

        if (
          action.type !==
          "date_venue_action"
        ) {
          return true;
        }

        if (
          !liveDateContext ||
          typeof liveDateContext !==
            "object" ||
          Array.isArray(
            liveDateContext
          )
        ) {
          return false;
        }

        const context =
          liveDateContext as Record<
            string,
            unknown
          >;

        if (
          context.active !== true ||
          context.locationMode !==
            "place" ||
          context.dateId !==
            action.dateId
        ) {
          return false;
        }

        const items =
          Array.isArray(
            context.availableVenueItems
          )
            ? context.availableVenueItems
            : [];

        const item =
          items.find(
            (value) =>
              value &&
              typeof value ===
                "object" &&
              !Array.isArray(
                value
              ) &&
              (
                value as Record<
                  string,
                  unknown
                >
              ).id ===
                action.itemId
          );

        if (!item) {
          return false;
        }

        const kind =
          (
            item as Record<
              string,
              unknown
            >
          ).kind;

        const shouldOrder =
          kind === "food" ||
          kind === "drink" ||
          kind === "dessert" ||
          kind === "snack";

        return shouldOrder
          ? action.venueAction ===
              "ordered"
          : action.venueAction ===
              "bought";
      }
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

              const supabaseUrl = envValue("SUPABASE_URL") || import.meta.env.VITE_SUPABASE_URL;
              const serviceRoleKey = envValue("SUPABASE_SERVICE_ROLE_KEY");
              if (!supabaseUrl || !serviceRoleKey) {
                return jsonError("Budget protection unavailable.", 503);
              }
              const rpc = async (name: string, body: Record<string, unknown>) => {
                const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
                  body: JSON.stringify(body),
                });
                if (!response.ok) throw new Error("Budget check failed");
                return response.json();
              };
              const budgetId = await rpc("reserve_ai_budget", { p_source: "dominic-actions", p_estimated_usd: 0.04 });
              if (!budgetId) return Response.json({ actions: [], budgetExhausted: true });
              let actions: DominicWorldAction[];
              try {
                actions = await interpretActions({
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

                  dominicContext:
                    body.dominicContext ?? null,

                  profilePhotoCandidates:
                    Array.isArray(
                      body.profilePhotoCandidates
                    )
                      ? body.profilePhotoCandidates
                      : [],
                });

                await rpc("settle_ai_budget", { p_id: budgetId });
              } catch (error) {
                await rpc("release_ai_budget", { p_id: budgetId });
                throw error;
              }
              // A genuine unconfirmed invitation is stored as a Date IDEA
              // and a linked existing shared-item chat message server-side.
              // The older Chat client only accepts confirmed create_date, so
              // never send an unrecognized "propose_date" down to it.
              const remainingActions: DominicWorldAction[] = [];
              for (const action of actions) {
                if (action.type === "propose_date") {
                  await persistDominicDateProposal({
                    userId: verified.id,
                    proposal: action,
                    supabaseUrl,
                    serviceKey: serviceRoleKey,
                  });
                  continue;
                }
                if (action.type === "create_date") {
                  // Reuse an exact, unaccepted invitation when a real agreement
                  // follows; the old Chat client must not create a second Date.
                  const confirmed = await confirmExistingDominicDateIdea({
                    userId: verified.id,
                    confirmed: action,
                    supabaseUrl,
                    serviceKey: serviceRoleKey,
                  });
                  if (confirmed.updated) continue;
                }
                remainingActions.push(action);
              }
              return Response.json({ actions: remainingActions });
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
