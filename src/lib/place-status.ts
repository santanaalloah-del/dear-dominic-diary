import { supabase } from "@/integrations/supabase/client";
import type { DiarioItem } from "@/lib/diario-world";

const db = supabase as any;

export type PersistedPlaceStatus = "saved" | "visited";

export async function setPersistedPlaceStatus({
  userId,
  place,
  status,
}: {
  userId: string;
  place: DiarioItem;
  status: PersistedPlaceStatus;
}): Promise<DiarioItem> {
  const now = new Date().toISOString();

  const nextData = {
    ...(place.data ?? {}),
    placeStatus: status,
    lastVisitedAt:
      status === "visited"
        ? now
        : place.data?.lastVisitedAt ?? null,
  };

  const { data, error } = await db
    .from("diario_items")
    .update({
      event_at: status === "visited" ? now : null,
      data: nextData,
    })
    .eq("user_id", userId)
    .eq("id", place.id)
    .eq("kind", "place")
    .select("*")
    .single();

  if (error) throw error;

  return data as DiarioItem;
}
