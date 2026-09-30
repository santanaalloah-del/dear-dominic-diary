import {
  Check,
  LoaderCircle,
  ShoppingBag,
  Sparkles,
  UserRound,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  supabase,
} from "@/integrations/supabase/client";

import type {
  DiarioItem,
} from "@/lib/diario-world";

import {
  dateVenueActionLabel,
  findDateVenuePurchase,
  recordDateVenuePurchase,
  removeDateVenuePurchase,
  venueItemAction,
  type DateVenuePurchase,
} from "@/lib/date-venue-world";

import {
  notifyDateVenueActionChanged,
} from "@/lib/date-live-events";

import {
  discoveredPlaceFromPersisted,
} from "@/lib/nyc-place-discovery";

import {
  formatVenuePrice,
  localInspiredVenueCatalog,
  persistVenueWorldCatalog,
  readVenueWorldCatalog,
  venueWorldPlaceContext,
  type VenueWorldCatalog,
  type VenueWorldItem,
  type VenueWorldPlaceContext,
} from "@/lib/venue-world";

import "./date-venue-world-panel.css";

const db =
  supabase as any;

type DateVenueWorldPanelProps = {
  userId: string;

  date: DiarioItem;

  onDateUpdated: (
    date: DiarioItem
  ) => void;
};

type VenueFilter =
  | "all"
  | "picks"
  | string;

function sourceTierLabel(
  tier:
    VenueWorldCatalog["sourceTier"]
) {
  if (
    tier ===
    "real_live"
  ) {
    return "Real · Live";
  }

  if (
    tier ===
    "real_reference"
  ) {
    return "Real · Reference";
  }

  return "Inspired · In-world";
}

async function loadDatePlace({
  userId,
  date,
}: {
  userId: string;

  date: DiarioItem;
}): Promise<DiarioItem | null> {
  const directPlaceId =
    typeof date.data
      ?.place_id ===
      "string"
      ? date.data
          .place_id
          .trim()
      : "";

  if (
    directPlaceId
  ) {
    const {
      data,
      error,
    } =
      await db
        .from(
          "diario_items"
        )
        .select("*")
        .eq(
          "user_id",
          userId
        )
        .eq(
          "id",
          directPlaceId
        )
        .eq(
          "kind",
          "place"
        )
        .eq(
          "status",
          "active"
        )
        .maybeSingle();

    if (
      error
    ) {
      throw error;
    }

    if (
      data
    ) {
      return data as DiarioItem;
    }
  }

  const {
    data: links,
    error:
      linkError,
  } =
    await db
      .from(
        "diario_links"
      )
      .select(
        "target_item_id"
      )
      .eq(
        "user_id",
        userId
      )
      .eq(
        "source_item_id",
        date.id
      )
      .eq(
        "relation",
        "at_place"
      )
      .limit(1);

  if (
    linkError
  ) {
    throw linkError;
  }

  const placeId =
    links?.[0]
      ?.target_item_id;

  if (
    !placeId
  ) {
    return null;
  }

  const {
    data,
    error,
  } =
    await db
      .from(
        "diario_items"
      )
      .select("*")
      .eq(
        "user_id",
        userId
      )
      .eq(
        "id",
        placeId
      )
      .eq(
        "kind",
        "place"
      )
      .eq(
        "status",
        "active"
      )
      .maybeSingle();

  if (
    error
  ) {
    throw error;
  }

  return data
    ? data as DiarioItem
    : null;
}

