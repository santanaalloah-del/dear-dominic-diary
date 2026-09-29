import type { DiarioItem } from "@/lib/diario-world";
import { getDateFlowState } from "@/lib/date-flow";
import { arriveAtDatePlace } from "@/lib/date-experience";
import { setDateCanonicalPlace } from "@/lib/date-place-selection";
import { notifyDateExperienceChanged } from "@/lib/date-live-events";

export function isLiveDatePlaceSelection(
  dates: DiarioItem[],
  dateId: string | null | undefined
): boolean {
  if (!dateId) return false;

  const date = dates.find((item) => item.id === dateId);
  return Boolean(date && getDateFlowState(date) === "live");
}

export async function goToPlaceDuringDate({
  userId,
  dates,
  dateId,
  place,
}: {
  userId: string;
  dates: DiarioItem[];
  dateId: string;
  place: DiarioItem;
}): Promise<{ date: DiarioItem; place: DiarioItem }> {
  const currentDate = dates.find((item) => item.id === dateId);

  if (!currentDate || getDateFlowState(currentDate) !== "live") {
    return setDateCanonicalPlace({
      userId,
      dateId,
      place,
    });
  }

  const canonical = await setDateCanonicalPlace({
    userId,
    dateId,
    place,
  });

  const arrived = await arriveAtDatePlace({
    userId,
    date: canonical.date,
    place: canonical.place,
  });

  notifyDateExperienceChanged(arrived.id);

  return {
    date: arrived,
    place: canonical.place,
  };
}
