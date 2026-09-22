import { createFileRoute } from "@tanstack/react-router";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  ArrowLeft,
  BookOpen,
  Box as BoxIcon,
  Calendar as CalendarIcon,
  ChevronRight,
  Clock,
  Disc3,
  Heart,
  Home,
  Image as ImageIcon,
  LampDesk,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Music2,
  Play,
  Send,
  Settings,
  Shirt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DiarioChat } from "@/components/diario-chat";
import { PrivateDiario, usePrivateDiario } from "@/components/private-diario";
import { useTimeMood, type TimeMoodState } from "@/lib/time-mood";
import {
  addItemToMemory,
  addPhotoToGalleryAlbum,
  createGalleryAlbum,
  createLetter,
  createMemory,
  getDiaryPages,
  getGalleryAlbumPhotoIds,
  getGalleryAlbums,
  getGalleryPhotos,
  getLetters,
  getLocalDateKey,
  getMemories,
  getMemoryItemIds,
  removeItemFromMemory,
  removePhotoFromGalleryAlbum,
  saveDiaryPage,
  setGalleryPhotoFavorite,
  uploadGalleryPhoto,
  type DiarioItem,
  type GalleryPhoto,
} from "@/lib/diario-world";
import room from "@/assets/dominic-room.jpg";
import livingRoom from "@/assets/living-room.jpeg";
import bedroom from "@/assets/bedroom.png";
import kitchen from "@/assets/kitchen.png";
import bathroom from "@/assets/bathroom.png";
import hall from "@/assets/hall.png";
import floorPlan from "@/assets/apartment-floor-plan.png";

type Screen =
  | "home"
  | "chat"
  | "diary"
  | "more"
  | "room"
  | "letters"
  | "gallery"
  | "memories"
  | "calendar"
  | "timeline"
  | "music"
  | "dates"
  | "keepsakes"
  | "wardrobe"
  | "night"
  | "settings";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Diário — a life that feels real" },
      {
        name: "description",
        content: "A private, living diary for a shared fictional world.",
      },
      { property: "og:title", content: "Diário — a life that feels real" },
      {
        property: "og:description",
        content: "A private, living diary for a shared fictional world.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Index,
});

const navItems: { id: Screen; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "chat", label: "Chat", icon: Send },
  { id: "diary", label: "Diary", icon: BookOpen },
  { id: "more", label: "More", icon: Menu },
];

const primaryScreens: Screen[] = ["home", "chat", "diary", "more"];

function Index() {
  return (
    <PrivateDiario>
      <DiarioApp />
    </PrivateDiario>
  );
}

function DiarioApp() {
  const [screen, setScreen] = useState<Screen>("home");
  const [activeRoom, setActiveRoom] = useState("living");
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollPositions = useRef<Partial<Record<Screen, number>>>({});
  const time = useTimeMood();
  const detail = !primaryScreens.includes(screen);

  const openScreen = (nextScreen: Screen) => {
    if (scrollRef.current) {
      scrollPositions.current[screen] = scrollRef.current.scrollTop;
    }

    setScreen(nextScreen);
  };

  const openRoom = (roomId: string) => {
    setActiveRoom(roomId);
    openScreen("room");
  };

  useLayoutEffect(() => {
    const scrollElement = scrollRef.current;

    if (!scrollElement) return;

    scrollElement.scrollTop = scrollPositions.current[screen] ?? 0;
  }, [screen]);

  return (
    <main
      className={`prototype-stage time-${time.mood}`}
      data-time-theme={time.mood}
    >
      <div className="phone-shell" data-time-theme={time.mood}>
        <div className="statusbar" aria-hidden="true">
          <span>{time.timeLabel}</span>
          <span className="brand-mark">Diário</span>
          <span>•••</span>
        </div>

        {detail && (
          <button
            className="back-button"
            onClick={() => openScreen(screen === "room" ? "home" : "more")}
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
        )}

        <div
          ref={scrollRef}
          className={`screen-scroll screen-${screen}`}
          key={screen}
        >
          {screen === "home" && (
            <HomeScreen
              time={time}
              onOpenRoom={openRoom}
            />
          )}

          {screen === "chat" && <DiarioChat />}

          {screen === "diary" && <DiaryScreen />}

          {screen === "more" && (
            <MoreScreen onOpen={openScreen} />
          )}

          {screen === "room" && (
            <RoomScreen
              time={time}
              roomId={activeRoom}
              onOpen={openScreen}
              onOpenRoom={openRoom}
            />
          )}

          {screen === "letters" && <LettersScreen />}
          {screen === "gallery" && <GalleryScreen />}
          {screen === "night" && <MorningNightScreen time={time} />}
          {screen === "memories" && <MemoriesScreen />}
          {screen === "calendar" && <CalendarScreen />}
          {screen === "timeline" && <TimelineScreen />}
          {screen === "music" && <MusicScreen />}
          {screen === "dates" && <DatesScreen />}
          {screen === "keepsakes" && <KeepsakesScreen />}
          {screen === "wardrobe" && <WardrobeScreen />}
          {screen === "settings" && <SettingsScreen />}
        </div>

        {!detail && (
          <BottomNav
            active={screen}
            onOpen={openScreen}
          />
        )}
      </div>
    </main>
  );
}
function ScreenIntro({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="screen-intro">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {children}
    </header>
  );
}

