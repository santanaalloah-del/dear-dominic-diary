import { useEffect } from "react";
import type { DiarioItem } from "@/lib/diario-world";

export const DATE_MODE_HERE_KEY = "diario-date-mode-here-v1";
export const OPEN_DATE_KEY = "diario-open-date-id-v1";

export function consumeDateModeEntry(
  dates: DiarioItem[],
  selectDate: (id: string) => void,
  openHere: () => void
) {
  if (typeof window === "undefined" || dates.length === 0) return false;

  const dateId = window.localStorage.getItem(OPEN_DATE_KEY);
  if (!dateId) return false;

  const exists = dates.some((date) => date.id === dateId);
  if (!exists) return false;

  const wantsHere =
    window.localStorage.getItem(DATE_MODE_HERE_KEY) === dateId;

  window.localStorage.removeItem(OPEN_DATE_KEY);
  window.localStorage.removeItem(DATE_MODE_HERE_KEY);

  selectDate(dateId);

  if (wantsHere) {
    window.requestAnimationFrame(openHere);
    window.setTimeout(openHere, 180);
  }

  return true;
}

export function useDateModeEntry({
  dates,
  onSelectDate,
}: {
  dates: DiarioItem[];
  onSelectDate: (id: string) => void;
}) {
  useEffect(() => {
    consumeDateModeEntry(
      dates,
      onSelectDate,
      () => {
        document
          .querySelector<HTMLElement>("[data-date-here]")
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
      }
    );
  }, [dates, onSelectDate]);
}
