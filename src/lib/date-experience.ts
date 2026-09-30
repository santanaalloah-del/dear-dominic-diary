import { supabase } from "@/integrations/supabase/client";
import type { DiarioItem } from "@/lib/diario-world";
import { getDateFlowState } from "@/lib/date-flow";

const db = supabase as any;

export type DateExperienceLocationMode =
  | "place"
  | "walking"
  | "between_places";

export type DateExperienceEventType =
  | "date_started"
  | "arrived"
  | "left_place"
  | "walking"
  | "date_finished";

export type DateExperienceEvent = {
  id: string;
  type: DateExperienceEventType;
  happenedAt: string;
  placeId: string | null;
  placeName: string | null;
  note: string | null;
};

export type DateExperienceState = {
  schemaVersion: 1;
  currentLocationMode: DateExperienceLocationMode;
  currentPlaceId: string | null;
  currentPlaceName: string | null;
  events: DateExperienceEvent[];
};

function cleanString(value: unknown): string | null {
  return typeof value === "string" ? value.trim() || null : null;
}

function emptyExperience(date?: DiarioItem | null): DateExperienceState {
  const placeId = cleanString(date?.data?.place_id);
  const placeName = cleanString(date?.data?.place);

  return {
    schemaVersion: 1,
    currentLocationMode: placeId || placeName ? "place" : "between_places",
    currentPlaceId: placeId,
    currentPlaceName: placeName,
    events: [],
  };
}

function readEvent(value: unknown): DateExperienceEvent | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const raw = value as Record<string, unknown>;
  const id = cleanString(raw.id);
  const happenedAt = cleanString(raw.happenedAt);
  const type = raw.type;

  if (
    !id ||
    !happenedAt ||
    !(
      type === "date_started" ||
      type === "arrived" ||
      type === "left_place" ||
      type === "walking" ||
      type === "date_finished"
    )
  ) {
    return null;
  }

  return {
    id,
    type,
    happenedAt,
    placeId: cleanString(raw.placeId),
    placeName: cleanString(raw.placeName),
    note: cleanString(raw.note),
  };
}

export function readDateExperience(
  date: DiarioItem | null
): DateExperienceState {
  const fallback = emptyExperience(date);
  const raw = date?.data?.date_experience;

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return fallback;
  }

  const value = raw as Record<string, unknown>;
  const mode = value.currentLocationMode;

  const currentLocationMode: DateExperienceLocationMode =
    mode === "place" || mode === "walking" || mode === "between_places"
      ? mode
      : fallback.currentLocationMode;

  const events = Array.isArray(value.events)
    ? value.events
        .map(readEvent)
        .filter((event): event is DateExperienceEvent => event !== null)
    : [];

  return {
    schemaVersion: 1,
    currentLocationMode,
    currentPlaceId:
      cleanString(value.currentPlaceId) ?? fallback.currentPlaceId,
    currentPlaceName:
      cleanString(value.currentPlaceName) ?? fallback.currentPlaceName,
    events,
  };
}

async function persistDateExperience({
  userId,
  date,
  experience,
}: {
  userId: string;
  date: DiarioItem;
  experience: DateExperienceState;
}): Promise<DiarioItem> {
  const { data, error } = await db
    .from("diario_items")
    .update({
      data: {
        ...(date.data ?? {}),
        date_experience: experience,
      },
    })
    .eq("user_id", userId)
    .eq("id", date.id)
    .eq("kind", "date")
    .select("*")
    .single();

  if (error) throw error;
  return data as DiarioItem;
}

function event({
  type,
  placeId = null,
  placeName = null,
  note = null,
}: {
  type: DateExperienceEventType;
  placeId?: string | null;
  placeName?: string | null;
  note?: string | null;
}): DateExperienceEvent {
  return {
    id: crypto.randomUUID(),
    type,
    happenedAt: new Date().toISOString(),
    placeId,
    placeName,
    note,
  };
}

export function isDateLive(date: DiarioItem | null): boolean {
  return Boolean(date && getDateFlowState(date) === "live");
}

