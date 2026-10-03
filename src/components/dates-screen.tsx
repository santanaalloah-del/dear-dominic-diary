import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Coffee,
  Gift,
  Link2,
  MapPin,
  Plus,
  ShoppingBag,
  Shirt,
  Utensils,
} from "lucide-react";

import {
  usePrivateDiario,
} from "@/components/private-diario";

import {
  ConnectedObjectDetailScreen,
} from "@/components/connected-object-detail-screen";

import {
  DateHistoryPanel,
} from "@/components/date-history-panel";

import { DateHerePanel } from "@/components/date-here-panel";

import "@/components/date-movement-controls.css";

import {
  useDateModeEntry,
} from "@/components/date-mode-entry";

import {
  beginDatePlaceSelection,
  consumeDatePlaceReturnId,
} from "@/lib/date-place-selection";

import {
  getDates,
  getLooks,
  type DiarioItem,
} from "@/lib/diario-world";

import {
  createContextualDate,
  createMemoryFromDate,
  finishDate,
  getDateCandidateItems,
  getDateConnectedThings,
  getDateFlowState,
  saveDateLiveNote,
  setDateLook,
  startDate,
  toggleDateContainedItem,
  updateDateDetails,
  type DateConnectedThing,
  type DateFlowState,
  type DateLookRole,
} from "@/lib/date-flow";

import {
  closeOtherLiveDateExperiences,
  finishDateExperience,
  getDateStartAvailability,
} from "@/lib/date-experience";

import {
  notifyDateExperienceChanged,
} from "@/lib/date-live-events";

import {
  materializeDateVenuePurchase,
  readDateVenueWorld,
  setDateVenuePurchaseVisual,
  type DateVenuePurchase,
} from "@/lib/date-venue-world";

import {
  generateObjectVisual,
  signedObjectVisualUrl,
} from "@/lib/object-visual";

import "./dates-screen.css";
import "./date-lifecycle.css";

type DateView =
  | "upcoming"
  | "past"
  | "ideas";

type DateOpenScreen =
  | "wardrobe"
  | "gallery"
  | "music"
  | "keepsakes"
  | "places";

function clean(
  value:
    string
) {
  return value.trim();
}

function dateTimeKnown(
  date:
    DiarioItem
) {
  return (
    date.data
      ?.time_known !==
    false
  );
}

function timeHint(
  date:
    DiarioItem
) {
  return typeof date
    .data
    ?.time_hint ===
  "string"
    ? date.data
        .time_hint
    : "";
}

function formatTimeHint(
  value:
    string
) {
  if (
    !value
  ) {
    return "";
  }

  const [
    hour,
    minute,
  ] =
    value
      .split(":")
      .map(
        Number
      );

  if (
    Number.isNaN(
      hour
    ) ||
    Number.isNaN(
      minute
    )
  ) {
    return value;
  }

  const fakeDate =
    new Date(
      2000,
      0,
      1,
      hour,
      minute
    );

  return new Intl.DateTimeFormat(
    "en-US",
    {
      hour:
        "numeric",

      minute:
        "2-digit",
    }
  ).format(
    fakeDate
  );
}

function dateLabel(
  value:
    | string
    | null
    | undefined,
  timeKnown =
    true
) {
  if (
    !value
  ) {
    return "Not scheduled";
  }

  const parsed =
    new Date(
      value
    );

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return value;
  }

  if (
    !timeKnown
  ) {
    return `${new Intl.DateTimeFormat(
      "en-US",
      {
        weekday:
          "short",

        month:
          "long",

        day:
          "numeric",

        year:
          "numeric",
      }
    ).format(
      parsed
    )} · time not set`;
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      weekday:
        "short",

      month:
        "long",

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
    parsed
  );
}

function dateDisplay(
  date:
    DiarioItem
) {
  if (
    date.planned_for
  ) {
    return dateLabel(
      date.planned_for,
      dateTimeKnown(
        date
      )
    );
  }

  const hint =
    timeHint(
      date
    );

  if (
    hint
  ) {
    return `Time idea · ${formatTimeHint(
      hint
    )}`;
  }

  return "Not scheduled";
}

function dateDayInputValue(
  value:
    | string
    | null
    | undefined
) {
  if (
    !value
  ) {
    return "";
  }

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

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() +
        1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}

function dateClockInputValue(
  date:
    DiarioItem
) {
  const hint =
    timeHint(
      date
    );

  if (
    !date.planned_for
  ) {
    return hint;
  }

  if (
    !dateTimeKnown(
      date
    )
  ) {
    return hint;
  }

  const parsed =
    new Date(
      date.planned_for
    );

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return hint;
  }

  const hour =
    String(
      parsed.getHours()
    ).padStart(
      2,
      "0"
    );

  const minute =
    String(
      parsed.getMinutes()
    ).padStart(
      2,
      "0"
    );

  return `${hour}:${minute}`;
}

function buildPlannedFor(
  day:
    string,
  time:
    string
) {
  if (
    !day
  ) {
    return null;
  }

  const local =
    new Date(
      clean(
        time
      )
        ? `${day}T${time}:00`
        : `${day}T12:00:00`
    );

  if (
    Number.isNaN(
      local.getTime()
    )
  ) {
    return null;
  }

  return local
    .toISOString();
}

function hasSomething({
  title,
  place,
  day,
  time,
  note,
  itinerary,
}: {
  title:
    string;
  place:
    string;
  day:
    string;
  time:
    string;
  note:
    string;
  itinerary:
    string;
}) {
  return Boolean(
    clean(
      title
    ) ||
      clean(
        place
      ) ||
      day ||
      time ||
      clean(
        note
      ) ||
      clean(
        itinerary
      )
  );
}

function flowLabel(
  state:
    DateFlowState,
  date?:
    DiarioItem,
  now =
    new Date()
) {
  if (
    state ===
    "idea"
  ) {
    return "Idea";
  }

  if (
    state ===
    "planned" &&
    date
  ) {
    return getDateStartAvailability(
      date,
      now
    ).label;
  }

  if (
    state ===
    "planned"
  ) {
    return "Upcoming";
  }

  if (
    state ===
    "live"
  ) {
    return "Happening now";
  }

  return "Past";
}

function itemKindLabel(
  kind:
    DiarioItem[
      "kind"
    ]
) {
  const labels:
    Partial<
      Record<
        DiarioItem[
          "kind"
        ],
        string
      >
    > = {
      photo:
        "Photo",

      song:
        "Music",

      place:
        "Place",

      keepsake:
        "Keepsake",

      look:
        "Outfit",

      letter:
        "Letter",
    };

  return (
    labels[kind] ??
    kind
  );
}

