import { Footprints, MapPin } from "lucide-react";
import type { DiarioItem } from "@/lib/diario-world";
import {
  leaveCurrentDatePlace,
  readDateExperience,
} from "@/lib/date-experience";

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
  onDateUpdated: (date: DiarioItem) => void;
  onExploreNearby: (date: DiarioItem) => void;
}) {
  const experience = readDateExperience(date);
  const walking = experience.currentLocationMode === "walking";

  async function leave() {
    try {
      const updated = await leaveCurrentDatePlace({
        userId,
        date,
      });

      onDateUpdated(updated);
    } catch (error) {
      console.error("Could not leave current Date place:", error);
    }
  }

  return (
    <section className="date-movement-controls" aria-label="Date movement">
      <div className="date-movement-status">
        <small>{walking ? "BETWEEN PLACES" : "HERE NOW"}</small>
        <strong>
          {walking
            ? "Walking together"
            : experience.currentPlaceName ||
              (typeof date.data?.place === "string"
                ? date.data.place
                : "Together")}
        </strong>
      </div>

      <div className="date-movement-actions">
        {!walking && (
          <button
            type="button"
            className="date-flow-secondary"
            disabled={saving}
            onClick={() => void leave()}
          >
            <Footprints size={14} />
            Leave
          </button>
        )}

        <button
          type="button"
          className={walking ? "date-flow-primary" : "date-flow-secondary"}
          disabled={saving}
          onClick={() => onExploreNearby(date)}
        >
          <MapPin size={14} />
          Explore nearby
        </button>
      </div>

      {walking && (
        <p className="date-movement-note">
          The Date is still happening. You’re just between places.
        </p>
      )}
    </section>
  );
}
