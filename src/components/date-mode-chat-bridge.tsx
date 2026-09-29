import type { DiarioItem } from "@/lib/diario-world";
import { DateModeChatBar } from "@/components/date-mode-chat-bar";
import { beginDatePlaceSelection } from "@/lib/date-place-selection";

const HERE_DATE_KEY = "diario-date-mode-here-v1";
const OPEN_DATE_KEY = "diario-open-date-id-v1";

export function DateModeChatBridge({
  userId,
  onOpenDates,
  onOpenPlaces,
}: {
  userId: string;
  onOpenDates: () => void;
  onOpenPlaces: () => void;
}) {
  const openDate = (date: DiarioItem) => {
    window.localStorage.setItem(OPEN_DATE_KEY, date.id);
    onOpenDates();
  };

  const openHere = (date: DiarioItem) => {
    window.localStorage.setItem(HERE_DATE_KEY, date.id);
    window.localStorage.setItem(OPEN_DATE_KEY, date.id);
    onOpenDates();
  };

  const exploreNearby = (date: DiarioItem) => {
    beginDatePlaceSelection(date);
    onOpenPlaces();
  };

  return (
    <DateModeChatBar
      userId={userId}
      onOpenDate={openDate}
      onOpenHere={openHere}
      onExploreNearby={exploreNearby}
    />
  );
}