export function canNaturallyStartDate(
  date: DiarioItem,
  now = new Date()
): boolean {
  if (!date.planned_for) return true;

  const planned = new Date(date.planned_for);
  if (Number.isNaN(planned.getTime())) return true;

  const timeKnown = date.data?.time_known !== false;

  if (!timeKnown) {
    const sameLocalDay =
      planned.getFullYear() === now.getFullYear() &&
      planned.getMonth() === now.getMonth() &&
      planned.getDate() === now.getDate();

    return sameLocalDay;
  }

  const earlyWindowMs = 60 * 60_000;
  return now.getTime() >= planned.getTime() - earlyWindowMs;
}

export function naturalStartMessage(date: DiarioItem): string | null {
  if (canNaturallyStartDate(date)) return null;
  if (!date.planned_for) return null;

  const planned = new Date(date.planned_for);
  if (Number.isNaN(planned.getTime())) return null;

  return `This Date is scheduled for ${new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    ...(date.data?.time_known !== false
      ? {
          hour: "numeric" as const,
          minute: "2-digit" as const,
        }
      : {}),
  }).format(planned)}.`;
}

export async function beginDateExperience({
  userId,
  date,
}: {
  userId: string;
  date: DiarioItem;
}): Promise<DiarioItem> {
  const current = readDateExperience(date);

  if (current.events.some((entry) => entry.type === "date_started")) {
    return date;
  }

  const placeId = cleanString(date.data?.place_id);
  const placeName = cleanString(date.data?.place);

  return persistDateExperience({
    userId,
    date,
    experience: {
      ...current,
      currentLocationMode: placeId || placeName ? "place" : "between_places",
      currentPlaceId: placeId,
      currentPlaceName: placeName,
      events: [
        ...current.events,
        event({
          type: "date_started",
          placeId,
          placeName,
        }),
        ...(placeId || placeName
          ? [
              event({
                type: "arrived" as const,
                placeId,
                placeName,
              }),
            ]
          : []),
      ],
    },
  });
}

export async function leaveCurrentDatePlace({
  userId,
  date,
}: {
  userId: string;
  date: DiarioItem;
}): Promise<DiarioItem> {
  const current = readDateExperience(date);

  return persistDateExperience({
    userId,
    date,
    experience: {
      ...current,
      currentLocationMode: "walking",
      currentPlaceId: null,
      currentPlaceName: null,
      events: [
        ...current.events,
        ...(current.currentPlaceId || current.currentPlaceName
          ? [
              event({
                type: "left_place" as const,
                placeId: current.currentPlaceId,
                placeName: current.currentPlaceName,
              }),
            ]
          : []),
        event({
          type: "walking",
          note: "Walking between places",
        }),
      ],
    },
  });
}

export async function arriveAtDatePlace({
  userId,
  date,
  place,
}: {
  userId: string;
  date: DiarioItem;
  place: DiarioItem;
}): Promise<DiarioItem> {
  const current = readDateExperience(date);
  const placeName = place.title ?? cleanString(place.data?.name) ?? "Place";

  const alreadyHere =
    current.currentLocationMode === "place" &&
    (current.currentPlaceId === place.id ||
      (!current.currentPlaceId &&
        current.currentPlaceName === placeName));

  if (alreadyHere) {
    return date;
  }

  return persistDateExperience({
    userId,
    date,
    experience: {
      ...current,
      currentLocationMode: "place",
      currentPlaceId: place.id,
      currentPlaceName: placeName,
      events: [
        ...current.events,
        event({
          type: "arrived",
          placeId: place.id,
          placeName,
        }),
      ],
    },
  });
}

export async function finishDateExperience({
  userId,
  date,
}: {
  userId: string;
  date: DiarioItem;
}): Promise<DiarioItem> {
  const current = readDateExperience(date);

  if (current.events.some((entry) => entry.type === "date_finished")) {
    return date;
  }

  return persistDateExperience({
    userId,
    date,
    experience: {
      ...current,
      events: [
        ...current.events,
        event({
          type: "date_finished",
          placeId: current.currentPlaceId,
          placeName: current.currentPlaceName,
        }),
      ],
    },
  });
}

export async function getLiveDateExperience(
  userId: string
): Promise<DiarioItem | null> {
  const { data, error } = await db
    .from("diario_items")
    .select("*")
    .eq("user_id", userId)
    .eq("kind", "date")
    .eq("status", "active")
    .contains("data", { flow_state: "live" })
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) throw error;
  return (data?.[0] as DiarioItem | undefined) ?? null;
}
