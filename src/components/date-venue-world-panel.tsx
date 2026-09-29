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
  type DateVenueActor,
} from "@/lib/date-venue-world";

import {
  formatVenuePrice,
  readVenueWorldCatalog,
  type VenueWorldCatalog,
  type VenueWorldItem,
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

type PickedItem = {
  item: VenueWorldItem;

  actor: DateVenueActor;

  note: string | null;
};

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

function actionButtonLabel(
  item: VenueWorldItem,
  actor: DateVenueActor
) {
  const action =
    venueItemAction(
      item
    );

  if (
    actor ===
    "dominic"
  ) {
    return action ===
      "ordered"
      ? "He ordered it"
      : "He bought it";
  }

  return action ===
    "ordered"
    ? "Order"
    : "Buy";
}

function DateVenuePickCard({
  userId,
  date,
  place,
  catalog,
  picked,
  savingKey,
  onSaving,
  onDateUpdated,
  onError,
}: {
  userId: string;

  date: DiarioItem;

  place: DiarioItem;

  catalog: VenueWorldCatalog;

  picked: PickedItem;

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
  const {
    item,
    actor,
    note,
  } =
    picked;

  const purchase =
    findDateVenuePurchase({
      date,

      placeId:
        place.id,

      itemId:
        item.id,

      actor,
    });

  const key =
    `${actor}:${item.id}`;

  const busy =
    savingKey !==
    null;

  async function record() {
    onSaving(
      key
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

          actor,
        });

      onDateUpdated(
        updated
      );
    } catch (
      saveError
    ) {
      console.error(
        "Could not record Date venue item:",
        saveError
      );

      onError(
        actor ===
          "dominic"
          ? "Dominic's choice could not be recorded."
          : "That order or purchase could not be recorded."
      );
    } finally {
      onSaving(
        null
      );
    }
  }

  async function undo() {
    if (
      !purchase
    ) {
      return;
    }

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
      className={`date-venue-pick ${
        actor ===
        "dominic"
          ? "dominic"
          : "alloah"
      } ${
        purchase
          ? "recorded"
          : ""
      }`}
    >
      <div className="date-venue-pick-main">
        <div className="date-venue-pick-title">
          {actor ===
          "dominic" ? (
            <UserRound
              size={15}
            />
          ) : (
            <ShoppingBag
              size={15}
            />
          )}

          <div>
            <small>
              {actor ===
              "dominic"
                ? "Dominic's pick"
                : "Your pick"}
            </small>

            <strong>
              {item.name}
            </strong>
          </div>
        </div>

        {item.description && (
          <p>
            {item.description}
          </p>
        )}

        {note && (
          <blockquote>
            “{note}”
          </blockquote>
        )}

        <div className="date-venue-pick-meta">
          {formatVenuePrice(
            item.priceUsdCents
          ) && (
            <span>
              {formatVenuePrice(
                item.priceUsdCents
              )}
            </span>
          )}

          <span>
            {item.section}
          </span>
        </div>
      </div>

      {purchase ? (
        <div className="date-venue-recorded-action">
          <span>
            <Check
              size={14}
            />

            {dateVenueActionLabel(
              purchase
            )}
          </span>

          <button
            type="button"
            disabled={
              busy
            }
            onClick={() =>
              void undo()
            }
          >
            {savingKey ===
            key ? (
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
            void record()
          }
        >
          {savingKey ===
          key ? (
            <LoaderCircle
              className="spin"
              size={15}
            />
          ) : (
            actionButtonLabel(
              item,
              actor
            )
          )}
        </button>
      )}
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

  const picks =
    useMemo<
      PickedItem[]
    >(() => {
      if (
        !catalog
      ) {
        return [];
      }

      const result:
        PickedItem[] =
        [];

      for (
        const itemId of
        catalog.alloahPickIds
      ) {
        const item =
          catalog.items.find(
            (
              candidate
            ) =>
              candidate.id ===
              itemId
          );

        if (
          item
        ) {
          result.push({
            item,

            actor:
              "alloah",

            note:
              null,
          });
        }
      }

      for (
        const dominicPick of
        catalog.dominicPicks
      ) {
        const item =
          catalog.items.find(
            (
              candidate
            ) =>
              candidate.id ===
              dominicPick.itemId
          );

        if (
          item
        ) {
          result.push({
            item,

            actor:
              "dominic",

            note:
              dominicPick.note,
          });
        }
      }

      return result;
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

          Opening our picks…
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

        <p className="date-venue-world-empty">
          Nothing has been picked here yet. Open this Place first to explore its menu, shop or little things.
        </p>

        {error && (
          <p className="date-venue-world-error">
            {error}
          </p>
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

        <ShoppingBag
          size={18}
        />
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

      {picks.length >
      0 ? (
        <div className="date-venue-picks">
          {picks.map(
            (
              picked
            ) => (
              <DateVenuePickCard
                key={`${picked.actor}:${picked.item.id}`}
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
                picked={
                  picked
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
      ) : (
        <p className="date-venue-world-empty">
          Neither of you has picked anything here yet.
        </p>
      )}
    </section>
  );
}
