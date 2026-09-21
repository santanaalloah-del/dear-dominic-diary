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
  const time = useTimeMood();
  const detail = !primaryScreens.includes(screen);

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
          {screen === "home" && <HomeScreen time={time} onOpen={setScreen} />}
          {screen === "chat" && <DiarioChat />}
          {screen === "diary" && <DiaryScreen />}
          {screen === "more" && <MoreScreen onOpen={setScreen} />}
          {screen === "room" && <RoomScreen time={time} />}
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

function HomeScreen({ time, onOpen }: { time: TimeMoodState; onOpen: (screen: Screen) => void }) {
  return (
    <section className="home-screen home-live">
      <div className="home-hero">
        <img src={room} alt="Our apartment in New York City" width={1280} height={960} />
        <div className="home-hero-shade" />
        <header className="home-brand">
          <span>DIÁRIO</span>
          <small>NYC · RIO TIME</small>
        </header>
        <div className="home-time-copy">
          <p className="home-script">Home</p>
          <h1>{time.greeting}</h1>
          <span>{time.dateLabel} · {time.timeLabel}</span>
          <p>{time.homeLine}</p>
        </div>
        <button className="home-hotspot hotspot-window" aria-label="Window view">
          <span />
          <small>window</small>
        </button>
        <button className="home-hotspot hotspot-bed" onClick={() => onOpen("room")} aria-label="Bedroom">
          <span />
          <small>bedroom</small>
        </button>
        <button className="home-hotspot hotspot-desk" onClick={() => onOpen("room")} aria-label="Room details">
          <span />
          <small>our things</small>
        </button>
        <div className="home-note home-mark" aria-hidden="true">   <span>✿</span>   <i>◌</i> </div>
      </div>

      <div className="home-dock-copy">
        <div>
          <span className="eyebrow">Right now</span>
          <strong>{time.mood === "late" ? "the apartment is quiet" : "our place is awake"}</strong>
          <small>New York City · following your Rio clock</small>
        </div>
        <span className={`home-orb orb-${time.mood}`} aria-hidden="true" />
      </div>

      <div className="home-actions">
        <button onClick={() => onOpen("chat")}>
          <Send size={17} />
          <span><strong>Continue Chat</strong><small>go find Dominic</small></span>
          <ChevronRight size={16} />
        </button>
        <button onClick={() => onOpen("room")}>
          <LampDesk size={17} />
          <span><strong>Our Home</strong><small>rooms, objects & references</small></span>
          <ChevronRight size={16} />
        </button>
        <button onClick={() => onOpen("music")}>
          <Music2 size={17} />
          <span><strong>Now Playing</strong><small>our soundtrack</small></span>
          <ChevronRight size={16} />
        </button>
      </div>

     <div className="home-today-card home-day-passage">
  <div className="day-passage-art" aria-hidden="true">
    <span>☼</span>
    <i>✦</i>
    <b>☾</b>
  </div>

  <button onClick={() => onOpen("night")}>
    Morning / Night
    <ChevronRight size={14} />
  </button>
</div>
    </section>
  );
}

function RoomScreen({ time }: { time: TimeMoodState }) {
  const objects = ["window", "bed", "nightstand", "photo wall", "record corner"];
  return (
    <section className="room-screen apartment-screen">
      <ScreenIntro eyebrow={`${time.dateLabel} · ${time.timeLabel}`} title="the apartment">
        <p className="intro-copy">a home in progress. the same rooms, changed by what happens here.</p>
      </ScreenIntro>
      <figure className="room-view apartment-view">
        <img src={room} alt="Our shared apartment" width={1280} height={960} />
        {objects.map((label, index) => (
          <button key={label} className={`object-pin room-pin-${index + 1}`} aria-label={label}>
            <span />
            <small>{label}</small>
          </button>
        ))}
      </figure>
      <div className="room-caption">
        <span>references · furniture · photos · keepsakes</span>
        <p>Add, move, store or replace things over time. A generated proposal only becomes part of the apartment after you keep it.</p>
      </div>
      <div className="room-tool-grid">
        <button><span>＋</span><strong>Add something</strong><small>furniture, decor, photos</small></button>
        <button><span>↔</span><strong>Move object</strong><small>change where it lives</small></button>
        <button><span>▧</span><strong>References</strong><small>save inspiration</small></button>
        <button><span>✦</span><strong>Room proposal</strong><small>try again · keep · discard</small></button>
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
