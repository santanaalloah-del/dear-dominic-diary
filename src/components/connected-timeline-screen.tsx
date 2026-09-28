import { useEffect, useMemo, useState } from "react";
import { Clock } from "lucide-react";

import { usePrivateDiario } from "@/components/private-diario";
import { ConnectedDiaryObject } from "@/components/connected-diary-object";
import { ConnectedObjectDetailScreen } from "@/components/connected-object-detail-screen";
import { getTimelineItems } from "@/lib/diario-world";
import {
  connectedKindLabel,
  connectedMoment,
  hydrateDiaryItems,
  type ConnectedDiaryView,
} from "@/lib/connected-diary";

import "./connected-diary.css";

type TimelineView = "all" | "lived" | "planned";

export function ConnectedTimelineScreen() {
  const { session } = usePrivateDiario();
  const [selectedObjectId, setSelectedObjectId] =
    useState<string | null>(null);

  const [view, setView] = useState<TimelineView>("all");
  const [items, setItems] = useState<ConnectedDiaryView[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError(null);

    void getTimelineItems(session.user.id)
      .then((loaded) => hydrateDiaryItems(loaded))
      .then((hydrated) => {
        if (active) setItems(hydrated);
      })
      .catch((nextError) => {
        console.error("Could not open connected Timeline:", nextError);
        if (active) setError("The timeline could not be opened.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [session.user.id]);

  const visible = useMemo(() => {
    const filtered = items.filter(({ item }) => {
      const planned = !item.event_at && Boolean(item.planned_for);

      if (view === "planned") return planned;
      if (view === "lived") return !planned;
      return true;
    });

    return [...filtered].sort(
      (a, b) =>
        new Date(connectedMoment(b.item)).getTime() -
        new Date(connectedMoment(a.item)).getTime()
    );
  }, [items, view]);

  if (selectedObjectId) {
    return (
      <ConnectedObjectDetailScreen
        itemId={selectedObjectId}
        onOpenRelated={setSelectedObjectId}
        onBack={() => setSelectedObjectId(null)}
      />
    );
  }

  return (
    <section className="connected-timeline-screen">
      <header className="connected-screen-intro">
        <small>THE CONTINUOUS STORY</small>
        <h1>Timeline</h1>
        <p>
          The same diary objects, arranged by when they entered your
          life instead of being recreated as timeline entries.
        </p>
      </header>

      <div className="connected-timeline-tabs" role="tablist">
        {(["all", "lived", "planned"] as TimelineView[]).map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={view === option}
            className={view === option ? "active" : ""}
            onClick={() => setView(option)}
          >
            {option[0].toUpperCase() + option.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="connected-empty">Opening Timeline…</div>
      ) : visible.length === 0 ? (
        <div className="connected-empty">
          <Clock size={25} strokeWidth={1.3} />
          <strong>The timeline begins here.</strong>
        </div>
      ) : (
        <div className="connected-timeline-stream">
          {visible.map((entry) => {
            const expanded = expandedId === entry.item.id;
            const planned =
              !entry.item.event_at && Boolean(entry.item.planned_for);

            return (
              <article
                className="connected-timeline-entry"
                key={entry.item.id}
              >
                <span className="connected-timeline-dot" />

                <time>
                  {new Intl.DateTimeFormat("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }).format(new Date(connectedMoment(entry.item)))}
                </time>

                <button
                  type="button"
                  onClick={() =>
                    setExpandedId(expanded ? null : entry.item.id)
                  }
                >
                  <small>
                    {planned
                      ? `planned · ${connectedKindLabel(entry.item.kind)}`
                      : connectedKindLabel(entry.item.kind)}
                  </small>

                  <strong>
                    {entry.item.title ??
                      (entry.item.kind === "diary"
                        ? "Diary entry"
                        : connectedKindLabel(entry.item.kind))}
                  </strong>

                  {!expanded && entry.item.body && (
                    <p>{entry.item.body}</p>
                  )}
                </button>

                {expanded && (
                  <div className="connected-timeline-expanded">
                    <ConnectedDiaryObject
                      view={entry}
                      onOpen={() =>
                        setSelectedObjectId(entry.item.id)
                      }
                    />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {error && <p className="connected-error">{error}</p>}
    </section>
  );
}
