import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Accessibility,
  CalendarPlus,
  Clock3,
  Compass,
  ExternalLink,
  Heart,
  List,
  LoaderCircle,
  Mail,
  Map,
  MapPin,
  Phone,
  Search,
  Sparkles,
  Utensils,
  Wifi,
} from "lucide-react";

import { usePrivateDiario } from "@/components/private-diario";
import { VenueContentPanel } from "@/components/venue-content-panel";
import {
  getPlaces,
  type DiarioItem,
} from "@/lib/diario-world";
import {
  getPlaceDateCandidates,
  getPlaceDates,
  toggleDatePlace,
} from "@/lib/place-flow";
import { createContextualDate } from "@/lib/date-flow";
import { setPersistedPlaceStatus } from "@/lib/place-status";
import {
  fetchGeoapifyPlaceDetails,
  friendlyPlaceCategory,
  getPlaceOpeningState,
  humanizeOpeningHours,
  humanizeProviderValue,
  persistGeoapifyPlaceDetails,
  placeDetailsAreFresh,
  readPersistedPlaceDetails,
  safeExternalUrl,
  type GeoapifyPlaceDetails,
} from "@/lib/geoapify-place-details";
import {
  cancelDatePlaceSelection,
  completeDatePlaceSelection,
  readDatePlaceSelection,
  setDateCanonicalPlace,
  type PendingDatePlaceSelection,
} from "@/lib/date-place-selection";
import {
  NYC_BOUNDS,
  NYC_CENTER,
  PLACE_SHORTCUTS,
  discoveredPlaceFromPersisted,
  findSavedVersion,
  getDynamicShortcuts,
  getHistoryShortcutKeys,
  saveDiscoveredPlace,
  searchPlacesByShortcut,
  searchPlacesByText,
  type DiscoveredPlace,
  type MapBounds,
  type PlaceShortcut,
} from "@/lib/nyc-place-discovery";

import "./places-experience-screen.css";

declare global {
  interface Window {
    L?: any;
  }
}


export const PLACE_MAP_OPEN_EVENT =
  "diario:places:open-map";

export const PLACE_LIST_OPEN_EVENT =
  "diario:places:open-list";

export function requestPlaceOnMap(placeId: string) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(PLACE_MAP_OPEN_EVENT, {
      detail: { placeId },
    })
  );
}

function requestPlaceInList(placeId: string) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(PLACE_LIST_OPEN_EVENT, {
      detail: { placeId },
    })
  );
}

type PlacesExperienceScreenProps = {
  listView: ReactNode;
  onSelectionComplete?: () => void;
};

const LEAFLET_SCRIPT_ID = "diario-leaflet-script";
const LEAFLET_STYLE_ID = "diario-leaflet-style";

let leafletPromise: Promise<any> | null = null;

function ensureLeaflet(): Promise<any> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Map can only open in the browser."));
  }

  if (window.L) return Promise.resolve(window.L);

  if (leafletPromise) return leafletPromise;

  leafletPromise = new Promise((resolve, reject) => {
    if (!document.getElementById(LEAFLET_STYLE_ID)) {
      const stylesheet = document.createElement("link");
      stylesheet.id = LEAFLET_STYLE_ID;
      stylesheet.rel = "stylesheet";
      stylesheet.href =
        "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(stylesheet);
    }

    const existingScript = document.getElementById(
      LEAFLET_SCRIPT_ID
    ) as HTMLScriptElement | null;

    const finish = () => {
      if (window.L) resolve(window.L);
      else reject(new Error("Leaflet did not load."));
    };

    if (existingScript) {
      existingScript.addEventListener("load", finish, {
        once: true,
      });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Leaflet could not load.")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.id = LEAFLET_SCRIPT_ID;
    script.src =
      "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = finish;
    script.onerror = () =>
      reject(new Error("Leaflet could not load."));
    document.body.appendChild(script);
  });

  return leafletPromise;
}

function boundsFromLeaflet(map: any): MapBounds {
  const bounds = map.getBounds();

  return {
    west: Math.max(NYC_BOUNDS.west, bounds.getWest()),
    south: Math.max(NYC_BOUNDS.south, bounds.getSouth()),
    east: Math.min(NYC_BOUNDS.east, bounds.getEast()),
    north: Math.min(NYC_BOUNDS.north, bounds.getNorth()),
  };
}

function dateLabel(date: DiarioItem): string {
  if (date.data?.flow_state === "live") return "Happening now";
  if (date.data?.flow_state === "past" || date.event_at) return "Past";
  if (date.planned_for) return "Upcoming";
  return "Idea";
}

function dateMoment(date: DiarioItem): string {
  const value = date.event_at ?? date.planned_for;

  if (!value) return "No day set";

  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "No day set";
  }
}

