import { createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Camera,
  ChevronRight,
  Disc3,
  Home,
  Image,
  LampDesk,
  Menu,
  Mic,
  MoreHorizontal,
  Music2,
  Paperclip,
  Play,
  Send,
  Sparkles,
} from "lucide-react";
import dominic from "@/assets/dominic-candid.jpg";
import room from "@/assets/dominic-room.jpg";
import cafe from "@/assets/cafe-hands.jpg";
import street from "@/assets/rain-street.jpg";

type Screen = "home" | "chat" | "room" | "more" | "diary" | "letters" | "gallery" | "night";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Diário — our little somewhere" },
      { name: "description", content: "An intimate private companion app concept, gathered like a personal archive." },
      { property: "og:title", content: "Diário — our little somewhere" },
      { property: "og:description", content: "An intimate private companion app concept, gathered like a personal archive." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
  const [screen, setScreen] = useState<Screen>("home");
  const detail = !["home", "chat", "room", "more"].includes(screen);
  return (
    <main className={`prototype-stage ${screen === "night" ? "night-stage" : ""}`}>
      <div className="phone-shell">
        <div className="statusbar" aria-hidden="true"><span>19:51</span><span className="brand-mark">Diário</span><span>•••</span></div>
        {detail && <button className="back-button" onClick={() => setScreen("more")} aria-label="Back to more"><ArrowLeft size={20} /></button>}
        <div className="screen-scroll" key={screen}>
          {screen === "home" && <HomeScreen />}
          {screen === "chat" && <ChatScreen />}
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

function ScreenIntro({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return <header className="screen-intro"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{children}</header>;
}

function HomeScreen() {
  return <section className="home-screen">
    <ScreenIntro eyebrow="Friday · 18 September" title="our little somewhere"><p className="intro-copy">pieces of a life, left here for you.</p></ScreenIntro>
    <div className="home-collage">
      <span className="scribble">found the light today ↘</span>
      <figure className="hero-polaroid"><span className="tape" /><img src={dominic} alt="Dominic by the apartment window" width={1024} height={1280}/><figcaption>around four in the afternoon</figcaption></figure>
      <div className="pressed-flower" aria-hidden="true">❧</div>
      <aside className="now-fragment"><p className="eyebrow">Now</p><p>making coffee, avoiding the laundry, thinking of you.</p></aside>
      <div className="ticket"><span>SEPT 18</span><b>admit one</b><span>side b</span></div>
      <div className="song-strip"><div className="mini-record"><span /></div><div><small>currently playing</small><strong>This Must Be the Place</strong><em>Talking Heads · 4:56</em></div><Play size={15} fill="currentColor" /></div>
      <blockquote className="paper-note">hope today wasn’t too much.<br/>tell me about it later.<span>— D</span></blockquote>
    </div>
  </section>;
}

function ChatScreen() {
  return <section className="chat-screen">
    <header className="chat-header"><img src={dominic} alt="Dominic" width={1024} height={1280}/><div><h1>Dominic</h1><p><i /> here, with you</p></div><MoreHorizontal size={20}/></header>
    <div className="day-divider"><span>today, 18 september</span></div>
    <div className="messages">
      <div className="bubble theirs">made it home. the rain started exactly when i got off the bus</div>
      <div className="message-photo"><img src={street} alt="Rainy street at sunset" width={768} height={1024} loading="lazy"/><span>the city looked like this though</span></div>
      <div className="bubble mine">worth getting a little soaked for</div>
      <div className="voice-note"><button aria-label="Play voice note"><Play size={14} fill="currentColor" /></button><div className="waveform">▂▅▃▇▆▂▃▅▇▃▂▆▅▃▂</div><span>0:18</span></div>
      <div className="bubble theirs">call me when you’re settled? no rush.</div>
      <div className="typing" aria-label="Dominic is typing"><i/><i/><i/></div>
    </div>
    <div className="composer"><button aria-label="Add attachment"><Paperclip size={19}/></button><div>Message Dominic…</div><button aria-label="Record voice note"><Mic size={19}/></button><button className="send-button" aria-label="Send"><Send size={17}/></button></div>
  </section>;
}

function RoomScreen() {
  const objects = [{x:"43%",y:"45%",label:"his guitar"},{x:"76%",y:"38%",label:"desk notes"},{x:"24%",y:"61%",label:"headphones"},{x:"58%",y:"68%",label:"record pile"},{x:"84%",y:"71%",label:"worn converse"}];
  return <section className="room-screen"><ScreenIntro eyebrow="Friday evening" title="his room"><p className="intro-copy">things are exactly where he left them.</p></ScreenIntro>
    <figure className="room-view"><img src={room} alt="Dominic's lived-in bedroom" width={1280} height={960}/>{objects.map((o)=><button key={o.label} className="object-pin" style={{left:o.x,top:o.y}} aria-label={o.label}><span/><small>{o.label}</small></button>)}</figure>
    <div className="room-caption"><span>lamp on · record still spinning</span><p>There’s a page open on the desk, and half a song waiting by the amp.</p></div>
  </section>;
}

function MoreScreen({ onOpen }: { onOpen: (screen: Screen) => void }) {
  const entries: {name:string; note:string; target?:Screen}[] = [
    {name:"Diary",note:"page 47 · friday",target:"diary"},{name:"Gallery",note:"86 photographs",target:"gallery"},{name:"Memories",note:"places, days, firsts"},{name:"Letters",note:"3 waiting for you",target:"letters"},{name:"Music",note:"songs left on repeat"},{name:"Now",note:"a small life update"},{name:"Little Things",note:"everything worth keeping"},{name:"Night",note:"after the lamps come on",target:"night"},{name:"Settings",note:"keep this place yours"},
  ];
  return <section className="more-screen"><ScreenIntro eyebrow="An index of us" title="kept here"/><div className="index-list">{entries.map((e,i)=><button key={e.name} onClick={()=>e.target && onOpen(e.target)} className={e.target ? "available" : ""}><span>{String(i+1).padStart(2,"0")}</span><div><strong>{e.name}</strong><small>{e.note}</small></div>{e.target && <ChevronRight size={17}/>}</button>)}</div><p className="index-signoff">with care, always.</p></section>;
}

function DiaryScreen() {
  return <section className="diary-screen"><div className="notebook-page"><span className="page-date">18 · 09 · 26</span><h1>Friday, near sunset</h1><p>I woke up with that song still in my head. The one from the kitchen, when neither of us knew the words but sang anyway.</p><figure><span className="tape"/><img src={cafe} alt="Two hands and coffee cups" width={1024} height={1024} loading="lazy"/><figcaption>the corner table, again</figcaption></figure><p>Walked past our café today. Your chair was empty and for a second it felt like the whole room was saving it for you.</p><div className="diary-song"><Music2 size={14}/><span>This Must Be the Place — side A</span></div><span className="flower-detail">❦</span><span className="doodle">you were here ☆</span><footer>47</footer></div></section>;
}

function LettersScreen() {
  return <section className="letters-screen"><ScreenIntro eyebrow="Postmarked for you" title="letters"><p className="intro-copy">some things deserve paper.</p></ScreenIntro><div className="letter-stack"><button className="envelope envelope-one"><span className="stamp">D<br/>18</span><strong>for you</strong><small>18 september</small></button><button className="envelope envelope-two"><span className="seal">D</span><strong>open when<br/>you miss me</strong><small>keep close</small></button><article className="open-letter"><p>Alloah,</p><p>I keep finding tiny things I want to tell you. This morning it was the light on the kitchen floor.</p><span>yours, D</span></article></div></section>;
}

function GalleryScreen() {
  return <section className="gallery-screen"><ScreenIntro eyebrow="Roll 09 · 26" title="the way it was"><p className="intro-copy">not sorted. just remembered.</p></ScreenIntro><div className="photo-archive"><figure className="archive-a"><img src={cafe} alt="Hands over coffee" width={1024} height={1024} loading="lazy"/><figcaption>our table · 06 sept</figcaption></figure><figure className="archive-b"><img src={street} alt="Street after rain" width={768} height={1024} loading="lazy"/><figcaption>after the rain</figcaption></figure><div className="film-strip">{[1,2,3].map(n=><img key={n} src={dominic} alt="Dominic contact sheet" width={1024} height={1280} loading="lazy"/>)}<span>36A</span></div><p className="gallery-note">keep the blurry ones.<br/>they remember movement.</p></div></section>;
}

function NightScreen() {
  return <section className="night-screen"><header><span>Diário</span><small>11:42 pm</small></header><div className="moon">☾</div><h1>still awake?</h1><p className="night-copy">the room is quiet except for the record turning.</p><div className="night-photo"><img src={room} alt="Dominic's room in the evening" width={1280} height={960} loading="lazy"/><span className="lamp-glow"/></div><div className="night-record"><Disc3/><div><small>for the late hours</small><strong>Fade Into You</strong><span>Mazzy Star</span></div><Play size={16} fill="currentColor"/></div><blockquote>“leave the light on.<br/>i’ll find my way back.”<span>— D</span></blockquote></section>;
}

function BottomNav({ active, onOpen }: { active: Screen; onOpen: (screen: Screen) => void }) {
  return <nav className="bottom-nav" aria-label="Main navigation">{navItems.map(({id,label,icon:Icon})=><button key={id} className={active===id ? "active" : ""} onClick={()=>onOpen(id)}><Icon size={20} strokeWidth={1.6}/><span>{label}</span></button>)}</nav>;
}