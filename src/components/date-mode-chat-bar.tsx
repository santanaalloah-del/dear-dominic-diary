import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, Footprints, MapPin, Navigation } from "lucide-react";
import type { DiarioItem } from "@/lib/diario-world";
import {
  beginDateExperience,
  getLiveDateExperience,
  readDateExperience,
} from "@/lib/date-experience";
import "./date-mode-chat-bar.css";

export const DATE_EXPERIENCE_CHANGED_EVENT =
  "diario:date-experience-changed";

export function notifyDateExperienceChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(DATE_EXPERIENCE_CHANGED_EVENT));
}

export function DateModeChatBar({
  userId,
  onOpenDate,
  onOpenHere,
  onExploreNearby,
}: {
  userId: string;
  onOpenDate?: (date: DiarioItem) => void;
  onOpenHere?: (date: DiarioItem) => void;
  onExploreNearby?: (date: DiarioItem) => void;
}) {
  const [date, setDate] = useState<DiarioItem | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const live = await getLiveDateExperience(userId);

      if (!live) {
        setDate(null);
        return;
      }

      const experience = readDateExperience(live);
      const hasStarted = experience.events.some(
        (entry) => entry.type === "date_started"
      );

      const ready = hasStarted
        ? live
        : await beginDateExperience({
            userId,
            date: live,
          });

      setDate(ready);
    } catch (error) {
      console.error("Could not load Date Mode in chat:", error);
      setDate(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();

    const onFocus = () => void refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const onDateChanged = () => void refresh();

    window.addEventListener("focus", onFocus);
    window.addEventListener(DATE_EXPERIENCE_CHANGED_EVENT, onDateChanged);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(DATE_EXPERIENCE_CHANGED_EVENT, onDateChanged);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  const experience = useMemo(
    () => (date ? readDateExperience(date) : null),
    [date]
  );

  if (loading || !date || !experience) return null;

  const walking = experience.currentLocationMode === "walking";
  const location = walking
    ? "Walking"
    : experience.currentPlaceName ||
      (typeof date.data?.place === "string" ? date.data.place : null) ||
      "Together";

  const lastEvent = experience.events.at(-1) ?? null;
  const contextLine =
    lastEvent?.type === "arrived"
      ? `Arrived at ${lastEvent.placeName ?? location}`
      : lastEvent?.type === "left_place"
        ? `Left ${lastEvent.placeName ?? "the last place"}`
        : walking
          ? "Between places"
          : "Here together";

  return (
    <section className="date-mode-chat-bar" aria-label="Active Date Mode">
      <button
        type="button"
        className="date-mode-chat-main"
        onClick={() => onOpenDate?.(date)}
      >
        <span className="date-mode-chat-icon" aria-hidden="true">
          {walking ? <Navigation /> : <MapPin />}
        </span>

        <span className="date-mode-chat-copy">
          <small>DATE MODE · IN PROGRESS</small>
          <strong>{location}</strong>
          <em>{contextLine} · {date.title ?? "Our Date"}</em>
        </span>

        <ChevronRight className="date-mode-chat-chevron" />
      </button>

      <div className="date-mode-chat-actions">
        <button
          type="button"
          className="date-mode-chat-here"
          onClick={() =>
            walking ? onExploreNearby?.(date) : onOpenHere?.(date)
          }
        >
          {walking ? (
            <>
              <Footprints size={14} />
              Explore nearby
            </>
          ) : (
            "Here"
          )}
        </button>

        {!walking && (
          <button
            type="button"
            className="date-mode-chat-explore"
            onClick={() => onExploreNearby?.(date)}
          >
            Explore
          </button>
        )}
      </div>
    </section>
  );
}
