import { createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
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
  const time = useTimeMood();
  const detail = !primaryScreens.includes(screen);

  const openRoom = (roomId: string) => {
    setActiveRoom(roomId);
    setScreen("room");
  };
  return (
    <main className={`prototype-stage time-${time.mood}`} data-time-theme={time.mood}>
      <div className="phone-shell" data-time-theme={time.mood}>
        <div className="statusbar" aria-hidden="true">
          <span>{time.timeLabel}</span>
          <span className="brand-mark">Diário</span>
          <span>•••</span>
        </div>

        {detail && (
          <button
            className="back-button"
            onClick={() => setScreen(screen === "room" ? "home" : "more")}
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
        )}

        <div className={`screen-scroll screen-${screen}`} key={screen}>
{screen === "home" && (
  <HomeScreen
    time={time}
    onOpenRoom={openRoom}
  />
)}
          {screen === "chat" && <DiarioChat />}
          {screen === "diary" && <DiaryScreen />}
          {screen === "more" && <MoreScreen onOpen={setScreen} />}
{screen === "room" && (
  <RoomScreen
    time={time}
    roomId={activeRoom}
    onOpen={setScreen}
    onOpenRoom={openRoom}
  />
)}
          {screen === "letters" && <LettersScreen />}
          {screen === "gallery" && <GalleryScreen />}
          {screen === "night" && <NightScreen />}
{screen === "memories" && <MemoriesScreen />}
{screen === "calendar" && <CalendarScreen />}
{screen === "timeline" && <TimelineScreen />}
          {screen === "music" && (
            <FeaturePreviewScreen
              eyebrow="Our soundtrack · Spotify connected"
              title="Music"
              note="Mine, Dominic and Ours — rotations, shared songs and listening recaps across weeks, months, years and all time."
              icon={<Music2 />}
            />
          )}
          {screen === "dates" && (
            <FeaturePreviewScreen
              eyebrow="Real places · real moments"
              title="Dates"
              note="Plan it, get ready, live it, keep what mattered. Places, photos, tickets, outfits and memories stay connected."
              icon={<MapPin />}
            />
          )}
          {screen === "keepsakes" && (
            <FeaturePreviewScreen
              eyebrow="Small things · big meanings"
              title="Keepsakes"
              note="Tickets, flowers, polaroids, gifts and little objects can move through the apartment and keep their history."
              icon={<BoxIcon />}
            />
          )}
          {screen === "wardrobe" && (
            <FeaturePreviewScreen
              eyebrow="Looks for our days"
              title="Wardrobe"
              note="Your clothes, Dominic's clothes, references and generated looks only become part of the world after you keep them."
              icon={<Shirt />}
            />
          )}
          {screen === "settings" && (
            <FeaturePreviewScreen
              eyebrow="Everything in your hands"
              title="Settings"
              note="Appearance, Home, Morning / Night, music, voice, privacy, data and the rules of your private universe."
              icon={<Settings />}
            />
          )}
        </div>

        {!detail && <BottomNav active={screen} onOpen={setScreen} />}
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
  const [owner, setOwner] = useState<"alloah" | "dominic">("alloah");

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
          aria-selected={owner === "alloah"}
          className={owner === "alloah" ? "active" : ""}
          onClick={() => setOwner("alloah")}
        >
          Alloah
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={owner === "dominic"}
          className={owner === "dominic" ? "active" : ""}
          onClick={() => setOwner("dominic")}
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
            >
              Write today's page
            </button>
          )}
        </div>

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

        <div className="diary-archive-empty">
          <p>
            Days will appear here after they are lived and written.
          </p>
        </div>
      </section>
    </section>
  );
}
function LettersScreen() {
  const [letterView, setLetterView] = useState<"all" | "mine" | "dominic">("all");

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
          aria-selected={letterView === "all"}
          className={letterView === "all" ? "active" : ""}
          onClick={() => setLetterView("all")}
        >
          All
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={letterView === "mine"}
          className={letterView === "mine" ? "active" : ""}
          onClick={() => setLetterView("mine")}
        >
          From me
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={letterView === "dominic"}
          className={letterView === "dominic" ? "active" : ""}
          onClick={() => setLetterView("dominic")}
        >
          From Dominic
        </button>
      </div>

      <div className="letters-empty-stage">
        <div
          className="letters-empty-envelope"
          aria-hidden="true"
        >
          <span className="letters-envelope-flap" />

          <div className="letters-envelope-mark">
            <Mail size={23} strokeWidth={1.35} />
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
            When a letter is written, sent or received in the world, its real
            envelope and contents can live here.
          </p>
        </div>

        <button
          type="button"
          className="letters-write-button"
        >
          <span aria-hidden="true">＋</span>
          Write a letter
        </button>
      </div>

      <section className="letters-drawer">
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
            0 letters
          </small>
        </header>

        <div className="letters-drawer-empty">
          <p>
            Sealed, opened and kept letters will collect here over time.
          </p>
        </div>
      </section>
    </section>
  );
}
function GalleryScreen() {
  const [galleryView, setGalleryView] = useState<
    "photos" | "albums" | "favorites"
  >("photos");

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
          aria-selected={galleryView === "photos"}
          className={galleryView === "photos" ? "active" : ""}
          onClick={() => setGalleryView("photos")}
        >
          Photos
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={galleryView === "albums"}
          className={galleryView === "albums" ? "active" : ""}
          onClick={() => setGalleryView("albums")}
        >
          Albums
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={galleryView === "favorites"}
          className={galleryView === "favorites" ? "active" : ""}
          onClick={() => setGalleryView("favorites")}
        >
          Favorites
        </button>
      </div>

      <section className="gallery-empty-stage">
        <div
          className="gallery-empty-icon"
          aria-hidden="true"
        >
          <ImageIcon size={28} strokeWidth={1.25} />
        </div>

        <div className="gallery-empty-copy">
          <small>
            {galleryView === "photos"
              ? "camera roll"
              : galleryView === "albums"
                ? "albums"
                : "favorites"}
          </small>

          <h2>
            {galleryView === "photos"
              ? "No photos here yet."
              : galleryView === "albums"
                ? "No albums yet."
                : "Nothing favorited yet."}
          </h2>

          <p>
            {galleryView === "photos"
              ? "Photos will appear here after they are taken, added from your library or kept from something that happened in the world."
              : galleryView === "albums"
                ? "Albums will organize real photos without creating duplicate copies of them."
                : "Photos you choose to favorite will collect here."}
          </p>
        </div>

        {galleryView === "photos" && (
          <button
            type="button"
            className="gallery-add-button"
          >
            <span aria-hidden="true">＋</span>
            Add photos
          </button>
        )}
      </section>

      <section className="gallery-library">
        <header>
          <div>
            <span>library</span>
            <strong>Your photos</strong>
          </div>

          <small>0 photos</small>
        </header>

        <div className="gallery-library-empty">
          <p>
            When the camera roll starts growing, this becomes the visual
            archive. Memories will reference these photos instead of copying
            them.
          </p>
        </div>
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
  const [memoryFilter, setMemoryFilter] = useState<
    "all" | "photos" | "letters" | "music" | "dates"
  >("all");

  const filters = [
    { id: "all", label: "All" },
    { id: "photos", label: "Photos" },
    { id: "letters", label: "Letters" },
    { id: "music", label: "Music" },
    { id: "dates", label: "Dates" },
  ] as const;

  const memories: Array<{
    id: string;
    date: string;
    title: string;
    note: string;
    kind: "photos" | "letters" | "music" | "dates";
  }> = [];

  const visibleMemories =
    memoryFilter === "all"
      ? memories
      : memories.filter(
          (memory) => memory.kind === memoryFilter
        );

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

      {visibleMemories.length === 0 ? (
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
              <article
                key={memory.id}
                className={`memory-entry memory-${memory.kind}`}
              >
                <span className="memory-timeline-dot" />

                <time>
                  {memory.date}
                </time>

                <div>
                  <strong>
                    {memory.title}
                  </strong>

                  <p>
                    {memory.note}
                  </p>
                </div>
              </article>
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
function NightScreen() {
  return (
    <section className="night-screen">
      <header><span>Diário</span><small>Morning / Night</small></header>
      <div className="moon">☾</div>
      <h1>still awake?</h1>
      <p className="night-copy">the same apartment gets quieter as your real night arrives.</p>
      <div className="night-photo">
        <img src={room} alt="The apartment at night" width={1280} height={960} loading="lazy" />
        <span className="lamp-glow" />
      </div>
      <div className="night-record">
        <Disc3 />
        <div><small>for the late hours</small><strong>our night rotation</strong><span>Spotify connected later</span></div>
        <Play size={16} fill="currentColor" />
      </div>
      <blockquote>“same place.<br />different light.”<span>— Diário</span></blockquote>
    </section>
  );
}

function FeaturePreviewScreen({
  eyebrow,
  title,
  note,
  icon,
}: {
  eyebrow: string;
  title: string;
  note: string;
  icon: ReactNode;
}) {
  return (
    <section className="feature-preview-screen">
      <div className="feature-preview-icon">{icon}</div>
      <ScreenIntro eyebrow={eyebrow} title={title}>
        <p className="intro-copy">{note}</p>
      </ScreenIntro>
      <div className="feature-preview-paper">
        <span className="tape" />
        <p>this room of the Diário is part of the final plan.</p>
        <small>the visual foundation is ready for its full interactive build.</small>
        <b>♡</b>
      </div>
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
