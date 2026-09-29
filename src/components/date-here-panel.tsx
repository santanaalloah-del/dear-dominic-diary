import { MapPin, Navigation } from "lucide-react";
import type { DiarioItem } from "@/lib/diario-world";
import { readDateExperience } from "@/lib/date-experience";
import { DateMovementControls } from "@/components/date-movement-controls";
import { DateVenueWorldPanel } from "@/components/date-venue-world-panel";
import "./date-here-panel.css";

export function DateHerePanel({
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
  const placeName =
    experience.currentPlaceName ||
    (typeof date.data?.place === "string" ? date.data.place : null);

  return (
    <section className="date-here-panel" data-date-here>
      <header className="date-here-head">
        <span className="date-here-icon" aria-hidden="true">
          {walking ? <Navigation size={18} /> : <MapPin size={18} />}
        </span>

        <div>
          <small>{walking ? "BETWEEN PLACES" : "HERE"}</small>
          <h2>{walking ? "Walking together" : placeName || "Together"}</h2>
          <p>
            {walking
              ? "The Date is still happening. Find somewhere nearby when you feel like stopping."
              : "This is where the Date is happening right now."}
          </p>
        </div>
      </header>

      <DateMovementControls
        userId={userId}
        date={date}
        saving={saving}
        onDateUpdated={onDateUpdated}
        onExploreNearby={onExploreNearby}
      />

      {!walking && (
        <div className="date-here-world">
          <div className="date-here-world-label">
            <small>THINGS HERE</small>
            <strong>What we can do, order or buy</strong>
          </div>

          <DateVenueWorldPanel
            userId={userId}
            date={date}
            onDateUpdated={onDateUpdated}
          />
        </div>
      )}
    </section>
  );
}
