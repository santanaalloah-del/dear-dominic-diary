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
        .filter((entry): entry is DateExperienceEvent => entry !== null)
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

export type DateStartPhase =
  | "upcoming"
  | "approaching"
  | "available";

export type DateStartAvailability = {
  phase: DateStartPhase;
  label: string;
  detail: string;
  canStartNaturally: boolean;
  canStartEarly: boolean;
};

const DATE_TIME_ZONE =
  "America/Sao_Paulo";

const DATE_APPROACHING_MS =
  24 * 60 * 60_000;

const DATE_MODE_EARLY_WINDOW_MS =
  60 * 60_000;

function rioCalendarParts(
  value: Date
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:
          DATE_TIME_ZONE,
        year:
          "numeric",
        month:
          "2-digit",
        day:
          "2-digit",
      }
    )
      .formatToParts(
        value
      );

  const read =
    (
      type:
        Intl.DateTimeFormatPartTypes
    ) =>
      Number(
        parts.find(
          (
            part
          ) =>
            part.type ===
            type
        )?.value ??
          "0"
      );

  return {
    year:
      read("year"),
    month:
      read("month"),
    day:
      read("day"),
  };
}

function rioDaySerial(
  value: Date
) {
  const parts =
    rioCalendarParts(
      value
    );

  return Math.floor(
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day
    ) /
      86_400_000
  );
}

function plannedDateLabel(
  date: DiarioItem
) {
  if (
    !date.planned_for
  ) {
    return "this Date";
  }

  const planned =
    new Date(
      date.planned_for
    );

  if (
    Number.isNaN(
      planned.getTime()
    )
  ) {
    return "this Date";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone:
        DATE_TIME_ZONE,
      month:
        "long",
      day:
        "numeric",
      year:
        "numeric",
      ...(date.data
        ?.time_known !==
      false
        ? {
            hour:
              "numeric" as const,
            minute:
              "2-digit" as const,
          }
        : {}),
    }
  ).format(
    planned
  );
}

export function getDateStartAvailability(
  date: DiarioItem,
  now = new Date()
): DateStartAvailability {
  if (
    !date.planned_for
  ) {
    return {
      phase:
        "available",
      label:
        "Date Mode available",
      detail:
        "This Date has no scheduled time, so you can start whenever you want.",
      canStartNaturally:
        true,
      canStartEarly:
        false,
    };
  }

  const planned =
    new Date(
      date.planned_for
    );

  if (
    Number.isNaN(
      planned.getTime()
    )
  ) {
    return {
      phase:
        "available",
      label:
        "Date Mode available",
      detail:
        "The planned time could not be read, so Date Mode is available.",
      canStartNaturally:
        true,
      canStartEarly:
        false,
    };
  }

  const timeKnown =
    date.data
      ?.time_known !==
    false;

  if (
    !timeKnown
  ) {
    const daysUntil =
      rioDaySerial(
        planned
      ) -
      rioDaySerial(
        now
      );

    if (
      daysUntil >
      1
    ) {
      return {
        phase:
          "upcoming",
        label:
          "Upcoming",
        detail:
          `Date Mode becomes available on ${plannedDateLabel(
            date
          )}.`,
        canStartNaturally:
          false,
        canStartEarly:
          true,
      };
    }

    if (
      daysUntil ===
      1
    ) {
      return {
        phase:
          "approaching",
        label:
          "Approaching",
        detail:
          "Tomorrow — Date Mode will be available for the whole day.",
        canStartNaturally:
          false,
        canStartEarly:
          true,
      };
    }

    return {
      phase:
        "available",
      label:
        "Date Mode available",
      detail:
        daysUntil ===
        0
          ? "It's the planned day. Date Mode is available now."
          : "The planned day has passed, so you can start now or reschedule it.",
      canStartNaturally:
        true,
      canStartEarly:
        false,
    };
  }

  const untilPlanned =
    planned.getTime() -
    now.getTime();

  if (
    untilPlanned >
    DATE_APPROACHING_MS
  ) {
    return {
      phase:
        "upcoming",
      label:
        "Upcoming",
      detail:
        `Date Mode opens one hour before ${plannedDateLabel(
          date
        )}.`,
      canStartNaturally:
        false,
      canStartEarly:
        true,
    };
  }

  if (
    untilPlanned >
    DATE_MODE_EARLY_WINDOW_MS
  ) {
    const availableAt =
      new Date(
        planned.getTime() -
          DATE_MODE_EARLY_WINDOW_MS
      );

    return {
      phase:
        "approaching",
      label:
        "Approaching",
      detail:
        `Coming up soon. Date Mode opens at ${new Intl.DateTimeFormat(
          "en-US",
          {
            timeZone:
              DATE_TIME_ZONE,
            hour:
              "numeric",
            minute:
              "2-digit",
          }
        ).format(
          availableAt
        )}.`,
      canStartNaturally:
        false,
      canStartEarly:
        true,
    };
  }

  return {
    phase:
      "available",
    label:
      "Date Mode available",
    detail:
      untilPlanned >
      0
        ? "You're within one hour of the planned time. Date Mode is available."
        : "The planned time has arrived. Date Mode is available.",
    canStartNaturally:
      true,
    canStartEarly:
      false,
  };
}

export function canNaturallyStartDate(
  date: DiarioItem,
  now = new Date()
): boolean {
  return getDateStartAvailability(
    date,
    now
  ).canStartNaturally;
}

