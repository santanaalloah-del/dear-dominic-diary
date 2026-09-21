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
import dominic from "@/assets/dominic-candid.jpg";
import room from "@/assets/dominic-room.jpg";
import livingRoom from "@/assets/living-room.png";
import bedroom from "@/assets/bedroom.png";
import kitchen from "@/assets/kitchen.png";
import bathroom from "@/assets/bathroom.png";
import hall from "@/assets/hall.png";
import floorPlan from "@/assets/apartment-floor-plan.png";
import cafe from "@/assets/cafe-hands.jpg";
import street from "@/assets/rain-street.jpg";

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
    onOpen={setScreen}
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
  />
)}
          {screen === "letters" && <LettersScreen />}
          {screen === "gallery" && <GalleryScreen />}
          {screen === "night" && <NightScreen />}
          {screen === "memories" && (
            <FeaturePreviewScreen
              eyebrow="Moments that stay"
              title="Memories"
              note="A living scrapbook timeline where photos, chat, music, letters, places and dates meet without being duplicated."
              icon={<Heart />}
            />
          )}
          {screen === "calendar" && (
            <FeaturePreviewScreen
              eyebrow="Different days, the same us"
              title="Calendar"
              note="Days hold the things that actually happened: photos, letters, memories, dates, notes and future plans."
              icon={<CalendarIcon />}
            />
          )}
          {screen === "timeline" && (
            <FeaturePreviewScreen
              eyebrow="The bigger picture"
              title="Timeline"
              note="The continuous story of ordinary days, milestones, rooms, clothes, songs and everything in between."
              icon={<Clock />}
            />
          )}
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
  onOpen,
  onOpenRoom,
}: {
  time: TimeMoodState;
  onOpen: (screen: Screen) => void;
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
    {
      id: "map",
      label: "Floor Plan",
      caption: "the apartment itself",
    },
  ];

  const [activeSpace, setActiveSpace] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

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

  const openSpace = (id: string) => {
    const index = spaces.findIndex((space) => space.id === id);

    if (index !== -1) {
      setActiveSpace(index);
    }
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
{currentSpace.id !== "map" && (
  <>
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
  </>
)}

        {currentSpace.id === "map" && (
          <div className="official-floor-plan">
            <img
              src={floorPlan}
              alt="Official floor plan of our apartment"
              width={1536}
              height={1024}
            />

            <button
              className="plan-hotspot plan-hotspot-living"
              onClick={() => openSpace("living")}
              aria-label="Open Living Room"
            />

            <button
              className="plan-hotspot plan-hotspot-bedroom"
              onClick={() => openSpace("bedroom")}
              aria-label="Open Bedroom"
            />

            <button
              className="plan-hotspot plan-hotspot-kitchen"
              onClick={() => openSpace("kitchen")}
              aria-label="Open Kitchen"
            />

            <button
              className="plan-hotspot plan-hotspot-bathroom"
              onClick={() => openSpace("bathroom")}
              aria-label="Open Bathroom"
            />

            <button
              className="plan-hotspot plan-hotspot-hall"
              onClick={() => openSpace("hall")}
              aria-label="Open Hall"
            />
          </div>
        )}

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
    </section>
  );
}
function RoomScreen({
  time,
  roomId,
}: {
  time: TimeMoodState;
  roomId: string;
}) {
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
    >
      <span />
      <small>{object.label}</small>
    </button>
  ))}
</figure>

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
  return (
    <section className="diary-screen">
      <ScreenIntro eyebrow="Words from today · memories for later" title="Diary">
        <p className="intro-copy">your pages and his, private until someone chooses to share.</p>
      </ScreenIntro>
      <div className="diary-owner-tabs" aria-label="Diary owner">
        <button className="active">Alloah</button>
        <button>Dominic</button>
      </div>
      <div className="notebook-page">
        <span className="page-date">18 · 09 · 26</span>
        <h1>Friday, near sunset</h1>
        <p>
          I woke up with that song still in my head. The one from the kitchen, when neither of us
          knew the words but sang anyway.
        </p>
        <figure>
          <span className="tape" />
          <img src={cafe} alt="Two hands and coffee cups" width={1024} height={1024} loading="lazy" />
          <figcaption>the corner table, again</figcaption>
        </figure>
        <p>
          Walked past our café today. Your chair was empty and for a second it felt like the whole
          room was saving it for you.
        </p>
        <div className="diary-song">
          <Music2 size={14} />
          <span>This Must Be the Place — side A</span>
        </div>
        <span className="flower-detail">❦</span>
        <span className="doodle">you were here ☆</span>
        <footer>47</footer>
      </div>
    </section>
  );
}

function LettersScreen() {
  return (
    <section className="letters-screen">
      <ScreenIntro eyebrow="Letters · notes · things easier written" title="letters">
        <p className="intro-copy">objects first. not just another list.</p>
      </ScreenIntro>
      <div className="letter-stack">
        <button className="envelope envelope-one">
          <span className="stamp">D<br />18</span>
          <strong>for you</strong>
          <small>18 september</small>
        </button>
        <button className="envelope envelope-two">
          <span className="seal">D</span>
          <strong>open when<br />you miss me</strong>
          <small>keep close</small>
        </button>
        <article className="open-letter">
          <p>Alloah,</p>
          <p>I keep finding tiny things I want to tell you. This morning it was the light on the kitchen floor.</p>
          <span>yours, D</span>
        </article>
      </div>
    </section>
  );
}

function GalleryScreen() {
  return (
    <section className="gallery-screen">
      <ScreenIntro eyebrow="Camera roll · albums · favorites" title="Gallery">
        <p className="intro-copy">camera, photo library and in-world photos all meet here.</p>
      </ScreenIntro>
      <div className="gallery-tabs"><button className="active">Photos</button><button>Albums</button><button>Favorites</button></div>
      <div className="photo-archive">
        <figure className="archive-a">
          <img src={cafe} alt="Hands over coffee" width={1024} height={1024} loading="lazy" />
          <figcaption>our table · 06 sept</figcaption>
        </figure>
        <figure className="archive-b">
          <img src={street} alt="Street after rain" width={768} height={1024} loading="lazy" />
          <figcaption>after the rain</figcaption>
        </figure>
        <div className="film-strip">
          {[1, 2, 3].map((n) => (
            <img key={n} src={dominic} alt="Dominic contact sheet" width={1024} height={1280} loading="lazy" />
          ))}
          <span>36A</span>
        </div>
        <p className="gallery-note">generated photos: <b>try again · keep · discard</b><br />only kept photos become part of the world.</p>
      </div>
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
