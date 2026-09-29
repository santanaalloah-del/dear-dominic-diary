import {
  LoaderCircle,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  UserRound,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type { DiarioItem } from "@/lib/diario-world";
import type { DiscoveredPlace } from "@/lib/nyc-place-discovery";
import type { GeoapifyPlaceDetails } from "@/lib/geoapify-place-details";
import {
  formatVenuePrice,
  localInspiredVenueCatalog,
  persistVenueWorldCatalog,
  readVenueWorldCatalog,
  setVenueWorldAlloahPick,
  venueWorldPlaceContext,
  type VenueWorldCatalog,
  type VenueWorldItem,
} from "@/lib/venue-world";

import "./venue-content-panel.css";

type VenueContentPanelProps = {
  userId: string;
  accessToken: string;
  place: DiscoveredPlace;
  canonicalPlace: DiarioItem | null;
  placeDetails: GeoapifyPlaceDetails | null;
  officialWebsite: string | null;
  ensureCanonicalPlace: () => Promise<DiarioItem>;
  onPlaceUpdated: (place: DiarioItem) => void;
};

function groupBySection(items: VenueWorldItem[]) {
  const grouped = new Map<string, VenueWorldItem[]>();

  for (const item of items) {
    const existing = grouped.get(item.section) ?? [];
    grouped.set(item.section, [...existing, item]);
  }

  return Array.from(grouped.entries());
}

export function VenueContentPanel({
  userId,
  accessToken,
  place,
  canonicalPlace,
  placeDetails,
  officialWebsite,
  ensureCanonicalPlace,
  onPlaceUpdated,
}: VenueContentPanelProps) {
  const [catalog, setCatalog] = useState<VenueWorldCatalog | null>(
    () => readVenueWorldCatalog(canonicalPlace)
  );
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingPick, setSavingPick] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const persisted = readVenueWorldCatalog(canonicalPlace);

    if (persisted) {
      setCatalog(persisted);
    }
  }, [canonicalPlace?.id, canonicalPlace?.updated_at]);

  useEffect(() => {
    setOpen(false);
    setError(null);

    const persisted = readVenueWorldCatalog(canonicalPlace);
    setCatalog(persisted);
  }, [place.placeId]);

  const sections = useMemo(
    () => (catalog ? groupBySection(catalog.items) : []),
    [catalog]
  );

  const dominicItem = useMemo(() => {
    if (!catalog?.dominicPick) return null;

    return (
      catalog.items.find(
        (item) => item.id === catalog.dominicPick?.itemId
      ) ?? null
    );
  }, [catalog]);

  const context = () =>
    venueWorldPlaceContext({
      place,
      cuisine: placeDetails?.cuisine ?? null,
      description: placeDetails?.description ?? null,
    });

  const saveIfCanonical = async (nextCatalog: VenueWorldCatalog) => {
    if (!canonicalPlace) return;

    const updated = await persistVenueWorldCatalog({
      userId,
      place: canonicalPlace,
      catalog: nextCatalog,
    });

    onPlaceUpdated(updated);
  };

  const generate = async () => {
    setOpen(true);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/venue-world", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          userId,
          place: context(),
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Could not build this in-world selection.");
      }

      const payload = (await response.json()) as {
        catalog?: VenueWorldCatalog;
      };

      if (!payload.catalog?.items?.length) {
        throw new Error("The in-world selection came back empty.");
      }

      setCatalog(payload.catalog);
      await saveIfCanonical(payload.catalog);
    } catch (generationError) {
      console.error("Could not generate venue world:", generationError);

      const fallback = localInspiredVenueCatalog(context());
      setCatalog(fallback);
      await saveIfCanonical(fallback).catch(() => undefined);

      setError(
        "Dominic's personal pick could not load, so a local inspired selection is showing instead."
      );
    } finally {
      setLoading(false);
    }
  };

  const chooseForAlloah = async (item: VenueWorldItem) => {
    if (!catalog) return;

    setSavingPick(item.id);
    setError(null);

    try {
      const canonical = canonicalPlace ?? (await ensureCanonicalPlace());
      const nextPick = catalog.alloahPickId === item.id ? null : item.id;

      const updated = await setVenueWorldAlloahPick({
        userId,
        place: canonical,
        catalog,
        itemId: nextPick,
      });

      onPlaceUpdated(updated);
      setCatalog({
        ...catalog,
        alloahPickId: nextPick,
      });
    } catch (pickError) {
      console.error("Could not save venue pick:", pickError);
      setError("That pick could not be saved.");
    } finally {
      setSavingPick(null);
    }
  };

  return (
    <section className="venue-world-panel">
      <header className="venue-world-panel-head">
        <div>
          <small>Menu · shop · little things</small>
          <strong>What could happen here?</strong>
        </div>

        <ShoppingBag size={18} />
      </header>

      {!open && !catalog && (
        <button
          type="button"
          className="venue-world-open"
          onClick={() => void generate()}
        >
          <Sparkles size={16} />
          Explore menu & things
        </button>
      )}

      {catalog && !open && (
        <button
          type="button"
          className="venue-world-open"
          onClick={() => setOpen(true)}
        >
          <ShoppingBag size={16} />
          Open our picks here
        </button>
      )}

      {open && (
        <div className="venue-world-body">
          <div className="venue-world-source-row">
            <span className="venue-world-source in-world">
              <Sparkles size={13} />
              {catalog?.sourceLabel ?? "Inspired by this place"}
            </span>

            {officialWebsite && (
              <a href={officialWebsite} target="_blank" rel="noreferrer">
                Real venue site
              </a>
            )}
          </div>

          <p className="venue-world-truth-note">
            {catalog?.notice ??
              "If a reliable real menu or catalog isn't available, this layer stays clearly in-world instead of pretending generated items are real venue data."}
          </p>

          {loading && (
            <div className="venue-world-loading">
              <LoaderCircle className="spin" size={17} />
              Dominic is looking around…
            </div>
          )}

          {error && <p className="venue-world-error">{error}</p>}

          {catalog?.dominicPick && dominicItem && (
            <article className="venue-world-dominic-pick">
              <div className="venue-world-avatar">
                <UserRound size={16} />
              </div>

              <div>
                <small>Dominic picked</small>
                <strong>{dominicItem.name}</strong>
                {catalog.dominicPick.note && (
                  <p>“{catalog.dominicPick.note}”</p>
                )}
              </div>

              {formatVenuePrice(dominicItem.priceUsdCents) && (
                <span>{formatVenuePrice(dominicItem.priceUsdCents)}</span>
              )}
            </article>
          )}

          {catalog &&
            sections.map(([section, items]) => (
              <section key={section} className="venue-world-section">
                <h4>{section}</h4>

                <div className="venue-world-items">
                  {items.map((item) => {
                    const mine = catalog.alloahPickId === item.id;
                    const dominic = catalog.dominicPick?.itemId === item.id;

                    return (
                      <article
                        key={item.id}
                        className={`venue-world-item ${mine ? "mine" : ""} ${
                          dominic ? "dominic" : ""
                        }`}
                      >
                        <div>
                          <strong>{item.name}</strong>

                          {item.description && <p>{item.description}</p>}

                          <div className="venue-world-item-meta">
                            {formatVenuePrice(item.priceUsdCents) && (
                              <span>{formatVenuePrice(item.priceUsdCents)}</span>
                            )}

                            {dominic && <em>Dominic's pick</em>}
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={savingPick !== null}
                          className={mine ? "selected" : ""}
                          onClick={() => void chooseForAlloah(item)}
                        >
                          {savingPick === item.id ? (
                            <LoaderCircle className="spin" size={14} />
                          ) : mine ? (
                            "My pick"
                          ) : (
                            "Choose"
                          )}
                        </button>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}

          {!loading && catalog && (
            <div className="venue-world-bottom-actions">
              <button
                type="button"
                onClick={() => void generate()}
              >
                <RefreshCw size={14} />
                New inspired selection
              </button>

              <button type="button" onClick={() => setOpen(false)}>
                Done
              </button>
            </div>
          )}

          {!loading && !catalog && (
            <button
              type="button"
              className="venue-world-open"
              onClick={() => void generate()}
            >
              <Sparkles size={16} />
              Build inspired selection
            </button>
          )}
        </div>
      )}
    </section>
  );
}
