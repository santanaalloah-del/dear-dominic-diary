import { supabase } from "@/integrations/supabase/client";
export type DominicLocation =
  | "living"
  | "bedroom"
  | "kitchen"
  | "bathroom"
  | "hall"
  | "out";

export type DominicActivity =
  | "sleeping"
  | "waking_up"
  | "showering"
  | "getting_dressed"
  | "making_coffee"
  | "cooking"
  | "eating"
  | "washing_dishes"
  | "cleaning"
  | "doing_laundry"
  | "watching_something"
  | "listening_to_music"
  | "playing_guitar"
  | "writing_music"
  | "recording"
  | "reading"
  | "scrolling"
  | "on_the_phone"
  | "relaxing"
  | "napping"
  | "getting_ready"
  | "leaving_home"
  | "coming_home"
  | "walking"
  | "getting_food"
  | "shopping"
  | "at_a_cafe"
  | "with_friends"
  | "working"
  | "driving"
  | "idle";

export type DominicMood =
  | "calm"
  | "focused"
  | "social"
  | "restless"
  | "playful"
  | "tired";

export type DominicState = {
  location: DominicLocation;
  activity: DominicActivity;
  detail?: string;
  mood?: DominicMood;
energy?: number;

  recent?: Array<{
  activity: DominicActivity;
  location: DominicLocation;
  endedAt: string;
}>;

  startedAt: string;
  nextChangeAt: string;

  source:
    | "autonomous"
    | "event"
    | "manual";
};

