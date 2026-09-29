import type { DiarioItem } from "@/lib/diario-world";
import { DateModeChatBar } from "@/components/date-mode-chat-bar";

const HERE_DATE_KEY = "diario-date-mode-here-v1";
const OPEN_DATE_KEY = "diario-open-date-id-v1";

export function DateModeChatBridge({
  userId,
  onOpenDates,
}: {
  userId: string;
  onOpenDates: () => void;
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

  return (
    <DateModeChatBar
      userId={userId}
      onOpenDate={openDate}
      onOpenHere={openHere}
    />
  );
}
