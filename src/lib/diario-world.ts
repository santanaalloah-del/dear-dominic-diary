import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type DiarioOwner =
  | "alloah"
  | "dominic"
  | "shared";

export type DiarioItemKind =
  | "diary"
  | "letter"
  | "photo"
  | "video"
  | "album"
  | "date"
  | "place"
  | "keepsake"
  | "clothing"
  | "look"
  | "song"
  | "story_memory"
  | "note"
  | "plan"
  | "home_object"
  | "home_change";

export type DiarioItem = {
  id: string;
  user_id: string;
  kind: DiarioItemKind;
  owner: DiarioOwner;
  status: string;
  title: string | null;
  body: string | null;
  event_at: string | null;
  planned_for: string | null;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type SaveDiaryPageInput = {
  id?: string;
  userId: string;
  owner: "alloah" | "dominic";
  body: string;
  localDate: string;
  eventAt: string;
};

const diarioSupabase =
  supabase as unknown as SupabaseClient<any>;

export async function getDiaryPages(
  userId: string,
  owner: "alloah" | "dominic"
): Promise<DiarioItem[]> {
  const { data, error } = await diarioSupabase
    .from("diario_items")
    .select("*")
    .eq("user_id", userId)
    .eq("kind", "diary")
    .eq("owner", owner)
    .eq("status", "active")
    .order("event_at", {
      ascending: false,
      nullsFirst: false,
    });

  if (error) {
    throw error;
  }

  return (data ?? []) as DiarioItem[];
}

export async function saveDiaryPage({
  id,
  userId,
  owner,
  body,
  localDate,
  eventAt,
}: SaveDiaryPageInput): Promise<DiarioItem> {
  const cleanBody = body.trim();

  if (!cleanBody) {
    throw new Error(
      "A diary page cannot be empty."
    );
  }

  const values = {
    user_id: userId,
    kind: "diary",
    owner,
    status: "active",
    title: null,
    body: cleanBody,
    event_at: eventAt,
    data: {
      local_date: localDate,
    },
  };

  if (id) {
    const { data, error } = await diarioSupabase
      .from("diario_items")
      .update(values)
      .eq("id", id)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return data as DiarioItem;
  }

  const { data, error } = await diarioSupabase
    .from("diario_items")
    .insert(values)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as DiarioItem;
}

export function getLocalDateKey(
  date = new Date()
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