function categoryLabel(key: string): string {
  return (
    PLACE_SHORTCUTS.find((shortcut) => shortcut.key === key)
      ?.label ?? key
  );
}

export function PlacesExperienceScreen({
  listView,
  onSelectionComplete,
}: PlacesExperienceScreenProps) {
  const { session } = usePrivateDiario();

  const [dateSelection, setDateSelection] =
    useState<PendingDatePlaceSelection | null>(
      () => readDatePlaceSelection()
    );

  const [view, setView] = useState<"list" | "map">(
    () =>
      readDatePlaceSelection()
        ? "map"
        : "list"
  );
  const [places, setPlaces] = useState<DiarioItem[]>([]);
  const [dates, setDates] = useState<DiarioItem[]>([]);
  const [loadingWorld, setLoadingWorld] = useState(false);
  const [worldError, setWorldError] = useState<string | null>(
    null
  );
  const [requestedPlaceId, setRequestedPlaceId] =
    useState<string | null>(null);

  const refreshWorld = async () => {
    setLoadingWorld(true);
    setWorldError(null);

    try {
      const [loadedPlaces, loadedDates] = await Promise.all([
        getPlaces(session.user.id),
        getPlaceDateCandidates(session.user.id),
      ]);

      setPlaces(loadedPlaces);
      setDates(loadedDates);
    } catch (error) {
      console.error("Could not open NYC Places map world:", error);
      setWorldError("The NYC map world could not be opened.");
    } finally {
      setLoadingWorld(false);
    }
  };

  useEffect(() => {
    if (view === "map") void refreshWorld();
  }, [view, session.user.id]);


  useEffect(() => {
    const openOnMap = (event: Event) => {
      const placeId = (
        event as CustomEvent<{ placeId?: string }>
      ).detail?.placeId;

      if (!placeId) return;

      setRequestedPlaceId(placeId);
      setView("map");
    };

    window.addEventListener(
      PLACE_MAP_OPEN_EVENT,
      openOnMap
    );

    return () => {
      window.removeEventListener(
        PLACE_MAP_OPEN_EVENT,
        openOnMap
      );
    };
  }, []);

  const openCanonicalPlaceInList = (placeId: string) => {
    setView("list");

    window.setTimeout(() => {
      requestPlaceInList(placeId);
    }, 0);
  };

  const cancelSelectionMode = () => {
    cancelDatePlaceSelection();
    setDateSelection(null);
    onSelectionComplete?.();
  };

  return (
    <section className="places-experience-shell">
      {!dateSelection && (
      <div
        className="places-primary-tabs"
        role="tablist"
        aria-label="Places mode"
      >
        <button
          type="button"
          role="tab"
          aria-selected={view === "list"}
          className={view === "list" ? "active" : ""}
          onClick={() => setView("list")}
        >
          <List size={17} />
          List
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={view === "map"}
          className={view === "map" ? "active" : ""}
          onClick={() => setView("map")}
        >
          <Map size={17} />
          Map
        </button>
      </div>

      )}

      {!dateSelection && view === "list" ? (
        listView
      ) : (
        <NycMapWorld
          userId={session.user.id}
          places={places}
          dates={dates}
          loadingWorld={loadingWorld}
          worldError={worldError}
          dateSelection={dateSelection}
          onCancelSelection={cancelSelectionMode}
          onSelectionComplete={onSelectionComplete}
          requestedPlaceId={requestedPlaceId}
          onRequestedPlaceHandled={() =>
            setRequestedPlaceId(null)
          }
          onOpenInList={openCanonicalPlaceInList}
          onPlaceSaved={(place) =>
            setPlaces((current) => {
              const alreadyExists = current.some(
                (item) => item.id === place.id
              );

              if (!alreadyExists) {
                return [place, ...current];
              }

              return current.map((item) =>
                item.id === place.id ? place : item
              );
            })
          }
          onDateCreated={(date) =>
            setDates((current) => [date, ...current])
          }
          onRefresh={refreshWorld}
        />
      )}
    </section>
  );
}

