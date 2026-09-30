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

import {
  beginDatePlaceSelection,
} from "@/lib/date-place-selection";

import {
  DateModeChatBar,
} from "@/components/date-mode-chat-bar";

const HERE_DATE_KEY =
  "diario-date-mode-here-v1";

const OPEN_DATE_KEY =
  "diario-open-date-id-v1";

export function DateModeChatBridge({
  userId,
  onOpenDates,
  onOpenPlaces,
}: {
  userId: string;

  onOpenDates:
    () => void;

  onOpenPlaces:
    () => void;
}) {
  const openHere =
    (
      date:
        DiarioItem
    ) => {
      window
        .localStorage
        .setItem(
          HERE_DATE_KEY,
          date.id
        );

      window
        .localStorage
        .setItem(
          OPEN_DATE_KEY,
          date.id
        );

      onOpenDates();
    };

  const nextStop =
    async (
      date:
        DiarioItem
    ) => {
      try {
        const experience =
          readDateExperience(
            date
          );

        let workingDate =
          date;

        if (
          experience
            .currentLocationMode !==
          "walking"
        ) {
          workingDate =
            await leaveCurrentDatePlace({
              userId,
              date,
            });

          notifyDateExperienceChanged(
            workingDate.id
          );
        }

        beginDatePlaceSelection(
          workingDate
        );

        onOpenPlaces();
      } catch (
        error
      ) {
        console.error(
          "Could not open the next Date stop:",
          error
        );
      }
    };

  return (
    <DateModeChatBar
      userId={
        userId
      }
      onOpenHere={
        openHere
      }
      onNextStop={(
        date
      ) =>
        void nextStop(
          date
        )
      }
    />
  );
}
