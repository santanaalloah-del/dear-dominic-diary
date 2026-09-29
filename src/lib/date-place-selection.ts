import { supabase } from "@/integrations/supabase/client";
import type { DiarioItem } from "@/lib/diario-world";

const db = supabase as any;

const DATE_PLACE_SELECTION_KEY =
  "diario:date-place-selection";

const DATE_PLACE_RETURN_KEY =
  "diario:date-place-return";

export type PendingDatePlaceSelection = {
  dateId: string;
  dateTitle: string;
};

export function beginDatePlaceSelection(
  date: DiarioItem
) {
  if (typeof window === "undefined") return;

  const payload: PendingDatePlaceSelection = {
    dateId: date.id,
    dateTitle:
      date.title?.trim() ||
      "Untitled Date",
  };

  window.sessionStorage.setItem(
    DATE_PLACE_SELECTION_KEY,
    JSON.stringify(payload)
  );
}

export function readDatePlaceSelection():
  | PendingDatePlaceSelection
  | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(
    DATE_PLACE_SELECTION_KEY
  );

  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);

    if (
      typeof parsed?.dateId !== "string" ||
      !parsed.dateId.trim()
    ) {
      return null;
    }

    return {
      dateId: parsed.dateId,
      dateTitle:
        typeof parsed.dateTitle === "string" &&
        parsed.dateTitle.trim()
          ? parsed.dateTitle.trim()
          : "Untitled Date",
    };
  } catch {
    return null;
  }
}

export function completeDatePlaceSelection(
  dateId: string
) {
  if (typeof window === "undefined") return;

  window.sessionStorage.setItem(
    DATE_PLACE_RETURN_KEY,
    dateId
  );

  window.sessionStorage.removeItem(
    DATE_PLACE_SELECTION_KEY
  );
}

export function cancelDatePlaceSelection() {
  const pending =
    readDatePlaceSelection();

  if (pending) {
    completeDatePlaceSelection(
      pending.dateId
    );
  }
}

export function consumeDatePlaceReturnId():
  | string
  | null {
  if (typeof window === "undefined") {
    return null;
  }

  const dateId =
    window.sessionStorage.getItem(
      DATE_PLACE_RETURN_KEY
    );

  if (dateId) {
    window.sessionStorage.removeItem(
      DATE_PLACE_RETURN_KEY
    );
  }

  return dateId;
}

export async function setDateCanonicalPlace({
  userId,
  dateId,
  place,
}: {
  userId: string;
  dateId: string;
  place: DiarioItem;
}): Promise<{
  date: DiarioItem;
  place: DiarioItem;
}> {
  const {
    data: currentDate,
    error: dateError,
  } = await db
    .from("diario_items")
    .select("*")
    .eq("user_id", userId)
    .eq("id", dateId)
    .eq("kind", "date")
    .single();

  if (dateError) throw dateError;

  const [
    directDelete,
    reverseDelete,
  ] = await Promise.all([
    db
      .from("diario_links")
      .delete()
      .eq("user_id", userId)
      .eq("source_item_id", dateId)
      .eq("relation", "at_place"),

    db
      .from("diario_links")
      .delete()
      .eq("user_id", userId)
      .eq("target_item_id", dateId)
      .eq("relation", "at_place"),
  ]);

  if (directDelete.error) {
    throw directDelete.error;
  }

  if (reverseDelete.error) {
    throw reverseDelete.error;
  }

  const { error: linkError } = await db
    .from("diario_links")
    .upsert(
      {
        user_id: userId,
        source_item_id: dateId,
        target_item_id: place.id,
        relation: "at_place",
        data: {
          source:
            "date_place_map_selection",
        },
      },
      {
        onConflict:
          "user_id,source_item_id,target_item_id,relation",
      }
    );

  if (linkError) throw linkError;

  const nextDateData = {
    ...(currentDate.data ?? {}),
    place:
      place.title ??
      "Untitled place",
    place_id: place.id,
    place_provider:
      place.data?.provider ?? null,
  };

  const {
    data: updatedDate,
    error: updateDateError,
  } = await db
    .from("diario_items")
    .update({
      data: nextDateData,
    })
    .eq("user_id", userId)
    .eq("id", dateId)
    .eq("kind", "date")
    .select("*")
    .single();

  if (updateDateError) {
    throw updateDateError;
  }

  let updatedPlace =
    place as DiarioItem;

  if (
    currentDate.event_at &&
    place.data?.placeStatus !==
      "visited"
  ) {
    const {
      data: visitedPlace,
      error: visitError,
    } = await db
      .from("diario_items")
      .update({
        event_at:
          place.event_at ??
          currentDate.event_at,
        data: {
          ...(place.data ?? {}),
          placeStatus: "visited",
          lastVisitedAt:
            currentDate.event_at,
        },
      })
      .eq("user_id", userId)
      .eq("id", place.id)
      .eq("kind", "place")
      .select("*")
      .single();

    if (visitError) throw visitError;

    updatedPlace =
      visitedPlace as DiarioItem;
  }

  return {
    date:
      updatedDate as DiarioItem,
    place: updatedPlace,
  };
}
