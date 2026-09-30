import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Calendar as CalendarIcon,
  Footprints,
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
  getCalendarItems,
  getDates,
  type DiarioItem,
} from "@/lib/diario-world";

import {
  collectDateConnectedMoments,
  type DateConnectedMoment,
} from "@/lib/date-connected-moments";

import {
  getMemoryConnectionMap,
  hydrateDiaryItems,
  type ConnectedDiaryView,
  type MemoryConnectionMap,
} from "@/lib/connected-diary";

import "./connected-diary.css";
import "./date-connected-moments.css";

function dateKey(
  date: Date
) {
  const y =
    date.getFullYear();

  const m =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const d =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${y}-${m}-${d}`;
}

function itemDateKey(
  item: DiarioItem
) {
  const value =
    item.event_at ??
    item.planned_for;

  return value
    ? dateKey(
        new Date(value)
      )
    : null;
}

function momentDateKey(
  moment:
    DateConnectedMoment
) {
  const value =
    new Date(
      moment.happenedAt
    );

  return Number.isNaN(
    value.getTime()
  )
    ? null
    : dateKey(
        value
      );
}

function momentTime(
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
    return "";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      hour:
        "numeric",
      minute:
        "2-digit",
    }
  ).format(
    date
  );
}

export function ConnectedCalendarScreen() {
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

  const today =
    new Date();

  const [
    viewDate,
    setViewDate,
  ] =
    useState(
      () =>
        new Date(
          today.getFullYear(),
          today.getMonth(),
          1
        )
    );

  const [
    selectedDate,
    setSelectedDate,
  ] =
    useState(
      () =>
        new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate()
        )
    );

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
    dateConnectionMap,
    setDateConnectionMap,
  ] =
    useState<
      MemoryConnectionMap
    >({});

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

  const year =
    viewDate.getFullYear();

  const month =
    viewDate.getMonth();

  useEffect(() => {
    let active =
      true;

    const monthStart =
      new Date(
        year,
        month,
        1
      );

    const nextMonthStart =
      new Date(
        year,
        month + 1,
        1
      );

    setLoading(
      true
    );

    setError(
      null
    );

    void Promise.all([
      getCalendarItems({
        userId:
          session.user.id,

        start:
          monthStart.toISOString(),

        end:
          nextMonthStart.toISOString(),
      }),

      getDates(
        session.user.id
      ),
    ])
      .then(
        async ([
          loaded,
          allDates,
        ]) => {
          const hydrated =
            await hydrateDiaryItems(
              loaded
            );

          const dateIds =
            hydrated
              .filter(
                (
                  view
                ) =>
                  view.item.kind ===
                  "date"
              )
              .map(
                (
                  view
                ) =>
                  view.item.id
              );

          const connections =
            await getMemoryConnectionMap({
              userId:
                session.user.id,

              memoryIds:
                dateIds,
            });

          const startMs =
            monthStart.getTime();

          const endMs =
            nextMonthStart.getTime();

          const moments =
            collectDateConnectedMoments(
              allDates
            ).filter(
              (
                moment
              ) => {
                const value =
                  new Date(
                    moment.happenedAt
                  ).getTime();

                return (
                  !Number.isNaN(
                    value
                  ) &&
                  value >=
                    startMs &&
                  value <
                    endMs
                );
              }
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

          setDateConnectionMap(
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
            "Could not open connected Calendar:",
            nextError
          );

          if (
            active
          ) {
            setError(
              "The calendar could not be opened."
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
    year,
    month,
    refreshKey,
  ]);

  const firstWeekday =
    new Date(
      year,
      month,
      1
    ).getDay();

  const daysInMonth =
    new Date(
      year,
      month + 1,
      0
    ).getDate();

  const cells =
    Array.from(
      {
        length:
          42,
      },
      (
        _,
        index
      ) => {
        const day =
          index -
          firstWeekday +
          1;

        return (
          day >=
            1 &&
          day <=
            daysInMonth
        )
          ? new Date(
              year,
              month,
              day
            )
          : null;
      }
    );

  const itemsByDay =
    useMemo(
      () => {
        const buckets =
          new Map<
            string,
            Map<
              string,
              ConnectedDiaryView
            >
          >();

        const addToDay =
          (
            key:
              string,
            view:
              ConnectedDiaryView
          ) => {
            const bucket =
              buckets.get(
                key
              ) ??
              new Map<
                string,
                ConnectedDiaryView
              >();

            bucket.set(
              view.item.id,
              view
            );

            buckets.set(
              key,
              bucket
            );
          };

        for (
          const view of
          items
        ) {
          const key =
            itemDateKey(
              view.item
            );

          if (
            !key
          ) {
            continue;
          }

          addToDay(
            key,
            view
          );

          if (
            view.item.kind ===
            "date"
          ) {
            const connected =
              dateConnectionMap[
                view.item.id
              ] ??
              [];

            for (
              const child of
              connected
            ) {
              addToDay(
                key,
                child
              );
            }
          }
        }

        return Object.fromEntries(
          Array.from(
            buckets.entries()
          ).map(
            ([
              key,
              bucket,
            ]) => [
              key,
              Array.from(
                bucket.values()
              ),
            ]
          )
        ) as Record<
          string,
          ConnectedDiaryView[]
        >;
      },
      [
        items,
        dateConnectionMap,
      ]
    );

  const momentsByDay =
    useMemo(
      () => {
        const buckets =
          new Map<
            string,
            DateConnectedMoment[]
          >();

        for (
          const moment of
          dateMoments
        ) {
          const key =
            momentDateKey(
              moment
            );

          if (
            !key
          ) {
            continue;
          }

          buckets.set(
            key,
            [
              ...(
                buckets.get(
                  key
                ) ??
                []
              ),
              moment,
            ]
          );
        }

        return Object.fromEntries(
          buckets.entries()
        ) as Record<
          string,
          DateConnectedMoment[]
        >;
      },
      [
        dateMoments,
      ]
    );

  const selectedKey =
    dateKey(
      selectedDate
    );

  const selectedItems =
    useMemo(
      () =>
        itemsByDay[
          selectedKey
        ] ??
        [],
      [
        itemsByDay,
        selectedKey,
      ]
    );

  const selectedMoments =
    useMemo(
      () =>
        momentsByDay[
          selectedKey
        ] ??
        [],
      [
        momentsByDay,
        selectedKey,
      ]
    );

  const monthLabel =
    new Intl.DateTimeFormat(
      "en-US",
      {
        month:
          "long",
        year:
          "numeric",
      }
    ).format(
      viewDate
    );

  const selectedLabel =
    new Intl.DateTimeFormat(
      "en-US",
      {
        weekday:
          "long",
        month:
          "long",
        day:
          "numeric",
      }
    ).format(
      selectedDate
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
    <section className="connected-calendar-screen">
      <header className="connected-screen-intro">
        <small>
          WHAT HAPPENED · WHAT IS PLANNED
        </small>

        <h1>
          Calendar
        </h1>

        <p>
          Each day opens the real
          objects that belong to it.
          Date moments are read
          directly from the original
          Date instead of being
          duplicated.
        </p>
      </header>

      <section className="connected-calendar-month">
        <header>
          <button
            type="button"
            onClick={() => {
              const next =
                new Date(
                  year,
                  month -
                    1,
                  1
                );

              setViewDate(
                next
              );

              setSelectedDate(
                next
              );
            }}
          >
            ‹
          </button>

          <strong>
            {monthLabel}
          </strong>

          <button
            type="button"
            onClick={() => {
              const next =
                new Date(
                  year,
                  month +
                    1,
                  1
                );

              setViewDate(
                next
              );

              setSelectedDate(
                next
              );
            }}
          >
            ›
          </button>
        </header>

        <div className="connected-calendar-weekdays">
          {[
            "S",
            "M",
            "T",
            "W",
            "T",
            "F",
            "S",
          ].map(
            (
              label,
              index
            ) => (
              <span
                key={`${label}-${index}`}
              >
                {label}
              </span>
            )
          )}
        </div>

        <div className="connected-calendar-grid">
          {cells.map(
            (
              date,
              index
            ) => {
              if (
                !date
              ) {
                return (
                  <span
                    key={`empty-${index}`}
                  />
                );
              }

              const key =
                dateKey(
                  date
                );

              const dayItems =
                itemsByDay[
                  key
                ] ??
                [];

              const dayMoments =
                momentsByDay[
                  key
                ] ??
                [];

              const count =
                dayItems.length +
                dayMoments.length;

              const selected =
                key ===
                selectedKey;

              const current =
                key ===
                dateKey(
                  today
                );

              return (
                <button
                  key={
                    key
                  }
                  type="button"
                  className={[
                    selected
                      ? "selected"
                      : "",
                    current
                      ? "today"
                      : "",
                    count
                      ? "has-items"
                      : "",
                  ]
                    .filter(
                      Boolean
                    )
                    .join(
                      " "
                    )}
                  onClick={() =>
                    setSelectedDate(
                      date
                    )
                  }
                >
                  <span>
                    {date.getDate()}
                  </span>

                  {count >
                    0 && (
                    <i
                      aria-label={`${count} moments and objects`}
                    >
                      {Math.min(
                        count,
                        9
                      )}
                    </i>
                  )}
                </button>
              );
            }
          )}
        </div>
      </section>

      <section className="connected-calendar-day">
        <header>
          <small>
            SELECTED DAY
          </small>

          <strong>
            {selectedLabel}
          </strong>
        </header>

        {loading ? (
          <div className="connected-empty">
            Opening day…
          </div>
        ) : (
          selectedItems.length ===
            0 &&
          selectedMoments.length ===
            0
        ) ? (
          <div className="connected-empty">
            <CalendarIcon
              size={
                22
              }
              strokeWidth={
                1.3
              }
            />

            <strong>
              Nothing belongs to this day yet.
            </strong>
          </div>
        ) : (
          <>
            {selectedItems.length >
              0 && (
              <div className="connected-day-objects">
                {selectedItems.map(
                  (
                    view
                  ) => (
                    <ConnectedDiaryObject
                      key={
                        view.item.id
                      }
                      view={
                        view
                      }
                      onOpen={() =>
                        setSelectedObjectId(
                          view.item.id
                        )
                      }
                    />
                  )
                )}
              </div>
            )}

            {selectedMoments.length >
              0 && (
              <section className="date-calendar-moments">
                <header>
                  <Footprints
                    size={
                      15
                    }
                  />

                  <div>
                    <small>
                      FROM DATES
                    </small>

                    <strong>
                      What happened that day
                    </strong>
                  </div>
                </header>

                <div>
                  {selectedMoments.map(
                    (
                      moment
                    ) => (
                      <button
                        key={
                          moment.id
                        }
                        type="button"
                        className="date-connected-moment-card"
                        onClick={() =>
                          setSelectedObjectId(
                            moment.dateId
                          )
                        }
                      >
                        <span className="date-connected-moment-time">
                          {momentTime(
                            moment.happenedAt
                          )}
                        </span>

                        <span className="date-connected-moment-copy">
                          <small>
                            {moment.dateTitle}
                          </small>

                          <strong>
                            {moment.title}
                          </strong>

                          {moment.detail && (
                            <em>
                              {moment.detail}
                            </em>
                          )}
                        </span>
                      </button>
                    )
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </section>

      {error && (
        <p className="connected-error">
          {error}
        </p>
      )}
    </section>
  );
}
