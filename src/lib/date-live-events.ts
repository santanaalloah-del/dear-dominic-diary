export const DATE_EXPERIENCE_CHANGED_EVENT =
  "diario:date-experience-changed";

export const DATE_VENUE_ACTION_CHANGED_EVENT =
  "diario:date-venue-action-changed";

export function notifyDateExperienceChanged(dateId?: string) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(DATE_EXPERIENCE_CHANGED_EVENT, {
      detail: { dateId: dateId ?? null },
    })
  );
}

export function notifyDateVenueActionChanged(dateId?: string) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(DATE_VENUE_ACTION_CHANGED_EVENT, {
      detail: { dateId: dateId ?? null },
    })
  );
}