function HomeScreen({
  time,
  onOpenRoom,
}: {
  time: TimeMoodState;
  onOpenRoom: (roomId: string) => void;
}) {
  const spaces = [
    {
      id: "living",
      label: "Living Room",
      caption: "the heart of the apartment",
    },
    {
      id: "bedroom",
      label: "Bedroom",
      caption: "quiet, warm, ours",
    },
    {
      id: "kitchen",
      label: "Kitchen",
      caption: "wood, white tile, everyday life",
    },
    {
      id: "bathroom",
      label: "Bathroom",
      caption: "small, old, simple",
    },
    {
      id: "hall",
      label: "Hall",
      caption: "the way in and out",
    },
  ];

  const [activeSpace, setActiveSpace] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [showFloorPlan, setShowFloorPlan] = useState(false);

  const currentSpace = spaces[activeSpace];

  const previousSpace = () => {
    setActiveSpace((current) =>
      current === 0 ? spaces.length - 1 : current - 1
    );
  };

  const nextSpace = () => {
    setActiveSpace((current) =>
      current === spaces.length - 1 ? 0 : current + 1
    );
  };

  const handleTouchStart = (
    event: React.TouchEvent<HTMLDivElement>
  ) => {
    setTouchStartX(event.touches[0].clientX);
  };

  const handleTouchEnd = (
    event: React.TouchEvent<HTMLDivElement>
  ) => {
    if (touchStartX === null) return;

    const endX = event.changedTouches[0].clientX;
    const distance = touchStartX - endX;

    if (Math.abs(distance) > 45) {
      if (distance > 0) {
        nextSpace();
      } else {
        previousSpace();
      }
    }

    setTouchStartX(null);
  };

  const openRoomFromPlan = (roomId: string) => {
    setShowFloorPlan(false);
    onOpenRoom(roomId);
  };

  return (
    <section className="home-screen home-live home-house">
      <header className="house-header">
        <div className="house-heading">
          <span className="house-kicker">
            our apartment · new york
          </span>

          <strong>{currentSpace.label}</strong>

          <small>{currentSpace.caption}</small>
        </div>

        <div className="house-time">
          <span>{time.timeLabel}</span>
          <small>{time.dateLabel}</small>
        </div>
      </header>

      <div
        className={`house-stage space-${currentSpace.id}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={
            currentSpace.id === "living"
              ? livingRoom
              : currentSpace.id === "bedroom"
                ? bedroom
                : currentSpace.id === "kitchen"
                  ? kitchen
                  : currentSpace.id === "bathroom"
                    ? bathroom
                    : hall
          }
          alt={`${currentSpace.label} in our apartment`}
          width={1280}
          height={960}
        />

        <div className="house-stage-shade" />

        <button
          className="house-object house-object-one"
          aria-label={`Open ${currentSpace.label}`}
          onClick={() => onOpenRoom(currentSpace.id)}
        >
          <span />
        </button>

        <button
          className="house-object house-object-two"
          aria-label={`Open details for ${currentSpace.label}`}
          onClick={() => onOpenRoom(currentSpace.id)}
        >
          <span />
        </button>

        <div className="house-room-label">
          <strong>{currentSpace.label}</strong>

          <small>
            {activeSpace + 1} / {spaces.length}
          </small>
        </div>

        <button
          className="house-arrow house-arrow-left"
          onClick={previousSpace}
          aria-label="Previous room"
        >
          ‹
        </button>

        <button
          className="house-arrow house-arrow-right"
          onClick={nextSpace}
          aria-label="Next room"
        >
          ›
        </button>
      </div>

      <button
        className="floor-plan-trigger"
        onClick={() => setShowFloorPlan(true)}
        aria-label="Open apartment floor plan"
      >
        <span aria-hidden="true">⌂</span>
        <small>floor plan</small>
      </button>

      <nav
        className="house-space-strip"
        aria-label="Apartment rooms"
      >
        {spaces.map((space, index) => (
          <button
            key={space.id}
            className={index === activeSpace ? "active" : ""}
            onClick={() => setActiveSpace(index)}
          >
            <span
              className={`room-thumb room-thumb-${space.id}`}
              aria-hidden="true"
            />

            <small>{space.label}</small>
          </button>
        ))}
      </nav>

      {showFloorPlan && (
        <div
          className="floor-plan-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Apartment floor plan"
        >
          <div className="floor-plan-sheet">
            <button
              className="floor-plan-close"
              onClick={() => setShowFloorPlan(false)}
              aria-label="Close floor plan"
            >
              ×
            </button>

            <div className="floor-plan-heading">
              <small>our apartment</small>
              <strong>Floor Plan</strong>
            </div>

            <div className="official-floor-plan floor-plan-modal-map">
              <img
                src={floorPlan}
                alt="Official floor plan of our apartment"
                width={1536}
                height={1024}
              />

              <button
                className="plan-hotspot plan-hotspot-living"
                onClick={() => openRoomFromPlan("living")}
                aria-label="Enter Living Room"
              />

              <button
                className="plan-hotspot plan-hotspot-bedroom"
                onClick={() => openRoomFromPlan("bedroom")}
                aria-label="Enter Bedroom"
              />

              <button
                className="plan-hotspot plan-hotspot-kitchen"
                onClick={() => openRoomFromPlan("kitchen")}
                aria-label="Enter Kitchen"
              />

              <button
                className="plan-hotspot plan-hotspot-bathroom"
                onClick={() => openRoomFromPlan("bathroom")}
                aria-label="Enter Bathroom"
              />

              <button
                className="plan-hotspot plan-hotspot-hall"
                onClick={() => openRoomFromPlan("hall")}
                aria-label="Enter Hall"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
function RoomScreen({
  time,
  roomId,
  onOpen,
  onOpenRoom,
}: {
  time: TimeMoodState;
  roomId: string;
  onOpen: (screen: Screen) => void;
  onOpenRoom: (roomId: string) => void;
}) {
  const [selectedObject, setSelectedObject] = useState<string | null>(null);

  const rooms = {
    living: {
      label: "Living Room",
      caption: "the heart of the apartment",
      image: livingRoom,
    },
    bedroom: {
      label: "Bedroom",
      caption: "quiet, warm, ours",
      image: bedroom,
    },
    kitchen: {
      label: "Kitchen",
      caption: "wood, white tile, everyday life",
      image: kitchen,
    },
    bathroom: {
      label: "Bathroom",
      caption: "small, old, simple",
      image: bathroom,
    },
    hall: {
      label: "Hall",
      caption: "the way in and out",
      image: hall,
    },
  };

  const room =
  rooms[roomId as keyof typeof rooms] ?? rooms.living;

const roomObjects =
  roomId === "living"
    ? [
        {
          id: "sofa",
          label: "Sofa",
          type: "furniture",
        },
        {
          id: "coffee-table",
          label: "Coffee Table",
          type: "furniture",
        },
        {
          id: "record-corner",
          label: "Records",
          type: "music",
        },
        {
          id: "window",
          label: "Window",
          type: "environment",
        },
        {
          id: "monstera",
          label: "Monstera",
          type: "plant",
        },
      ]
    : [];

return (
    <section className="room-screen apartment-screen">
      <ScreenIntro
        eyebrow={`${time.dateLabel} · ${time.timeLabel}`}
        title={room.label}
      >
        <p className="intro-copy">{room.caption}</p>
      </ScreenIntro>

<figure className={`room-view apartment-view room-view-${roomId}`}>
  <img
    src={room.image}
    alt={`${room.label} in our apartment`}
    width={1280}
    height={960}
  />

{roomObjects.map((object) => (
  <button
    key={object.id}
    className={`room-hotspot room-hotspot-${object.id}`}
    aria-label={object.label}
    data-object-type={object.type}
    onClick={() => {
      if (object.id === "record-corner") {
        onOpen("music");
        return;
      }

      setSelectedObject(object.id);
    }}
  >
    <span />
    <small>{object.label}</small>
  </button>
))}
</figure>
{selectedObject && (
  <div className="room-object-sheet">
    <div className="room-object-sheet-header">
      <div>
        <small>in this room</small>

        <strong>
          {roomObjects.find((object) => object.id === selectedObject)?.label}
        </strong>
      </div>

      <button
        className="room-object-close"
        onClick={() => setSelectedObject(null)}
        aria-label="Close object"
      >
        ×
      </button>
    </div>

    <p>
      {roomObjects.find((object) => object.id === selectedObject)?.type}
    </p>

    <div className="room-object-actions">
      <button>
        <span>↔</span>
        Move
      </button>

      <button>
        <span>✦</span>
        Change
      </button>

      <button>
        <span>□</span>
        Store
      </button>
    </div>
  </div>
)}

<nav className="room-navigation" aria-label="Move through the apartment">
  {[
    { id: "living", label: "Living" },
    { id: "bedroom", label: "Bedroom" },
    { id: "kitchen", label: "Kitchen" },
    { id: "bathroom", label: "Bathroom" },
    { id: "hall", label: "Hall" },
  ].map((item) => (
    <button
      key={item.id}
      className={roomId === item.id ? "active" : ""}
      onClick={() => onOpenRoom(item.id)}
      aria-current={roomId === item.id ? "page" : undefined}
    >
      {item.label}
    </button>
  ))}
</nav>

<div className="room-caption">
        <span>our apartment · new york</span>
        <p>
          This room keeps its architecture. Furniture, objects and memories
          can change around it over time.
        </p>
      </div>

      <div className="room-tool-grid">
        <button>
          <span>＋</span>
          <strong>Add something</strong>
          <small>furniture, decor, objects</small>
        </button>

        <button>
          <span>↔</span>
          <strong>Move something</strong>
          <small>change where an object lives</small>
        </button>

        <button>
          <span>▧</span>
          <strong>References</strong>
          <small>save ideas for this room</small>
        </button>

        <button>
          <span>✦</span>
          <strong>Try a change</strong>
          <small>preview · keep · discard</small>
        </button>
      </div>
    </section>
  );
}
function MoreScreen({ onOpen }: { onOpen: (screen: Screen) => void }) {
  const { preferredName, signOut } = usePrivateDiario();
  const entries: { name: string; note: string; target: Screen; icon: ReactNode }[] = [
    { name: "Memories", note: "the moments that stay", target: "memories", icon: <Heart /> },
    { name: "Gallery", note: "photos, videos & context", target: "gallery", icon: <ImageIcon /> },
    { name: "Letters", note: "letters, notes & envelopes", target: "letters", icon: <Mail /> },
    { name: "Calendar", note: "days, plans & what happened", target: "calendar", icon: <CalendarIcon /> },
    { name: "Timeline", note: "our story in order", target: "timeline", icon: <Clock /> },
    { name: "Music", note: "Mine · Dominic · Ours", target: "music", icon: <Music2 /> },
    { name: "Dates", note: "places, plans & memories", target: "dates", icon: <MapPin /> },
    { name: "Keepsakes", note: "little things with a history", target: "keepsakes", icon: <BoxIcon /> },
    { name: "Wardrobe", note: "looks for our days", target: "wardrobe", icon: <Shirt /> },
    { name: "Morning / Night", note: "the day changes with you", target: "night", icon: <Disc3 /> },
    { name: "Settings", note: "make this place yours", target: "settings", icon: <Settings /> },
  ];

  return (
    <section className="more-screen">
      <ScreenIntro eyebrow={`Private space · ${preferredName}`} title="more of us">
        <p className="intro-copy">everything belongs to the same world.</p>
      </ScreenIntro>
      <div className="index-list richer-index">
        {entries.map((entry, index) => (
          <button key={entry.name} onClick={() => onOpen(entry.target)} className="available">
            <span className="index-number">{String(index + 1).padStart(2, "0")}</span>
            <span className="index-icon">{entry.icon}</span>
            <div>
              <strong>{entry.name}</strong>
              <small>{entry.note}</small>
            </div>
            <ChevronRight size={17} />
          </button>
        ))}
      </div>
      <div className="more-signoff">
        <p className="index-signoff">same time. different light. always you.</p>
        <Button variant="ghost" size="sm" onClick={signOut}>
          <LogOut /> Leave for now
        </Button>
      </div>
    </section>
  );
}

function DiaryScreen() {
  const { session } = usePrivateDiario();

  const [owner, setOwner] =
    useState<"alloah" | "dominic">("alloah");

  const [pages, setPages] =
    useState<DiarioItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [editing, setEditing] =
    useState(false);

  const [draft, setDraft] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const todayKey = getLocalDateKey();

  const todayPage =
    pages.find(
      (page) =>
        page.data?.local_date === todayKey
    ) ?? null;

  const pastPages =
    pages.filter(
      (page) =>
        page.data?.local_date !== todayKey
    );

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError(null);
    setEditing(false);
    setDraft("");

    getDiaryPages(
      session.user.id,
      owner
    )
      .then((loadedPages) => {
        if (!active) return;

        setPages(loadedPages);
        setLoading(false);
      })
      .catch((loadError) => {
        if (!active) return;

        console.error(
          "Could not load diary pages:",
          loadError
        );

        setError(
          "The diary could not be opened right now."
        );

        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [owner, session.user.id]);

  const startWriting = () => {
    setDraft(todayPage?.body ?? "");
    setEditing(true);
    setError(null);
  };

  const savePage = async () => {
    if (!draft.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const savedPage =
        await saveDiaryPage({
          id: todayPage?.id,
          userId: session.user.id,
          owner: "alloah",
          body: draft,
          localDate: todayKey,
          eventAt:
            todayPage?.event_at ??
            new Date().toISOString(),
        });

      setPages((currentPages) => [
        savedPage,
        ...currentPages.filter(
          (page) =>
            page.id !== savedPage.id
        ),
      ]);

      setDraft(savedPage.body ?? "");
      setEditing(false);
    } catch (saveError) {
      console.error(
        "Could not save diary page:",
        saveError
      );

      setError(
        "Your page could not be saved. Try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="diary-screen diary-live">
      <ScreenIntro
        eyebrow="Private pages · written when they happen"
        title="Diary"
      >
        <p className="intro-copy">
          real days only. nothing becomes part of our history before it is lived.
        </p>
      </ScreenIntro>

      <div
        className="diary-owner-tabs"
        role="tablist"
        aria-label="Diary owner"
      >
        <button
          type="button"
          role="tab"
          aria-selected={
            owner === "alloah"
          }
          className={
            owner === "alloah"
              ? "active"
              : ""
          }
          onClick={() =>
            setOwner("alloah")
          }
        >
          Alloah
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={
            owner === "dominic"
          }
          className={
            owner === "dominic"
              ? "active"
              : ""
          }
          onClick={() =>
            setOwner("dominic")
          }
        >
          Dominic
        </button>
      </div>

      <article className="diary-today-card">
        <header className="diary-today-header">
          <div>
            <span>today</span>

            <strong>
              {owner === "alloah"
                ? "Your page"
                : "Dominic's page"}
            </strong>
          </div>

          <small>
            {owner === "alloah"
              ? "private"
              : "his space"}
          </small>
        </header>

        {loading ? (
          <div className="diary-empty-page">
            <p>
              Opening today's page…
            </p>
          </div>
        ) : editing &&
          owner === "alloah" ? (
          <div className="diary-empty-page diary-editor">
            <textarea
              value={draft}
              onChange={(event) =>
                setDraft(
                  event.target.value
                )
              }
              placeholder="Write what happened today…"
              rows={12}
              autoFocus
            />

            <div className="diary-editor-actions">
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setDraft(
                    todayPage?.body ?? ""
                  );
                }}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="button"
                className="diary-write-button"
                onClick={savePage}
                disabled={
                  saving ||
                  !draft.trim()
                }
              >
                {saving
                  ? "Saving…"
                  : "Save today's page"}
              </button>
            </div>
          </div>
        ) : todayPage ? (
          <div className="diary-empty-page diary-written-page">
            <p className="diary-page-body">
              {todayPage.body}
            </p>

            {owner === "alloah" && (
              <button
                type="button"
                className="diary-write-button"
                onClick={startWriting}
              >
                Edit today's page
              </button>
            )}
          </div>
        ) : (
          <div className="diary-empty-page">
            <div
              className="diary-page-mark"
              aria-hidden="true"
            >
              ✦
            </div>

            <h2>
              Nothing written here yet.
            </h2>

            <p>
              {owner === "alloah"
                ? "When you write about a real day, this page can later connect to its photos, music, places, letters and memories."
                : "His pages belong to him. They only appear here when something is actually written or shared in the world."}
            </p>

            {owner === "alloah" && (
              <button
                type="button"
                className="diary-write-button"
                onClick={startWriting}
              >
                Write today's page
              </button>
            )}
          </div>
        )}

        {error && (
          <p role="alert">
            {error}
          </p>
        )}

        <footer className="diary-page-footer">
          <span>
            {owner === "alloah"
              ? "Alloah's diary"
              : "Dominic's diary"}
          </span>

          <span>
            no invented history
          </span>
        </footer>
      </article>

      <section className="diary-archive-preview">
        <header>
          <span>archive</span>
          <strong>Past pages</strong>
        </header>

        {pastPages.length === 0 ? (
          <div className="diary-archive-empty">
            <p>
              Days will appear here after they are lived and written.
            </p>
          </div>
        ) : (
          <div className="diary-archive-list">
            {pastPages.map((page) => (
              <article
                key={page.id}
                className="diary-archive-item"
              >
                <small>
                  {page.event_at
                    ? new Intl.DateTimeFormat(
                        "en",
                        {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          timeZone:
                            "America/Sao_Paulo",
                        }
                      ).format(
                        new Date(
                          page.event_at
                        )
                      )
                    : "Past page"}
                </small>

                <p>
                  {page.body}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
function LettersScreen() {
  const { session } = usePrivateDiario();

  const [letterView, setLetterView] =
    useState<"all" | "mine" | "dominic">("all");

  const [letters, setLetters] =
    useState<DiarioItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [writing, setWriting] =
    useState(false);

  const [title, setTitle] =
    useState("");

  const [body, setBody] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError(null);

    getLetters(session.user.id)
      .then((loadedLetters) => {
        if (!active) return;

        setLetters(loadedLetters);
        setLoading(false);
      })
      .catch((loadError) => {
        if (!active) return;

        console.error(
          "Could not load letters:",
          loadError
        );

        setError(
          "The letter drawer could not be opened right now."
        );

        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [session.user.id]);

  const visibleLetters =
    letters.filter((letter) => {
      if (letterView === "all") {
        return true;
      }

      if (letterView === "mine") {
        return letter.owner === "alloah";
      }

      return letter.owner === "dominic";
    });

  const saveLetter = async () => {
    if (!body.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const savedLetter =
        await createLetter({
          userId: session.user.id,
          owner: "alloah",
          title,
          body,
        });

      setLetters((currentLetters) => [
        savedLetter,
        ...currentLetters,
      ]);

      setTitle("");
      setBody("");
      setWriting(false);
      setLetterView("all");
    } catch (saveError) {
      console.error(
        "Could not save letter:",
        saveError
      );

      setError(
        "Your letter could not be saved. Try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="letters-screen letters-live">
      <ScreenIntro
        eyebrow="Letters · notes · things easier written"
        title="Letters"
      >
        <p className="intro-copy">
          letters only appear here after someone actually writes or sends one.
        </p>
      </ScreenIntro>

      <div
        className="letters-filter"
        role="tablist"
        aria-label="Letter filter"
      >
        <button
          type="button"
          role="tab"
          aria-selected={
            letterView === "all"
          }
          className={
            letterView === "all"
              ? "active"
              : ""
          }
          onClick={() =>
            setLetterView("all")
          }
        >
          All
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={
            letterView === "mine"
          }
          className={
            letterView === "mine"
              ? "active"
              : ""
          }
          onClick={() =>
            setLetterView("mine")
          }
        >
          From me
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={
            letterView === "dominic"
          }
          className={
            letterView === "dominic"
              ? "active"
              : ""
          }
          onClick={() =>
            setLetterView("dominic")
          }
        >
          From Dominic
        </button>
      </div>

      {writing ? (
        <section className="letters-empty-stage letters-editor">
          <div className="letters-empty-copy">
            <small>
              new letter
            </small>

            <h2>
              Write a letter
            </h2>
          </div>

          <input
            type="text"
            value={title}
            onChange={(event) =>
              setTitle(
                event.target.value
              )
            }
            placeholder="Title"
          />

          <textarea
            value={body}
            onChange={(event) =>
              setBody(
                event.target.value
              )
            }
            placeholder="Write your letter…"
            rows={12}
            autoFocus
          />

          <div className="diary-editor-actions">
            <button
              type="button"
              onClick={() => {
                setWriting(false);
                setTitle("");
                setBody("");
                setError(null);
              }}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="button"
              className="letters-write-button"
              onClick={saveLetter}
              disabled={
                saving ||
                !body.trim()
              }
            >
              {saving
                ? "Saving…"
                : "Keep letter"}
            </button>
          </div>
        </section>
      ) : loading ? (
        <section className="letters-empty-stage">
          <p>
            Opening the letter drawer…
          </p>
        </section>
      ) : visibleLetters.length === 0 ? (
        <div className="letters-empty-stage">
          <div
            className="letters-empty-envelope"
            aria-hidden="true"
          >
            <span className="letters-envelope-flap" />

            <div className="letters-envelope-mark">
              <Mail
                size={23}
                strokeWidth={1.35}
              />
            </div>
          </div>

          <div className="letters-empty-copy">
            <small>
              letter box
            </small>

            <h2>
              No letters here yet.
            </h2>

            <p>
              {letterView === "dominic"
                ? "Letters from Dominic will only appear here when he actually writes or sends one in the world."
                : "Write something you want to keep. It becomes part of the letter drawer only after you save it."}
            </p>
          </div>

          {letterView !== "dominic" && (
            <button
              type="button"
              className="letters-write-button"
              onClick={() =>
                setWriting(true)
              }
            >
              <span aria-hidden="true">
                ＋
              </span>
              Write a letter
            </button>
          )}
        </div>
      ) : (
        <section className="letters-drawer letters-drawer-filled">
          <header>
            <div>
              <span>
                saved
              </span>

              <strong>
                Letter drawer
              </strong>
            </div>

            <small>
              {visibleLetters.length}{" "}
              {visibleLetters.length === 1
                ? "letter"
                : "letters"}
            </small>
          </header>

          <div className="letters-saved-list">
            {visibleLetters.map(
              (letter) => (
                <article
                  key={letter.id}
                  className="letters-saved-item"
                >
                  <small>
                    {letter.owner === "alloah"
                      ? "From Alloah"
                      : "From Dominic"}
                  </small>

                  <strong>
                    {letter.title ??
                      "Untitled letter"}
                  </strong>

                  <p>
                    {letter.body}
                  </p>

                  {letter.event_at && (
                    <time
                      dateTime={
                        letter.event_at
                      }
                    >
                      {new Intl.DateTimeFormat(
                        "en",
                        {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          timeZone:
                            "America/Sao_Paulo",
                        }
                      ).format(
                        new Date(
                          letter.event_at
                        )
                      )}
                    </time>
                  )}
                </article>
              )
            )}
          </div>

          {letterView !== "dominic" && (
            <button
              type="button"
              className="letters-write-button"
              onClick={() =>
                setWriting(true)
              }
            >
              <span aria-hidden="true">
                ＋
              </span>
              Write another letter
            </button>
          )}
        </section>
      )}

      {error && (
        <p role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
function GalleryScreen() {
  const { session } = usePrivateDiario();

  const [galleryView, setGalleryView] =
    useState<
      "photos" | "albums" | "favorites"
    >("photos");

  const [photos, setPhotos] =
    useState<GalleryPhoto[]>([]);

    const [albums, setAlbums] =
    useState<DiarioItem[]>([]);

  const [creatingAlbum, setCreatingAlbum] =
    useState(false);

  const [albumTitle, setAlbumTitle] =
    useState("");

  const [selectedAlbum, setSelectedAlbum] =
    useState<DiarioItem | null>(null);

  const [albumPhotoIds, setAlbumPhotoIds] =
    useState<string[]>([]);

  const [editingAlbumPhotos, setEditingAlbumPhotos] =
    useState(false);

  const [loadingAlbum, setLoadingAlbum] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [uploading, setUploading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const fileInputRef =
    useRef<HTMLInputElement>(null);

    const toggleFavorite = async (
    photo: GalleryPhoto
  ) => {
    const nextFavorite =
      photo.item.data?.favorite !== true;

    try {
      const updatedItem =
        await setGalleryPhotoFavorite({
          userId: session.user.id,
          photo: photo.item,
          favorite: nextFavorite,
        });

      setPhotos((currentPhotos) =>
        currentPhotos.map(
          (currentPhoto) =>
            currentPhoto.item.id ===
            updatedItem.id
              ? {
                  ...currentPhoto,
                  item: updatedItem,
                }
              : currentPhoto
        )
      );
    } catch (favoriteError) {
      console.error(
        "Could not update favorite:",
        favoriteError
      );

      setError(
        "The photo could not be updated. Try again."
      );
    }
  };
  useEffect(() => {
    let active = true;

    setLoading(true);
    setError(null);

    getGalleryPhotos(
      session.user.id
    )
      .then((loadedPhotos) => {
        if (!active) return;

        setPhotos(loadedPhotos);
        setLoading(false);
      })
      .catch((loadError) => {
        if (!active) return;

        console.error(
          "Could not load Gallery:",
          loadError
        );

        setError(
          "The Gallery could not be opened right now."
        );

        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [session.user.id]);

    useEffect(() => {
    let active = true;

    getGalleryAlbums(
      session.user.id
    )
      .then((loadedAlbums) => {
        if (!active) return;

        setAlbums(loadedAlbums);
      })
      .catch((loadError) => {
        if (!active) return;

        console.error(
          "Could not load albums:",
          loadError
        );

        setError(
          "The albums could not be opened right now."
        );
      });

    return () => {
      active = false;
    };
  }, [session.user.id]);

  const saveAlbum = async () => {
    if (!albumTitle.trim()) {
      return;
    }

    setError(null);

    try {
      const savedAlbum =
        await createGalleryAlbum({
          userId: session.user.id,
          title: albumTitle,
        });

      setAlbums((currentAlbums) => [
        savedAlbum,
        ...currentAlbums,
      ]);

      setAlbumTitle("");
      setCreatingAlbum(false);
    } catch (albumError) {
      console.error(
        "Could not create album:",
        albumError
      );

      setError(
        "The album could not be created. Try again."
      );
    }
  };

  const openAlbum = async (
    album: DiarioItem
  ) => {
    setSelectedAlbum(album);
    setLoadingAlbum(true);
    setEditingAlbumPhotos(false);
    setError(null);

    try {
      const photoIds =
        await getGalleryAlbumPhotoIds({
          userId: session.user.id,
          albumId: album.id,
        });

      setAlbumPhotoIds(photoIds);
    } catch (albumError) {
      console.error(
        "Could not open album:",
        albumError
      );

      setError(
        "The album could not be opened. Try again."
      );
    } finally {
      setLoadingAlbum(false);
    }
  };

  const favoritePhotos =
    photos.filter(
      (photo) =>
        photo.item.data?.favorite === true
    );

  const visiblePhotos =
    galleryView === "favorites"
      ? favoritePhotos
      : photos;

  const handleFiles =
    async (
      event: React.ChangeEvent<HTMLInputElement>
    ) => {
      const files =
        Array.from(
          event.target.files ?? []
        );

      if (files.length === 0) {
        return;
      }

      setUploading(true);
      setError(null);

      try {
        const uploadedPhotos =
          await Promise.all(
            files.map((file) =>
              uploadGalleryPhoto({
                userId:
                  session.user.id,
                file,
              })
            )
          );

        setPhotos(
          (currentPhotos) => [
            ...uploadedPhotos,
            ...currentPhotos,
          ]
        );
      } catch (uploadError) {
        console.error(
          "Could not upload Gallery photo:",
          uploadError
        );

        setError(
          "One of the photos could not be added. Try again."
        );
      } finally {
        setUploading(false);

        if (
          fileInputRef.current
        ) {
          fileInputRef.current.value =
            "";
        }
      }
    };

  return (
    <section className="gallery-screen gallery-live">
      <ScreenIntro
        eyebrow="Camera roll · albums · favorites"
        title="Gallery"
      >
        <p className="intro-copy">
          only photos that are actually taken, added or kept become part of
          this world.
        </p>
      </ScreenIntro>

      <div
        className="gallery-tabs gallery-live-tabs"
        role="tablist"
        aria-label="Gallery view"
      >
        <button
          type="button"
          role="tab"
          aria-selected={
            galleryView === "photos"
          }
          className={
            galleryView === "photos"
              ? "active"
              : ""
          }
          onClick={() =>
            setGalleryView("photos")
          }
        >
          Photos
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={
            galleryView === "albums"
          }
          className={
            galleryView === "albums"
              ? "active"
              : ""
          }
          onClick={() =>
            setGalleryView("albums")
          }
        >
          Albums
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={
            galleryView === "favorites"
          }
          className={
            galleryView ===
            "favorites"
              ? "active"
              : ""
          }
          onClick={() =>
            setGalleryView(
              "favorites"
            )
          }
        >
          Favorites
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={handleFiles}
      />

         {galleryView === "albums" ? (
        selectedAlbum ? (
          <section className="gallery-library">
            <header>
              <div>
                <span>
                  album
                </span>

                <strong>
                  {selectedAlbum.title}
                </strong>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedAlbum(null);
                  setAlbumPhotoIds([]);
                  setEditingAlbumPhotos(false);
                }}
              >
                Back to albums
              </button>
            </header>

            {loadingAlbum ? (
              <div className="gallery-empty-stage">
                <p>
                  Opening album…
                </p>
              </div>
            ) : (
              <>
                <div className="gallery-photo-grid">
                  {photos
                    .filter((photo) =>
                      albumPhotoIds.includes(
                        photo.item.id
                      )
                    )
                    .map((photo) => (
                      <figure
                        key={photo.item.id}
                        className="gallery-photo-item"
                      >
                        <img
                          src={photo.url}
                          alt={
                            photo.item.title ??
                            "Album photo"
                          }
                          loading="lazy"
                        />
                      </figure>
                    ))}
                </div>

                {editingAlbumPhotos ? (
                  <section className="gallery-library">
                    <header>
                      <div>
                        <span>
                          choose photos
                        </span>

                        <strong>
                          Add or remove
                        </strong>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setEditingAlbumPhotos(
                            false
                          )
                        }
                      >
                        Done
                      </button>
                    </header>

                    <div className="gallery-photo-grid">
                      {photos.map((photo) => {
                        const isInAlbum =
                          albumPhotoIds.includes(
                            photo.item.id
                          );

                        return (
                          <button
                            key={photo.item.id}
                            type="button"
                            className={
                              isInAlbum
                                ? "gallery-photo-item active"
                                : "gallery-photo-item"
                            }
                            onClick={async () => {
                              if (!selectedAlbum) {
                                return;
                              }

                              setError(null);

                              try {
                                if (isInAlbum) {
                                  await removePhotoFromGalleryAlbum({
                                    userId:
                                      session.user.id,
                                    albumId:
                                      selectedAlbum.id,
                                    photoId:
                                      photo.item.id,
                                  });

                                  setAlbumPhotoIds(
                                    (
                                      currentIds
                                    ) =>
                                      currentIds.filter(
                                        (id) =>
                                          id !==
                                          photo.item.id
                                      )
                                  );
                                } else {
                                  await addPhotoToGalleryAlbum({
                                    userId:
                                      session.user.id,
                                    albumId:
                                      selectedAlbum.id,
                                    photoId:
                                      photo.item.id,
                                  });

                                  setAlbumPhotoIds(
                                    (
                                      currentIds
                                    ) => [
                                      ...currentIds,
                                      photo.item.id,
                                    ]
                                  );
                                }
                              } catch (
                                albumPhotoError
                              ) {
                                console.error(
                                  "Could not update album photo:",
                                  albumPhotoError
                                );

                                setError(
                                  "The album could not be updated. Try again."
                                );
                              }
                            }}
                          >
                            <img
                              src={photo.url}
                              alt={
                                photo.item.title ??
                                "Gallery photo"
                              }
                              loading="lazy"
                            />

                            <span>
                              {isInAlbum
                                ? "Remove"
                                : "Add"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ) : (
                  <button
                    type="button"
                    className="gallery-add-button"
                    onClick={() =>
                      setEditingAlbumPhotos(
                        true
                      )
                    }
                  >
                    ＋ Add or remove photos
                  </button>
                )}
              </>
            )}
          </section>
        ) : (
        <section className="gallery-library">
          <header>
            <div>
              <span>
                albums
              </span>

              <strong>
                Your albums
              </strong>
            </div>

            <small>
              {albums.length}{" "}
              {albums.length === 1
                ? "album"
                : "albums"}
            </small>
          </header>

          {creatingAlbum ? (
            <div className="gallery-empty-stage">
              <div className="gallery-empty-copy">
                <small>
                  new album
                </small>

                <h2>
                  Name this album
                </h2>
              </div>

              <input
                type="text"
                value={albumTitle}
                onChange={(event) =>
                  setAlbumTitle(
                    event.target.value
                  )
                }
                placeholder="Album name"
                autoFocus
              />

              <div className="diary-editor-actions">
                <button
                  type="button"
                  onClick={() => {
                    setCreatingAlbum(false);
                    setAlbumTitle("");
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="gallery-add-button"
                  onClick={saveAlbum}
                  disabled={
                    !albumTitle.trim()
                  }
                >
                  Create album
                </button>
              </div>
            </div>
          ) : albums.length === 0 ? (
            <div className="gallery-empty-stage">
              <div className="gallery-empty-copy">
                <small>
                  albums
                </small>

                <h2>
                  No albums yet.
                </h2>

                <p>
                  Albums organize real photos without duplicating them.
                </p>
              </div>

              <button
                type="button"
                className="gallery-add-button"
                onClick={() =>
                  setCreatingAlbum(true)
                }
              >
                <span aria-hidden="true">
                  ＋
                </span>
                Create album
              </button>
            </div>
          ) : (
            <>
              <div className="gallery-album-list">
                {albums.map((album) => (
                  <button
                    key={album.id}
                    type="button"
                    className="gallery-album-item"
                    onClick={() =>
                      openAlbum(album)
                    }
                  >
                    <small>
                      album
                    </small>

                    <strong>
                      {album.title}
                    </strong>
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="gallery-add-button"
                onClick={() =>
                  setCreatingAlbum(true)
                }
              >
                <span aria-hidden="true">
                  ＋
                </span>
                Create another album
              </button>
            </>
          )}
        </section>
        )
      ) : loading ? (
        <section className="gallery-empty-stage">
          <p>
            Opening the camera roll…
          </p>
        </section>
      ) : visiblePhotos.length ===
        0 ? (
        <section className="gallery-empty-stage">
          <div
            className="gallery-empty-icon"
            aria-hidden="true"
          >
            <ImageIcon
              size={28}
              strokeWidth={1.25}
            />
          </div>

          <div className="gallery-empty-copy">
            <small>
              {galleryView ===
              "favorites"
                ? "favorites"
                : "camera roll"}
            </small>

            <h2>
              {galleryView ===
              "favorites"
                ? "Nothing favorited yet."
                : "No photos here yet."}
            </h2>

            <p>
              {galleryView ===
              "favorites"
                ? "Photos you choose to favorite will collect here."
                : "Add a real photo from your library. It will be stored privately and become part of this world."}
            </p>
          </div>

          {galleryView ===
            "photos" && (
            <button
              type="button"
              className="gallery-add-button"
              onClick={() =>
                fileInputRef.current?.click()
              }
              disabled={
                uploading
              }
            >
              <span aria-hidden="true">
                ＋
              </span>

              {uploading
                ? "Adding…"
                : "Add photos"}
            </button>
          )}
        </section>
      ) : (
        <>
          <section className="gallery-library">
            <header>
              <div>
                <span>
                  library
                </span>

                <strong>
                  {galleryView ===
                  "favorites"
                    ? "Favorites"
                    : "Your photos"}
                </strong>
              </div>

              <small>
                {visiblePhotos.length}{" "}
                {visiblePhotos.length ===
                1
                  ? "photo"
                  : "photos"}
              </small>
            </header>

            <div className="gallery-photo-grid">
              {visiblePhotos.map(
                (photo) => (
                  <figure
                    key={
                      photo.item.id
                    }
                    className="gallery-photo-item"
                  >
                    <div className="gallery-photo-media">
                      <img
                        src={
                          photo.url
                        }
                        alt={
                          photo.item
                            .title ??
                          "Gallery photo"
                        }
                        loading="lazy"
                      />

                      <button
                        type="button"
                        className={
                          photo.item.data
                            ?.favorite === true
                            ? "gallery-favorite-button active"
                            : "gallery-favorite-button"
                        }
                        aria-label={
                          photo.item.data
                            ?.favorite === true
                            ? "Remove from favorites"
                            : "Add to favorites"
                        }
                        aria-pressed={
                          photo.item.data
                            ?.favorite === true
                        }
                        onClick={() =>
                          toggleFavorite(
                            photo
                          )
                        }
                      >
                        <Heart
                          size={18}
                          fill={
                            photo.item.data
                              ?.favorite === true
                              ? "currentColor"
                              : "none"
                          }
                        />
                      </button>
                    </div>

                    <figcaption>
                      <small>
                        {photo.item
                          .event_at
                          ? new Intl.DateTimeFormat(
                              "en",
                              {
                                day: "numeric",
                                month:
                                  "short",
                                year:
                                  "numeric",
                                timeZone:
                                  "America/Sao_Paulo",
                              }
                            ).format(
                              new Date(
                                photo.item
                                  .event_at
                              )
                            )
                          : "Photo"}
                      </small>
                    </figcaption>
                  </figure>
                )
              )}
            </div>
          </section>

          {galleryView ===
            "photos" && (
            <button
              type="button"
              className="gallery-add-button"
              onClick={() =>
                fileInputRef.current?.click()
              }
              disabled={
                uploading
              }
            >
              <span aria-hidden="true">
                ＋
              </span>

              {uploading
                ? "Adding…"
                : "Add more photos"}
            </button>
          )}
        </>
      )}

      {error && (
        <p role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
function WardrobeScreen() {
  const [wardrobeOwner, setWardrobeOwner] = useState<
    "mine" | "dominic"
  >("mine");

  const [wardrobeView, setWardrobeView] = useState<
    "closet" | "looks"
  >("closet");

  const wardrobeItems: Array<{
    id: string;
    owner: "mine" | "dominic";
    name: string;
    category:
      | "top"
      | "bottom"
      | "dress"
      | "outerwear"
      | "shoes"
      | "accessory";
    imageUrl?: string;
    acquiredAt?: string;
    note?: string;
  }> = [];

  const savedLooks: Array<{
    id: string;
    owner: "mine" | "dominic";
    name: string;
    itemIds: string[];
    imageUrl?: string;
    keptAt: string;
    dateId?: string;
    note?: string;
  }> = [];

  const visibleItems =
    wardrobeItems.filter(
      (item) =>
        item.owner === wardrobeOwner
    );

  const visibleLooks =
    savedLooks.filter(
      (look) =>
        look.owner === wardrobeOwner
    );

  return (
    <section className="wardrobe-screen wardrobe-live">
      <ScreenIntro
        eyebrow="Clothes · looks · getting ready"
        title="Wardrobe"
      >
        <p className="intro-copy">
          clothes belong to the person who owns them.
          Looks only become part of the world after
          they are actually kept.
        </p>
      </ScreenIntro>

      <div
        className="wardrobe-owner-tabs"
        role="tablist"
        aria-label="Wardrobe owner"
      >
        <button
          type="button"
          role="tab"
          aria-selected={
            wardrobeOwner === "mine"
          }
          className={
            wardrobeOwner === "mine"
              ? "active"
              : ""
          }
          onClick={() =>
            setWardrobeOwner("mine")
          }
        >
          Mine
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={
            wardrobeOwner === "dominic"
          }
          className={
            wardrobeOwner === "dominic"
              ? "active"
              : ""
          }
          onClick={() =>
            setWardrobeOwner("dominic")
          }
        >
          Dominic
        </button>
      </div>

      <div
        className="wardrobe-view-tabs"
        role="tablist"
        aria-label="Wardrobe view"
      >
        <button
          type="button"
          role="tab"
          aria-selected={
            wardrobeView === "closet"
          }
          className={
            wardrobeView === "closet"
              ? "active"
              : ""
          }
          onClick={() =>
            setWardrobeView("closet")
          }
        >
          Closet
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={
            wardrobeView === "looks"
          }
          className={
            wardrobeView === "looks"
              ? "active"
              : ""
          }
          onClick={() =>
            setWardrobeView("looks")
          }
        >
          Looks
        </button>
      </div>

      {wardrobeView === "closet" && (
        <section className="wardrobe-closet">
          <header>
            <div>
              <span>
                closet
              </span>

              <strong>
                {wardrobeOwner === "mine"
                  ? "My clothes"
                  : "Dominic's clothes"}
              </strong>
            </div>

            <small>
              {visibleItems.length} items
            </small>
          </header>

          {visibleItems.length === 0 ? (
            <div className="wardrobe-empty">
              <div
                className="wardrobe-empty-icon"
                aria-hidden="true"
              >
                <Shirt
                  size={27}
                  strokeWidth={1.3}
                />
              </div>

              <small>
                empty wardrobe
              </small>

              <h2>
                No clothes added yet.
              </h2>

              <p>
                Real clothes can be added here
                over time. References do not
                automatically become owned items.
              </p>

              <button
                type="button"
                className="wardrobe-add-button"
              >
                <span aria-hidden="true">
                  ＋
                </span>

                Add clothing
              </button>
            </div>
          ) : (
            <div className="wardrobe-item-grid">
              {visibleItems.map(
                (item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="wardrobe-item"
                  >
                    <div
                      className="wardrobe-item-image"
                      aria-hidden={
                        !item.imageUrl
                      }
                    >
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt=""
                        />
                      ) : (
                        <Shirt
                          size={23}
                          strokeWidth={1.25}
                        />
                      )}
                    </div>

                    <span>
                      <strong>
                        {item.name}
                      </strong>

                      <small>
                        {item.category}
                      </small>
                    </span>
                  </button>
                )
              )}
            </div>
          )}
        </section>
      )}

      {wardrobeView === "looks" && (
        <section className="wardrobe-looks">
          <header>
            <div>
              <span>
                saved looks
              </span>

              <strong>
                {wardrobeOwner === "mine"
                  ? "My looks"
                  : "Dominic's looks"}
              </strong>
            </div>

            <small>
              {visibleLooks.length} looks
            </small>
          </header>

          {visibleLooks.length === 0 ? (
            <div className="wardrobe-look-empty">
              <ImageIcon
                size={24}
                strokeWidth={1.3}
              />

              <p>
                No looks kept yet.
              </p>

              <small>
                A generated or assembled look
                only becomes part of the world
                after you choose to keep it.
              </small>
            </div>
          ) : (
            <div className="wardrobe-look-list">
              {visibleLooks.map(
                (look) => (
                  <button
                    key={look.id}
                    type="button"
                    className="wardrobe-look"
                  >
                    <div>
                      <span>
                        saved look
                      </span>

                      <strong>
                        {look.name}
                      </strong>

                      {look.note && (
                        <small>
                          {look.note}
                        </small>
                      )}
                    </div>

                    <ChevronRight
                      size={17}
                    />
                  </button>
                )
              )}
            </div>
          )}

          <button
            type="button"
            className="wardrobe-create-look"
          >
            <span aria-hidden="true">
              ＋
            </span>

            Create a look
          </button>
        </section>
      )}

      <section className="wardrobe-date-link">
        <CalendarIcon
          size={19}
          strokeWidth={1.35}
        />

        <div>
          <strong>
            Getting ready for a Date
          </strong>

          <p>
            A saved look can be attached
            to a planned Date and later
            remain connected to the real
            day that happened.
          </p>
        </div>
      </section>

      <section className="wardrobe-rule">
        <p>
          Clothes are owned items. Looks are
          combinations or references. Keeping a
          look never creates duplicate clothing,
          and nothing becomes relationship history
          until it is actually used in the world.
        </p>
      </section>
    </section>
  );
}
function KeepsakesScreen() {
  const [keepsakeView, setKeepsakeView] = useState<
    "all" | "home" | "stored"
  >("all");

  const keepsakes: Array<{
    id: string;
    name: string;
    kind:
      | "ticket"
      | "flower"
      | "photo"
      | "gift"
      | "note"
      | "object";
    status: "home" | "stored";
    room?: string;
    acquiredAt: string;
    origin?: string;
    note?: string;
    memoryId?: string;
    dateId?: string;
    photoId?: string;
  }> = [];

  const visibleKeepsakes =
    keepsakeView === "all"
      ? keepsakes
      : keepsakes.filter(
          (item) =>
            item.status === keepsakeView
        );

  const homeKeepsakes =
    keepsakes.filter(
      (item) =>
        item.status === "home"
    );

  const storedKeepsakes =
    keepsakes.filter(
      (item) =>
        item.status === "stored"
    );

  return (
    <section className="keepsakes-screen keepsakes-live">
      <ScreenIntro
        eyebrow="Objects that stayed"
        title="Keepsakes"
      >
        <p className="intro-copy">
          little physical things can keep their
          place, origin and history without becoming
          separate copies of the memory they belong to.
        </p>
      </ScreenIntro>

      <div
        className="keepsakes-tabs"
        role="tablist"
        aria-label="Keepsake location"
      >
        <button
          type="button"
          role="tab"
          aria-selected={
            keepsakeView === "all"
          }
          className={
            keepsakeView === "all"
              ? "active"
              : ""
          }
          onClick={() =>
            setKeepsakeView("all")
          }
        >
          All
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={
            keepsakeView === "home"
          }
          className={
            keepsakeView === "home"
              ? "active"
              : ""
          }
          onClick={() =>
            setKeepsakeView("home")
          }
        >
          At home
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={
            keepsakeView === "stored"
          }
          className={
            keepsakeView === "stored"
              ? "active"
              : ""
          }
          onClick={() =>
            setKeepsakeView("stored")
          }
        >
          Stored
        </button>
      </div>

      <section className="keepsakes-summary">
        <div>
          <span>
            at home
          </span>

          <strong>
            {homeKeepsakes.length}
          </strong>
        </div>

        <div>
          <span>
            stored
          </span>

          <strong>
            {storedKeepsakes.length}
          </strong>
        </div>
      </section>

      {visibleKeepsakes.length === 0 ? (
        <section className="keepsakes-empty">
          <div
            className="keepsakes-empty-icon"
            aria-hidden="true"
          >
            <BoxIcon
              size={27}
              strokeWidth={1.3}
            />
          </div>

          <small>
            empty drawer
          </small>

          <h2>
            Nothing kept yet.
          </h2>

          <p>
            Tickets, flowers, notes,
            photos, gifts and small objects
            only appear here after they
            actually enter your world.
          </p>

          <div className="keepsakes-examples">
            <span>
              ticket
            </span>

            <span>
              flower
            </span>

            <span>
              photo
            </span>

            <span>
              gift
            </span>

            <span>
              note
            </span>

            <span>
              object
            </span>
          </div>
        </section>
      ) : (
        <div className="keepsakes-list">
          {visibleKeepsakes.map(
            (item) => (
              <article
                key={item.id}
                className={`keepsake-card keepsake-${item.kind}`}
              >
                <header>
                  <div>
                    <span>
                      {item.kind}
                    </span>

                    <strong>
                      {item.name}
                    </strong>
                  </div>

                  <ChevronRight
                    size={17}
                  />
                </header>

                <div className="keepsake-location">
                  <Home
                    size={15}
                    strokeWidth={1.4}
                  />

                  <span>
                    {item.status === "home"
                      ? item.room ||
                        "Somewhere at home"
                      : "Stored away"}
                  </span>
                </div>

                <time>
                  {new Intl.DateTimeFormat(
                    "en-US",
                    {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    }
                  ).format(
                    new Date(
                      item.acquiredAt
                    )
                  )}
                </time>

                {item.origin && (
                  <p>
                    {item.origin}
                  </p>
                )}

                {item.note && (
                  <small>
                    {item.note}
                  </small>
                )}
              </article>
            )
          )}
        </div>
      )}

      <section className="keepsake-life">
        <header>
          <span>
            one real object
          </span>

          <strong>
            It can move without losing its history
          </strong>
        </header>

        <div>
          <article>
            <MapPin
              size={18}
              strokeWidth={1.35}
            />

            <span>
              <strong>
                Origin
              </strong>

              <small>
                where it came from
              </small>
            </span>
          </article>

          <article>
            <Home
              size={18}
              strokeWidth={1.35}
            />

            <span>
              <strong>
                Place
              </strong>

              <small>
                where it is now
              </small>
            </span>
          </article>

          <article>
            <Heart
              size={18}
              strokeWidth={1.35}
            />

            <span>
              <strong>
                Meaning
              </strong>

              <small>
                memory or date attached
              </small>
            </span>
          </article>

          <article>
            <BoxIcon
              size={18}
              strokeWidth={1.35}
            />

            <span>
              <strong>
                Storage
              </strong>

              <small>
                kept even when not displayed
              </small>
            </span>
          </article>
        </div>
      </section>

      <section className="keepsakes-rule">
        <p>
          A keepsake is one object with one history.
          Moving it from the bedroom to a drawer,
          attaching it to a Date or showing it in a
          Memory never creates another copy.
        </p>
      </section>
    </section>
  );
}
function DatesScreen() {
  const [dateView, setDateView] = useState<
    "all" | "planned" | "lived"
  >("all");

  const dates: Array<{
    id: string;
    title: string;
    place: string;
    date: string;
    status: "planned" | "lived";
    note?: string;
    outfitId?: string;
    memoryId?: string;
    photoIds?: string[];
    keepsakeIds?: string[];
    songIds?: string[];
  }> = [];

  const visibleDates =
    dateView === "all"
      ? dates
      : dates.filter(
          (date) =>
            date.status === dateView
        );

  const plannedDates =
    dates.filter(
      (date) =>
        date.status === "planned"
    );

  const livedDates =
    dates.filter(
      (date) =>
        date.status === "lived"
    );

  return (
    <section className="dates-screen dates-live">
      <ScreenIntro
        eyebrow="Plan it · live it · keep it"
        title="Dates"
      >
        <p className="intro-copy">
          a place becomes part of your story only
          after you actually plan or live something there.
        </p>
      </ScreenIntro>

      <div
        className="dates-tabs"
        role="tablist"
        aria-label="Date status"
      >
        <button
          type="button"
          role="tab"
          aria-selected={
            dateView === "all"
          }
          className={
            dateView === "all"
              ? "active"
              : ""
          }
          onClick={() =>
            setDateView("all")
          }
        >
          All
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={
            dateView === "planned"
          }
          className={
            dateView === "planned"
              ? "active"
              : ""
          }
          onClick={() =>
            setDateView("planned")
          }
        >
          Planned
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={
            dateView === "lived"
          }
          className={
            dateView === "lived"
              ? "active"
              : ""
          }
          onClick={() =>
            setDateView("lived")
          }
        >
          Lived
        </button>
      </div>

      <section className="dates-summary">
        <div>
          <span>
            planned
          </span>

          <strong>
            {plannedDates.length}
          </strong>
        </div>

        <div>
          <span>
            lived
          </span>

          <strong>
            {livedDates.length}
          </strong>
        </div>
      </section>

      {visibleDates.length === 0 ? (
        <section className="dates-empty">
          <div
            className="dates-empty-icon"
            aria-hidden="true"
          >
            <MapPin
              size={27}
              strokeWidth={1.3}
            />
          </div>

          <small>
            nowhere yet
          </small>

          <h2>
            No dates here yet.
          </h2>

          <p>
            Real places can exist in the world
            without becoming part of your history.
            A date appears here only after you plan
            it or actually live it.
          </p>

          <button
            type="button"
            className="dates-plan-button"
          >
            <span aria-hidden="true">
              ＋
            </span>

            Plan a date
          </button>
        </section>
      ) : (
        <div className="dates-list">
          {visibleDates.map(
            (date) => (
              <article
                key={date.id}
                className={`date-card date-${date.status}`}
              >
                <header>
                  <div>
                    <span>
                      {date.status}
                    </span>

                    <strong>
                      {date.title}
                    </strong>
                  </div>

                  <ChevronRight
                    size={17}
                  />
                </header>

                <div className="date-place">
                  <MapPin
                    size={16}
                  />

                  <span>
                    {date.place}
                  </span>
                </div>

                <time>
                  {new Intl.DateTimeFormat(
                    "en-US",
                    {
                      weekday: "short",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    }
                  ).format(
                    new Date(date.date)
                  )}
                </time>

                {date.note && (
                  <p>
                    {date.note}
                  </p>
                )}
              </article>
            )
          )}
        </div>
      )}

      <section className="date-life-cycle">
        <header>
          <span>
            how a date lives
          </span>

          <strong>
            One moment, connected everywhere
          </strong>
        </header>

        <div>
          <article>
            <CalendarIcon
              size={18}
              strokeWidth={1.35}
            />

            <span>
              <strong>
                Plan
              </strong>

              <small>
                place, day and idea
              </small>
            </span>
          </article>

          <article>
            <Shirt
              size={18}
              strokeWidth={1.35}
            />

            <span>
              <strong>
                Get ready
              </strong>

              <small>
                outfit and preparation
              </small>
            </span>
          </article>

          <article>
            <MapPin
              size={18}
              strokeWidth={1.35}
            />

            <span>
              <strong>
                Live
              </strong>

              <small>
                what actually happened
              </small>
            </span>
          </article>

          <article>
            <ImageIcon
              size={18}
              strokeWidth={1.35}
            />

            <span>
              <strong>
                Keep
              </strong>

              <small>
                photos, songs and objects
              </small>
            </span>
          </article>
        </div>
      </section>

      <section className="dates-rule">
        <p>
          A lived date can later point to Gallery
          photos, a Wardrobe look, Music, Keepsakes,
          Calendar, Timeline and Memories without
          creating duplicate copies.
        </p>
      </section>
    </section>
  );
}
function MusicScreen() {
  const [musicView, setMusicView] = useState<
    "mine" | "dominic" | "ours"
  >("ours");

  const [period, setPeriod] = useState<
    "week" | "month" | "year" | "all"
  >("month");

  const tracks: Array<{
    id: string;
    title: string;
    artist: string;
    owner: "mine" | "dominic" | "ours";
    playedAt?: string;
    memoryId?: string;
  }> = [];

  const sharedSongs: Array<{
    id: string;
    title: string;
    artist: string;
    addedAt: string;
    note?: string;
  }> = [];

  const filteredTracks =
    tracks.filter(
      (track) =>
        musicView === "ours"
          ? track.owner === "ours"
          : track.owner === musicView
    );

  const periodLabel =
    period === "week"
      ? "This week"
      : period === "month"
        ? "This month"
        : period === "year"
          ? "This year"
          : "All time";

  return (
    <section className="music-screen music-live">
      <ScreenIntro
        eyebrow="Listening · songs · shared soundtrack"
        title="Music"
      >
        <p className="intro-copy">
          what you listen to can stay personal,
          become shared, or attach itself to a real moment.
        </p>
      </ScreenIntro>

      <div
        className="music-owner-tabs"
        role="tablist"
        aria-label="Music owner"
      >
        <button
          type="button"
          role="tab"
          aria-selected={musicView === "mine"}
          className={
            musicView === "mine"
              ? "active"
              : ""
          }
          onClick={() =>
            setMusicView("mine")
          }
        >
          Mine
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={
            musicView === "dominic"
          }
          className={
            musicView === "dominic"
              ? "active"
              : ""
          }
          onClick={() =>
            setMusicView("dominic")
          }
        >
          Dominic
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={musicView === "ours"}
          className={
            musicView === "ours"
              ? "active"
              : ""
          }
          onClick={() =>
            setMusicView("ours")
          }
        >
          Ours
        </button>
      </div>

      <section className="music-now">
        <div
          className="music-record"
          aria-hidden="true"
        >
          <Disc3
            size={34}
            strokeWidth={1.2}
          />
        </div>

        <div>
          <small>
            now playing
          </small>

          <strong>
            Nothing playing
          </strong>

          <span>
            Spotify connection comes later.
          </span>
        </div>

        <button
          type="button"
          aria-label="Play"
          disabled
        >
          <Play
            size={17}
          />
        </button>
      </section>

      <section className="music-recap">
        <header>
          <div>
            <span>
              listening recap
            </span>

            <strong>
              {periodLabel}
            </strong>
          </div>

          <div
            className="music-period-tabs"
            role="tablist"
            aria-label="Recap period"
          >
            <button
              type="button"
              className={
                period === "week"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setPeriod("week")
              }
            >
              W
            </button>

            <button
              type="button"
              className={
                period === "month"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setPeriod("month")
              }
            >
              M
            </button>

            <button
              type="button"
              className={
                period === "year"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setPeriod("year")
              }
            >
              Y
            </button>

            <button
              type="button"
              className={
                period === "all"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setPeriod("all")
              }
            >
              ∞
            </button>
          </div>
        </header>

        <div className="music-recap-empty">
          <Music2
            size={22}
            strokeWidth={1.3}
          />

          <p>
            Listening history will build
            after music is connected.
          </p>

          <small>
            Later this can show top songs,
            artists, repeats and listening
            patterns for each period.
          </small>
        </div>
      </section>

      <section className="music-library">
        <header>
          <div>
            <span>
              {musicView}
            </span>

            <strong>
              {musicView === "mine"
                ? "My listening"
                : musicView === "dominic"
                  ? "Dominic's listening"
                  : "Our songs"}
            </strong>
          </div>

          <small>
            {filteredTracks.length} songs
          </small>
        </header>

        {filteredTracks.length === 0 ? (
          <div className="music-library-empty">
            <p>
              {musicView === "ours"
                ? "A song only becomes ours after it actually gains shared meaning."
                : "Listening history will appear here when music is connected."}
            </p>
          </div>
        ) : (
          <div className="music-track-list">
            {filteredTracks.map(
              (track) => (
                <button
                  key={track.id}
                  type="button"
                  className="music-track"
                >
                  <div
                    className="music-track-art"
                    aria-hidden="true"
                  >
                    <Music2
                      size={17}
                    />
                  </div>

                  <span>
                    <strong>
                      {track.title}
                    </strong>

                    <small>
                      {track.artist}
                    </small>
                  </span>

                  <Play
                    size={15}
                  />
                </button>
              )
            )}
          </div>
        )}
      </section>

      <section className="music-shared">
        <header>
          <span>
            shared soundtrack
          </span>

          <strong>
            Songs with a history
          </strong>
        </header>

        {sharedSongs.length === 0 ? (
          <div className="music-shared-empty">
            <p>
              No shared songs yet.
            </p>

            <small>
              When a song becomes connected
              to a real conversation, date,
              memory or moment, it can live here.
            </small>
          </div>
        ) : (
          <div>
            {sharedSongs.map(
              (song) => (
                <article
                  key={song.id}
                  className="shared-song"
                >
                  <Music2
                    size={18}
                  />

                  <div>
                    <strong>
                      {song.title}
                    </strong>

                    <span>
                      {song.artist}
                    </span>

                    {song.note && (
                      <p>
                        {song.note}
                      </p>
                    )}
                  </div>
                </article>
              )
            )}
          </div>
        )}
      </section>
    </section>
  );
}
function TimelineScreen() {
  const [timelineView, setTimelineView] = useState<
    "all" | "lived" | "planned"
  >("all");

  const timelineEntries: Array<{
    id: string;
    date: string;
    title: string;
    description: string;
    status: "lived" | "planned";
    kind:
      | "memory"
      | "date"
      | "letter"
      | "photo"
      | "music"
      | "home"
      | "wardrobe"
      | "diary";
  }> = [];

  const visibleEntries =
    timelineView === "all"
      ? timelineEntries
      : timelineEntries.filter(
          (entry) =>
            entry.status === timelineView
        );

  const sortedEntries = [
    ...visibleEntries,
  ].sort(
    (first, second) =>
      new Date(first.date).getTime() -
      new Date(second.date).getTime()
  );

  const todayLabel =
    new Intl.DateTimeFormat(
      "en-US",
      {
        month: "long",
        day: "numeric",
        year: "numeric",
      }
    ).format(new Date());

  return (
    <section className="timeline-screen timeline-live">
      <ScreenIntro
        eyebrow="The continuous story"
        title="Timeline"
      >
        <p className="intro-copy">
          everything that changes the world
          can appear here in chronological order.
        </p>
      </ScreenIntro>

      <div
        className="timeline-filter"
        role="tablist"
        aria-label="Timeline view"
      >
        <button
          type="button"
          role="tab"
          aria-selected={
            timelineView === "all"
          }
          className={
            timelineView === "all"
              ? "active"
              : ""
          }
          onClick={() =>
            setTimelineView("all")
          }
        >
          All
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={
            timelineView === "lived"
          }
          className={
            timelineView === "lived"
              ? "active"
              : ""
          }
          onClick={() =>
            setTimelineView("lived")
          }
        >
          Lived
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={
            timelineView === "planned"
          }
          className={
            timelineView === "planned"
              ? "active"
              : ""
          }
          onClick={() =>
            setTimelineView("planned")
          }
        >
          Planned
        </button>
      </div>

      {sortedEntries.length === 0 ? (
        <section className="timeline-empty">
          <div
            className="timeline-empty-icon"
            aria-hidden="true"
          >
            <Clock
              size={27}
              strokeWidth={1.3}
            />
          </div>

          <small>
            {todayLabel}
          </small>

          <h2>
            The timeline begins now.
          </h2>

          <p>
            There is no invented history before
            this point. As real days, plans and
            changes happen, they can join the
            timeline automatically.
          </p>

          <div className="timeline-source-list">
            <div>
              <Heart
                size={17}
                strokeWidth={1.4}
              />
              <span>
                Memories
              </span>
            </div>

            <div>
              <MapPin
                size={17}
                strokeWidth={1.4}
              />
              <span>
                Dates
              </span>
            </div>

            <div>
              <Music2
                size={17}
                strokeWidth={1.4}
              />
              <span>
                Music
              </span>
            </div>

            <div>
              <Home
                size={17}
                strokeWidth={1.4}
              />
              <span>
                Home changes
              </span>
            </div>

            <div>
              <Shirt
                size={17}
                strokeWidth={1.4}
              />
              <span>
                Wardrobe
              </span>
            </div>

            <div>
              <BookOpen
                size={17}
                strokeWidth={1.4}
              />
              <span>
                Diary
              </span>
            </div>
          </div>
        </section>
      ) : (
        <div
          className="timeline-stream"
          aria-label="Life timeline"
        >
          {sortedEntries.map(
            (entry) => (
              <article
                key={entry.id}
                className={`timeline-entry timeline-entry-${entry.kind}`}
              >
                <span
                  className="timeline-entry-dot"
                  aria-hidden="true"
                />

                <time>
                  {new Intl.DateTimeFormat(
                    "en-US",
                    {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }
                  ).format(
                    new Date(entry.date)
                  )}
                </time>

                <div>
                  <small>
                    {entry.status}
                  </small>

                  <strong>
                    {entry.title}
                  </strong>

                  <p>
                    {entry.description}
                  </p>
                </div>
              </article>
            )
          )}
        </div>
      )}

      <section className="timeline-explainer">
        <p>
          Memories tells the story of a moment.
          Calendar tells when it happened.
          Timeline shows how everything continues
          from one moment into the next.
        </p>
      </section>
    </section>
  );
}
function CalendarScreen() {
  const today = new Date();

  const [viewDate, setViewDate] = useState(
    () =>
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      )
  );

  const [selectedDate, setSelectedDate] =
    useState(
      () =>
        new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate()
        )
    );

  const calendarItems: Array<{
    id: string;
    date: string;
    type:
      | "memory"
      | "date"
      | "letter"
      | "photo"
      | "note"
      | "plan";
    title: string;
  }> = [];

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstWeekday = new Date(
    year,
    month,
    1
  ).getDay();

  const daysInMonth = new Date(
    year,
    month + 1,
    0
  ).getDate();

  const monthCells = Array.from(
    { length: 42 },
    (_, index) => {
      const day =
        index - firstWeekday + 1;

      if (
        day < 1 ||
        day > daysInMonth
      ) {
        return null;
      }

      return new Date(
        year,
        month,
        day
      );
    }
  );

  const weekdayLabels = [
    "S",
    "M",
    "T",
    "W",
    "T",
    "F",
    "S",
  ];

  const dateKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(
      date.getMonth() + 1
    ).padStart(2, "0");
    const d = String(
      date.getDate()
    ).padStart(2, "0");

    return `${y}-${m}-${d}`;
  };

  const selectedKey =
    dateKey(selectedDate);

  const selectedItems =
    calendarItems.filter(
      (item) =>
        item.date === selectedKey
    );

  const isSameDay = (
    first: Date,
    second: Date
  ) =>
    first.getFullYear() ===
      second.getFullYear() &&
    first.getMonth() ===
      second.getMonth() &&
    first.getDate() ===
      second.getDate();

  const changeMonth = (
    offset: number
  ) => {
    const nextMonth = new Date(
      year,
      month + offset,
      1
    );

    setViewDate(nextMonth);
    setSelectedDate(nextMonth);
  };

  const monthLabel =
    new Intl.DateTimeFormat(
      "en-US",
      {
        month: "long",
        year: "numeric",
      }
    ).format(viewDate);

  const selectedLabel =
    new Intl.DateTimeFormat(
      "en-US",
      {
        weekday: "long",
        month: "long",
        day: "numeric",
      }
    ).format(selectedDate);

  return (
    <section className="calendar-screen calendar-live">
      <ScreenIntro
        eyebrow="What happened · what is planned"
        title="Calendar"
      >
        <p className="intro-copy">
          every real day can hold its
          photos, letters, memories,
          dates and plans.
        </p>
      </ScreenIntro>

      <section className="calendar-month">
        <header className="calendar-month-header">
          <button
            type="button"
            onClick={() =>
              changeMonth(-1)
            }
            aria-label="Previous month"
          >
            ‹
          </button>

          <strong>
            {monthLabel}
          </strong>

          <button
            type="button"
            onClick={() =>
              changeMonth(1)
            }
            aria-label="Next month"
          >
            ›
          </button>
        </header>

        <div
          className="calendar-weekdays"
          aria-hidden="true"
        >
          {weekdayLabels.map(
            (label, index) => (
              <span
                key={`${label}-${index}`}
              >
                {label}
              </span>
            )
          )}
        </div>

        <div className="calendar-grid">
          {monthCells.map(
            (date, index) => {
              if (!date) {
                return (
                  <span
                    key={`empty-${index}`}
                    className="calendar-day-empty"
                    aria-hidden="true"
                  />
                );
              }

              const key =
                dateKey(date);

              const hasItems =
                calendarItems.some(
                  (item) =>
                    item.date === key
                );

              const selected =
                isSameDay(
                  date,
                  selectedDate
                );

              const current =
                isSameDay(
                  date,
                  today
                );

              return (
                <button
                  key={key}
                  type="button"
                  className={[
                    "calendar-day",
                    selected
                      ? "selected"
                      : "",
                    current
                      ? "today"
                      : "",
                    hasItems
                      ? "has-items"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() =>
                    setSelectedDate(date)
                  }
                  aria-label={
                    new Intl.DateTimeFormat(
                      "en-US",
                      {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      }
                    ).format(date)
                  }
                  aria-pressed={
                    selected
                  }
                >
                  <span>
                    {date.getDate()}
                  </span>

                  {hasItems && (
                    <i
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            }
          )}
        </div>
      </section>

      <section className="calendar-day-detail">
        <header>
          <span>
            selected day
          </span>

          <strong>
            {selectedLabel}
          </strong>
        </header>

        {selectedItems.length === 0 ? (
          <div className="calendar-day-empty-state">
            <CalendarIcon
              size={22}
              strokeWidth={1.35}
            />

            <p>
              Nothing is attached to
              this day yet.
            </p>

            <small>
              Real plans and lived
              moments will appear here
              without duplicating their
              original objects.
            </small>
          </div>
        ) : (
          <div className="calendar-day-items">
            {selectedItems.map(
              (item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`calendar-item calendar-item-${item.type}`}
                >
                  <span>
                    {item.type}
                  </span>

                  <strong>
                    {item.title}
                  </strong>

                  <ChevronRight
                    size={16}
                  />
                </button>
              )
            )}
          </div>
        )}
      </section>

      <section className="calendar-legend">
        <p>
          Past days show what really
          happened. Future days can hold
          plans. The same object can also
          appear in Memories or Timeline
          without being copied.
        </p>
      </section>
    </section>
  );
}

function MemoriesScreen() {
  const { session } = usePrivateDiario();

  const [memoryFilter, setMemoryFilter] = useState<
    "all" | "photos" | "letters" | "music" | "dates"
  >("all");

  const [memories, setMemories] =
    useState<DiarioItem[]>([]);

  const [loadingMemories, setLoadingMemories] =
    useState(true);

  const [creatingMemory, setCreatingMemory] =
    useState(false);

  const [memoryTitle, setMemoryTitle] =
    useState("");

  const [memoryBody, setMemoryBody] =
    useState("");

  const [memoryError, setMemoryError] =
    useState<string | null>(null);

  const [selectedMemory, setSelectedMemory] =
    useState<DiarioItem | null>(null);

  const [memoryItemIds, setMemoryItemIds] =
    useState<string[]>([]);

  const [loadingMemoryItems, setLoadingMemoryItems] =
    useState(false);

   const [editingMemoryItems, setEditingMemoryItems] =
    useState(false);

  const [memoryChoices, setMemoryChoices] =
    useState<DiarioItem[]>([]);

  const startEditingMemoryItems = async () => {
    if (!selectedMemory) {
      return;
    }

    setMemoryError(null);

    try {
      const [
        loadedPhotos,
        loadedLetters,
      ] = await Promise.all([
        getGalleryPhotos(
          session.user.id
        ),
        getLetters(
          session.user.id
        ),
      ]);

      setMemoryChoices([
        ...loadedPhotos.map(
          (photo) => photo.item
        ),
        ...loadedLetters,
      ]);

      setEditingMemoryItems(true);
    } catch (loadError) {
      console.error(
        "Could not load Memory items:",
        loadError
      );

      setMemoryError(
        "Photos and letters could not be opened."
      );
    }
  };

  useEffect(() => {
    let active = true;

    setLoadingMemories(true);
    setMemoryError(null);

    getMemories(session.user.id)
      .then((loadedMemories) => {
        if (!active) return;

        setMemories(loadedMemories);
        setLoadingMemories(false);
      })
      .catch((loadError) => {
        if (!active) return;

        console.error(
          "Could not load Memories:",
          loadError
        );

        setMemoryError(
          "Memories could not be opened right now."
        );

        setLoadingMemories(false);
      });

    return () => {
      active = false;
    };
  }, [session.user.id]);

  const saveMemory = async () => {
    if (!memoryTitle.trim()) {
      return;
    }

    setMemoryError(null);

    try {
      const savedMemory =
        await createMemory({
          userId: session.user.id,
          title: memoryTitle,
          body: memoryBody,
        });

      setMemories((currentMemories) => [
        savedMemory,
        ...currentMemories,
      ]);

      setMemoryTitle("");
      setMemoryBody("");
      setCreatingMemory(false);
    } catch (saveError) {
      console.error(
        "Could not create Memory:",
        saveError
      );

      setMemoryError(
        "The memory could not be saved. Try again."
      );
    }
  };

  const openMemory = async (
    memory: DiarioItem
  ) => {
    setSelectedMemory(memory);
    setLoadingMemoryItems(true);
    setEditingMemoryItems(false);
    setMemoryError(null);

    try {
      const itemIds =
        await getMemoryItemIds({
          userId: session.user.id,
          memoryId: memory.id,
        });

      setMemoryItemIds(itemIds);
    } catch (openError) {
      console.error(
        "Could not open Memory:",
        openError
      );

      setMemoryError(
        "The memory could not be opened."
      );
    } finally {
      setLoadingMemoryItems(false);
    }
  };

  const filters = [
    { id: "all", label: "All" },
    { id: "photos", label: "Photos" },
    { id: "letters", label: "Letters" },
    { id: "music", label: "Music" },
    { id: "dates", label: "Dates" },
  ] as const;

  const visibleMemories =
    memoryFilter === "all"
      ? memories
      : [];

  return (
    <section className="memories-screen memories-live">
      <ScreenIntro
        eyebrow="Moments that actually happened"
        title="Memories"
      >
        <p className="intro-copy">
          one timeline connecting the real pieces of your life together.
        </p>
      </ScreenIntro>

      <div
        className="memories-filter"
        role="tablist"
        aria-label="Memory type"
      >
        {filters.map((filter) => (
          <button
            key={filter.id}
            type="button"
            role="tab"
            aria-selected={memoryFilter === filter.id}
            className={
              memoryFilter === filter.id
                ? "active"
                : ""
            }
            onClick={() =>
              setMemoryFilter(filter.id)
            }
          >
            {filter.label}
          </button>
        ))}
      </div>

      {selectedMemory ? (
        <section className="memories-empty">
          <button
            type="button"
            onClick={() => {
              setSelectedMemory(null);
              setMemoryItemIds([]);
              setEditingMemoryItems(false);
            }}
          >
            ← Back to memories
          </button>

          <small>
            memory
          </small>

          <h2>
            {selectedMemory.title ??
              "Untitled memory"}
          </h2>

          {selectedMemory.event_at && (
            <time>
              {new Intl.DateTimeFormat(
                "en-US",
                {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                }
              ).format(
                new Date(
                  selectedMemory.event_at
                )
              )}
            </time>
          )}

          {selectedMemory.body && (
            <p>
              {selectedMemory.body}
            </p>
          )}

             {loadingMemoryItems ? (
            <p>
              Opening memory…
            </p>
          ) : editingMemoryItems ? (
            <section className="memory-source-list">
              <button
                type="button"
                onClick={() =>
                  setEditingMemoryItems(
                    false
                  )
                }
              >
                Done
              </button>

              {memoryChoices.length === 0 ? (
                <p>
                  No photos or letters available yet.
                </p>
              ) : (
                memoryChoices.map(
                  (item) => {
                    const isConnected =
                      memoryItemIds.includes(
                        item.id
                      );

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={async () => {
                          if (!selectedMemory) {
                            return;
                          }

                          setMemoryError(null);

                          try {
                            if (isConnected) {
                              await removeItemFromMemory({
                                userId:
                                  session.user.id,
                                memoryId:
                                  selectedMemory.id,
                                itemId:
                                  item.id,
                              });

                              setMemoryItemIds(
                                (currentIds) =>
                                  currentIds.filter(
                                    (id) =>
                                      id !==
                                      item.id
                                  )
                              );
                            } else {
                              await addItemToMemory({
                                userId:
                                  session.user.id,
                                memoryId:
                                  selectedMemory.id,
                                itemId:
                                  item.id,
                              });

                              setMemoryItemIds(
                                (currentIds) => [
                                  ...currentIds,
                                  item.id,
                                ]
                              );
                            }
                          } catch (
                            updateError
                          ) {
                            console.error(
                              "Could not update Memory:",
                              updateError
                            );

                            setMemoryError(
                              "The memory could not be updated."
                            );
                          }
                        }}
                      >
                        <span>
                          {item.kind ===
                          "photo"
                            ? "Photo"
                            : "Letter"}
                        </span>

                        <strong>
                          {item.title ??
                            (item.kind ===
                            "photo"
                              ? "Photo"
                              : "Untitled letter")}
                        </strong>

                        <small>
                          {isConnected
                            ? "Remove"
                            : "Add"}
                        </small>
                      </button>
                    );
                  }
                )
              )}
            </section>
          ) : (
            <>
              <p>
                {memoryItemIds.length === 0
                  ? "Nothing is connected to this memory yet."
                  : `${memoryItemIds.length} connected ${
                      memoryItemIds.length === 1
                        ? "item"
                        : "items"
                    }`}
              </p>

              <button
                type="button"
                className="gallery-add-button"
                onClick={
                  startEditingMemoryItems
                }
              >
                ＋ Add photos or letters
              </button>
            </>
          )}
        </section>
      ) : creatingMemory ? (
        <section className="memories-empty">
          <small>
            new memory
          </small>

          <h2>
            Keep this moment
          </h2>

          <input
            type="text"
            value={memoryTitle}
            onChange={(event) =>
              setMemoryTitle(
                event.target.value
              )
            }
            placeholder="Memory title"
            autoFocus
          />

          <textarea
            value={memoryBody}
            onChange={(event) =>
              setMemoryBody(
                event.target.value
              )
            }
            placeholder="What happened?"
            rows={8}
          />

          <div className="diary-editor-actions">
            <button
              type="button"
              onClick={() => {
                setCreatingMemory(false);
                setMemoryTitle("");
                setMemoryBody("");
                setMemoryError(null);
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              className="gallery-add-button"
              onClick={saveMemory}
              disabled={
                !memoryTitle.trim()
              }
            >
              Keep memory
            </button>
          </div>
        </section>
      ) : visibleMemories.length === 0 ? (
        <section className="memories-empty">
          <div
            className="memories-empty-mark"
            aria-hidden="true"
          >
            <Heart
              size={27}
              strokeWidth={1.3}
            />
          </div>

          <small>
            beginning
          </small>

          <h2>
            Your story starts here.
          </h2>

          <p>
            Nothing has been turned into a memory yet.
            Real photos, conversations, songs,
            letters and dates can connect here after
            they actually happen.
          </p>

          <button
            type="button"
            className="gallery-add-button"
            onClick={() =>
              setCreatingMemory(true)
            }
          >
            ＋ Create memory
          </button>

          <div className="memory-source-list">
            <div>
              <ImageIcon
                size={18}
                strokeWidth={1.4}
              />

              <span>
                <strong>Gallery</strong>
                <small>real photos</small>
              </span>
            </div>

            <div>
              <Mail
                size={18}
                strokeWidth={1.4}
              />

              <span>
                <strong>Letters</strong>
                <small>written and received</small>
              </span>
            </div>

            <div>
              <Music2
                size={18}
                strokeWidth={1.4}
              />

              <span>
                <strong>Music</strong>
                <small>songs tied to moments</small>
              </span>
            </div>

            <div>
              <MapPin
                size={18}
                strokeWidth={1.4}
              />

              <span>
                <strong>Dates</strong>
                <small>places you actually went</small>
              </span>
            </div>
          </div>
        </section>
      ) : (
        <div
          className="memories-timeline"
          aria-label="Memory timeline"
        >
          {visibleMemories.map(
            (memory) => (
              <button
                key={memory.id}
                type="button"
                className="memory-entry memory-story"
                onClick={() =>
                  openMemory(memory)
                }
              >
                <span className="memory-timeline-dot" />

                <time>
                  {memory.event_at
                    ? new Intl.DateTimeFormat(
                        "en-US",
                        {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        }
                      ).format(
                        new Date(
                          memory.event_at
                        )
                      )
                    : "Memory"}
                </time>

                <div>
                  <strong>
                    {memory.title ??
                      "Untitled memory"}
                  </strong>

                  {memory.body && (
                    <p>
                      {memory.body}
                    </p>
                  )}
                </div>
              </button>
            )
          )}
        </div>
      )}

      <section className="memories-rule">
        <CalendarIcon
          size={17}
          strokeWidth={1.35}
        />

        <p>
          Gallery keeps the media. Memories connects it
          to what happened. Calendar keeps the date.
          Timeline keeps the continuity.
        </p>
      </section>
    </section>
  );
}
function MorningNightScreen({
  time,
}: {
  time: TimeMoodState;
}) {
  const defaultView:
    | "morning"
    | "night" =
    time.mood === "early" ||
    time.mood === "morning"
      ? "morning"
      : "night";

  const [dayView, setDayView] =
    useState<
      "morning" | "night"
    >(defaultView);

  const morningMoments: Array<{
    id: string;
    title: string;
    note?: string;
  }> = [];

  const nightMoments: Array<{
    id: string;
    title: string;
    note?: string;
  }> = [];

  const activeMoments =
    dayView === "morning"
      ? morningMoments
      : nightMoments;

  const isCurrentPhase =
    dayView === defaultView;

  return (
    <section className="day-cycle-screen">
      <ScreenIntro
        eyebrow={`${time.dateLabel} · ${time.timeLabel}`}
        title="Morning / Night"
      >
        <p className="intro-copy">
          the same apartment changes with
          the real time around you.
        </p>
      </ScreenIntro>

      <div
        className="day-cycle-tabs"
        role="tablist"
        aria-label="Time of day"
      >
        <button
          type="button"
          role="tab"
          aria-selected={
            dayView === "morning"
          }
          className={
            dayView === "morning"
              ? "active"
              : ""
          }
          onClick={() =>
            setDayView("morning")
          }
        >
          Morning
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={
            dayView === "night"
          }
          className={
            dayView === "night"
              ? "active"
              : ""
          }
          onClick={() =>
            setDayView("night")
          }
        >
          Night
        </button>
      </div>

      <section
        className={`day-cycle-current day-cycle-${dayView}`}
      >
        <div className="day-cycle-image">
          <img
            src={
              dayView === "morning"
                ? bedroom
                : room
            }
            alt={
              dayView === "morning"
                ? "The apartment bedroom in the morning"
                : "The apartment at night"
            }
          />
        </div>

        <div className="day-cycle-copy">
          <small>
            {isCurrentPhase
              ? "right now"
              : "other side of the day"}
          </small>

          <h2>
            {dayView === "morning"
              ? "A new day starts here."
              : "The apartment gets quieter."}
          </h2>

          <p>
            {dayView === "morning"
              ? "Morning can hold whatever actually belongs to the start of this day — plans, music, notes and little routines."
              : "Night can collect the things that really belong to the end of this day — music, reflections, messages and what happened."}
          </p>
        </div>
      </section>

      <section className="day-cycle-context">
        <header>
          <span>
            real time
          </span>

          <strong>
            {time.greeting}
          </strong>
        </header>

        <p>
          {time.homeLine}
        </p>

        <small>
          mood: {time.mood}
        </small>
      </section>

      <section className="day-cycle-moments">
        <header>
          <div>
            <span>
              {dayView}
            </span>

            <strong>
              Today's moments
            </strong>
          </div>

          <small>
            {activeMoments.length}
          </small>
        </header>

        {activeMoments.length === 0 ? (
          <div className="day-cycle-empty">
            {dayView === "morning" ? (
              <LampDesk
                size={23}
                strokeWidth={1.3}
              />
            ) : (
              <Disc3
                size={23}
                strokeWidth={1.3}
              />
            )}

            <p>
              Nothing recorded here yet.
            </p>

            <small>
              This section fills only from
              things that actually happen
              during this part of the day.
            </small>
          </div>
        ) : (
          <div className="day-cycle-moment-list">
            {activeMoments.map(
              (moment) => (
                <article
                  key={moment.id}
                >
                  <strong>
                    {moment.title}
                  </strong>

                  {moment.note && (
                    <p>
                      {moment.note}
                    </p>
                  )}
                </article>
              )
            )}
          </div>
        )}
      </section>

      <section className="day-cycle-links">
        <article>
          <Music2
            size={18}
            strokeWidth={1.35}
          />

          <span>
            <strong>
              Music
            </strong>

            <small>
              what was really playing
            </small>
          </span>
        </article>

        <article>
          <BookOpen
            size={18}
            strokeWidth={1.35}
          />

          <span>
            <strong>
              Diary
            </strong>

            <small>
              writing from this day
            </small>
          </span>
        </article>

        <article>
          <CalendarIcon
            size={18}
            strokeWidth={1.35}
          />

          <span>
            <strong>
              Calendar
            </strong>

            <small>
              today's plans and events
            </small>
          </span>
        </article>

        <article>
          <Heart
            size={18}
            strokeWidth={1.35}
          />

          <span>
            <strong>
              Memories
            </strong>

            <small>
              only if something stays
            </small>
          </span>
        </article>
      </section>

      <section className="day-cycle-rule">
        <p>
          Morning and Night do not create
          events on their own. They are
          contextual views of the same real
          day and the same apartment.
        </p>
      </section>
    </section>
  );
}
function SettingsScreen() {
  const { preferredName, signOut } =
    usePrivateDiario();

  const [appearance, setAppearance] =
    useState<
      "system" | "light" | "dark"
    >("system");

  const [timeAware, setTimeAware] =
    useState(true);

  const [privacyCoverEnabled, setPrivacyCoverEnabled] =
    useState(true);

  const [musicIntegration, setMusicIntegration] =
    useState(false);

  const [voiceEnabled, setVoiceEnabled] =
    useState(false);

  return (
    <section className="settings-screen settings-live">
      <ScreenIntro
        eyebrow={`Private space · ${preferredName}`}
        title="Settings"
      >
        <p className="intro-copy">
          the rules, appearance and connections
          that shape this private world.
        </p>
      </ScreenIntro>

      <section className="settings-group">
        <header>
          <span>
            appearance
          </span>

          <strong>
            How Diário looks
          </strong>
        </header>

        <div
          className="settings-segment"
          role="radiogroup"
          aria-label="Appearance"
        >
          <button
            type="button"
            role="radio"
            aria-checked={
              appearance === "system"
            }
            className={
              appearance === "system"
                ? "active"
                : ""
            }
            onClick={() =>
              setAppearance("system")
            }
          >
            System
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={
              appearance === "light"
            }
            className={
              appearance === "light"
                ? "active"
                : ""
            }
            onClick={() =>
              setAppearance("light")
            }
          >
            Light
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={
              appearance === "dark"
            }
            className={
              appearance === "dark"
                ? "active"
                : ""
            }
            onClick={() =>
              setAppearance("dark")
            }
          >
            Dark
          </button>
        </div>

        <p className="settings-note">
          The final visual pass will make
          every screen follow this choice.
        </p>
      </section>

      <section className="settings-group">
        <header>
          <span>
            world
          </span>

          <strong>
            Home & time
          </strong>
        </header>

        <button
          type="button"
          className="settings-row"
          onClick={() =>
            setTimeAware(
              (value) => !value
            )
          }
          aria-pressed={
            timeAware
          }
        >
          <div>
            <Clock
              size={19}
              strokeWidth={1.4}
            />

            <span>
              <strong>
                Time-aware apartment
              </strong>

              <small>
                light and atmosphere follow
                the real time
              </small>
            </span>
          </div>

          <i
            className={
              timeAware
                ? "settings-toggle on"
                : "settings-toggle"
            }
            aria-hidden="true"
          />
        </button>

        <div className="settings-static-row">
          <div>
            <Home
              size={19}
              strokeWidth={1.4}
            />

            <span>
              <strong>
                Apartment architecture
              </strong>

              <small>
                walls, doors, windows and
                circulation stay fixed
              </small>
            </span>
          </div>

          <small>
            locked
          </small>
        </div>
      </section>

      <section className="settings-group">
        <header>
          <span>
            privacy
          </span>

          <strong>
            Keep it private
          </strong>
        </header>

        <button
          type="button"
          className="settings-row"
          onClick={() =>
            setPrivacyCoverEnabled(
              (value) => !value
            )
          }
          aria-pressed={
            privacyCoverEnabled
          }
        >
          <div>
            <Heart
              size={19}
              strokeWidth={1.4}
            />

            <span>
              <strong>
                Hide app preview
              </strong>

              <small>
                cover private content when
                Diário goes into the background
              </small>
            </span>
          </div>

          <i
            className={
              privacyCoverEnabled
                ? "settings-toggle on"
                : "settings-toggle"
            }
            aria-hidden="true"
          />
        </button>

        <div className="settings-static-row">
          <div>
            <Settings
              size={19}
              strokeWidth={1.4}
            />

            <span>
              <strong>
                Account session
              </strong>

              <small>
                Supabase keeps the signed-in
                session on this device
              </small>
            </span>
          </div>

          <small>
            private
          </small>
        </div>
      </section>

      <section className="settings-group">
        <header>
          <span>
            connections
          </span>

          <strong>
            Music & voice
          </strong>
        </header>

        <button
          type="button"
          className="settings-row"
          onClick={() =>
            setMusicIntegration(
              (value) => !value
            )
          }
          aria-pressed={
            musicIntegration
          }
        >
          <div>
            <Music2
              size={19}
              strokeWidth={1.4}
            />

            <span>
              <strong>
                Music connection
              </strong>

              <small>
                listening history and
                now playing
              </small>
            </span>
          </div>

          <i
            className={
              musicIntegration
                ? "settings-toggle on"
                : "settings-toggle"
            }
            aria-hidden="true"
          />
        </button>

        <button
          type="button"
          className="settings-row"
          onClick={() =>
            setVoiceEnabled(
              (value) => !value
            )
          }
          aria-pressed={
            voiceEnabled
          }
        >
          <div>
            <Send
              size={19}
              strokeWidth={1.4}
            />

            <span>
              <strong>
                Voice features
              </strong>

              <small>
                audio belongs to the same
                private world
              </small>
            </span>
          </div>

          <i
            className={
              voiceEnabled
                ? "settings-toggle on"
                : "settings-toggle"
            }
            aria-hidden="true"
          />
        </button>

        <p className="settings-note">
          These connection switches are the
          interface foundation only. We will wire
          the real providers after the core app
          structure is complete.
        </p>
      </section>

      <section className="settings-group">
        <header>
          <span>
            data
          </span>

          <strong>
            Your world
          </strong>
        </header>

        <div className="settings-static-row">
          <div>
            <ImageIcon
              size={19}
              strokeWidth={1.4}
            />

            <span>
              <strong>
                Media
              </strong>

              <small>
                Gallery remains the source
                of truth for photos
              </small>
            </span>
          </div>

          <small>
            Gallery
          </small>
        </div>

        <div className="settings-static-row">
          <div>
            <Heart
              size={19}
              strokeWidth={1.4}
            />

            <span>
              <strong>
                Relationship history
              </strong>

              <small>
                only lived events become canon
              </small>
            </span>
          </div>

          <small>
            protected
          </small>
        </div>
      </section>

      <section className="settings-account">
        <header>
          <span>
            account
          </span>

          <strong>
            Leave Diário
          </strong>
        </header>

        <p>
          Signing out removes the active session
          from this device. It does not erase the
          world or its saved data.
        </p>

        <Button
          variant="ghost"
          onClick={signOut}
        >
          <LogOut
            size={17}
          />
          Sign out
        </Button>
      </section>
    </section>
  );
}


function BottomNav({ active, onOpen }: { active: Screen; onOpen: (screen: Screen) => void }) {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {navItems.map(({ id, label, icon: Icon }) => (
        <button key={id} className={active === id ? "active" : ""} onClick={() => onOpen(id)}>
          <Icon size={20} strokeWidth={1.6} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
