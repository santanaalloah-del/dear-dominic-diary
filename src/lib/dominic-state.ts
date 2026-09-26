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

export type DominicState = {
  location: DominicLocation;
  activity: DominicActivity;
  detail?: string;
  mood?: string;

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
