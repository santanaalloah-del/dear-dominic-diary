import { createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ChevronRight,
  Disc3,
  Home,
  LampDesk,
  LogOut,
  Menu,
  Music2,
  Play,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DiarioChat } from "@/components/diario-chat";
import { PrivateDiario, usePrivateDiario } from "@/components/private-diario";
import dominic from "@/assets/dominic-candid.jpg";
import room from "@/assets/dominic-room.jpg";
import cafe from "@/assets/cafe-hands.jpg";
import street from "@/assets/rain-street.jpg";

type Screen = "home" | "chat" | "room" | "more" | "diary" | "letters" | "gallery" | "night";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Diário — our little somewhere" },
      {
        name: "description",
        content: "An intimate private companion app concept, gathered like a personal archive.",
      },
      { property: "og:title", content: "Diário — our little somewhere" },
      {
        property: "og:description",
        content: "An intimate private companion app concept, gathered like a personal archive.",
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
  { id: "room", label: "Room", icon: LampDesk },
  { id: "more", label: "More", icon: Menu },
];

function Index() {
  return (
    <PrivateDiario>
      <DiarioApp />
    </PrivateDiario>
  );
}

function DiarioApp() {
  const [screen, setScreen] = useState<Screen>("home");
  const detail = !["home", "chat", "room", "more"].includes(screen);
  return (
    <main className={`prototype-stage ${screen === "night" ? "night-stage" : ""}`}>
      <div className="phone-shell">
        <div className="statusbar" aria-hidden="true">
          <span>19:51</span>
          <span className="brand-mark">Diário</span>
          <span>•••</span>
        </div>
        {detail && (
          <button
            className="back-button"
            onClick={() => setScreen("more")}
            aria-label="Back to more"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <div className="screen-scroll" key={screen}>
          {screen === "home" && <HomeScreen />}
          {screen === "chat" && <DiarioChat />}
          {screen === "room" && <RoomScreen />}
          {screen === "more" && <MoreScreen onOpen={setScreen} />}
          {screen === "diary" && <DiaryScreen />}
          {screen === "letters" && <LettersScreen />}
          {screen === "gallery" && <GalleryScreen />}
          {screen === "night" && <NightScreen />}
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

function HomeScreen() {
  return (
    <section className="home-screen">
      <ScreenIntro eyebrow="Friday · 18 September" title="our little somewhere">
        <p className="intro-copy">pieces of a life, left here for you.</p>
      </ScreenIntro>
      <div className="home-collage">
        <span className="scribble">found the light today ↘</span>
        <figure className="hero-polaroid">
          <span className="tape" />
          <img src={dominic} alt="Dominic by the apartment window" width={1024} height={1280} />
          <figcaption>around four in the afternoon</figcaption>
        </figure>
        <div className="pressed-flower" aria-hidden="true">
          ❧
        </div>
        <aside className="now-fragment">
          <p className="eyebrow">Now</p>
          <p>making coffee, avoiding the laundry, thinking of you.</p>
        </aside>
        <div className="ticket">
          <span>SEPT 18</span>
          <b>admit one</b>
          <span>side b</span>
        </div>
        <div className="song-strip">
          <div className="mini-record">
            <span />
          </div>
          <div>
            <small>currently playing</small>
            <strong>This Must Be the Place</strong>
            <em>Talking Heads · 4:56</em>
          </div>
          <Play size={15} fill="currentColor" />
        </div>
        <blockquote className="paper-note">
          hope today wasn’t too much.
          <br />
          tell me about it later.<span>— D</span>
        </blockquote>
      </div>
    </section>
  );
}

function RoomScreen() {
  const objects = ["his guitar", "desk notes", "headphones", "record pile", "worn converse"];
  return (
    <section className="room-screen">
      <ScreenIntro eyebrow="Friday evening" title="his room">
        <p className="intro-copy">things are exactly where he left them.</p>
      </ScreenIntro>
      <figure className="room-view">
        <img src={room} alt="Dominic's lived-in bedroom" width={1280} height={960} />
        {objects.map((label) => (
          <button key={label} className="object-pin" aria-label={label}>
            <span />
            <small>{label}</small>
          </button>
        ))}
      </figure>
      <div className="room-caption">
        <span>lamp on · record still spinning</span>
        <p>There’s a page open on the desk, and half a song waiting by the amp.</p>
      </div>
    </section>
  );
}

function MoreScreen({ onOpen }: { onOpen: (screen: Screen) => void }) {
  const { preferredName, signOut } = usePrivateDiario();
  const entries: { name: string; note: string; target?: Screen }[] = [
    { name: "Diary", note: "page 47 · friday", target: "diary" },
    { name: "Gallery", note: "86 photographs", target: "gallery" },
    { name: "Memories", note: "places, days, firsts" },
    { name: "Letters", note: "3 waiting for you", target: "letters" },
    { name: "Music", note: "songs left on repeat" },
    { name: "Now", note: "a small life update" },
    { name: "Little Things", note: "everything worth keeping" },
    { name: "Night", note: "after the lamps come on", target: "night" },
    { name: "Settings", note: "keep this place yours" },
  ];
  return (
    <section className="more-screen">
      <ScreenIntro eyebrow={`Kept for ${preferredName}`} title="kept here" />
      <div className="index-list">
        {entries.map((e, i) => (
          <button
            key={e.name}
            onClick={() => e.target && onOpen(e.target)}
            className={e.target ? "available" : ""}
          >
            <span>{String(i + 1).padStart(2, "0")}</span>
            <div>
              <strong>{e.name}</strong>
              <small>{e.note}</small>
            </div>
            {e.target && <ChevronRight size={17} />}
          </button>
        ))}
      </div>
      <div className="more-signoff">
        <p className="index-signoff">with care, always.</p>
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
      <div className="notebook-page">
        <span className="page-date">18 · 09 · 26</span>
        <h1>Friday, near sunset</h1>
        <p>
          I woke up with that song still in my head. The one from the kitchen, when neither of us
          knew the words but sang anyway.
        </p>
        <figure>
          <span className="tape" />
          <img
            src={cafe}
            alt="Two hands and coffee cups"
            width={1024}
            height={1024}
            loading="lazy"
          />
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
      <ScreenIntro eyebrow="Postmarked for you" title="letters">
        <p className="intro-copy">some things deserve paper.</p>
      </ScreenIntro>
      <div className="letter-stack">
        <button className="envelope envelope-one">
          <span className="stamp">
            D<br />
            18
          </span>
          <strong>for you</strong>
          <small>18 september</small>
        </button>
        <button className="envelope envelope-two">
          <span className="seal">D</span>
          <strong>
            open when
            <br />
            you miss me
          </strong>
          <small>keep close</small>
        </button>
        <article className="open-letter">
          <p>Alloah,</p>
          <p>
            I keep finding tiny things I want to tell you. This morning it was the light on the
            kitchen floor.
          </p>
          <span>yours, D</span>
        </article>
      </div>
    </section>
  );
}

function GalleryScreen() {
  return (
    <section className="gallery-screen">
      <ScreenIntro eyebrow="Roll 09 · 26" title="the way it was">
        <p className="intro-copy">not sorted. just remembered.</p>
      </ScreenIntro>
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
            <img
              key={n}
              src={dominic}
              alt="Dominic contact sheet"
              width={1024}
              height={1280}
              loading="lazy"
            />
          ))}
          <span>36A</span>
        </div>
        <p className="gallery-note">
          keep the blurry ones.
          <br />
          they remember movement.
        </p>
      </div>
    </section>
  );
}

function NightScreen() {
  return (
    <section className="night-screen">
      <header>
        <span>Diário</span>
        <small>11:42 pm</small>
      </header>
      <div className="moon">☾</div>
      <h1>still awake?</h1>
      <p className="night-copy">the room is quiet except for the record turning.</p>
      <div className="night-photo">
        <img
          src={room}
          alt="Dominic's room in the evening"
          width={1280}
          height={960}
          loading="lazy"
        />
        <span className="lamp-glow" />
      </div>
      <div className="night-record">
        <Disc3 />
        <div>
          <small>for the late hours</small>
          <strong>Fade Into You</strong>
          <span>Mazzy Star</span>
        </div>
        <Play size={16} fill="currentColor" />
      </div>
      <blockquote>
        “leave the light on.
        <br />
        i’ll find my way back.”<span>— D</span>
      </blockquote>
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