function persistedPlaceContext(
  place: DiarioItem
): VenueWorldPlaceContext {
  const discovered =
    discoveredPlaceFromPersisted(
      place
    );

  if (
    discovered
  ) {
    return venueWorldPlaceContext({
      place:
        discovered,
    });
  }

  const categories =
    Array.isArray(
      place.data
        ?.categories
    )
      ? place.data.categories.filter(
          (
            value: unknown
          ): value is string =>
            typeof value ===
            "string"
        )
      : [];

  const stringValue =
    (
      value: unknown
    ) =>
      typeof value ===
        "string" &&
      value.trim()
        ? value.trim()
        : null;

  return {
    name:
      place.title ||
      "This place",

    placeType:
      stringValue(
        place.data
          ?.placeType
      ) ||
      "place",

    neighborhood:
      stringValue(
        place.data
          ?.neighborhood
      ),

    address:
      stringValue(
        place.data
          ?.address
      ),

    categories,

    cuisine:
      stringValue(
        place.data
          ?.cuisine
      ),

    description:
      stringValue(
        place.data
          ?.description
      ),
  };
}

function actionButtonLabel(
  item: VenueWorldItem
) {
  return venueItemAction(
    item
  ) === "ordered"
    ? "Order"
    : "Buy";
}

function groupItems(
  items: VenueWorldItem[]
) {
  const grouped =
    new Map<
      string,
      VenueWorldItem[]
    >();

  for (
    const item of
    items
  ) {
    const current =
      grouped.get(
        item.section
      ) ?? [];

    current.push(
      item
    );

    grouped.set(
      item.section,
      current
    );
  }

  return Array.from(
    grouped.entries()
  );
}

