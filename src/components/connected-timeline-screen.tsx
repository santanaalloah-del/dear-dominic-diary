import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Clock,
} from "lucide-react";

import {
  usePrivateDiario,
} from "@/components/private-diario";

import {
  ConnectedDiaryObject,
} from "@/components/connected-diary-object";

import {
  ConnectedObjectDetailScreen,
} from "@/components/connected-object-detail-screen";

import {
  getTimelineItems,
} from "@/lib/diario-world";

import {
  collectDateConnectedMoments,
  type DateConnectedMoment,
} from "@/lib/date-connected-moments";

import {
  connectedKindLabel,
  connectedMoment,
  getMemoryConnectionMap,
  hydrateDiaryItems,
  type ConnectedDiaryView,
  type MemoryConnectionMap,
} from "@/lib/connected-diary";

import "./connected-diary.css";
import "./date-connected-moments.css";

type TimelineView =
  | "all"
  | "lived"
  | "planned";

type TimelineEntry =
  | {
      kind:
        "object";
      key:
        string;
      happenedAt:
        string;
      view:
        ConnectedDiaryView;
    }
  | {
      kind:
        "date_moment";
      key:
        string;
      happenedAt:
        string;
      moment:
        DateConnectedMoment;
    };

function timelineDateLabel(
  value: string
) {
  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month:
        "short",
      day:
        "numeric",
      year:
        "numeric",
      hour:
        "numeric",
      minute:
        "2-digit",
    }
  ).format(
    date
  );
}