export function naturalStartMessage(
  date: DiarioItem
): string | null {
  const availability =
    getDateStartAvailability(
      date
    );

  return availability
    .canStartNaturally
    ? null
    : availability.detail;
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

  const samePlaceName =
    Boolean(
      current.currentPlaceName &&
      current.currentPlaceName
        .trim()
        .toLocaleLowerCase("en-US") ===
        placeName
          .trim()
          .toLocaleLowerCase("en-US")
    );

  const alreadyHere =
    current.currentLocationMode === "place" &&
    (
      current.currentPlaceId === place.id ||
      samePlaceName
    );

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

function dateStartedTimestamp(
  date: DiarioItem
): number {
  const raw =
    cleanString(
      date.data
        ?.started_at
    ) ??
    date.event_at ??
    date.updated_at ??
    date.created_at;

  const value =
    raw
      ? new Date(
          raw
        ).getTime()
      : Number.NaN;

  return Number.isNaN(
    value
  )
    ? 0
    : value;
}

function dateFinishedTimestamp(
  date: DiarioItem
): number {
  const raw =
    cleanString(
      date.data
        ?.finished_at
    );

  if (
    !raw
  ) {
    return 0;
  }

  const value =
    new Date(
      raw
    ).getTime();

  return Number.isNaN(
    value
  )
    ? 0
    : value;
}

async function closeLiveDateRecord({
  userId,
  liveDate,
}: {
  userId: string;
  liveDate: DiarioItem;
}): Promise<void> {
  const current =
    readDateExperience(
      liveDate
    );

  const alreadyFinished =
    current
      .events
      .some(
        (
          entry
        ) =>
          entry.type ===
          "date_finished"
      );

  const repairedExperience:
    DateExperienceState =
      alreadyFinished
        ? current
        : {
            ...current,
            events: [
              ...current.events,
              event({
                type:
                  "date_finished",
                placeId:
                  current.currentPlaceId,
                placeName:
                  current.currentPlaceName,
              }),
            ],
          };

  const now =
    new Date()
      .toISOString();

  const startedAt =
    cleanString(
      liveDate.data
        ?.started_at
    );

  const {
    error,
  } =
    await db
      .from(
        "diario_items"
      )
      .update({
        event_at:
          liveDate.event_at ??
          startedAt ??
          now,

        data: {
          ...(
            liveDate.data ??
            {}
          ),

          flow_state:
            "past",

          finished_at:
            cleanString(
              liveDate.data
                ?.finished_at
            ) ??
            now,

          date_experience:
            repairedExperience,
        },
      })
      .eq(
        "user_id",
        userId
      )
      .eq(
        "id",
        liveDate.id
      )
      .eq(
        "kind",
        "date"
      );

  if (
    error
  ) {
    throw error;
  }
}

/**
 * Enforces the app invariant that only one Date can be live.
 * Older dangling live Dates are historical and are repaired as Past.
 */
export async function closeOtherLiveDateExperiences({
  userId,
  exceptDateId = null,
}: {
  userId: string;
  exceptDateId?: string | null;
}): Promise<void> {
  const {
    data,
    error,
  } =
    await db
      .from(
        "diario_items"
      )
      .select("*")
      .eq(
        "user_id",
        userId
      )
      .eq(
        "kind",
        "date"
      )
      .eq(
        "status",
        "active"
      )
      .contains(
        "data",
        {
          flow_state:
            "live",
        }
      );

  if (
    error
  ) {
    throw error;
  }

  const liveDates =
    (data ??
      []) as DiarioItem[];

  for (
    const liveDate of
    liveDates
  ) {
    if (
      exceptDateId &&
      liveDate.id ===
        exceptDateId
    ) {
      continue;
    }

    await closeLiveDateRecord({
      userId,
      liveDate,
    });
  }
}

/**
 * Reads the one valid live Date and also self-heals legacy data:
 * - if an older live Date predates a Date that has already finished, it is stale;
 * - if several Dates are live, only the newest valid one remains live.
 */
export async function getLiveDateExperience(
  userId: string
): Promise<DiarioItem | null> {
  const {
    data,
    error,
  } =
    await db
      .from(
        "diario_items"
      )
      .select("*")
      .eq(
        "user_id",
        userId
      )
      .eq(
        "kind",
        "date"
      )
      .eq(
        "status",
        "active"
      );

  if (
    error
  ) {
    throw error;
  }

  const dates =
    (data ??
      []) as DiarioItem[];

  const latestFinishedAt =
    dates
      .filter(
        (
          date
        ) =>
          getDateFlowState(
            date
          ) ===
          "past"
      )
      .reduce(
        (
          latest,
          date
        ) =>
          Math.max(
            latest,
            dateFinishedTimestamp(
              date
            )
          ),
        0
      );

  const liveDates =
    dates
      .filter(
        (
          date
        ) =>
          getDateFlowState(
            date
          ) ===
          "live"
      )
      .sort(
        (
          first,
          second
        ) =>
          dateStartedTimestamp(
            second
          ) -
          dateStartedTimestamp(
            first
          )
      );

  const validLive =
    liveDates.find(
      (
        date
      ) => {
        if (
          !latestFinishedAt
        ) {
          return true;
        }

        return (
          dateStartedTimestamp(
            date
          ) >
          latestFinishedAt
        );
      }
    ) ??
    null;

  for (
    const liveDate of
    liveDates
  ) {
    if (
      validLive &&
      liveDate.id ===
        validLive.id
    ) {
      continue;
    }

    await closeLiveDateRecord({
      userId,
      liveDate,
    });
  }

  return validLive;
}
