import {
  CheckCircle2,
  Footprints,
  MapPin,
  Play,
  ShoppingBag,
} from "lucide-react";

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
  getDateFlowState,
} from "@/lib/date-flow";

import {
  formatVenuePrice,
} from "@/lib/venue-world";

import "./date-history-panel.css";

type DateHistoryEntry =
  | {
      id: string;
      kind: "experience";
      happenedAt: string;
      event: DateExperienceEvent;
    }
  | {
      id: string;
      kind: "venue";
      happenedAt: string;
      purchase: DateVenuePurchase;
    };

function formatHistoryTime(
  value: string
) {
  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return new Intl
    .DateTimeFormat(
      "en-US",
      {
        timeZone:
          "America/Sao_Paulo",
        hour:
          "numeric",
        minute:
          "2-digit",
      }
    )
    .format(
      date
    );
}

function placeKey(
  event:
    DateExperienceEvent
) {
  return (
    event.placeId ||
    event.placeName ||
    null
  );
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
      icon:
        Play,
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
      icon:
        MapPin,
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
      icon:
        Footprints,
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
      icon:
        Footprints,
      title:
        "Walking together",
      detail:
        event.note ||
        "Between places.",
    };
  }

  return {
    icon:
      CheckCircle2,
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
        ),
  };
}

export function DateHistoryPanel({
  date,
}: {
  date: DiarioItem;
}) {
  const experience =
    readDateExperience(
      date
    );

  const venueWorld =
    readDateVenueWorld(
      date
    );

  const experienceEvents =
    withoutRepeatedArrivals(
      experience.events
    );

  const entries:
    DateHistoryEntry[] = [
      ...experienceEvents
        .map(
          (
            event
          ) => ({
            id:
              `experience:${event.id}`,
            kind:
              "experience" as const,
            happenedAt:
              event.happenedAt,
            event,
          })
        ),

      ...venueWorld
        .purchases
        .map(
          (
            purchase
          ) => ({
            id:
              `venue:${purchase.id}`,
            kind:
              "venue" as const,
            happenedAt:
              purchase.happenedAt,
            purchase,
          })
        ),
    ]
      .sort(
        (
          a,
          b
        ) =>
          new Date(
            a.happenedAt
          ).getTime() -
          new Date(
            b.happenedAt
          ).getTime()
      );

  if (
    entries.length ===
    0
  ) {
    return null;
  }

  const past =
    getDateFlowState(
      date
    ) === "past";

  return (
    <section
      className="date-history-panel"
      aria-label={
        past
          ? "Date story"
          : "Date so far"
      }
    >
      <header className="date-history-head">
        <div>
          <small>
            {past
              ? "DATE STORY"
              : "DATE SO FAR"}
          </small>

          <strong>
            Our trail
          </strong>
        </div>

        <span>
          {entries.length}
          {" "}
          {entries.length ===
          1
            ? "moment"
            : "moments"}
        </span>
      </header>

      <div className="date-history-timeline">
        {entries.map(
          (
            entry,
            index
          ) => {
            if (
              entry.kind ===
              "venue"
            ) {
              const copy =
                venueCopy(
                  entry.purchase
                );

              return (
                <article
                  key={
                    entry.id
                  }
                  className="date-history-entry venue"
                >
                  <div className="date-history-rail">
                    <span className="date-history-dot">
                      <ShoppingBag
                        size={14}
                      />
                    </span>

                    {index <
                      entries.length -
                        1 && (
                      <span className="date-history-line" />
                    )}
                  </div>

                  <div className="date-history-copy">
                    <div className="date-history-entry-top">
                      <strong>
                        {copy.title}
                      </strong>

                      <time>
                        {formatHistoryTime(
                          entry.happenedAt
                        )}
                      </time>
                    </div>

                    {copy.detail && (
                      <p>
                        {copy.detail}
                      </p>
                    )}
                  </div>
                </article>
              );
            }

            const copy =
              experienceCopy(
                entry.event
              );

            const Icon =
              copy.icon;

            return (
              <article
                key={
                  entry.id
                }
                className={`date-history-entry ${entry.event.type}`}
              >
                <div className="date-history-rail">
                  <span className="date-history-dot">
                    <Icon
                      size={14}
                    />
                  </span>

                  {index <
                    entries.length -
                      1 && (
                    <span className="date-history-line" />
                  )}
                </div>

                <div className="date-history-copy">
                  <div className="date-history-entry-top">
                    <strong>
                      {copy.title}
                    </strong>

                    <time>
                      {formatHistoryTime(
                        entry.happenedAt
                      )}
                    </time>
                  </div>

                  {copy.detail && (
                    <p>
                      {copy.detail}
                    </p>
                  )}
                </div>
              </article>
            );
          }
        )}
      </div>
    </section>
  );
}