function NycMapWorld({
  userId,
  places,
  dates,
  loadingWorld,
  worldError,
  dateSelection,
  onCancelSelection,
  onSelectionComplete,
  requestedPlaceId,
  onRequestedPlaceHandled,
  onOpenInList,
  onPlaceSaved,
  onDateCreated,
  onRefresh,
}: {
  userId: string;
  places: DiarioItem[];
  dates: DiarioItem[];
  loadingWorld: boolean;
  worldError: string | null;
  dateSelection: PendingDatePlaceSelection | null;
  onCancelSelection: () => void;
  onSelectionComplete?: () => void;
  requestedPlaceId: string | null;
  onRequestedPlaceHandled: () => void;
  onOpenInList: (placeId: string) => void;
  onPlaceSaved: (place: DiarioItem) => void;
  onDateCreated: (date: DiarioItem) => void;
  onRefresh: () => Promise<void>;
}) {
  const { session } = usePrivateDiario();

  const apiKey =
    typeof import.meta !== "undefined"
      ? import.meta.env.VITE_GEOAPIFY_API_KEY ?? ""
      : "";

  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerLayerRef = useRef<any>(null);

  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [bounds, setBounds] = useState<MapBounds>(NYC_BOUNDS);

  const [query, setQuery] = useState("");
  const [activeShortcut, setActiveShortcut] =
    useState<PlaceShortcut | null>(null);
  const [results, setResults] = useState<DiscoveredPlace[]>([]);
  const [selected, setSelected] =
    useState<DiscoveredPlace | null>(null);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [choosingDate, setChoosingDate] = useState(false);
  const [placeSheetOpen, setPlaceSheetOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [placeDetails, setPlaceDetails] =
    useState<GeoapifyPlaceDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] =
    useState<string | null>(null);
const detailsCacheRef = useRef(
  new globalThis.Map<string, GeoapifyPlaceDetails>()
);

  const dynamicShortcuts = useMemo(
    () => getDynamicShortcuts(places),
    [places]
  );

  const historyShortcutKeys = useMemo(
    () => getHistoryShortcutKeys(places),
    [places]
  );

  const savedSelected = useMemo(
    () => (selected ? findSavedVersion(places, selected) : null),
    [places, selected]
  );

  const placeCategory = useMemo(
    () =>
      selected
        ? friendlyPlaceCategory({
            placeType: selected.placeType,
            details: placeDetails,
          })
        : "Place",
    [selected, placeDetails]
  );

  const openingState = useMemo(
    () =>
      getPlaceOpeningState(
        placeDetails?.openingHours ?? null
      ),
    [placeDetails?.openingHours]
  );

  const officialWebsite = useMemo(
    () =>
      safeExternalUrl(
        placeDetails?.website ??
          selected?.website ??
          null
      ),
    [
      placeDetails?.website,
      selected?.website,
    ]
  );

  useEffect(() => {
    if (!placeSheetOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [placeSheetOpen]);

  useEffect(() => {
    if (
      !placeSheetOpen ||
      !selected ||
      !apiKey
    ) {
      setPlaceDetails(null);
      setDetailsError(null);
      setDetailsLoading(false);
      return;
    }

    let cancelled = false;

    const persistedDetails =
      readPersistedPlaceDetails(
        savedSelected
      );

    if (
      persistedDetails &&
      placeDetailsAreFresh(
        persistedDetails
      )
    ) {
      setPlaceDetails(
        persistedDetails
      );
      setDetailsError(null);
      setDetailsLoading(false);
      return;
    }

    const cacheKey =
      selected.placeId;

    const cached =
      detailsCacheRef.current.get(
        cacheKey
      );

    if (cached) {
      setPlaceDetails(cached);
      setDetailsError(null);
      setDetailsLoading(false);
      return;
    }

    setPlaceDetails(
      persistedDetails
    );
    setDetailsError(null);
    setDetailsLoading(true);

    void fetchGeoapifyPlaceDetails({
      apiKey,
      place: selected,
    })
      .then(
        async (
          details
        ) => {
          if (
            cancelled ||
            !details
          ) {
            return;
          }

          detailsCacheRef.current.set(
            cacheKey,
            details
          );

          setPlaceDetails(
            details
          );

          if (
            savedSelected
          ) {
            const updated =
              await persistGeoapifyPlaceDetails({
                userId,
                place:
                  savedSelected,
                details,
              });

            if (
              !cancelled
            ) {
              onPlaceSaved(
                updated
              );
            }
          }
        }
      )
      .catch(
        (
          error
        ) => {
          console.error(
            "Could not load real Place details:",
            error
          );

          if (
            !cancelled
          ) {
            setDetailsError(
              "Extra details are not available for this Place right now."
            );
          }
        }
      )
      .finally(
        () => {
          if (
            !cancelled
          ) {
            setDetailsLoading(
              false
            );
          }
        }
      );

    return () => {
      cancelled = true;
    };
  }, [
    apiKey,
    placeSheetOpen,
    selected?.placeId,
    savedSelected?.id,
    userId,
  ]);

  useEffect(() => {
    if (!apiKey || !mapNodeRef.current || mapRef.current) return;

    let cancelled = false;

    ensureLeaflet()
      .then((L) => {
        if (cancelled || !mapNodeRef.current) return;

        const map = L.map(mapNodeRef.current, {
          zoomControl: true,
          minZoom: 10,
          maxBounds: [
            [NYC_BOUNDS.south, NYC_BOUNDS.west],
            [NYC_BOUNDS.north, NYC_BOUNDS.east],
          ],
          maxBoundsViscosity: 0.95,
        }).setView(
          [NYC_CENTER.latitude, NYC_CENTER.longitude],
          11
        );

        const isRetina = Boolean(L.Browser?.retina);
        const tileUrl = isRetina
          ? `https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}@2x.png?apiKey=${apiKey}`
          : `https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${apiKey}`;

        L.tileLayer(tileUrl, {
          maxZoom: 20,
          attribution:
            'Powered by <a href="https://www.geoapify.com/" target="_blank" rel="noreferrer">Geoapify</a> | <a href="https://openmaptiles.org/" target="_blank" rel="noreferrer">© OpenMapTiles</a> <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>',
        }).addTo(map);

        markerLayerRef.current = L.layerGroup().addTo(map);
        mapRef.current = map;

        const updateBounds = () => {
          setBounds(boundsFromLeaflet(map));
        };

        map.on("moveend", updateBounds);
        updateBounds();
        setMapReady(true);
      })
      .catch((error) => {
        console.error("Could not open NYC map:", error);
        setMapError("The map could not be opened.");
      });

    return () => {
      cancelled = true;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerLayerRef.current = null;
      }
    };
  }, [apiKey]);

  useEffect(() => {
    if (!mapReady || !window.L || !markerLayerRef.current) return;

    const L = window.L;
    markerLayerRef.current.clearLayers();

    results.forEach((place) => {
      const icon = L.divIcon({
        className: "nyc-map-pin-shell",
        html: `
          <span class="nyc-map-pin-touch">
            <span class="nyc-map-pin">
              <i></i>
            </span>
          </span>
        `,
        iconSize: [44, 52],
        iconAnchor: [22, 48],
        popupAnchor: [0, -44],
      });

      const marker = L.marker([place.latitude, place.longitude], {
        icon,
        title: place.name,
        keyboard: true,
        riseOnHover: true,
        bubblingMouseEvents: false,
      }).addTo(markerLayerRef.current);

      const popupButton = document.createElement("button");
      popupButton.type = "button";
      popupButton.className = "nyc-map-place-popup";
      popupButton.setAttribute(
        "aria-label",
        `Open details for ${place.name}`
      );

      const popupTitle = document.createElement("strong");
      popupTitle.textContent = place.name;

      const popupMeta = document.createElement("span");
      popupMeta.textContent =
        place.neighborhood ||
        place.placeType ||
        "New York City";

      const popupHint = document.createElement("small");
      popupHint.textContent = "Open place";

      popupButton.appendChild(popupTitle);
      popupButton.appendChild(popupMeta);
      popupButton.appendChild(popupHint);

      L.DomEvent.disableClickPropagation(popupButton);
      L.DomEvent.disableScrollPropagation(popupButton);

      popupButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();

        setSelected(place);
        setChoosingDate(false);
        setFeedback(null);
        setPlaceSheetOpen(true);
        marker.closePopup();
      });

      marker.bindPopup(popupButton, {
        closeButton: false,
        autoPan: true,
        autoPanPadding: [24, 80],
        className: "nyc-map-place-popup-shell",
        maxWidth: 260,
        minWidth: 170,
      });

      const selectPlace = () => {
        setSelected(place);
        setChoosingDate(false);
        setFeedback(null);
        setPlaceSheetOpen(false);
        marker.openPopup();
      };

      marker.on("click", selectPlace);
      marker.on("keypress", selectPlace);
    });
  }, [results, mapReady]);


  useEffect(() => {
    if (
      !mapReady ||
      loadingWorld ||
      !requestedPlaceId
    ) {
      return;
    }

    const persisted = places.find(
      (place) => place.id === requestedPlaceId
    );

    if (!persisted) {
      return;
    }

    const mapPlace =
      discoveredPlaceFromPersisted(persisted);

    if (!mapPlace) {
      setFeedback(
        `${persisted.title ?? "This Place"} does not have map coordinates yet.`
      );
      onRequestedPlaceHandled();
      return;
    }

    setResults((current) => {
      const withoutSame = current.filter(
        (place) => place.placeId !== mapPlace.placeId
      );

      return [mapPlace, ...withoutSame];
    });
    setSelected(mapPlace);
    setChoosingDate(false);
    setFeedback(null);
    setPlaceSheetOpen(true);

    mapRef.current?.setView(
      [mapPlace.latitude, mapPlace.longitude],
      16
    );

    onRequestedPlaceHandled();
  }, [
    mapReady,
    loadingWorld,
    requestedPlaceId,
    places,
    onRequestedPlaceHandled,
  ]);

  const showPlaces = (nextResults: DiscoveredPlace[]) => {
    setPlaceSheetOpen(false);
    setChoosingDate(false);
    setResults(nextResults);
    setSelected(nextResults[0] ?? null);

    if (nextResults.length > 0 && mapRef.current && window.L) {
      const L = window.L;
      const points = nextResults.map((place) => [
        place.latitude,
        place.longitude,
      ]);

      if (points.length === 1) {
        mapRef.current.setView(points[0], 15);
      } else {
        const nextBounds = L.latLngBounds(points);
        mapRef.current.fitBounds(nextBounds, {
          padding: [34, 34],
          maxZoom: 15,
        });
      }
    }
  };

  const searchShortcut = async (shortcut: PlaceShortcut) => {
    if (!apiKey) return;

    setSearching(true);
    setFeedback(null);
    setMapError(null);
    setActiveShortcut(shortcut);
    setQuery("");

    try {
      const found = await searchPlacesByShortcut({
        apiKey,
        shortcut,
        bounds,
      });

      showPlaces(found);

      if (found.length === 0) {
        setFeedback(
          `Nothing for ${shortcut.label.toLowerCase()} in this map area yet. Move the map and search again.`
        );
      }
    } catch (error) {
      console.error("Could not search NYC places:", error);
      setMapError("NYC places could not be searched.");
    } finally {
      setSearching(false);
    }
  };

  const searchText = async () => {
    const cleanQuery = query.trim();

    if (!apiKey || !cleanQuery) return;

    setSearching(true);
    setFeedback(null);
    setMapError(null);
    setActiveShortcut(null);

    try {
      const found = await searchPlacesByText({
        apiKey,
        query: cleanQuery,
        bounds,
      });

      showPlaces(found);

      if (found.length === 0) {
        setFeedback(
          `No places matched “${cleanQuery}” here. Try another idea or move around NYC.`
        );
      }
    } catch (error) {
      console.error("Could not search NYC by text:", error);
      setMapError("That NYC search could not be completed.");
    } finally {
      setSearching(false);
    }
  };

  const searchThisArea = async () => {
    if (activeShortcut) {
      await searchShortcut(activeShortcut);
      return;
    }

    if (query.trim()) {
      await searchText();
      return;
    }

    const fallback = dynamicShortcuts[0] ?? PLACE_SHORTCUTS[0];
    await searchShortcut(fallback);
  };

  const enrichCanonicalPlace = async (
    place: DiarioItem
  ): Promise<DiarioItem> => {
    if (!placeDetails) {
      onPlaceSaved(place);
      return place;
    }

    const enriched =
      await persistGeoapifyPlaceDetails({
        userId,
        place,
        details:
          placeDetails,
      });

    onPlaceSaved(
      enriched
    );

    return enriched;
  };

  const saveSelected = async (): Promise<DiarioItem | null> => {
    if (!selected) return null;

    setSaving(true);
    setFeedback(null);

    try {
      const saved = await saveDiscoveredPlace({
        userId,
        place: selected,
      });

      const canonical =
        await enrichCanonicalPlace(
          saved
        );

      setFeedback(`${canonical.title ?? selected.name} is saved for later.`);
      return canonical;
    } catch (error) {
      console.error("Could not save discovered place:", error);
      setMapError("That place could not be saved.");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const chooseSelectedForDate = async () => {
    if (!selected || !dateSelection) {
      return;
    }

    setSaving(true);
    setFeedback(null);
    setMapError(null);

    try {
      const saved =
        savedSelected ??
        (await saveDiscoveredPlace({
          userId,
          place: selected,
        }));

      const canonical =
        await enrichCanonicalPlace(
          saved
        );

      const result =
        await setDateCanonicalPlace({
          userId,
          dateId:
            dateSelection.dateId,
          place: canonical,
        });

      onPlaceSaved(
        result.place
      );

      completeDatePlaceSelection(
        result.date.id
      );

      onSelectionComplete?.();
    } catch (error) {
      console.error(
        "Could not choose Place for Date:",
        error
      );

      setMapError(
        "That Place could not be connected to the Date."
      );
    } finally {
      setSaving(false);
    }
  };

  const changeSelectedPlaceStatus = async (
    status: "saved" | "visited"
  ) => {
    if (!savedSelected) return;

    setSaving(true);
    setFeedback(null);
    setMapError(null);

    try {
      const updated = await setPersistedPlaceStatus({
        userId,
        place: savedSelected,
        status,
      });

      onPlaceSaved(updated);

      setFeedback(
        status === "visited"
          ? `${updated.title ?? selected?.name ?? "This place"} is now marked as Been there.`
          : `${updated.title ?? selected?.name ?? "This place"} is back in Saved.`
      );
    } catch (error) {
      console.error("Could not change Place status:", error);
      setMapError("That Place status could not be changed.");
    } finally {
      setSaving(false);
    }
  };

  const attachToDate = async (date: DiarioItem) => {
    if (!selected) return;

    setSaving(true);
    setFeedback(null);

    try {
      const saved =
        savedSelected ??
        (await saveDiscoveredPlace({
          userId,
          place: selected,
        }));

      const canonical =
        await enrichCanonicalPlace(
          saved
        );

      const linked = await getPlaceDates({
        userId,
        placeId: canonical.id,
      });

      const alreadyLinked = linked.some(
        (connection) => connection.date.id === date.id
      );

      if (!alreadyLinked) {
        await toggleDatePlace({
          userId,
          place: canonical,
          date,
        });
      }

      setChoosingDate(false);
      setFeedback(
        `${canonical.title ?? selected.name} is now part of ${
          date.title ?? "that Date"
        }.`
      );
      await onRefresh();
    } catch (error) {
      console.error("Could not add place to Date:", error);
      setMapError("That place could not be added to the Date.");
    } finally {
      setSaving(false);
    }
  };

  const createDateIdea = async () => {
    if (!selected) return;

    setSaving(true);
    setFeedback(null);

    try {
      const saved =
        savedSelected ??
        (await saveDiscoveredPlace({
          userId,
          place: selected,
        }));

      const canonical =
        await enrichCanonicalPlace(
          saved
        );

      const created = await createContextualDate({
        userId,
        place: canonical.title ?? selected.name,
      });

      await toggleDatePlace({
        userId,
        place: canonical,
        date: created,
      });

      onDateCreated(created);
      setChoosingDate(false);
      setFeedback(
        `New Date idea created from ${canonical.title ?? selected.name}.`
      );
    } catch (error) {
      console.error("Could not create Date idea from place:", error);
      setMapError("A Date idea could not be created from this place.");
    } finally {
      setSaving(false);
    }
  };

  if (!apiKey) {
    return (
      <section className="nyc-map-missing-key">
        <MapPin size={28} />
        <small>NYC discovery map</small>
        <h2>Connect the map first.</h2>
        <p>
          Add <code>VITE_GEOAPIFY_API_KEY</code> to the app
          environment, then redeploy. The manual Places list still
          works while the map key is missing.
        </p>
      </section>
    );
  }

  return (
    <section className="nyc-map-world">
      {dateSelection && (
        <section className="nyc-map-selection-banner">
          <div>
            <small>
              Choosing a Place for
            </small>

            <strong>
              {dateSelection.dateTitle}
            </strong>
          </div>

          <button
            type="button"
            onClick={onCancelSelection}
          >
            Cancel
          </button>
        </section>
      )}

      <header className="nyc-map-heading">
        <div>
          <small>New York City</small>
          <h1>Where should we go?</h1>
          <p>
            Search naturally, explore the city, save a place or let
            a real Place become a Date idea.
          </p>
        </div>

        <Compass size={27} strokeWidth={1.35} />
      </header>

      <form
        className="nyc-map-search"
        onSubmit={(event) => {
          event.preventDefault();
          void searchText();
        }}
      >
        <Search size={18} />

        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Coffee shops, Italian, bookstores, museums…"
          aria-label="Search NYC places"
        />

        <button
          type="submit"
          disabled={searching || !query.trim()}
        >
          Search
        </button>
      </form>

      <section className="nyc-map-discovery-row">
        <div className="nyc-map-row-title">
          <Sparkles size={15} />
          <span>New ideas</span>
        </div>

        <div className="nyc-map-chips">
          {dynamicShortcuts.map((shortcut) => (
            <button
              key={shortcut.key}
              type="button"
              className={
                activeShortcut?.key === shortcut.key ? "active" : ""
              }
              disabled={searching}
              onClick={() => void searchShortcut(shortcut)}
            >
              {shortcut.label}
            </button>
          ))}
        </div>
      </section>

      {historyShortcutKeys.length > 0 && (
        <section className="nyc-map-discovery-row history">
          <div className="nyc-map-row-title">
            <Heart size={15} />
            <span>Things we already discovered</span>
          </div>

          <div className="nyc-map-chips">
            {historyShortcutKeys.map((key) => {
              const shortcut = PLACE_SHORTCUTS.find(
                (item) => item.key === key
              );

              if (!shortcut) return null;

              return (
                <button
                  key={key}
                  type="button"
                  disabled={searching}
                  onClick={() => void searchShortcut(shortcut)}
                >
                  {categoryLabel(key)}
                </button>
              );
            })}
          </div>
        </section>
      )}

      <div className="nyc-map-frame">
        <div
          ref={mapNodeRef}
          className="nyc-map-canvas"
          aria-label="Interactive map of New York City"
        />

        {!mapReady && !mapError && (
          <div className="nyc-map-loading">
            <LoaderCircle className="spin" size={25} />
            Opening New York…
          </div>
        )}

        <button
          type="button"
          className="nyc-search-area"
          disabled={!mapReady || searching}
          onClick={() => void searchThisArea()}
        >
          {searching ? (
            <LoaderCircle className="spin" size={15} />
          ) : (
            <MapPin size={15} />
          )}
          Search this area
        </button>
      </div>

      {(mapError || worldError) && (
        <p className="nyc-map-error" role="alert">
          {mapError ?? worldError}
        </p>
      )}

      {feedback && <p className="nyc-map-feedback">{feedback}</p>}

      {selected && placeSheetOpen && (
        <>
          <button
            type="button"
            className="nyc-place-sheet-backdrop"
            aria-label="Close place details"
            onClick={() => {
              setPlaceSheetOpen(false);
              setChoosingDate(false);
            }}
          />

          <article
            className="nyc-place-card nyc-place-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="nyc-place-sheet-title"
          >
            <div className="nyc-place-sheet-handle" />

            <header>
              <div>
                <small>
                  {savedSelected
                    ? `${
                        savedSelected.data?.placeStatus === "visited"
                          ? "Been there"
                          : "Saved"
                      } · ${placeCategory}`
                    : placeCategory}
                </small>

                <h2 id="nyc-place-sheet-title">
                  {selected.name}
                </h2>
              </div>

              <button
                type="button"
                className="nyc-place-sheet-close"
                aria-label="Close place details"
                onClick={() => {
                  setPlaceSheetOpen(false);
                  setChoosingDate(false);
                }}
              >
                ×
              </button>
            </header>

            {(selected.neighborhood || selected.address) && (
              <div className="nyc-place-address-row">
                <MapPin size={16} />

                <p className="nyc-place-address">
                  {selected.neighborhood &&
                    `${selected.neighborhood}${
                      selected.address ? " · " : ""
                    }`}
                  {selected.address}
                </p>
              </div>
            )}

            {detailsLoading && (
              <div className="nyc-place-details-loading">
                <LoaderCircle
                  className="spin"
                  size={16}
                />
                Loading real place details…
              </div>
            )}

            {detailsError && (
              <p className="nyc-place-details-note">
                {detailsError}
              </p>
            )}

            {placeDetails && (
              <section className="nyc-place-rich-details">
                {placeDetails.description && (
                  <p className="nyc-place-description">
                    {placeDetails.description}
                  </p>
                )}

                {placeDetails.openingHours && (
                  <div className="nyc-place-detail-row">
                    <Clock3 size={17} />

                    <div>
                      <strong>
                        {openingState?.label ?? "Opening hours"}
                      </strong>

                      <span>
                        {humanizeOpeningHours(
                          placeDetails.openingHours
                        )}
                      </span>
                    </div>

                    {openingState && (
                      <em
                        className={
                          openingState.isOpen
                            ? "open"
                            : "closed"
                        }
                      >
                        {openingState.isOpen
                          ? "Open"
                          : "Closed"}
                      </em>
                    )}
                  </div>
                )}

                {(placeDetails.cuisine ||
                  placeDetails.diet ||
                  placeDetails.reservation) && (
                  <div className="nyc-place-detail-row">
                    <Utensils size={17} />

                    <div>
                      <strong>
                        Food & reservations
                      </strong>

                      <div className="nyc-place-detail-chips">
                        {placeDetails.cuisine && (
                          <span>
                            {humanizeProviderValue(
                              placeDetails.cuisine
                            )}
                          </span>
                        )}

                        {placeDetails.diet && (
                          <span>
                            {humanizeProviderValue(
                              placeDetails.diet
                            )}
                          </span>
                        )}

                        {placeDetails.reservation && (
                          <span>
                            Reservation{" "}
                            {humanizeProviderValue(
                              placeDetails.reservation
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {(placeDetails.wheelchair === true ||
                  placeDetails.internetAccess === true ||
                  placeDetails.smoking !== null) && (
                  <div className="nyc-place-facilities">
                    {placeDetails.wheelchair === true && (
                      <span>
                        <Accessibility size={14} />
                        Wheelchair accessible
                      </span>
                    )}

                    {placeDetails.internetAccess === true && (
                      <span>
                        <Wifi size={14} />
                        Wi-Fi
                      </span>
                    )}

                    {placeDetails.smoking === false && (
                      <span>
                        Non-smoking
                      </span>
                    )}

                    {placeDetails.smoking === true && (
                      <span>
                        Smoking permitted
                      </span>
                    )}
                  </div>
                )}
              </section>
            )}

            {(officialWebsite ||
              placeDetails?.phone ||
              selected.phone ||
              placeDetails?.email) && (
              <div className="nyc-place-contact-row">
                {officialWebsite && (
                  <a
                    href={officialWebsite}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink size={14} />
                    Official site
                  </a>
                )}

                {(placeDetails?.phone || selected.phone) && (
                  <a
                    href={`tel:${
                      placeDetails?.phone ?? selected.phone
                    }`}
                  >
                    <Phone size={14} />
                    Call
                  </a>
                )}

                {placeDetails?.email && (
                  <a
                    href={`mailto:${placeDetails.email}`}
                  >
                    <Mail size={14} />
                    Email
                  </a>
                )}
              </div>
            )}

{placeDetails && (
  <p className="nyc-place-provider-note">
    Real place details from Geoapify / OpenStreetMap.
    Availability and hours can change.
  </p>
)}

{!dateSelection && (
  <VenueContentPanel
    userId={userId}
    accessToken={session.access_token}
    place={selected}
    canonicalPlace={savedSelected}
    placeDetails={placeDetails}
    officialWebsite={officialWebsite}
    ensureCanonicalPlace={async () => {
      const saved =
        savedSelected ??
        (await saveDiscoveredPlace({
          userId,
          place: selected,
        }));

      return enrichCanonicalPlace(
        saved
      );
    }}
    onPlaceUpdated={onPlaceSaved}
  />
)}

            {dateSelection && (
              <button
                type="button"
                className="nyc-place-choose-action"
                disabled={saving}
                onClick={() =>
                  void chooseSelectedForDate()
                }
              >
                <MapPin size={17} />
                Choose this Place
              </button>
            )}

            {!dateSelection && savedSelected && (
              <button
                type="button"
                className="nyc-open-list-action"
                onClick={() =>
                  onOpenInList(savedSelected.id)
                }
              >
                <List size={16} />
                Open in List
              </button>
            )}

            {!dateSelection && savedSelected && (
              <button
                type="button"
                className={`nyc-place-status-action ${
                  savedSelected.data?.placeStatus === "visited"
                    ? "visited"
                    : ""
                }`}
                disabled={saving}
                onClick={() =>
                  void changeSelectedPlaceStatus(
                    savedSelected.data?.placeStatus === "visited"
                      ? "saved"
                      : "visited"
                  )
                }
              >
                <MapPin size={16} />
                {savedSelected.data?.placeStatus === "visited"
                  ? "Move back to Saved"
                  : "Mark as Been there"}
              </button>
            )}

            {!dateSelection && (
            <div className="nyc-place-actions">
              <button
                type="button"
                disabled={saving || Boolean(savedSelected)}
                onClick={() => void saveSelected()}
              >
                <Heart size={16} />
                {savedSelected ? "Saved" : "Save for later"}
              </button>

              <button
                type="button"
                className="primary"
                disabled={saving}
                onClick={() =>
                  setChoosingDate((value) => !value)
                }
              >
                <CalendarPlus size={16} />
                Add to Date
              </button>
            </div>
            )}

            {!dateSelection && choosingDate && (
              <section className="nyc-date-picker">
                <header>
                  <div>
                    <small>Date</small>
                    <strong>Where should this Place go?</strong>
                  </div>
                </header>

                <button
                  type="button"
                  className="nyc-new-date-idea"
                  disabled={saving}
                  onClick={() => void createDateIdea()}
                >
                  <Sparkles size={16} />
                  Create a new Date idea from this Place
                </button>

                {loadingWorld ? (
                  <p>Opening your Dates…</p>
                ) : dates.length === 0 ? (
                  <p>
                    No Dates yet. You can create the first idea directly
                    from this Place.
                  </p>
                ) : (
                  <div className="nyc-date-options">
                    {dates.map((date) => (
                      <button
                        key={date.id}
                        type="button"
                        disabled={saving}
                        onClick={() => void attachToDate(date)}
                      >
                        <span>
                          <small>{dateLabel(date)}</small>
                          <strong>
                            {date.title ?? "Untitled Date"}
                          </strong>
                        </span>

                        <time>{dateMoment(date)}</time>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            )}
          </article>
        </>
      )}

      {results.length > 1 && (
        <section className="nyc-results">
          <header>
            <small>On the map</small>
            <strong>{results.length} places to look at</strong>
          </header>

          <div className="nyc-results-strip">
            {results.map((place) => (
              <button
                key={place.placeId}
                type="button"
                className={
                  selected?.placeId === place.placeId ? "active" : ""
                }
                onClick={() => {
                  setSelected(place);
                  setChoosingDate(false);
                  setFeedback(null);
                  setPlaceSheetOpen(true);
                  mapRef.current?.setView(
                    [place.latitude, place.longitude],
                    Math.max(mapRef.current?.getZoom?.() ?? 13, 14)
                  );
                }}
              >
                <strong>{place.name}</strong>
                <span>
                  {place.neighborhood || place.placeType}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