export function ConnectedTimelineScreen() {
  const {
    session,
  } =
    usePrivateDiario();

  const [
    selectedObjectId,
    setSelectedObjectId,
  ] =
    useState<
      string | null
    >(null);

  const [
    refreshKey,
    setRefreshKey,
  ] =
    useState(0);

  const [
    view,
    setView,
  ] =
    useState<
      TimelineView
    >("all");

  const [
    items,
    setItems,
  ] =
    useState<
      ConnectedDiaryView[]
    >([]);

  const [
    dateMoments,
    setDateMoments,
  ] =
    useState<
      DateConnectedMoment[]
    >([]);

  const [
    connectionMap,
    setConnectionMap,
  ] =
    useState<
      MemoryConnectionMap
    >({});

  const [
    expandedId,
    setExpandedId,
  ] =
    useState<
      string | null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  useEffect(() => {
    let active =
      true;

    setLoading(
      true
    );

    setError(
      null
    );

    void getTimelineItems(
      session.user.id
    )
      .then(
        async (
          loaded
        ) => {
          const hydrated =
            await hydrateDiaryItems(
              loaded
            );

          const containerIds =
            hydrated
              .filter(
                (
                  entry
                ) =>
                  entry.item.kind ===
                    "date" ||
                  entry.item.kind ===
                    "story_memory"
              )
              .map(
                (
                  entry
                ) =>
                  entry.item.id
              );

          const connections =
            await getMemoryConnectionMap({
              userId:
                session.user.id,

              memoryIds:
                containerIds,
            });

          const moments =
            collectDateConnectedMoments(
              loaded.filter(
                (
                  item
                ) =>
                  item.kind ===
                  "date"
              )
            );

          return {
            hydrated,
            connections,
            moments,
          };
        }
      )
      .then(
        ({
          hydrated,
          connections,
          moments,
        }) => {
          if (
            !active
          ) {
            return;
          }

          setItems(
            hydrated
          );

          setConnectionMap(
            connections
          );

          setDateMoments(
            moments
          );
        }
      )
      .catch(
        (
          nextError
        ) => {
          console.error(
            "Could not open connected Timeline:",
            nextError
          );

          if (
            active
          ) {
            setError(
              "The timeline could not be opened."
            );
          }
        }
      )
      .finally(
        () => {
          if (
            active
          ) {
            setLoading(
              false
            );
          }
        }
      );

    return () => {
      active =
        false;
    };
  }, [
    session.user.id,
    refreshKey,
  ]);

  const visible =
    useMemo(
      (): TimelineEntry[] => {
        const dateIdsWithMoments =
          new Set(
            dateMoments.map(
              (
                moment
              ) =>
                moment.dateId
            )
          );

        const objectEntries =
          items
            .filter(
              ({
                item,
              }) => {
                const planned =
                  !item.event_at &&
                  Boolean(
                    item.planned_for
                  );

                if (
                  view ===
                  "planned"
                ) {
                  return planned;
                }

                if (
                  view ===
                  "lived" &&
                  planned
                ) {
                  return false;
                }

                if (
                  item.kind ===
                    "date" &&
                  !planned &&
                  dateIdsWithMoments.has(
                    item.id
                  )
                ) {
                  return false;
                }

                return true;
              }
            )
            .map(
              (
                entry
              ): TimelineEntry => ({
                kind:
                  "object",
                key:
                  `object:${entry.item.id}`,
                happenedAt:
                  connectedMoment(
                    entry.item
                  ),
                view:
                  entry,
              })
            );

        const momentEntries =
          view ===
          "planned"
            ? []
            : dateMoments.map(
                (
                  moment
                ): TimelineEntry => ({
                  kind:
                    "date_moment",
                  key:
                    moment.id,
                  happenedAt:
                    moment.happenedAt,
                  moment,
                })
              );

        return [
          ...objectEntries,
          ...momentEntries,
        ].sort(
          (
            first,
            second
          ) =>
            new Date(
              second.happenedAt
            ).getTime() -
            new Date(
              first.happenedAt
            ).getTime()
        );
      },
      [
        items,
        dateMoments,
        view,
      ]
    );

  if (
    selectedObjectId
  ) {
    return (
      <ConnectedObjectDetailScreen
        itemId={
          selectedObjectId
        }
        onOpenRelated={
          setSelectedObjectId
        }
        onBack={() => {
          setSelectedObjectId(
            null
          );

          setRefreshKey(
            (
              current
            ) =>
              current +
              1
          );
        }}
      />
    );
  }

  return (
    <section className="connected-timeline-screen">
      <header className="connected-screen-intro">
        <small>
          THE CONTINUOUS STORY
        </small>

        <h1>
          Timeline
        </h1>

        <p>
          Original objects stay
          original. A Date can unfold
          here as real moments read
          from that same Date record.
        </p>
      </header>

      <div
        className="connected-timeline-tabs"
        role="tablist"
      >
        {(
          [
            "all",
            "lived",
            "planned",
          ] as TimelineView[]
        ).map(
          (
            option
          ) => (
            <button
              key={
                option
              }
              type="button"
              role="tab"
              aria-selected={
                view ===
                option
              }
              className={
                view ===
                option
                  ? "active"
                  : ""
              }
              onClick={() =>
                setView(
                  option
                )
              }
            >
              {option[0].toUpperCase() +
                option.slice(
                  1
                )}
            </button>
          )
        )}
      </div>

      {loading ? (
        <div className="connected-empty">
          Opening Timeline…
        </div>
      ) : visible.length ===
        0 ? (
        <div className="connected-empty">
          <Clock
            size={
              25
            }
            strokeWidth={
              1.3
            }
          />

          <strong>
            The timeline begins here.
          </strong>
        </div>
      ) : (
        <div className="connected-timeline-stream">
          {visible.map(
            (
              entry
            ) => {
              if (
                entry.kind ===
                "date_moment"
              ) {
                return (
                  <article
                    className="connected-timeline-entry date-moment"
                    key={
                      entry.key
                    }
                  >
                    <span className="connected-timeline-dot" />

                    <time>
                      {timelineDateLabel(
                        entry.happenedAt
                      )}
                    </time>

                    <button
                      type="button"
                      className="date-timeline-moment-button"
                      onClick={() =>
                        setSelectedObjectId(
                          entry.moment.dateId
                        )
                      }
                    >
                      <small>
                        Date · {entry.moment.dateTitle}
                      </small>

                      <strong>
                        {entry.moment.title}
                      </strong>

                      {entry.moment.detail && (
                        <p>
                          {entry.moment.detail}
                        </p>
                      )}
                    </button>
                  </article>
                );
              }

              const object =
                entry.view;

              const expanded =
                expandedId ===
                object.item.id;

              const planned =
                !object
                  .item
                  .event_at &&
                Boolean(
                  object
                    .item
                    .planned_for
                );

              const contained =
                connectionMap[
                  object.item.id
                ] ??
                [];

              return (
                <article
                  className="connected-timeline-entry"
                  key={
                    entry.key
                  }
                >
                  <span className="connected-timeline-dot" />

                  <time>
                    {new Intl.DateTimeFormat(
                      "en-US",
                      {
                        month:
                          "short",
                        day:
                          "numeric",
                        year:
                          "numeric",
                      }
                    ).format(
                      new Date(
                        connectedMoment(
                          object.item
                        )
                      )
                    )}
                  </time>

                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId(
                        expanded
                          ? null
                          : object
                              .item
                              .id
                      )
                    }
                  >
                    <small>
                      {planned
                        ? `planned · ${connectedKindLabel(
                            object
                              .item
                              .kind
                          )}`
                        : connectedKindLabel(
                            object
                              .item
                              .kind
                          )}
                    </small>

                    <strong>
                      {object.item
                        .title ??
                        (
                          object
                            .item
                            .kind ===
                          "diary"
                            ? "Diary entry"
                            : connectedKindLabel(
                                object
                                  .item
                                  .kind
                              )
                        )}
                    </strong>

                    {!expanded &&
                      object.item
                        .body && (
                        <p>
                          {
                            object
                              .item
                              .body
                          }
                        </p>
                      )}

                    {contained.length >
                      0 && (
                      <small>
                        {
                          contained.length
                        } connected{" "}
                        {contained.length ===
                        1
                          ? "object"
                          : "objects"}
                      </small>
                    )}
                  </button>

                  {expanded && (
                    <div className="connected-timeline-expanded">
                      <ConnectedDiaryObject
                        view={
                          object
                        }
                        onOpen={() =>
                          setSelectedObjectId(
                            object
                              .item
                              .id
                          )
                        }
                      />

                      {contained.map(
                        (
                          child
                        ) => (
                          <ConnectedDiaryObject
                            key={
                              child
                                .item
                                .id
                            }
                            view={
                              child
                            }
                            onOpen={() =>
                              setSelectedObjectId(
                                child
                                  .item
                                  .id
                              )
                            }
                          />
                        )
                      )}
                    </div>
                  )}
                </article>
              );
            }
          )}
        </div>
      )}

      {error && (
        <p className="connected-error">
          {error}
        </p>
      )}
    </section>
  );
}