export const DOMINIC_ACTIVITIES = [
  {
    activity: "sleeping",
    locations: ["bedroom"],
  },
  {
    activity: "showering",
    locations: ["bathroom"],
  },
  {
    activity: "getting_dressed",
    locations: ["bedroom", "bathroom"],
  },
  {
    activity: "making_coffee",
    locations: ["kitchen"],
  },
  {
    activity: "cooking",
    locations: ["kitchen"],
  },
  {
    activity: "eating",
    locations: ["kitchen", "living"],
  },
  {
    activity: "washing_dishes",
    locations: ["kitchen"],
  },
  {
    activity: "cleaning",
    locations: [
      "living",
      "bedroom",
      "kitchen",
      "bathroom",
    ],
  },
  {
    {
{
  activity: "watching_something",
  locations: ["living", "bedroom"],
},
  {
    activity: "listening_to_music",
    locations: ["living", "bedroom"],
  },
  {
    activity: "playing_guitar",
    locations: ["living", "bedroom"],
  },
  {
    activity: "writing_music",
    locations: ["living", "bedroom"],
  },
  {
    activity: "reading",
    locations: ["living", "bedroom"],
  },
  {
    activity: "scrolling",
    locations: ["living", "bedroom"],
  },
  {
    activity: "relaxing",
    locations: ["living", "bedroom"],
  },
  {
    activity: "napping",
    locations: ["bedroom", "living"],
  },
  {
    activity: "getting_ready",
    locations: ["bedroom", "bathroom"],
  },
  {
    activity: "leaving_home",
    locations: ["hall"],
  },
  {
    activity: "coming_home",
    locations: ["hall"],
  },

  {
    activity: "walking",
    locations: ["out"],
  },
  {
    activity: "getting_food",
    locations: ["out"],
  },
  {
    activity: "shopping",
    locations: ["out"],
  },
  {
    activity: "at_a_cafe",
    locations: ["out"],
  },
  {
    activity: "with_friends",
    locations: ["out"],
  },
  {
    activity: "working",
    locations: ["out"],
  },
  {
    activity: "recording",
    locations: ["out"],
  },
  {
    activity: "driving",
    locations: ["out"],
  },
] as const;

export async function loadDominicState(
  userId: string
): Promise<DominicState | null> {
  const { data, error } = await supabase
    .from("home_state")
    .select(
      "id,current_room,metadata,updated_at"
    )
    .eq("user_id", userId)
    .order("updated_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const metadata =
    (data.metadata ?? {}) as Record<
      string,
      unknown
    >;

  const saved =
    metadata.dominicState as
      | DominicState
      | undefined;

  return saved ?? null;
}

export async function saveDominicState(
  userId: string,
  state: DominicState
) {
  const { data: existing, error } =
    await supabase
      .from("home_state")
      .select("id,metadata")
      .eq("user_id", userId)
      .order("updated_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

  if (error) throw error;

  const previousMetadata =
    (existing?.metadata ?? {}) as Record<
      string,
      unknown
    >;

  const metadata = {
    ...previousMetadata,
    dominicState: state,
  };

  if (existing) {
    const { error: updateError } =
      await supabase
        .from("home_state")
        .update({
          current_room: state.location,
          metadata,
        })
        .eq("id", existing.id)
        .eq("user_id", userId);

    if (updateError) throw updateError;

    return;
  }

  const { error: insertError } =
    await supabase
      .from("home_state")
      .insert({
        user_id: userId,
        home_name: "Our Apartment",
        city: "New York",
        current_room: state.location,
        metadata,
      });

  if (insertError) throw insertError;
}

export async function syncDominicActiveContext(
  userId: string,
  state: DominicState
) {
  const { data: existing } =
    await supabase
      .from("active_context")
      .select("id")
      .eq("user_id", userId)
      .eq(
        "context_type",
        "dominic_live_state"
      )
      .eq("source_id", "dominic")
      .limit(1)
      .maybeSingle();

  const payload = {
    activity: state.activity,
    place: state.location,
    state,
    status: "active",
    started_at: state.startedAt,
    last_activity_at:
      new Date().toISOString(),
    context_type:
      "dominic_live_state",
    source_type:
      "autonomy_engine",
    source_id: "dominic",
    title: "Dominic",
  };

  if (existing) {
    await supabase
      .from("active_context")
      .update(payload)
      .eq("id", existing.id)
      .eq("user_id", userId);

    return;
  }

  await supabase
    .from("active_context")
    .insert({
      user_id: userId,
      ...payload,
    });
}

export type DominicWorldContext = {
  activity: string | null;
  place: string | null;
  status: string;
  title: string | null;
  contextType: string;
  togetherNow: boolean | null;
  state: unknown;
  metadata: unknown;
  startedAt: string;
};

export async function loadDominicWorldContext(
  userId: string
): Promise<DominicWorldContext[]> {
  const { data, error } =
    await supabase
      .from("active_context")
      .select(
        "activity,place,status,title,context_type,together_now,state,metadata,started_at,source_id,last_activity_at"
      )
      .eq("user_id", userId)
      .eq("status", "active")
      .order("last_activity_at", {
        ascending: false,
      })
      .limit(12);

  if (error) throw error;

  return (data ?? [])
    .filter(
      (item) =>
        item.source_id !== "dominic"
    )
    .map((item) => ({
      activity: item.activity,
      place: item.place,
      status: item.status,
      title: item.title,
      contextType:
        item.context_type,
      togetherNow:
        item.together_now,
      state: item.state,
      metadata: item.metadata,
      startedAt:
        item.started_at,
    }));
}

export async function recordDominicAction(
  userId: string,
  state: DominicState
) {
  await supabase
    .from("character_actions")
    .update({
      status: "completed",
      completed_at: state.startedAt,
    })
    .eq("user_id", userId)
    .eq("character_name", "Dominic")
    .eq("source_type", "autonomy_engine")
    .eq("source_id", "dominic")
    .eq("status", "active");

  const { error } =
    await supabase
      .from("character_actions")
      .insert({
        user_id: userId,
        character_name: "Dominic",
        action_type: state.activity,
        agency_class: "autonomous",
        agency_valid: true,
        motive_type: "ambient_life",
        status: "active",

        title:
          state.activity.replaceAll(
            "_",
            " "
          ),

        description:
          `${state.activity.replaceAll(
            "_",
            " "
          )} · ${state.location}`,

        decided_at: state.startedAt,
        executed_at: state.startedAt,
        scheduled_for: state.startedAt,

        source_type:
          "autonomy_engine",
        source_id: "dominic",

        payload: {
          location: state.location,
          mood: state.mood ?? null,
          energy: state.energy ?? null,
          nextChangeAt:
            state.nextChangeAt,
        },
      });

  if (error) throw error;
}

export type DominicRecentAction = {
  activity: string;
  startedAt: string | null;
  completedAt: string | null;
  status: string;
  payload: unknown;
};

export async function loadRecentDominicActions(
  userId: string
): Promise<DominicRecentAction[]> {
  const since =
    new Date(
      Date.now() -
        24 * 60 * 60 * 1000
    ).toISOString();

  const { data, error } =
    await supabase
      .from("character_actions")
      .select(
        "action_type,executed_at,completed_at,status,payload,created_at"
      )
      .eq("user_id", userId)
      .eq("character_name", "Dominic")
      .eq(
        "source_type",
        "autonomy_engine"
      )
      .eq("source_id", "dominic")
.gte("executed_at", since)
.order("executed_at", {
        ascending: false,
      })
      .limit(40);

  if (error) throw error;

  return (data ?? []).map(
    (item) => ({
      activity: item.action_type,
      startedAt: item.executed_at,
      completedAt: item.completed_at,
      status: item.status,
      payload: item.payload,
    })
  );
}

export type DominicCommitment = {
  id: string;
  kind: string;
  owner: string;
  title: string | null;
  plannedFor: string;
  data: unknown;
};

export async function loadDominicCommitments(
  userId: string,
  at = new Date()
): Promise<DominicCommitment[]> {
  const windowStart =
    new Date(
      at.getTime() -
        48 * 60 * 60 * 1000
    ).toISOString();

  const windowEnd =
    new Date(
      at.getTime() +
        48 * 60 * 60 * 1000
    ).toISOString();

  const { data, error } =
    await supabase
      .from("diario_items")
      .select(
        "id,kind,owner,title,planned_for,data"
      )
      .eq("user_id", userId)
      .eq("status", "active")
      .in("kind", [
        "date",
        "plan",
      ])
      .in("owner", [
        "dominic",
        "shared",
      ])
      .not(
        "planned_for",
        "is",
        null
      )
      .gte(
        "planned_for",
        windowStart
      )
      .lte(
        "planned_for",
        windowEnd
      )
      .order("planned_for", {
        ascending: true,
      })
      .limit(30);

  if (error) throw error;

  return (data ?? []).map(
    (item) => ({
      id: item.id,
      kind: item.kind,
      owner: item.owner,
      title: item.title,
      plannedFor:
        item.planned_for as string,
      data: item.data,
    })
  );
}

type DominicCandidate = {
  activity: DominicActivity;
  location: DominicLocation;
  weight: number;
};

const ACTIVITY_DURATION: Partial<
  Record<DominicActivity, [number, number]>
> = {
  sleeping: [240, 540],
  waking_up: [5, 20],
  showering: [10, 30],
  getting_dressed: [10, 35],
  making_coffee: [5, 20],
  cooking: [20, 75],
  eating: [15, 45],
  washing_dishes: [5, 25],
  cleaning: [20, 90],
  doing_laundry: [30, 120],
  watching_something: [30, 150],
  listening_to_music: [20, 120],
  playing_guitar: [20, 120],
  writing_music: [30, 180],
  recording: [60, 240],
  reading: [20, 120],
  scrolling: [10, 60],
  on_the_phone: [5, 60],
  relaxing: [20, 120],
  napping: [20, 120],
  getting_ready: [15, 60],
  leaving_home: [3, 15],
  coming_home: [3, 15],
  walking: [15, 90],
  getting_food: [20, 90],
  shopping: [30, 150],
  at_a_cafe: [30, 150],
  with_friends: [60, 300],
  working: [60, 300],
  driving: [15, 120],
  idle: [10, 60],
};

function randomBetween(
  min: number,
  max: number
) {
  return Math.floor(
    Math.random() * (max - min + 1)
  ) + min;
}

function weightedPick(
  candidates: DominicCandidate[]
) {
  const total = candidates.reduce(
    (sum, item) => sum + item.weight,
    0
  );

  let roll = Math.random() * total;

  for (const candidate of candidates) {
    roll -= candidate.weight;

    if (roll <= 0) {
      return candidate;
    }
  }

  return candidates[candidates.length - 1];
}

function applyRecentPenalty(
  candidates: DominicCandidate[],
  previous: DominicState | null
): DominicCandidate[] {
  if (!previous) return candidates;

  const recentActivities = [
    previous.activity,
    ...(previous.recent ?? [])
      .slice(-5)
      .map((item) => item.activity),
  ];

  return candidates.map((candidate) => {
    const repeats =
      recentActivities.filter(
        (activity) =>
          activity === candidate.activity
      ).length;

    if (repeats === 0) {
      return candidate;
    }

    return {
      ...candidate,
      weight: Math.max(
        0.15,
        candidate.weight /
          (1 + repeats * 1.8)
      ),
    };
  });
}

function applyDailyHistoryBias(
  candidates: DominicCandidate[],
  recentActions: DominicRecentAction[]
): DominicCandidate[] {
  if (recentActions.length === 0) {
    return candidates;
  }

  return candidates.map((candidate) => {
    const timesDone =
      recentActions.filter(
        (action) =>
          action.activity === candidate.activity
      ).length;

    if (timesDone === 0) {
      return candidate;
    }

    let weight = candidate.weight;

    if (
      [
        "showering",
        "getting_dressed",
        "doing_laundry",
      ].includes(candidate.activity)
    ) {
      weight *= Math.pow(
        0.2,
        timesDone
      );
    } else if (
      [
        "working",
        "recording",
        "shopping",
        "with_friends",
      ].includes(candidate.activity)
    ) {
      weight *= Math.pow(
        0.5,
        timesDone
      );
    } else if (
      [
        "making_coffee",
        "cooking",
        "eating",
      ].includes(candidate.activity)
    ) {
      weight *= Math.pow(
        0.72,
        timesDone
      );
    } else {
      weight *=
        1 /
        (1 + timesDone * 0.55);
    }

    return {
      ...candidate,
      weight: Math.max(
        0.08,
        weight
      ),
    };
  });
}

function clampEnergy(value: number) {
  return Math.max(
    5,
    Math.min(100, value)
  );
}

function applyInternalStateBias(
  candidates: DominicCandidate[],
  previous: DominicState | null
): DominicCandidate[] {
  if (!previous) return candidates;

  const energy =
    previous.energy ?? 60;

  const mood =
    previous.mood ?? "calm";

  return candidates.map((candidate) => {
    let weight = candidate.weight;

    if (energy < 30) {
      if (
        [
          "sleeping",
          "napping",
          "relaxing",
          "scrolling",
          "watching_something",
        ].includes(candidate.activity)
      ) {
        weight *= 1.8;
      }

      if (
        [
          "working",
          "recording",
          "cleaning",
          "with_friends",
          "leaving_home",
        ].includes(candidate.activity)
      ) {
        weight *= 0.5;
      }
    }

    if (energy > 70) {
      if (
        [
          "walking",
          "cleaning",
          "playing_guitar",
          "recording",
          "working",
          "leaving_home",
        ].includes(candidate.activity)
      ) {
        weight *= 1.45;
      }
    }

    if (
      mood === "social" &&
      [
        "with_friends",
        "at_a_cafe",
        "on_the_phone",
        "getting_food",
      ].includes(candidate.activity)
    ) {
      weight *= 1.7;
    }

    if (
      mood === "focused" &&
      [
        "writing_music",
        "recording",
        "reading",
        "working",
      ].includes(candidate.activity)
    ) {
      weight *= 1.7;
    }

    if (
      mood === "restless" &&
      [
        "walking",
        "driving",
        "shopping",
        "leaving_home",
        "cleaning",
      ].includes(candidate.activity)
    ) {
      weight *= 1.6;
    }

    if (
      mood === "playful" &&
      [
        "playing_guitar",
        "listening_to_music",
        "with_friends",
        "driving",
      ].includes(candidate.activity)
    ) {
      weight *= 1.5;
    }

    if (
      mood === "tired" &&
      [
        "sleeping",
        "napping",
        "relaxing",
        "scrolling",
      ].includes(candidate.activity)
    ) {
      weight *= 1.8;
    }

    return {
      ...candidate,
      weight,
    };
  });
}

function applyWorldContextBias(
  candidates: DominicCandidate[],
  worldContext: DominicWorldContext[]
): DominicCandidate[] {
  if (worldContext.length === 0) {
    return candidates;
  }

  const togetherContext =
    worldContext.find(
      (item) => item.togetherNow === true
    );

  const sharedPlace =
    togetherContext?.place;

  const sharedActivity =
    togetherContext?.activity;

  return candidates.map((candidate) => {
    let weight = candidate.weight;

    if (togetherContext) {
      if (
        candidate.activity ===
        sharedActivity
      ) {
        weight *= 2.2;
      }

      if (
        candidate.location ===
        sharedPlace
      ) {
        weight *= 1.8;
      }

      if (
        [
          "relaxing",
          "eating",
          "listening_to_music",
          "watching_something",
          "playing_guitar",
        ].includes(candidate.activity)
      ) {
        weight *= 1.25;
      }

      if (
        [
          "leaving_home",
          "working",
          "shopping",
          "with_friends",
        ].includes(candidate.activity)
      ) {
        weight *= 0.45;
      }
    }

    return {
      ...candidate,
      weight,
    };
  });
}

function applyCommitmentBias(
  candidates: DominicCandidate[],
  commitments: DominicCommitment[],
  at: Date
): DominicCandidate[] {
  const nearby =
    commitments
      .map((commitment) => ({
        commitment,
        minutesUntil:
          (new Date(
            commitment.plannedFor
          ).getTime() -
            at.getTime()) /
          60_000,
      }))
      .filter(
        (item) =>
          item.minutesUntil >= -30 &&
          item.minutesUntil <= 180
      )
      .sort(
        (a, b) =>
          Math.abs(a.minutesUntil) -
          Math.abs(b.minutesUntil)
      )[0];

  if (!nearby) {
    return candidates;
  }

  return candidates.map((candidate) => {
    let weight = candidate.weight;

    if (nearby.minutesUntil > 45) {
      if (
        [
          "getting_ready",
          "showering",
          "getting_dressed",
        ].includes(candidate.activity)
      ) {
        weight *= 1.7;
      }
    } else {
      if (
        candidate.activity ===
        "getting_ready"
      ) {
        weight *= 2.4;
      }

      if (
        [
          "sleeping",
          "napping",
        ].includes(candidate.activity)
      ) {
        weight *= 0.2;
      }
    }

    return {
      ...candidate,
      weight,
    };
  });
}

function evolveInternalState(
  previous: DominicState | null,
  activity: DominicActivity,
  hour: number
) {
  let energy =
    previous?.energy ??
    randomBetween(45, 80);

  if (activity === "sleeping") {
    energy += randomBetween(25, 45);
  } else if (activity === "napping") {
    energy += randomBetween(10, 25);
  } else if (
    [
      "working",
      "recording",
      "cleaning",
      "walking",
      "with_friends",
      "shopping",
    ].includes(activity)
  ) {
    energy -= randomBetween(7, 16);
  } else {
    energy += randomBetween(-5, 5);
  }

  if (hour >= 0 && hour < 6) {
    energy -= randomBetween(3, 10);
  }

  energy = clampEnergy(energy);

  const moods: DominicMood[] = [
    previous?.mood ?? "calm",
    "calm",
  ];

  if (energy < 30) {
    moods.push(
      "tired",
      "tired"
    );
  }

  if (
    [
      "with_friends",
      "at_a_cafe",
      "on_the_phone",
    ].includes(activity)
  ) {
    moods.push(
      "social",
      "social"
    );
  }

  if (
    [
      "writing_music",
      "recording",
      "reading",
      "working",
    ].includes(activity)
  ) {
    moods.push(
      "focused",
      "focused"
    );
  }

  if (
    [
      "walking",
      "driving",
      "shopping",
    ].includes(activity)
  ) {
    moods.push("restless");
  }

  if (
    [
      "playing_guitar",
      "listening_to_music",
    ].includes(activity)
  ) {
    moods.push("playful");
  }

  const mood =
    moods[
      randomBetween(
        0,
        moods.length - 1
      )
    ];

  return {
    energy,
    mood,
  };
}

function homeCandidates(
  hour: number
): DominicCandidate[] {
  const candidates: DominicCandidate[] = [
    {
      activity: "relaxing",
      location: "living",
      weight: 3,
    },
    {
      activity: "scrolling",
      location: "bedroom",
      weight: 2,
    },
    {
      activity: "listening_to_music",
      location: "living",
      weight: 3,
    },
    {
      activity: "playing_guitar",
      location: "living",
      weight: 2.5,
    },
    {
      activity: "writing_music",
      location: "bedroom",
      weight: 2,
    },
    {
      activity: "reading",
      location: "bedroom",
      weight: 1.5,
    },
    {
      activity: "watching_something",
      location: "living",
      weight: 2,
    },
    {
      activity: "on_the_phone",
      location: "bedroom",
      weight: 1.5,
    },
    {
      activity: "cleaning",
      location: "living",
      weight: 0.7,
    },
  ];

  if (hour >= 5 && hour < 11) {
    candidates.push(
      {
        activity: "making_coffee",
        location: "kitchen",
        weight: 5,
      },
      {
        activity: "showering",
        location: "bathroom",
        weight: 3,
      },
      {
        activity: "getting_dressed",
        location: "bedroom",
        weight: 3,
      },
      {
        activity: "cooking",
        location: "kitchen",
        weight: 2,
      }
    );
  }

  if (hour >= 11 && hour < 22) {
    candidates.push(
      {
        activity: "cooking",
        location: "kitchen",
        weight: 2.5,
      },
      {
        activity: "eating",
        location: "kitchen",
        weight: 1.5,
      },
      {
        activity: "doing_laundry",
        location: "bedroom",
        weight: 0.7,
      }
    );
  }

  if (hour >= 22 || hour < 7) {
    candidates.push(
      {
        activity: "sleeping",
        location: "bedroom",
        weight:
          hour >= 1 && hour < 6
            ? 12
            : 4,
      },
      {
        activity: "scrolling",
        location: "bedroom",
        weight: 3,
      },
      {
        activity: "listening_to_music",
        location: "bedroom",
        weight: 2,
      }
    );
  }

  candidates.push({
    activity: "leaving_home",
    location: "hall",
    weight:
      hour >= 9 && hour < 23
        ? 1.5
        : 0.25,
  });

  return candidates;
}

function outCandidates(
  hour: number
): DominicCandidate[] {
  const candidates: DominicCandidate[] = [
    {
      activity: "walking",
      location: "out",
      weight: 2,
    },
    {
      activity: "getting_food",
      location: "out",
      weight: 2,
    },
    {
      activity: "shopping",
      location: "out",
      weight: 1,
    },
    {
      activity: "at_a_cafe",
      location: "out",
      weight: 1.5,
    },
    {
      activity: "with_friends",
      location: "out",
      weight: 2,
    },
    {
      activity: "working",
      location: "out",
      weight: 2,
    },
    {
      activity: "recording",
      location: "out",
      weight: 2,
    },
    {
      activity: "driving",
      location: "out",
      weight: 1,
    },
    {
      activity: "coming_home",
      location: "hall",
      weight: 2,
    },
  ];

  if (hour >= 23 || hour < 7) {
    candidates.push({
      activity: "coming_home",
      location: "hall",
      weight: 8,
    });
  }

  return candidates;
}

function candidatesAfter(
  previous: DominicState | null,
  hour: number
): DominicCandidate[] {
  if (!previous) {
    return [
      ...homeCandidates(hour),
      ...outCandidates(hour).filter(
        (item) =>
          item.activity !== "coming_home"
      ),
    ];
  }

  if (previous.activity === "cooking") {
    return [
      {
        activity: "eating",
        location: "kitchen",
        weight: 10,
      },
      ...homeCandidates(hour),
    ];
  }

  if (previous.activity === "eating") {
    return [
      {
        activity: "washing_dishes",
        location: "kitchen",
        weight: 6,
      },
      {
        activity: "relaxing",
        location: "living",
        weight: 5,
      },
      ...homeCandidates(hour),
    ];
  }

  if (
    previous.activity ===
    "leaving_home"
  ) {
    return outCandidates(hour).filter(
      (item) =>
        item.activity !== "coming_home"
    );
  }

  if (
    previous.location === "out"
  ) {
    return outCandidates(hour);
  }

  if (
    previous.activity ===
    "coming_home"
  ) {
    return homeCandidates(hour).filter(
      (item) =>
        item.activity !== "leaving_home"
    );
  }

  if (
    previous.activity === "sleeping"
  ) {
    return [
      {
        activity: "waking_up",
        location: "bedroom",
        weight: 10,
      },
      {
        activity: "scrolling",
        location: "bedroom",
        weight: 2,
      },
    ];
  }

  if (
    previous.activity === "waking_up"
  ) {
    return [
      {
        activity: "showering",
        location: "bathroom",
        weight: 4,
      },
      {
        activity: "making_coffee",
        location: "kitchen",
        weight: 5,
      },
      {
        activity: "scrolling",
        location: "bedroom",
        weight: 1,
      },
    ];
  }

  return homeCandidates(hour).filter(
    (candidate) =>
      !(
        candidate.activity ===
          previous.activity &&
        candidate.location ===
          previous.location
      )
  );
}

export function createNextDominicState(
  previous: DominicState | null,
  at = new Date(),
  worldContext: DominicWorldContext[] = [],
  recentActions: DominicRecentAction[] = [],
commitments: DominicCommitment[] = []
): DominicState {
const candidate = weightedPick(
  applyCommitmentBias(
    applyWorldContextBias(
      applyInternalStateBias(
        applyDailyHistoryBias(
          applyRecentPenalty(
            candidatesAfter(
              previous,
              at.getHours()
            ),
            previous
          ),
          recentActions
        ),
        previous
      ),
      worldContext
    ),
    commitments,
    at
  )
);
  
  const [minMinutes, maxMinutes] =
    ACTIVITY_DURATION[
      candidate.activity
    ] ?? [20, 90];

  const durationMinutes =
    randomBetween(
      minMinutes,
      maxMinutes
    );

  const nextChangeAt =
    new Date(
      at.getTime() +
        durationMinutes * 60_000
    );

  const recent =
  previous
    ? [
        ...(previous.recent ?? []),
        {
          activity: previous.activity,
          location: previous.location,
          endedAt: at.toISOString(),
        },
      ].slice(-8)
    : [];

  const internal =
  evolveInternalState(
    previous,
    candidate.activity,
    at.getHours()
  );

  return {
    location: candidate.location,
    activity: candidate.activity,
    mood: internal.mood,
energy: internal.energy,
    recent,
    startedAt: at.toISOString(),
    nextChangeAt:
      nextChangeAt.toISOString(),
    source: "autonomous",
  };
}

export async function getCurrentDominicState(
  userId: string
): Promise<DominicState> {
  let state =
    await loadDominicState(userId);

  const now = new Date();

  const worldContext =
  await loadDominicWorldContext(
    userId
  );

  const recentActions =
  await loadRecentDominicActions(
    userId
  );

  const commitments =
  await loadDominicCommitments(
    userId,
    now
  );
if (!state) {
  state =
 createNextDominicState(
  null,
  now,
  worldContext,
  recentActions,
  commitments
);
  await saveDominicState(
    userId,
    state
  );

  await recordDominicAction(
  userId,
  state
);
  
  await syncDominicActiveContext(
    userId,
    state
  );

  return state;
}
  
  let changes = 0;

  while (
    new Date(
      state.nextChangeAt
    ).getTime() <= now.getTime() &&
    changes < 48
  ) {
    const transitionTime =
      new Date(
        state.nextChangeAt
      );

   state =
createNextDominicState(
  state,
  transitionTime,
  worldContext,
  recentActions,
  commitments
);
await recordDominicAction(
  userId,
  state
);

recentActions.unshift({
  activity: state.activity,
  startedAt: state.startedAt,
  completedAt: null,
  status: "active",
  payload: {
    location: state.location,
    mood: state.mood ?? null,
    energy: state.energy ?? null,
    nextChangeAt: state.nextChangeAt,
  },
});

recentActions.splice(40);

changes += 1;
  }

 if (changes > 0) {
  await saveDominicState(
    userId,
    state
  );
}

await syncDominicActiveContext(
  userId,
  state
);

return state;
}