function DateVenueItemCard({
  userId,
  date,
  place,
  catalog,
  item,
  savingKey,
  onSaving,
  onDateUpdated,
  onError,
}: {
  userId: string;

  date: DiarioItem;

  place: DiarioItem;

  catalog: VenueWorldCatalog;

  item: VenueWorldItem;

  savingKey: string | null;

  onSaving: (
    value: string | null
  ) => void;

  onDateUpdated: (
    date: DiarioItem
  ) => void;

  onError: (
    value: string | null
  ) => void;
}) {
  const myPurchase =
    findDateVenuePurchase({
      date,

      placeId:
        place.id,

      itemId:
        item.id,

      actor:
        "alloah",
    });

  const dominicPurchase =
    findDateVenuePurchase({
      date,

      placeId:
        place.id,

      itemId:
        item.id,

      actor:
        "dominic",
    });

  const myPick =
    catalog
      .alloahPickIds
      .includes(
        item.id
      );

  const dominicPick =
    catalog
      .dominicPicks
      .find(
        (
          pick
        ) =>
          pick.itemId ===
          item.id
      ) ??
    null;

  const myKey =
    `alloah:${item.id}`;

  const busy =
    savingKey !==
    null;

  async function recordMine() {
    onSaving(
      myKey
    );

    onError(
      null
    );

    try {
      const updated =
        await recordDateVenuePurchase({
          userId,

          date,

          place,

          catalog,

          item,

          actor:
            "alloah",
        });

      onDateUpdated(
        updated
      );

      notifyDateVenueActionChanged(
        updated.id
      );
    } catch (
      saveError
    ) {
      console.error(
        "Could not record Date venue item:",
        saveError
      );

      onError(
        "That order or purchase could not be recorded."
      );
    } finally {
      onSaving(
        null
      );
    }
  }

  async function undo(
    purchase:
      DateVenuePurchase,
    key:
      string
  ) {
    onSaving(
      key
    );

    onError(
      null
    );

    try {
      const updated =
        await removeDateVenuePurchase({
          userId,

          date,

          purchaseId:
            purchase.id,
        });

      onDateUpdated(
        updated
      );

      notifyDateVenueActionChanged(
        updated.id
      );
    } catch (
      removeError
    ) {
      console.error(
        "Could not remove Date venue item:",
        removeError
      );

      onError(
        "That Date action could not be undone."
      );
    } finally {
      onSaving(
        null
      );
    }
  }

  return (
    <article
      className={`date-venue-item ${
        dominicPick
          ? "dominic-pick"
          : ""
      } ${
        myPurchase ||
        dominicPurchase
          ? "recorded"
          : ""
      }`}
    >
      <div className="date-venue-item-main">
        <div className="date-venue-item-top">
          <div>
            <strong>
              {item.name}
            </strong>

            <small>
              {item.section}
            </small>
          </div>

          {formatVenuePrice(
            item.priceUsdCents
          ) && (
            <span className="date-venue-item-price">
              {formatVenuePrice(
                item.priceUsdCents
              )}
            </span>
          )}
        </div>

        {item.description && (
          <p>
            {item.description}
          </p>
        )}

        {(myPick ||
          dominicPick) && (
          <div className="date-venue-item-picks">
            {myPick && (
              <span>
                <ShoppingBag
                  size={12}
                />

                Your pick
              </span>
            )}

            {dominicPick && (
              <span className="dominic">
                <UserRound
                  size={12}
                />

                Dominic picked
              </span>
            )}
          </div>
        )}

        {dominicPick
          ?.note && (
          <blockquote>
            “
            {dominicPick.note}
            ”
          </blockquote>
        )}
      </div>

      <div className="date-venue-item-actions">
        {myPurchase ? (
          <div className="date-venue-recorded-action">
            <span>
              <Check
                size={14}
              />

              {dateVenueActionLabel(
                myPurchase
              )}
            </span>

            <button
              type="button"
              disabled={
                busy
              }
              onClick={() =>
                void undo(
                  myPurchase,
                  myKey
                )
              }
            >
              {savingKey ===
              myKey ? (
                <LoaderCircle
                  className="spin"
                  size={14}
                />
              ) : (
                "Undo"
              )}
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="date-venue-record-button"
            disabled={
              busy
            }
            onClick={() =>
              void recordMine()
            }
          >
            {savingKey ===
            myKey ? (
              <LoaderCircle
                className="spin"
                size={15}
              />
            ) : (
              actionButtonLabel(
                item
              )
            )}
          </button>
        )}

        {dominicPurchase && (
          <div className="date-venue-recorded-action dominic">
            <span>
              <Check
                size={14}
              />

              {dateVenueActionLabel(
                dominicPurchase
              )}
            </span>

            <button
              type="button"
              disabled={
                busy
              }
              onClick={() =>
                void undo(
                  dominicPurchase,
                  `dominic:${item.id}`
                )
              }
            >
              {savingKey ===
              `dominic:${item.id}` ? (
                <LoaderCircle
                  className="spin"
                  size={14}
                />
              ) : (
                "Undo"
              )}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

export function DateVenueWorldPanel({
  userId,
  date,
  onDateUpdated,
}: DateVenueWorldPanelProps) {
  const [
    place,
    setPlace,
  ] =
    useState<DiarioItem | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  const [
    savingKey,
    setSavingKey,
  ] =
    useState<string | null>(
      null
    );

  const [
    activeFilter,
    setActiveFilter,
  ] =
    useState<VenueFilter>(
      "all"
    );

  const [
    buildingCatalog,
    setBuildingCatalog,
  ] =
    useState(false);

  const [
    buildRetry,
    setBuildRetry,
  ] =
    useState(0);

  const attemptedCatalogPlaceId =
    useRef<string | null>(
      null
    );

  useEffect(() => {
    let active =
      true;

    async function load() {
      setLoading(
        true
      );

      setError(
        null
      );

      try {
        const loadedPlace =
          await loadDatePlace({
            userId,
            date,
          });

        if (
          active
        ) {
          setPlace(
            loadedPlace
          );

          setActiveFilter(
            "all"
          );
        }
      } catch (
        loadError
      ) {
        console.error(
          "Could not load Date Place for Venue World:",
          loadError
        );

        if (
          active
        ) {
          setPlace(
            null
          );

          setError(
            "The place connected to this Date could not be opened."
          );
        }
      } finally {
        if (
          active
        ) {
          setLoading(
            false
          );
        }
      }
    }

    void load();

    return () => {
      active =
        false;
    };
  }, [
    userId,
    date.id,
    date.data
      ?.place_id,
  ]);

  const catalog =
    useMemo(
      () =>
        readVenueWorldCatalog(
          place
        ),
      [
        place,
      ]
    );

  useEffect(() => {
    if (
      !place ||
      catalog ||
      attemptedCatalogPlaceId.current ===
        place.id
    ) {
      return;
    }

    let active =
      true;

    attemptedCatalogPlaceId.current =
      place.id;

    async function buildCatalog() {
      setBuildingCatalog(
        true
      );

      setError(
        null
      );

      const context =
        persistedPlaceContext(
          place!
        );

      try {
        let nextCatalog:
          VenueWorldCatalog;

        try {
          const {
            data:
              authData,
            error:
              authError,
          } =
            await supabase
              .auth
              .getSession();

          if (
            authError ||
            !authData
              .session
              ?.access_token
          ) {
            throw new Error(
              "No active session for Venue World."
            );
          }

          const response =
            await fetch(
              "/api/venue-world",
              {
                method:
                  "POST",

                headers: {
                  "Content-Type":
                    "application/json",

                  Authorization:
                    `Bearer ${authData.session.access_token}`,
                },

                body:
                  JSON.stringify({
                    userId,
                    place:
                      context,
                  }),
              }
            );

          if (
            !response.ok
          ) {
            const payload =
              await response
                .json()
                .catch(
                  () => null
                );

            throw new Error(
              payload?.error ||
                "Could not build Things Here."
            );
          }

          const payload =
            (await response.json()) as {
              catalog?:
                VenueWorldCatalog;
            };

          if (
            !payload.catalog
              ?.items
              ?.length
          ) {
            throw new Error(
              "Things Here came back empty."
            );
          }

          nextCatalog =
            payload.catalog;
        } catch (
          remoteError
        ) {
          console.warn(
            "Could not build remote Venue World. Using the local inspired catalog:",
            remoteError
          );

          nextCatalog =
            localInspiredVenueCatalog(
              context
            );
        }

        const updatedPlace =
          await persistVenueWorldCatalog({
            userId,

            place:
              place!,

            catalog:
              nextCatalog,
          });

        if (
          active
        ) {
          setPlace(
            updatedPlace
          );

          setActiveFilter(
            "all"
          );
        }
      } catch (
        buildError
      ) {
        console.error(
          "Could not build Things Here from the live Date:",
          buildError
        );

        if (
          active
        ) {
          setError(
            "Things Here could not be built right now."
          );
        }
      } finally {
        if (
          active
        ) {
          setBuildingCatalog(
            false
          );
        }
      }
    }

    void buildCatalog();

    return () => {
      active =
        false;
    };
  }, [
    place?.id,
    catalog,
    userId,
    buildRetry,
  ]);

  const sections =
    useMemo(
      () =>
        catalog
          ? Array.from(
              new Set(
                catalog.items.map(
                  (
                    item
                  ) =>
                    item.section
                )
              )
            )
          : [],
      [
        catalog,
      ]
    );

  const visibleItems =
    useMemo(() => {
      if (
        !catalog
      ) {
        return [];
      }

      if (
        activeFilter ===
        "all"
      ) {
        return catalog.items;
      }

      if (
        activeFilter ===
        "picks"
      ) {
        const dominicIds =
          new Set(
            catalog
              .dominicPicks
              .map(
                (
                  pick
                ) =>
                  pick.itemId
              )
          );

        return catalog
          .items
          .filter(
            (
              item
            ) =>
              catalog
                .alloahPickIds
                .includes(
                  item.id
                ) ||
              dominicIds.has(
                item.id
              )
          );
      }

      return catalog
        .items
        .filter(
          (
            item
          ) =>
            item.section ===
            activeFilter
        );
    }, [
      activeFilter,
      catalog,
    ]);

  const groupedItems =
    useMemo(
      () =>
        groupItems(
          visibleItems
        ),
      [
        visibleItems,
      ]
    );

  const pickCount =
    useMemo(() => {
      if (
        !catalog
      ) {
        return 0;
      }

      return new Set([
        ...catalog
          .alloahPickIds,

        ...catalog
          .dominicPicks
          .map(
            (
              pick
            ) =>
              pick.itemId
          ),
      ]).size;
    }, [
      catalog,
    ]);

  if (
    loading
  ) {
    return (
      <section className="date-venue-world-panel">
        <div className="date-venue-world-loading">
          <LoaderCircle
            className="spin"
            size={16}
          />

          Opening what's here…
        </div>
      </section>
    );
  }

  if (
    !place
  ) {
    return null;
  }

  if (
    !catalog
  ) {
    return (
      <section className="date-venue-world-panel">
        <header className="date-venue-world-head">
          <div>
            <small>
              While we're here
            </small>

            <strong>
              {place.title}
            </strong>
          </div>

          <ShoppingBag
            size={18}
          />
        </header>

        {buildingCatalog ||
        !error ? (
          <div className="date-venue-world-loading">
            <LoaderCircle
              className="spin"
              size={16}
            />

            Looking around…
          </div>
        ) : (
          <>
            <p className="date-venue-world-error">
              {error}
            </p>

            <button
              type="button"
              className="date-venue-record-button"
              onClick={() => {
                attemptedCatalogPlaceId.current =
                  null;

                setBuildRetry(
                  (
                    current
                  ) =>
                    current +
                    1
                );
              }}
            >
              Try again
            </button>
          </>
        )}
      </section>
    );
  }

  return (
    <section className="date-venue-world-panel">
      <header className="date-venue-world-head">
        <div>
          <small>
            While we're here
          </small>

          <strong>
            {place.title}
          </strong>
        </div>

        <span className="date-venue-world-count">
          {catalog.items.length}
          {" "}
          things
        </span>
      </header>

      <div className="date-venue-world-source">
        <span>
          <Sparkles
            size={13}
          />

          {sourceTierLabel(
            catalog.sourceTier
          )}
        </span>

        <small>
          {catalog.sourceLabel}
        </small>
      </div>

      {catalog.sourceTier ===
        "in_world" && (
        <p className="date-venue-world-truth">
          Simulated in-world choices inspired by this real place — not a claim about its current menu, stock or prices.
        </p>
      )}

      {error && (
        <p className="date-venue-world-error">
          {error}
        </p>
      )}

      <div
        className="date-venue-filters"
        aria-label="Filter things here"
      >
        <button
          type="button"
          className={
            activeFilter ===
            "all"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveFilter(
              "all"
            )
          }
        >
          All
        </button>

        {pickCount >
          0 && (
          <button
            type="button"
            className={
              activeFilter ===
              "picks"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveFilter(
                "picks"
              )
            }
          >
            Our picks
          </button>
        )}

        {sections.map(
          (
            section
          ) => (
            <button
              key={
                section
              }
              type="button"
              className={
                activeFilter ===
                section
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveFilter(
                  section
                )
              }
            >
              {section}
            </button>
          )
        )}
      </div>

      {groupedItems.length >
      0 ? (
        <div className="date-venue-sections">
          {groupedItems.map(
            ([
              section,
              items,
            ]) => (
              <section
                key={
                  section
                }
                className="date-venue-section"
              >
                <header>
                  <strong>
                    {section}
                  </strong>

                  <small>
                    {items.length}
                  </small>
                </header>

                <div className="date-venue-items">
                  {items.map(
                    (
                      item
                    ) => (
                      <DateVenueItemCard
                        key={
                          item.id
                        }
                        userId={
                          userId
                        }
                        date={
                          date
                        }
                        place={
                          place
                        }
                        catalog={
                          catalog
                        }
                        item={
                          item
                        }
                        savingKey={
                          savingKey
                        }
                        onSaving={
                          setSavingKey
                        }
                        onDateUpdated={
                          onDateUpdated
                        }
                        onError={
                          setError
                        }
                      />
                    )
                  )}
                </div>
              </section>
            )
          )}
        </div>
      ) : (
        <p className="date-venue-world-empty">
          Nothing matches this filter.
        </p>
      )}
    </section>
  );
}
