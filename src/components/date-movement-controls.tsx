import {
  useState,
} from "react";
import {
  Footprints,
  MapPin,
} from "lucide-react";

import type {
  DiarioItem,
} from "@/lib/diario-world";

import {
  leaveCurrentDatePlace,
  readDateExperience,
} from "@/lib/date-experience";

import {
  notifyDateExperienceChanged,
} from "@/lib/date-live-events";

export function DateMovementControls({
  userId,
  date,
  saving,
  onDateUpdated,
  onExploreNearby,
}: {
  userId: string;

  date: DiarioItem;

  saving?: boolean;

  onDateUpdated: (
    date: DiarioItem
  ) => void;

  onExploreNearby: (
    date: DiarioItem
  ) => void;
}) {
  const [
    moving,
    setMoving,
  ] =
    useState(false);

  const experience =
    readDateExperience(
      date
    );

  const walking =
    experience
      .currentLocationMode ===
    "walking";

  const busy =
    Boolean(
      saving ||
      moving
    );

  async function leaveOnly() {
    if (
      busy ||
      walking
    ) {
      return;
    }

    setMoving(
      true
    );

    try {
      const updated =
        await leaveCurrentDatePlace({
          userId,
          date,
        });

      onDateUpdated(
        updated
      );

      notifyDateExperienceChanged(
        updated.id
      );
    } catch (
      error
    ) {
      console.error(
        "Could not leave current Date place:",
        error
      );
    } finally {
      setMoving(
        false
      );
    }
  }

  async function nextStop() {
    if (
      busy
    ) {
      return;
    }

    setMoving(
      true
    );

    try {
      let workingDate =
        date;

      if (
        !walking
      ) {
        workingDate =
          await leaveCurrentDatePlace({
            userId,
            date,
          });

        onDateUpdated(
          workingDate
        );

        notifyDateExperienceChanged(
          workingDate.id
        );
      }

      onExploreNearby(
        workingDate
      );
    } catch (
      error
    ) {
      console.error(
        "Could not open the next Date stop:",
        error
      );
    } finally {
      setMoving(
        false
      );
    }
  }

  return (
    <section
      className="date-movement-controls"
      aria-label="Date movement"
    >
      <div className="date-movement-status">
        <small>
          {walking
            ? "BETWEEN PLACES"
            : "HERE NOW"}
        </small>

        <strong>
          {walking
            ? "Walking together"
            : experience
                .currentPlaceName ||
              (
                typeof date
                  .data
                  ?.place ===
                "string"
                  ? date
                      .data
                      .place
                  : "Together"
              )}
        </strong>
      </div>

      <div className="date-movement-actions">
        {!walking && (
          <button
            type="button"
            className="date-flow-secondary"
            disabled={
              busy
            }
            onClick={() =>
              void leaveOnly()
            }
          >
            <Footprints
              size={14}
            />

            Just walk
          </button>
        )}

        <button
          type="button"
          className="date-flow-primary"
          disabled={
            busy
          }
          onClick={() =>
            void nextStop()
          }
        >
          <MapPin
            size={14}
          />

          {walking
            ? "Find a place"
            : "Next stop"}
        </button>
      </div>

      <p className="date-movement-note">
        {walking
          ? "The Date is still happening. Pick somewhere when you feel like stopping."
          : "Next stop keeps this same Date going and moves you into walking while you choose where to go."}
      </p>
    </section>
  );
}
