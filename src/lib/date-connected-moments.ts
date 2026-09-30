import type {
  DiarioItem,
} from "@/lib/diario-world";

import {
  readDateExperience,
  type DateExperienceEvent,
} from "@/lib/date-experience";

import {
  readDateVenueWorld,
  type DateVenuePurchase,
} from "@/lib/date-venue-world";

import {
  formatVenuePrice,
} from "@/lib/venue-world";

export type DateConnectedMoment = {
  id: string;
  dateId: string;
  dateTitle: string;
  happenedAt: string;
  kind:
    | "experience"
    | "venue";
  title: string;
  detail: string | null;
};

function placeKey(
  event:
    DateExperienceEvent
) {
  const placeName =
    event.placeName
      ?.trim()
      .toLocaleLowerCase(
        "en-US"
      ) ??
    "";

  if (
    placeName
  ) {
    return `name:${placeName}`;
  }

  return event.placeId
    ? `id:${event.placeId}`
    : null;
}

function withoutRepeatedArrivals(
  events:
    DateExperienceEvent[]
) {
  const result:
    DateExperienceEvent[] =
    [];

  let activeArrival:
    string | null =
    null;

  for (
    const event of
    events
  ) {
    if (
      event.type ===
      "arrived"
    ) {
      const key =
        placeKey(
          event
        );

      if (
        key &&
        activeArrival ===
          key
      ) {
        continue;
      }

      activeArrival =
        key;

      result.push(
        event
      );

      continue;
    }

    if (
      event.type ===
        "left_place" ||
      event.type ===
        "walking"
    ) {
      activeArrival =
        null;
    }

    result.push(
      event
    );
  }

  return result;
}

function experienceCopy(
  event:
    DateExperienceEvent
) {
  if (
    event.type ===
    "date_started"
  ) {
    return {
      title:
        "Date started",
      detail:
        event.placeName
          ? `Started at ${event.placeName}`
          : "You two are together.",
    };
  }

  if (
    event.type ===
    "arrived"
  ) {
    return {
      title:
        event.placeName
          ? `Arrived at ${event.placeName}`
          : "Arrived",
      detail:
        null,
    };
  }

  if (
    event.type ===
    "left_place"
  ) {
    return {
      title:
        event.placeName
          ? `Left ${event.placeName}`
          : "Left the last place",
      detail:
        "The Date kept going.",
    };
  }

  if (
    event.type ===
    "walking"
  ) {
    return {
      title:
        "Walking together",
      detail:
        event.note ||
        "Between places.",
    };
  }

  return {
    title:
      "Date finished",
    detail:
      event.placeName
        ? `Finished at ${event.placeName}`
        : null,
  };
}

function venueCopy(
  purchase:
    DateVenuePurchase
) {
  const actor =
    purchase.actor ===
    "dominic"
      ? "Dominic"
      : "You";

  const verb =
    purchase.action ===
    "ordered"
      ? "ordered"
      : "bought";

  const price =
    formatVenuePrice(
      purchase.priceUsdCents
    );

  return {
    title:
      `${actor} ${verb} ${purchase.itemName}`,

    detail:
      [
        purchase.placeName,
        price,
      ]
        .filter(
          Boolean
        )
        .join(
          " · "
        ) ||
      null,
  };
}

export function getDateConnectedMoments(
  date:
    DiarioItem
): DateConnectedMoment[] {
  if (
    date.kind !==
    "date"
  ) {
    return [];
  }

  const dateTitle =
    date.title ??
    "Date";

  const experience =
    readDateExperience(
      date
    );

  const venueWorld =
    readDateVenueWorld(
      date
    );

  const experienceMoments =
    withoutRepeatedArrivals(
      experience.events
    ).map(
      (
        event
      ): DateConnectedMoment => {
        const copy =
          experienceCopy(
            event
          );

        return {
          id:
            `date-event:${date.id}:${event.id}`,
          dateId:
            date.id,
          dateTitle,
          happenedAt:
            event.happenedAt,
          kind:
            "experience",
          title:
            copy.title,
          detail:
            copy.detail,
        };
      }
    );

  const venueMoments =
    venueWorld
      .purchases
      .map(
        (
          purchase
        ): DateConnectedMoment => {
          const copy =
            venueCopy(
              purchase
            );

          return {
            id:
              `date-venue:${date.id}:${purchase.id}`,
            dateId:
              date.id,
            dateTitle,
            happenedAt:
              purchase.happenedAt,
            kind:
              "venue",
            title:
              copy.title,
            detail:
              copy.detail,
          };
        }
      );

  return [
    ...experienceMoments,
    ...venueMoments,
  ].sort(
    (
      first,
      second
    ) =>
      new Date(
        first.happenedAt
      ).getTime() -
      new Date(
        second.happenedAt
      ).getTime()
  );
}

export function collectDateConnectedMoments(
  dates:
    DiarioItem[]
): DateConnectedMoment[] {
  return dates
    .flatMap(
      getDateConnectedMoments
    )
    .sort(
      (
        first,
        second
      ) =>
        new Date(
          first.happenedAt
        ).getTime() -
        new Date(
          second.happenedAt
        ).getTime()
    );
}