function purchaseKindIcon(
  purchase: DateVenuePurchase
) {
  if (purchase.itemKind === "drink") {
    return <Coffee size={18} strokeWidth={1.35} />;
  }

  if (
    purchase.itemKind === "food" ||
    purchase.itemKind === "dessert" ||
    purchase.itemKind === "snack"
  ) {
    return <Utensils size={18} strokeWidth={1.35} />;
  }

  if (
    purchase.itemKind === "gift" ||
    purchase.itemKind === "souvenir"
  ) {
    return <Gift size={18} strokeWidth={1.35} />;
  }

  return <ShoppingBag size={18} strokeWidth={1.35} />;
}


export function DatesExperienceScreen({
  onOpen,
}: {
  onOpen?: (
    screen:
      DateOpenScreen
  ) => void;
}) {
  const {
    session,
  } =
    usePrivateDiario();

  const [
    view,
    setView,
  ] =
    useState<DateView>(
      "upcoming"
    );

  const [
    dates,
    setDates,
  ] =
    useState<
      DiarioItem[]
    >([]);

  const [
    selectedDateId,
    setSelectedDateId,
  ] =
    useState<
      string | null
    >(null);

  const [
    connectedDetailId,
    setConnectedDetailId,
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

  const [
    creating,
    setCreating,
  ] =
    useState(false);

  const [
    newTitle,
    setNewTitle,
  ] =
    useState("");

  const [
    newPlace,
    setNewPlace,
  ] =
    useState("");

  const [
    newDay,
    setNewDay,
  ] =
    useState("");

  const [
    newTime,
    setNewTime,
  ] =
    useState("");

  const [
    newNote,
    setNewNote,
  ] =
    useState("");

  const [
    newItinerary,
    setNewItinerary,
  ] =
    useState("");

  const [
    editing,
    setEditing,
  ] =
    useState(false);

  const [
    editTitle,
    setEditTitle,
  ] =
    useState("");

  const [
    editPlace,
    setEditPlace,
  ] =
    useState("");

  const [
    editDay,
    setEditDay,
  ] =
    useState("");

  const [
    editTime,
    setEditTime,
  ] =
    useState("");

  const [
    editNote,
    setEditNote,
  ] =
    useState("");

  const [
    editItinerary,
    setEditItinerary,
  ] =
    useState("");

  const [
    looks,
    setLooks,
  ] =
    useState<
      DiarioItem[]
    >([]);

  const [
    connectedThings,
    setConnectedThings,
  ] =
    useState<
      DateConnectedThing[]
    >([]);

  const [
    candidates,
    setCandidates,
  ] =
    useState<
      DiarioItem[]
    >([]);

  const [
    pickerOpen,
    setPickerOpen,
  ] =
    useState(false);

  const [
    liveNote,
    setLiveNote,
  ] =
    useState("");

  const [
    finishSummary,
    setFinishSummary,
  ] =
    useState("");

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    lifecycleNow,
    setLifecycleNow,
  ] =
    useState(
      () =>
        new Date()
    );

  const [
    earlyStartConfirm,
    setEarlyStartConfirm,
  ] =
    useState(false);

  const [
    createdMemory,
    setCreatedMemory,
  ] =
    useState<
      DiarioItem | null
    >(null);

  const [
    purchaseVisualUrls,
    setPurchaseVisualUrls,
  ] = useState<
    Record<string, string>
  >({});

  const [
    purchaseVisualBusy,
    setPurchaseVisualBusy,
  ] = useState<
    Record<string, boolean>
  >({});

  const purchaseVisualInFlight =
    useRef(
      new Set<string>()
    );

  const purchaseVisualFailed =
    useRef(
      new Set<string>()
    );

  const selectedDate =
    dates.find(
      (
        date
      ) =>
        date.id ===
        selectedDateId
    ) ??
    null;

  useDateModeEntry({
  dates,
  onSelectDate: setSelectedDateId,
});


  async function refreshDates() {
    setLoading(
      true
    );

    setError(
      null
    );

    try {
      const loaded =
        await getDates(
          session.user.id
        );

      setDates(
        loaded
      );
    } catch (
      loadError
    ) {
      console.error(
        "Could not load Dates:",
        loadError
      );

      setError(
        "Dates could not be opened right now."
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  async function loadDateExtras(
    dateId:
      string
  ) {
    try {
      const [
        loadedLooks,
        loadedThings,
        loadedCandidates,
      ] =
        await Promise.all([
          getLooks(
            session.user.id
          ),

          getDateConnectedThings({
            userId:
              session.user.id,

            dateId,
          }),

          getDateCandidateItems(
            session.user.id
          ),
        ]);

      setLooks(
        loadedLooks
      );

      setConnectedThings(
        loadedThings
      );

      setCandidates(
        loadedCandidates.filter(
          (
            item
          ) =>
            item.id !==
            dateId
        )
      );
    } catch (
      loadError
    ) {
      console.error(
        "Could not load Date details:",
        loadError
      );

      setError(
        "Some Date details could not be loaded."
      );
    }
  }

  useEffect(() => {
    void refreshDates();
  }, [
    session.user.id,
  ]);

  useEffect(() => {
  const returnDateId =
    consumeDatePlaceReturnId();

  if (!returnDateId) {
    return;
  }

  setSelectedDateId(
    returnDateId
  );
}, []);

  useEffect(() => {
    if (
      !selectedDateId
    ) {
      return;
    }

    void loadDateExtras(
      selectedDateId
    );
  }, [
    selectedDateId,
    session.user.id,
  ]);

  useEffect(() => {
    const timer =
      window.setInterval(
        () =>
          setLifecycleNow(
            new Date()
          ),
        30_000
      );

    return () =>
      window.clearInterval(
        timer
      );
  }, []);

  useEffect(() => {
    if (!selectedDate) {
      setPurchaseVisualUrls({});
      return;
    }

    let cancelled = false;

    const purchases =
      readDateVenueWorld(
        selectedDate
      ).purchases;

    void Promise.all(
      purchases.map(
        async (purchase) => {
          if (
            !purchase.visualStoragePath ||
            purchaseVisualUrls[
              purchase.id
            ]
          ) {
            return;
          }

          const url =
            await signedObjectVisualUrl({
              storageBucket:
                purchase.visualStorageBucket ??
                "diario-media",
              storagePath:
                purchase.visualStoragePath,
            });

          if (
            !cancelled &&
            url
          ) {
            setPurchaseVisualUrls(
              (current) => ({
                ...current,
                [purchase.id]:
                  url,
              })
            );
          }
        }
      )
    );

    return () => {
      cancelled = true;
    };
  }, [
    selectedDate?.id,
    selectedDate?.data?.venueWorld,
  ]);

  useEffect(() => {
    if (!selectedDate) {
      return;
    }

    const purchases =
      readDateVenueWorld(
        selectedDate
      ).purchases;

    const next =
      purchases.find(
        (purchase) =>
          !purchase.visualStoragePath &&
          !purchaseVisualInFlight.current.has(
            purchase.id
          ) &&
          !purchaseVisualFailed.current.has(
            purchase.id
          )
      );

    if (!next) {
      return;
    }

    purchaseVisualInFlight.current.add(
      next.id
    );

    setPurchaseVisualBusy(
      (current) => ({
        ...current,
        [next.id]:
          true,
      })
    );

    const dateSnapshot =
      selectedDate;

    void generateObjectVisual({
      userId:
        session.user.id,
      name:
        next.itemName,
      kind:
        next.itemKind,
      description:
        next.description,
      placeName:
        next.placeName,
      section:
        next.section,
    })
      .then(
        async (
          generated
        ) => {
          setPurchaseVisualUrls(
            (current) => ({
              ...current,
              [next.id]:
                generated.url,
            })
          );

          const updated =
            await setDateVenuePurchaseVisual({
              userId:
                session.user.id,
              date:
                dateSnapshot,
              purchaseId:
                next.id,
              storageBucket:
                generated.storageBucket,
              storagePath:
                generated.storagePath,
              provider:
                generated.provider,
              model:
                generated.model,
            });

          replaceDate(
            updated
          );
        }
      )
      .catch(
        (visualError) => {
          console.error(
            "Could not make Date object visual:",
            visualError
          );

          purchaseVisualFailed.current.add(
            next.id
          );
        }
      )
      .finally(() => {
        purchaseVisualInFlight.current.delete(
          next.id
        );

        setPurchaseVisualBusy(
          (current) => ({
            ...current,
            [next.id]:
              false,
          })
        );
      });
  }, [
    selectedDate?.id,
    selectedDate?.data?.venueWorld,
    session.user.id,
  ]);

  useEffect(() => {
    if (
      !selectedDate
    ) {
      return;
    }

    setEarlyStartConfirm(
      false
    );

    setLiveNote(
      typeof selectedDate
        .data
        ?.live_note ===
      "string"
        ? selectedDate
            .data
            .live_note
        : ""
    );

    setFinishSummary(
      typeof selectedDate
        .data
        ?.summary ===
      "string"
        ? selectedDate
            .data
            .summary
        : ""
    );

    setCreatedMemory(
      null
    );
  }, [
    selectedDate?.id,
  ]);

  function choosePlaceOnMap(
  date:
    DiarioItem
) {
  beginDatePlaceSelection(
    date
  );

  setEditing(
    false
  );

  onOpen?.(
    "places"
  );
}

  function exploreNearbyDuringDate(
  date: DiarioItem
) {
  beginDatePlaceSelection(date);
  onOpen?.("places");
}

  function replaceDate(
    updated:
      DiarioItem
  ) {
    setDates(
      (
        current
      ) =>
        current.map(
          (
            date
          ) =>
            date.id ===
            updated.id
              ? updated
              : date
        )
    );
  }

  function resetNewDate() {
    setCreating(
      false
    );

    setNewTitle(
      ""
    );

    setNewPlace(
      ""
    );

    setNewDay(
      ""
    );

    setNewTime(
      ""
    );

    setNewNote(
      ""
    );

    setNewItinerary(
      ""
    );
  }

  async function saveNewDate() {
    const hasContent =
      hasSomething({
        title:
          newTitle,

        place:
          newPlace,

        day:
          newDay,

        time:
          newTime,

        note:
          newNote,

        itinerary:
          newItinerary,
      });

    if (
      !hasContent
    ) {
      return;
    }

    setSaving(
      true
    );

    setError(
      null
    );

    try {
      const plannedFor =
        buildPlannedFor(
          newDay,
          newTime
        );

      const saved =
        await createContextualDate({
          userId:
            session.user.id,

          title:
            newTitle,

          place:
            newPlace,

          plannedFor,

          timeKnown:
            Boolean(
              newDay &&
              newTime
            ),

          timeHint:
            newTime ||
            null,

          note:
            newNote,

          itinerary:
            newItinerary,
        });

      await refreshDates();

      resetNewDate();

      setSelectedDateId(
        saved.id
      );

      setView(
        plannedFor
          ? "upcoming"
          : "ideas"
      );
    } catch (
      saveError
    ) {
      console.error(
        "Could not save Date:",
        saveError
      );

      setError(
        "The Date could not be saved."
      );
    } finally {
      setSaving(
        false
      );
    }
  }

  function beginEditing(
    date:
      DiarioItem
  ) {
    setEditTitle(
      date.title ??
      ""
    );

    setEditPlace(
      typeof date.data
        ?.place ===
      "string"
        ? date.data
            .place
        : ""
    );

    setEditDay(
      dateDayInputValue(
        date.planned_for
      )
    );

    setEditTime(
      dateClockInputValue(
        date
      )
    );

    setEditNote(
      date.body ??
      ""
    );

    setEditItinerary(
      typeof date.data
        ?.itinerary ===
      "string"
        ? date.data
            .itinerary
        : ""
    );

    setEditing(
      true
    );
  }

  async function saveEdit() {
    if (
      !selectedDate
    ) {
      return;
    }

    if (
      !hasSomething({
        title:
          editTitle,

        place:
          editPlace,

        day:
          editDay,

        time:
          editTime,

        note:
          editNote,

        itinerary:
          editItinerary,
      })
    ) {
      setError(
        "Keep at least one detail in this Date."
      );

      return;
    }

    setSaving(
      true
    );

    setError(
      null
    );

    try {
      const plannedFor =
        buildPlannedFor(
          editDay,
          editTime
        );

      const updated =
        await updateDateDetails({
          userId:
            session.user.id,

          dateId:
            selectedDate.id,

          title:
            editTitle,

          place:
            editPlace,

          plannedFor,

          timeKnown:
            Boolean(
              editDay &&
              editTime
            ),

          timeHint:
            editTime ||
            null,

          note:
            editNote,

          itinerary:
            editItinerary,
        });

      replaceDate(
        updated
      );

      setEditing(
        false
      );
    } catch (
      updateError
    ) {
      console.error(
        "Could not update Date:",
        updateError
      );

      setError(
        "The Date could not be updated."
      );
    } finally {
      setSaving(
        false
      );
    }
  }

  async function beginDate(
    allowEarly =
      false
  ) {
    if (
      !selectedDate
    ) {
      return;
    }

    const availability =
      getDateStartAvailability(
        selectedDate,
        new Date()
      );

    if (
      !availability
        .canStartNaturally &&
      !allowEarly
    ) {
      setError(
        "This Date is not available yet. Use Start early if you really want to begin it now."
      );

      return;
    }

    setSaving(
      true
    );

    setError(
      null
    );

    try {
      await closeOtherLiveDateExperiences({
        userId:
          session.user.id,

        exceptDateId:
          selectedDate.id,
      });

      const updated =
        await startDate({
          userId:
            session.user.id,

          dateId:
            selectedDate.id,
        });

      replaceDate(
        updated
      );

      setEarlyStartConfirm(
        false
      );

      notifyDateExperienceChanged(
        updated.id
      );

      setView(
        "upcoming"
      );
    } catch (
      startError
    ) {
      console.error(
        "Could not start Date:",
        startError
      );

      setError(
        "Date Mode could not be started."
      );
    } finally {
      setSaving(
        false
      );
    }
  }

  async function saveLiveNoteNow() {
    if (
      !selectedDate
    ) {
      return;
    }

    setSaving(
      true
    );

    try {
      const updated =
        await saveDateLiveNote({
          userId:
            session.user.id,

          dateId:
            selectedDate.id,

          note:
            liveNote,
        });

      replaceDate(
        updated
      );
    } catch (
      noteError
    ) {
      console.error(
        "Could not save Date note:",
        noteError
      );

      setError(
        "The Date note could not be saved."
      );
    } finally {
      setSaving(
        false
      );
    }
  }

  async function completeDate() {
    if (
      !selectedDate
    ) {
      return;
    }

    setSaving(
      true
    );

    try {
      const withFinishedExperience =
        await finishDateExperience({
          userId:
            session.user.id,

          date:
            selectedDate,
        });

      const updated =
        await finishDate({
          userId:
            session.user.id,

          dateId:
            withFinishedExperience.id,

          summary:
            finishSummary,
        });

      replaceDate(
        updated
      );

      await closeOtherLiveDateExperiences({
        userId:
          session.user.id,
      });

      notifyDateExperienceChanged(
        updated.id
      );

      await refreshDates();

      setView(
        "past"
      );
    } catch (
      finishError
    ) {
      console.error(
        "Could not finish Date:",
        finishError
      );

      setError(
        "The Date could not be finished."
      );
    } finally {
      setSaving(
        false
      );
    }
  }

  async function changeLook(
    role:
      DateLookRole,
    lookId:
      string
  ) {
    if (
      !selectedDate
    ) {
      return;
    }

    setSaving(
      true
    );

    try {
      const updated =
        await setDateLook({
          userId:
            session.user.id,

          dateId:
            selectedDate.id,

          role,

          lookId:
            lookId ||
            null,
        });

      replaceDate(
        updated
      );

      await loadDateExtras(
        selectedDate.id
      );
    } catch (
      lookError
    ) {
      console.error(
        "Could not set Date look:",
        lookError
      );

      setError(
        "The outfit could not be connected."
      );
    } finally {
      setSaving(
        false
      );
    }
  }

  async function toggleThing(
    item:
      DiarioItem
  ) {
    if (
      !selectedDate
    ) {
      return;
    }

    setSaving(
      true
    );

    try {
      await toggleDateContainedItem({
        userId:
          session.user.id,

        dateId:
          selectedDate.id,

        itemId:
          item.id,
      });

      await loadDateExtras(
        selectedDate.id
      );
    } catch (
      connectionError
    ) {
      console.error(
        "Could not update Date contents:",
        connectionError
      );

      setError(
        "The object could not be connected to this Date."
      );
    } finally {
      setSaving(
        false
      );
    }
  }

  async function keepVenuePurchase(
    purchase: DateVenuePurchase
  ) {
    if (!selectedDate) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await materializeDateVenuePurchase({
        userId: session.user.id,
        date: selectedDate,
        purchase,
      });

      await loadDateExtras(
        selectedDate.id
      );
    } catch (purchaseError) {
      console.error(
        "Could not keep Date purchase:",
        purchaseError
      );

      setError(
        "That Date item could not be added to Keepsakes."
      );
    } finally {
      setSaving(false);
    }
  }

  async function makeMemory() {
    if (
      !selectedDate
    ) {
      return;
    }

    setSaving(
      true
    );

    try {
      const memory =
        await createMemoryFromDate({
          userId:
            session.user.id,

          date:
            selectedDate,
        });

      setCreatedMemory(
        memory
      );
    } catch (
      memoryError
    ) {
      console.error(
        "Could not create Memory from Date:",
        memoryError
      );

      setError(
        "The Memory could not be created."
      );
    } finally {
      setSaving(
        false
      );
    }
  }

  if (
    connectedDetailId
  ) {
    return (
      <ConnectedObjectDetailScreen
        itemId={
          connectedDetailId
        }
        onOpenRelated={
          setConnectedDetailId
        }
        onBack={() =>
          setConnectedDetailId(
            null
          )
        }
      />
    );
  }

  if (
    selectedDate
  ) {
    const state =
      getDateFlowState(
        selectedDate
      );

    const place =
      typeof selectedDate
        .data
        ?.place ===
      "string"
        ? selectedDate
            .data
            .place
        : "";

    const itinerary =
      typeof selectedDate
        .data
        ?.itinerary ===
      "string"
        ? selectedDate
            .data
            .itinerary
        : "";

    const alloahLooks =
      looks.filter(
        (
          look
        ) =>
          look.owner ===
          "alloah"
      );

    const dominicLooks =
      looks.filter(
        (
          look
        ) =>
          look.owner ===
          "dominic"
      );

    const startAvailability =
      getDateStartAvailability(
        selectedDate,
        lifecycleNow
      );

    const contentThings =
      connectedThings.filter(
        (
          thing
        ) =>
          thing.relation ===
          "contains"
      );

    const connectedIds =
      new Set(
        contentThings.map(
          (
            thing
          ) =>
            thing.item.id
        )
      );

    const venuePurchases =
      readDateVenueWorld(
        selectedDate
      ).purchases;

    const consumedPurchases =
      venuePurchases.filter(
        (purchase) =>
          purchase.action ===
          "ordered"
      );

    const broughtHomePurchases =
      venuePurchases.filter(
        (purchase) =>
          purchase.action ===
          "bought"
      );

    const keptPurchaseIds =
      new Set(
        contentThings
          .filter(
            (thing) =>
              thing.item.kind ===
              "keepsake"
          )
          .map(
            (thing) =>
              typeof thing.item.data
                ?.source_purchase_id ===
              "string"
                ? thing.item.data
                    .source_purchase_id
                : null
          )
          .filter(
            (
              id
            ): id is string =>
              Boolean(id)
          )
      );

    return (
      <section className="dates-experience">
        <button
          type="button"
          className="date-flow-back"
          onClick={() => {
            setSelectedDateId(
              null
            );

            setEditing(
              false
            );

            setPickerOpen(
              false
            );
          }}
        >
          <ArrowLeft
            size={15}
          />{" "}
          Back to Dates
        </button>

        <header className="date-flow-detail-head">
          <span className="date-flow-state-badge">
            {flowLabel(
              state,
              selectedDate,
              lifecycleNow
            )}
          </span>

          <h1>
            {selectedDate.title ??
              "Untitled Date"}
          </h1>

          <div className="date-flow-actions">
            <button
              type="button"
              className="date-flow-link"
              onClick={() =>
                setConnectedDetailId(
                  selectedDate.id
                )
              }
            >
              <Link2
                size={14}
              />{" "}
              Connections
            </button>
          </div>
        </header>

<section className="date-flow-section">
  <small>
    Plan
  </small>

  <h2>
    The plan
  </h2>

  {editing ? (
    <>
      <div className="date-flow-field">
        <label>
          What are we doing?
        </label>

        <input
          value={
            editTitle
          }
          onChange={(
            event
          ) =>
            setEditTitle(
              event
                .target
                .value
            )
          }
        />
      </div>

      <div className="date-flow-field">
        <label>
          Place
        </label>

        <input
          value={
            editPlace
          }
          onChange={(
            event
          ) =>
            setEditPlace(
              event
                .target
                .value
            )
          }
        />

        <button
          type="button"
          className="date-flow-secondary"
          onClick={() =>
            choosePlaceOnMap(
              selectedDate
            )
          }
        >
          <MapPin
            size={14}
          />{" "}
          Choose Place on Map
        </button>
      </div>

      <div className="date-flow-field">
        <label>
          Date
        </label>

        <input
          type="date"
          value={
            editDay
          }
          onChange={(
            event
          ) =>
            setEditDay(
              event
                .target
                .value
            )
          }
        />
      </div>

      <div className="date-flow-field">
        <label>
          Time
        </label>

        <input
          type="time"
          value={
            editTime
          }
          onChange={(
            event
          ) =>
            setEditTime(
              event
                .target
                .value
            )
          }
        />
      </div>

      <div className="date-flow-field">
        <label>
          Note
        </label>

        <textarea
          value={
            editNote
          }
          onChange={(
            event
          ) =>
            setEditNote(
              event
                .target
                .value
            )
          }
        />
      </div>

      <div className="date-flow-field">
        <label>
          Itinerary
        </label>

        <textarea
          value={
            editItinerary
          }
          onChange={(
            event
          ) =>
            setEditItinerary(
              event
                .target
                .value
            )
          }
        />
      </div>

      <div className="date-flow-actions">
        <button
          type="button"
          className="date-flow-secondary"
          onClick={() =>
            setEditing(
              false
            )
          }
        >
          Cancel
        </button>

        <button
          type="button"
          className="date-flow-primary"
          disabled={
            saving ||
            !hasSomething({
              title:
                editTitle,

              place:
                editPlace,

              day:
                editDay,

              time:
                editTime,

              note:
                editNote,

              itinerary:
                editItinerary,
            })
          }
          onClick={() =>
            void saveEdit()
          }
        >
          Save
        </button>
      </div>
    </>
  ) : (
    <>
      <div className="date-flow-plan-grid">
        <div className="date-flow-plan-row">
          <small>
            Place
          </small>

          <span>
            {place ||
              "Not set"}
          </span>
        </div>

        <div className="date-flow-plan-row">
          <small>
            When
          </small>

          <span>
            {dateDisplay(
              selectedDate
            )}
          </span>
        </div>

        <div className="date-flow-plan-row">
          <small>
            Note
          </small>

          <span>
            {selectedDate.body ||
              "Not set"}
          </span>
        </div>

        <div className="date-flow-plan-row">
          <small>
            Itinerary
          </small>

          <span>
            {itinerary ||
              "Not set"}
          </span>
        </div>
      </div>

      <div className="date-flow-actions">
        <button
          type="button"
          className="date-flow-secondary"
          onClick={() =>
            beginEditing(
              selectedDate
            )
          }
        >
          Edit
        </button>

        <button
          type="button"
          className="date-flow-secondary"
          onClick={() =>
            choosePlaceOnMap(
              selectedDate
            )
          }
        >
          <MapPin
            size={14}
          />{" "}
          Choose Place
        </button>

        {(state ===
          "idea" ||
          state ===
            "planned") && (
          <>
            {state ===
              "planned" && (
              <div
                className={`date-lifecycle-note ${startAvailability.phase}`}
              >
                <small>
                  {startAvailability.label}
                </small>

                <span>
                  {startAvailability.detail}
                </span>
              </div>
            )}

            {startAvailability
              .canStartNaturally ? (
              <button
                type="button"
                className="date-flow-primary"
                disabled={
                  saving
                }
                onClick={() =>
                  void beginDate()
                }
              >
                Start Date Mode
              </button>
            ) : (
              <button
                type="button"
                className="date-flow-secondary"
                disabled={
                  saving
                }
                onClick={() =>
                  setEarlyStartConfirm(
                    true
                  )
                }
              >
                Start early
              </button>
            )}
          </>
        )}
      </div>

      {earlyStartConfirm &&
        state ===
          "planned" &&
        !startAvailability
          .canStartNaturally && (
        <div className="date-start-early-confirm">
          <small>
            START EARLY
          </small>

          <strong>
            Start this Date before its planned time?
          </strong>

          <p>
            This will make it the active Date now. It will not happen automatically.
          </p>

          <div className="date-flow-actions">
            <button
              type="button"
              className="date-flow-secondary"
              disabled={
                saving
              }
              onClick={() =>
                setEarlyStartConfirm(
                  false
                )
              }
            >
              Not yet
            </button>

            <button
              type="button"
              className="date-flow-primary"
              disabled={
                saving
              }
              onClick={() =>
                void beginDate(
                  true
                )
              }
            >
              Start early now
            </button>
          </div>
        </div>
      )}
    </>
  )}
</section>
        
        <section className="date-flow-section">
          <small>
            Get ready
          </small>

          <h2>
            What are we wearing?
          </h2>

          <div className="date-flow-get-ready">
            <div className="date-flow-look">
              <strong>
                Alloah
              </strong>

              <select
                value={
                  typeof selectedDate
                    .data
                    ?.alloah_look_id ===
                  "string"
                    ? selectedDate
                        .data
                        .alloah_look_id
                    : ""
                }
                disabled={
                  saving
                }
                onChange={(
                  event
                ) =>
                  void changeLook(
                    "alloah",
                    event
                      .target
                      .value
                  )
                }
              >
                <option value="">
                  No look selected
                </option>

                {alloahLooks.map(
                  (
                    look
                  ) => (
                    <option
                      key={
                        look.id
                      }
                      value={
                        look.id
                      }
                    >
                      {look.title ??
                        "Untitled look"}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="date-flow-look">
              <strong>
                Dominic
              </strong>

              <select
                value={
                  typeof selectedDate
                    .data
                    ?.dominic_look_id ===
                  "string"
                    ? selectedDate
                        .data
                        .dominic_look_id
                    : ""
                }
                disabled={
                  saving
                }
                onChange={(
                  event
                ) =>
                  void changeLook(
                    "dominic",
                    event
                      .target
                      .value
                  )
                }
              >
                <option value="">
                  No look selected
                </option>

                {dominicLooks.map(
                  (
                    look
                  ) => (
                    <option
                      key={
                        look.id
                      }
                      value={
                        look.id
                      }
                    >
                      {look.title ??
                        "Untitled look"}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          {looks.length ===
            0 && (
            <div className="date-flow-actions">
              <button
                type="button"
                className="date-flow-secondary"
                onClick={() =>
                  onOpen?.(
                    "wardrobe"
                  )
                }
              >
                <Shirt
                  size={14}
                />{" "}
                Open Wardrobe
              </button>
            </div>
          )}
        </section>

        {(state ===
          "live" ||
          state ===
            "past") && (
         <section
           className={`date-flow-section ${
              state ===
              "live"
                ? "date-flow-live"
                : ""
            }`}
          >
            <small>
              Date Mode
            </small>

            <h2>
              {state ===
              "live"
                ? "We’re here."
                : "What happened"}
            </h2>

            {state ===
              "live" && (
              <>
<DateHerePanel
  userId={session.user.id}
  date={selectedDate}
  saving={saving}
  onDateUpdated={replaceDate}
  onExploreNearby={exploreNearbyDuringDate}
/>


                <div className="date-flow-field">
                  <label>
                    Live note
                  </label>

                  <textarea
                    value={
                      liveNote
                    }
                    onChange={(
                      event
                    ) =>
                      setLiveNote(
                        event
                          .target
                          .value
                      )
                    }
                  />
                </div>

                <div className="date-flow-actions">
                  <button
                    type="button"
                    className="date-flow-secondary"
                    disabled={
                      saving
                    }
                    onClick={() =>
                      void saveLiveNoteNow()
                    }
                  >
                    Save note
                  </button>

                  <button
                    type="button"
                    className="date-flow-primary"
                    onClick={() =>
                      setPickerOpen(
                        (
                          current
                        ) =>
                          !current
                      )
                    }
                  >
                    <Plus
                      size={14}
                    />{" "}
                    Add from our world
                  </button>
                </div>
              </>
            )}

          {state ===
              "past" &&
              selectedDate
                .data
                ?.live_note && (
                <p className="date-flow-summary">
                  {
                    selectedDate
                      .data
                      .live_note
                  }
                </p>
              )}

           {state === "past" && (
  <DateHistoryPanel
    date={selectedDate}
  />
)}

          </section>
        )}

        {venuePurchases.length > 0 && (
          <section className="date-flow-section date-objects-section">
            <small>
              Little things from the day
            </small>

            <h2>
              What we had & brought home
            </h2>

            {consumedPurchases.length > 0 && (
              <div className="date-object-group">
                <header>
                  <span>what we had</span>
                  <small>
                    food · drinks · little treats
                  </small>
                </header>

                <div className="date-object-strip">
                  {consumedPurchases.map(
                    (purchase) => {
                      const kept =
                        keptPurchaseIds.has(
                          purchase.id
                        );

                      return (
                        <article
                          className="date-object-card consumed"
                          key={purchase.id}
                        >
                          <div
                            className={
                              purchaseVisualUrls[
                                purchase.id
                              ]
                                ? "date-object-visual has-image"
                                : purchaseVisualBusy[
                                      purchase.id
                                    ]
                                  ? "date-object-visual generating"
                                  : "date-object-visual"
                            }
                          >
                            {purchaseVisualUrls[
                              purchase.id
                            ] ? (
                              <img
                                src={
                                  purchaseVisualUrls[
                                    purchase.id
                                  ]
                                }
                                alt={
                                  purchase.itemName
                                }
                              />
                            ) : (
                              <>
                                {purchaseKindIcon(
                                  purchase
                                )}

                                {purchaseVisualBusy[
                                  purchase.id
                                ] && (
                                  <small>
                                    developing…
                                  </small>
                                )}
                              </>
                            )}
                          </div>

                          <span>
                            <strong>
                              {purchase.itemName}
                            </strong>

                            <small>
                              {purchase.actor === "dominic"
                                ? "Dominic"
                                : "You"} · {purchase.placeName}
                            </small>
                          </span>

                          <button
                            type="button"
                            disabled={
                              saving || kept
                            }
                            onClick={() =>
                              void keepVenuePurchase(
                                purchase
                              )
                            }
                          >
                            {kept
                              ? "in the day"
                              : "keep the trace"}
                          </button>
                        </article>
                      );
                    }
                  )}
                </div>
              </div>
            )}

            {broughtHomePurchases.length > 0 && (
              <div className="date-object-group">
                <header>
                  <span>brought home</span>
                  <small>
                    things we bought & kept
                  </small>
                </header>

                <div className="date-object-strip">
                  {broughtHomePurchases.map(
                    (purchase) => {
                      const kept =
                        keptPurchaseIds.has(
                          purchase.id
                        );

                      return (
                        <article
                          className="date-object-card kept"
                          key={purchase.id}
                        >
                          <div
                            className={
                              purchaseVisualUrls[
                                purchase.id
                              ]
                                ? "date-object-visual has-image"
                                : purchaseVisualBusy[
                                      purchase.id
                                    ]
                                  ? "date-object-visual generating"
                                  : "date-object-visual"
                            }
                          >
                            {purchaseVisualUrls[
                              purchase.id
                            ] ? (
                              <img
                                src={
                                  purchaseVisualUrls[
                                    purchase.id
                                  ]
                                }
                                alt={
                                  purchase.itemName
                                }
                              />
                            ) : (
                              <>
                                {purchaseKindIcon(
                                  purchase
                                )}

                                {purchaseVisualBusy[
                                  purchase.id
                                ] && (
                                  <small>
                                    developing…
                                  </small>
                                )}
                              </>
                            )}
                          </div>

                          <span>
                            <strong>
                              {purchase.itemName}
                            </strong>

                            <small>
                              {purchase.actor === "dominic"
                                ? "Dominic"
                                : "You"} · {purchase.placeName}
                            </small>
                          </span>

                          <button
                            type="button"
                            disabled={
                              saving || kept
                            }
                            onClick={() =>
                              void keepVenuePurchase(
                                purchase
                              )
                            }
                          >
                            {kept
                              ? "kept"
                              : "add to Keepsakes"}
                          </button>
                        </article>
                      );
                    }
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        <section className="date-flow-section">
          <small>
            Things from this Date
          </small>
          
          <h2>
            What belongs here
          </h2>

          {contentThings.length ===
          0 ? (
            <p>
              Nothing connected yet.
            </p>
          ) : (
            <div className="date-flow-things">
              {contentThings.map(
                (
                  thing
                ) => (
                  <div
                    className="date-flow-thing"
                    key={`${thing.relation}-${thing.item.id}`}
                  >
                    <div>
                      <small>
                        {itemKindLabel(
                          thing
                            .item
                            .kind
                        )}
                      </small>

                      <strong>
                        {thing
                          .item
                          .title ??
                          "Untitled object"}
                      </strong>
                    </div>

                    <button
                      type="button"
                      disabled={
                        saving
                      }
                      onClick={() =>
                        void toggleThing(
                          thing
                            .item
                        )
                      }
                    >
                      Remove
                    </button>
                  </div>
                )
              )}
            </div>
          )}

          <div className="date-flow-actions">
            <button
              type="button"
              className="date-flow-secondary"
              onClick={() =>
                setPickerOpen(
                  (
                    current
                  ) =>
                    !current
                )
              }
            >
              <Plus
                size={14}
              />{" "}
              Manage contents
            </button>
          </div>

          {pickerOpen && (
            <div className="date-flow-picker">
              <strong>
                Add existing objects
              </strong>

              <div className="date-flow-picker-list">
                {candidates.map(
                  (
                    item
                  ) => {
                    const connected =
                      connectedIds.has(
                        item.id
                      );

                    return (
                      <div
                        className="date-flow-picker-item"
                        key={
                          item.id
                        }
                      >
                        <div>
                          <small>
                            {itemKindLabel(
                              item.kind
                            )}
                          </small>

                          <strong>
                            {item.title ??
                              "Untitled object"}
                          </strong>
                        </div>

                        <button
                          type="button"
                          disabled={
                            saving
                          }
                          onClick={() =>
                            void toggleThing(
                              item
                            )
                          }
                        >
                          {connected
                            ? "Remove"
                            : "Add"}
                        </button>
                      </div>
                    );
                  }
                )}
              </div>

              <div className="date-flow-actions">
                <button
                  type="button"
                  className="date-flow-secondary"
                  onClick={() =>
                    onOpen?.(
                      "gallery"
                    )
                  }
                >
                  Gallery
                </button>

                <button
                  type="button"
                  className="date-flow-secondary"
                  onClick={() =>
                    onOpen?.(
                      "music"
                    )
                  }
                >
                  Music
                </button>

                <button
                  type="button"
                  className="date-flow-secondary"
                  onClick={() =>
                    onOpen?.(
                      "keepsakes"
                    )
                  }
                >
                  Keepsakes
                </button>
              </div>
            </div>
          )}
        </section>

        {state ===
          "live" && (
          <section className="date-flow-section">
            <small>
              Finish
            </small>

            <h2>
              End the Date
            </h2>

            <div className="date-flow-field">
              <label>
                What happened?
              </label>

              <textarea
                value={
                  finishSummary
                }
                onChange={(
                  event
                ) =>
                  setFinishSummary(
                    event
                      .target
                      .value
                  )
                }
              />
            </div>

            <button
              type="button"
              className="date-flow-primary"
              disabled={
                saving
              }
              onClick={() =>
                void completeDate()
              }
            >
              Finish Date
            </button>
          </section>
        )}

        {state ===
          "past" && (
          <section className="date-flow-section">
            <small>
              After
            </small>

            <h2>
              What remains
            </h2>

            {selectedDate
              .data
              ?.summary ? (
              <p className="date-flow-summary">
                {
                  selectedDate
                    .data
                    .summary
                }
              </p>
            ) : (
              <p>
                No final summary was written.
              </p>
            )}

            <div className="date-flow-actions">
              <button
                type="button"
                className="date-flow-primary"
                disabled={
                  saving ||
                  Boolean(
                    createdMemory
                  )
                }
                onClick={() =>
                  void makeMemory()
                }
              >
                Save this Date as a Memory
              </button>
            </div>

            {createdMemory && (
              <p className="date-flow-success">
                Memory connected:{" "}
                <strong>
                  {createdMemory.title ??
                    "Untitled Memory"}
                </strong>
              </p>
            )}
          </section>
        )}

        {error && (
          <p
            className="date-flow-error"
            role="alert"
          >
            {error}
          </p>
        )}
      </section>
    );
  }

  const visibleDates =
    dates
      .filter(
        (
          date
        ) => {
          const state =
            getDateFlowState(
              date
            );

          if (
            view ===
            "upcoming"
          ) {
            return (
              state ===
                "planned" ||
              state ===
                "live"
            );
          }

          if (
            view ===
            "past"
          ) {
            return (
              state ===
              "past"
            );
          }

          return (
            state ===
            "idea"
          );
        }
      )
      .sort(
        (
          first,
          second
        ) => {
          const firstValue =
            first.planned_for ??
            first.event_at ??
            first.created_at;

          const secondValue =
            second.planned_for ??
            second.event_at ??
            second.created_at;

          const firstTime =
            new Date(
              firstValue
            ).getTime();

          const secondTime =
            new Date(
              secondValue
            ).getTime();

          return view ===
            "past"
            ? secondTime -
                firstTime
            : firstTime -
                secondTime;
        }
      );

  const newHasSomething =
    hasSomething({
      title:
        newTitle,

      place:
        newPlace,

      day:
        newDay,

      time:
        newTime,

      note:
        newNote,

      itinerary:
        newItinerary,
    });

  return (
    <section className="dates-experience">
      <header className="date-flow-intro">
        <p className="date-flow-eyebrow">
          Plans · getting ready · lived days
        </p>

        <h1>
          Dates
        </h1>

        <p>
          Add whatever you already know.
          The Date becomes an idea or a plan
          from the context itself.
        </p>
      </header>

      <div
        className="date-flow-tabs"
        role="tablist"
        aria-label="Dates"
      >
        <button
          type="button"
          className={
            view ===
            "upcoming"
              ? "active"
              : ""
          }
          onClick={() =>
            setView(
              "upcoming"
            )
          }
        >
          Upcoming
        </button>

        <button
          type="button"
          className={
            view ===
            "past"
              ? "active"
              : ""
          }
          onClick={() =>
            setView(
              "past"
            )
          }
        >
          Past
        </button>

        <button
          type="button"
          className={
            view ===
            "ideas"
              ? "active"
              : ""
          }
          onClick={() =>
            setView(
              "ideas"
            )
          }
        >
          Ideas
        </button>
      </div>

      {!creating && (
        <button
          type="button"
          className="date-flow-primary date-flow-add"
          onClick={() =>
            setCreating(
              true
            )
          }
        >
          <Plus
            size={14}
          />{" "}
          Add a Date
        </button>
      )}

      {creating && (
        <section className="date-flow-form">
          <small>
            New
          </small>

          <h2>
            Add a Date
          </h2>

          <p>
            Fill only what you know. A Date
            with a day becomes Upcoming.
            Without a day, it stays an Idea.
          </p>

          <div className="date-flow-field">
            <label>
              What are we doing?
            </label>

            <input
              value={
                newTitle
              }
              onChange={(
                event
              ) =>
                setNewTitle(
                  event
                    .target
                    .value
                )
              }
              autoFocus
            />
          </div>

          <div className="date-flow-field">
            <label>
              Place
            </label>

            <input
              value={
                newPlace
              }
              onChange={(
                event
              ) =>
                setNewPlace(
                  event
                    .target
                    .value
                )
              }
            />
          </div>

          <div className="date-flow-field">
            <label>
              Date
            </label>

            <input
              type="date"
              value={
                newDay
              }
              onChange={(
                event
              ) =>
                setNewDay(
                  event
                    .target
                    .value
                )
              }
            />
          </div>

          <div className="date-flow-field">
            <label>
              Time
            </label>

            <input
              type="time"
              value={
                newTime
              }
              onChange={(
                event
              ) =>
                setNewTime(
                  event
                    .target
                    .value
                )
              }
            />
          </div>

          <div className="date-flow-field">
            <label>
              Note
            </label>

            <textarea
              value={
                newNote
              }
              onChange={(
                event
              ) =>
                setNewNote(
                  event
                    .target
                    .value
                )
              }
            />
          </div>

          <div className="date-flow-field">
            <label>
              Itinerary
            </label>

            <textarea
              value={
                newItinerary
              }
              onChange={(
                event
              ) =>
                setNewItinerary(
                  event
                    .target
                    .value
                )
              }
            />
          </div>

          <div className="date-flow-actions">
            <button
              type="button"
              className="date-flow-secondary"
              onClick={
                resetNewDate
              }
            >
              Cancel
            </button>

            <button
              type="button"
              className="date-flow-primary"
              disabled={
                saving ||
                !newHasSomething
              }
              onClick={() =>
                void saveNewDate()
              }
            >
              Save
            </button>
          </div>
        </section>
      )}

      {loading ? (
        <div className="date-flow-empty">
          <strong>
            Opening Dates…
          </strong>
        </div>
      ) : visibleDates.length ===
        0 ? (
        <div className="date-flow-empty">
          <CalendarDays
            size={24}
          />

          <strong>
            {view ===
            "upcoming"
              ? "Nothing upcoming."
              : view ===
                  "past"
                ? "No past Dates yet."
                : "No Date ideas yet."}
          </strong>

          <span>
            The world gets fuller as things
            actually happen.
          </span>
        </div>
      ) : (
        <div className="date-flow-list">
          {visibleDates.map(
            (
              date
            ) => {
              const state =
                getDateFlowState(
                  date
                );

              const place =
                typeof date
                  .data
                  ?.place ===
                "string"
                  ? date.data
                      .place
                  : "";

              return (
                <article
                  key={
                    date.id
                  }
                  className={`date-flow-card ${
                    state ===
                    "live"
                      ? "date-flow-live-card"
                      : ""
                  }`}
                  onClick={() =>
                    setSelectedDateId(
                      date.id
                    )
                  }
                >
                  <header>
                    <div>
                      <span className="date-flow-card-status">
                        {flowLabel(
                          state,
                          date,
                          lifecycleNow
                        )}
                      </span>

                      <strong>
                        {date.title ??
                          "Untitled Date"}
                      </strong>
                    </div>

                    <ChevronRight
                      size={17}
                    />
                  </header>

                  {place && (
                    <p>
                      <MapPin
                        size={13}
                      />{" "}
                      {place}
                    </p>
                  )}

                  <div className="date-flow-card-meta">
                    <span>
                      {dateDisplay(
                        date
                      )}
                    </span>
                  </div>
                </article>
              );
            }
          )}
        </div>
      )}

      {error && (
        <p
          className="date-flow-error"
          role="alert"
        >
          {error}
        </p>
      )}
    </section>
  );
}
