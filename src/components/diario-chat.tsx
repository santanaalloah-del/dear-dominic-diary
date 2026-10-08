import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SpontaneousPhotoOpportunity } from "@/components/spontaneous-photo-opportunity";
import { DateModeChatBridge } from "@/components/date-mode-chat-bridge";
import "@/components/date-mode-chat-context.css";
import "@/components/diario-chat-world.css";
import {
  Camera,
  ChevronRight,
  Heart,
  Image,
  Mail,
  Mic,
  Music2,
  Palette,
  Pause,
  Phone,
  Play,
  Plus,
  RotateCcw,
  Search,
  SendHorizontal,
  Smile,
  Video,
  MessageCircle,
Sparkles,
} from "lucide-react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { usePrivateDiario } from "@/components/private-diario";
import { ConnectedObjectDetailScreen } from "@/components/connected-object-detail-screen";
import {
  applyDominicWorldStateAction,
  getCurrentDominicState,
  resolveDominicPresence,
  processDominicStateCheckIns,
  type DominicPresence,
  type DominicState,
} from "@/lib/dominic-state";
import {
  getWearingSelection,
} from "@/lib/wardrobe-context";
import {
  getChatProfiles,
  removeChatProfilePhoto,
  saveChatProfile,
  uploadChatProfilePhoto,
  type ChatProfile,
  type ChatProfileOwner,
} from "@/lib/chat-profile";
import {
  getChatStickers,
  removeChatSticker,
  uploadChatSticker,
  type ChatStickerAsset,
  type ChatStickerOwner,
} from "@/lib/chat-stickers";
import {
  loadDominicLiveDateContext,
  liveDateContextForPrompt,
} from "@/lib/dominic-live-date-context";
import {
  getLiveDateExperience,
  readDateExperience,
} from "@/lib/date-experience";
import {
  findDateVenuePurchase,
  recordDateVenuePurchase,
  venueItemAction,
} from "@/lib/date-venue-world";
import { notifyDateVenueActionChanged } from "@/lib/date-live-events";
import { readVenueWorldCatalog } from "@/lib/venue-world";
import { useTimeMood } from "@/lib/time-mood";
import {
  createDate,
  createLetter,
  createMemory,
  createPlace,
  createSong,
  getDates,
  getGalleryPhotos,
  getLooks,
  getWardrobeItems,
  type DiarioItem,
  type GalleryPhoto,
} from "@/lib/diario-world";
import dominic from "@/assets/dominic-candid.jpg";

type DominicActionType =
  | "create_date"
  | "create_letter"
  | "create_memory"
  | "create_place"
  | "create_song"
  | "date_venue_action"
  | "update_profile_photo"
  | "change_live_state";

type DominicWorldAction =
  | {
      type:
        "create_date";

      title:
        string;

      place:
        string;

      plannedFor:
        string;

      note?:
        string;
    }
  | {
      type:
        "create_letter";

      title:
        string;

      body:
        string;
    }
  | {
      type:
        "create_memory";

      title:
        string;

      body?:
        string;

      eventAt?:
        string;
    }
  | {
      type:
        "create_place";

      title:
        string;

      neighborhood?:
        string;

      placeType?:
        string;

      placeStatus:
        | "saved"
        | "visited";

      note?:
        string;
    }
  | {
      type:
        "create_song";

      title:
        string;

      artist:
        string;

      album?:
        string;

      note?:
        string;
    }
  | {
      type:
        "date_venue_action";

      dateId:
        string;

      itemId:
        string;

      venueAction:
        | "ordered"
        | "bought";
    }
  | {
      type:
        "update_profile_photo";

      photoId:
        string;
    }
  | {
      type:
        "change_live_state";

      location:
        DominicState["location"];

      activity:
        DominicState["activity"];

      detail?:
        string;
    };

type MessageKind =
  | "text"
  | "physical_action"
  | "voice"
  | "photo"
  | "sticker"
  | "shared_item"
  | "agent_action";

type PendingChatShare = {
  text:
    string;

  itemId:
    string;

  kind:
    DiarioItem[
      "kind"
    ];

  title:
    string;

  subtitle?:
    string | null;
};

type ChatMedia = {
  id:
    string;

  type:
    | "photo"
    | "voice"
    | "sticker"
    | "shared_item"
    | "agent_action";

  url?:
    string;

  transcript?:
    string;

  createdAt:
    string;

  sender?:
    | "user"
    | "assistant";

  generated?:
    boolean;

  sharedItemId?:
    string;

  sharedTitle?:
    string;

  sharedSubtitle?:
    string | null;

  sharedKind?:
    DiarioItem[
      "kind"
    ];

  actionTargetItemId?:
    string;

  actionTitle?:
    string;

  actionType?:
    DominicActionType;

  physicalAction?:
    string;

  replyTo?: {
    id: string;
    role: "user" | "assistant";
    content: string;
  } | null;
};

type ChatMessage = {
  id:
    string;

  role:
    | "user"
    | "assistant";

  content:
    string;

  createdAt:
    string;

  kind?:
    MessageKind;

  mediaUrl?:
    string;

  diaryItemId?:
    string;

  sharedTitle?:
    string;

  sharedSubtitle?:
    string | null;

  sharedKind?:
    DiarioItem[
      "kind"
    ];

  actionTitle?:
    string;

  actionType?:
    DominicActionType;

  physicalAction?:
    string;
};

type DominicReplyPart = {
  kind: "speech" | "action";
  content: string;
};

function stripInternalReplyDirective(value: string) {
  return value
    .replace(/<REPLY_TO\s*:[\s\S]*?>\s*/gi, "")
    .replace(/\[\s*message_id\s*:\s*[^\]]+\]\s*/gi, "")
    .trim();
}

function parseDominicReplyParts(
  value: string
): DominicReplyPart[] {
  const clean = stripInternalReplyDirective(value);
  if (!clean) return [];

  const parts: DominicReplyPart[] = [];
  const actionPattern = /\*([^*]+)\*/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while (
    (match = actionPattern.exec(clean))
  ) {
    const speech = clean
      .slice(cursor, match.index)
      .trim();

    if (speech) {
      parts.push({
        kind: "speech",
        content: speech,
      });
    }

    const action =
      match[1]?.trim();

    if (action) {
      parts.push({
        kind: "action",
        content: action,
      });
    }

    cursor =
      match.index +
      match[0].length;
  }

  const tail =
    clean.slice(cursor).trim();

  if (tail) {
    parts.push({
      kind: "speech",
      content: tail,
    });
  }

  return parts.length
    ? parts
    : [
        {
          kind: "speech",
          content: clean,
        },
      ];
}

function isDominicActionType(
  value: unknown
): value is DominicActionType {
  return (
    value ===
      "create_date" ||
    value ===
      "create_letter" ||
    value ===
      "create_memory" ||
    value ===
      "create_place" ||
    value ===
      "create_song" ||
    value ===
      "date_venue_action" ||
    value ===
      "update_profile_photo" ||
    value ===
      "change_live_state"
  );
}

function dominicActionLabel(
  type?:
    DominicActionType
) {
  if (
    type ===
    "create_date"
  ) {
    return "Dominic planned a Date";
  }

  if (
    type ===
    "create_letter"
  ) {
    return "Dominic left a Letter";
  }

  if (
    type ===
    "create_memory"
  ) {
    return "Dominic saved a Memory";
  }

  if (
    type ===
    "create_place"
  ) {
    return "Dominic saved a Place";
  }

  if (
    type ===
    "create_song"
  ) {
    return "Dominic added a Song";
  }

  if (
    type ===
    "date_venue_action"
  ) {
    return "Dominic chose something on the Date";
  }

  if (
    type ===
    "update_profile_photo"
  ) {
    return "Dominic changed his profile photo";
  }

  if (
    type ===
    "change_live_state"
  ) {
    return "Dominic changed what he is doing";
  }

  return "Dominic added something";
}

type ActiveListeningTrack = {
  title: string;
  artist?: string | null;
  coverUrl?: string | null;
  spotifyUrl?: string | null;
  owner: "alloah" | "dominic" | "together";
};

type ChatTheme = "diary" | "cherry" | "old-letter" | "soft-rose" | "midnight";
type BubbleStyle = "soft" | "paper" | "minimal" | "classic";

type ChatPreferences = {
  theme: ChatTheme;
  bubbles: BubbleStyle;
  adaptToTime: boolean;
  showTimestamps: boolean;
  showDominicAvatar: boolean;
};

type VoiceMarker = { content: string; sentAt: string };

type SpeechResultEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }>;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

const PREFS_KEY = "diario-chat-preferences-v1";
const VOICE_KEY = "diario-voice-markers-v1";

const DOMINIC_NAME = "Dominic";

const defaultPreferences: ChatPreferences = {
  theme: "diary",
  bubbles: "soft",
  adaptToTime: true,
  showTimestamps: true,
  showDominicAvatar: true,
};

const themeOptions: { id: ChatTheme; label: string; note: string }[] = [
  { id: "diary", label: "Diary", note: "cream · pink · burgundy" },
  { id: "cherry", label: "Cherry Wine", note: "wine · dusty rose" },
  { id: "old-letter", label: "Old Letter", note: "sepia · brown" },
  { id: "soft-rose", label: "Soft Rose", note: "blush · cream" },
  { id: "midnight", label: "Midnight", note: "plum · deep wine" },
];

const bubbleOptions: { id: BubbleStyle; label: string }[] = [
  { id: "soft", label: "Soft" },
  { id: "paper", label: "Paper" },
  { id: "minimal", label: "Minimal" },
  { id: "classic", label: "Classic" },
];

const formatTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(value));

function readPreferences(): ChatPreferences {
  if (typeof window === "undefined") return defaultPreferences;
  try {
    const saved = JSON.parse(window.localStorage.getItem(PREFS_KEY) ?? "null");
    return { ...defaultPreferences, ...(saved ?? {}) };
  } catch {
    return defaultPreferences;
  }
}

function readVoiceMarkers(): VoiceMarker[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(VOICE_KEY) ?? "[]") as VoiceMarker[];
  } catch {
    return [];
  }
}

function rememberVoice(content: string, sentAt: string) {
  if (typeof window === "undefined") return;
  const markers = [...readVoiceMarkers(), { content, sentAt }].slice(-50);
  window.localStorage.setItem(VOICE_KEY, JSON.stringify(markers));
}

function wasVoiceMessage(content: string, createdAt: string) {
  const created = new Date(createdAt).getTime();
  return readVoiceMarkers().some((marker) => {
    const markerTime = new Date(marker.sentAt).getTime();
    return marker.content.trim() === content.trim() && Math.abs(created - markerTime) < 5 * 60_000;
  });
}

function voiceDuration(content: string) {
  const seconds = Math.max(3, Math.round(content.trim().split(/\s+/).length / 2.3));
  return `0:${String(Math.min(seconds, 59)).padStart(2, "0")}`;
}

function dominicPresenceCopy(
  state:
    DominicState | null
) {
  if (!state) {
    return "loading his day…";
  }

  const room: Record<
    string,
    string
  > = {
    living:
      "living room",
    bedroom:
      "bedroom",
    kitchen:
      "kitchen",
    bathroom:
      "bathroom",
    hall:
      "hall",
    out:
      "out",
  };

  const activity: Record<
    string,
    string
  > = {
    sleeping:
      "asleep",
    waking_up:
      "waking up",
    showering:
      "in the shower",
    getting_dressed:
      "getting dressed",
    making_coffee:
      "making coffee",
    cooking:
      "cooking",
    eating:
      "eating",
    washing_dishes:
      "doing the dishes",
    cleaning:
      "cleaning up",
    doing_laundry:
      "doing laundry",
    watching_something:
      "watching something",
    listening_to_music:
      "listening to music",
    playing_guitar:
      "playing guitar",
    writing_music:
      "writing music",
    recording:
      "recording",
    reading:
      "reading",
    scrolling:
      "on his phone",
    on_the_phone:
      "on a call",
    relaxing:
      "taking it easy",
    napping:
      "having a nap",
    getting_ready:
      "getting ready",
    leaving_home:
      "heading out",
    coming_home:
      "coming home",
    walking:
      "out walking",
    getting_food:
      "getting food",
    shopping:
      "out shopping",
    at_a_cafe:
      "at a café",
    with_friends:
      "with friends",
    working:
      "working",
    at_the_studio:
      "at the studio",
    rehearsing:
      "rehearsing",
    performing:
      "performing",
    backstage:
      "backstage",
    traveling:
      "traveling",
    driving:
      "driving",
    idle:
      "around",
  };

  const action =
    activity[
      state.activity
    ] ??
    state.activity
      .replaceAll(
        "_",
        " "
      );

  if (
    state.detail?.trim()
  ) {
    return `${action} · ${state.detail.trim()}`;
  }

  const place =
    room[
      state.location
    ] ??
    state.location;

  if (
    state.location ===
      "out" &&
    [
      "walking",
      "getting_food",
      "shopping",
      "at_a_cafe",
      "with_friends",
      "working",
      "at_the_studio",
      "rehearsing",
      "performing",
      "backstage",
      "traveling",
      "recording",
      "driving",
    ].includes(
      state.activity
    )
  ) {
    return action;
  }

  return `${action} · ${place}`;
}

function DiarioVoiceNote({
  src,
  transcript,
  open,
  onToggleTranscript,
}: {
  src?: string;
  transcript?: string;
  open: boolean;
  onToggleTranscript: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackError, setPlaybackError] = useState(false);

  const formatTime = (seconds: number) => {
    const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
    return `${Math.floor(safe / 60)}:${String(Math.floor(safe % 60)).padStart(2, "0")}`;
  };

  return (
    <div className="voice-note-real">
      {src ? (
        <>
          <audio
            ref={audioRef}
            className="voice-note-native-audio"
            preload="metadata"
            src={src}
            onLoadedMetadata={(event) => {
              const next = event.currentTarget.duration;
              setDuration(Number.isFinite(next) ? next : 0);
              setPlaybackError(false);
            }}
            onTimeUpdate={(event) => {
              setProgress(event.currentTarget.currentTime || 0);
            }}
            onPlay={() => {
              setPlaying(true);
              setPlaybackError(false);
            }}
            onPause={() => setPlaying(false)}
            onEnded={() => {
              setPlaying(false);
              setProgress(0);
            }}
            onError={() => {
              setPlaying(false);
              setPlaybackError(true);
            }}
          />
          <div className="voice-note-player">
            <button
              type="button"
              className="voice-note-play"
              aria-label={playing ? "Pause voice note" : "Play voice note"}
              onClick={() => {
                const audio = audioRef.current;
                if (!audio) return;
                if (!audio.paused) {
                  audio.pause();
                  return;
                }
                setPlaybackError(false);
                audio.play().catch(() => {
                  setPlaying(false);
                  setPlaybackError(true);
                });
              }}
            >
              {playing ? (
                <Pause aria-hidden="true" />
              ) : (
                <Play aria-hidden="true" />
              )}
            </button>
            <div className="voice-note-track" aria-hidden="true">
              <span
                style={{
                  width: `${Math.min(
                    100,
                    (progress / Math.max(duration || 1, 1)) * 100
                  )}%`,
                }}
              />
            </div>
            <span className="voice-note-time">
              {playing || progress > 0
                ? formatTime(progress)
                : formatTime(duration)}
            </span>
          </div>
          {playbackError && (
            <span className="voice-note-error">Audio unavailable</span>
          )}
        </>
      ) : (
        <span className="voice-note-error">Audio unavailable</span>
      )}

      {transcript && (
        <button
          type="button"
          className="voice-transcript-toggle"
          onClick={onToggleTranscript}
        >
          Transcript
        </button>
      )}

      {open && transcript && <em>{transcript}</em>}
    </div>
  );
}

export function DiarioChat({
  onOpen,
}: {
onOpen: (
  screen:
    | "letters"
    | "music"
    | "dates"
    | "photo-engine"
    | "gallery"
    | "memories"
    | "wardrobe"
    | "places"
    | "settings"
) => void;
}) {
  const { session, preferredName } = usePrivateDiario();
  const time = useTimeMood();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [failedMessage, setFailedMessage] = useState<string | null>(null);
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const [swipingMessageId, setSwipingMessageId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const replyTouchRef = useRef<{ id: string; x: number; y: number; timer: ReturnType<typeof window.setTimeout> | null } | null>(null);
  const [preferences, setPreferences] = useState<ChatPreferences>(defaultPreferences);

  const [
    chatProfiles,
    setChatProfiles,
  ] = useState<{
    alloah: ChatProfile;
    dominic: ChatProfile;
  } | null>(null);

  const [
    profileError,
    setProfileError,
  ] = useState<string | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<"idle" | "listening" | "processing">("idle");
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [openTranscript, setOpenTranscript] = useState<string | null>(null);
  const [
  selectedChatObjectId,
  setSelectedChatObjectId,
] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const pendingMessagesRef =
  useRef<
    {
      text: string;
      kind: MessageKind;
      photoContext?: {
        storagePath: string;
        storageBucket: string;
      };
      replyTo?: {
        id: string;
        role: "user" | "assistant";
        content: string;
      } | null;
    }[]
  >([]);

const processingQueueRef =
  useRef(false);

  const queueTimerRef =
  useRef<ReturnType<typeof window.setTimeout> | null>(
    null
  );
  
const photoInputRef =
    useRef<HTMLInputElement | null>(null);

  const cameraInputRef =
    useRef<HTMLInputElement | null>(null);

  const mediaRecorderRef =
    useRef<MediaRecorder | null>(null);

  const audioChunksRef =
    useRef<Blob[]>([]);

  const audioTranscriptRef =
    useRef("");

  const cancelVoiceRef =
    useRef(false);

  const [uploadingMedia, setUploadingMedia] =
    useState(false);

  const [searchOpen, setSearchOpen] =
    useState(false);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [stickersOpen, setStickersOpen] =
    useState(false);

  const [
    customStickers,
    setCustomStickers,
  ] = useState<ChatStickerAsset[]>([]);

  const [
    stickerBusy,
    setStickerBusy,
  ] = useState(false);

  const [
    stickerNotice,
    setStickerNotice,
  ] = useState<string | null>(null);

  const [
    stickerOwnerView,
    setStickerOwnerView,
  ] = useState<
    ChatStickerOwner | "all"
  >("all");

  const [
    stickerUploadOwner,
    setStickerUploadOwner,
  ] = useState<ChatStickerOwner>(
    "alloah"
  );

  const stickerInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

 const [activeListeningTrack, setActiveListeningTrack] =
  useState<ActiveListeningTrack | null>(null);

useEffect(() => {
  const loadActiveListeningTrack = () => {
    if (typeof window === "undefined") return;

    try {
      const saved = window.localStorage.getItem(
        "diario-active-listening-track-v1"
      );

      setActiveListeningTrack(
        saved ? JSON.parse(saved) : null
      );
    } catch {
      setActiveListeningTrack(null);
    }
  };

  loadActiveListeningTrack();

  window.addEventListener(
    "diario-active-listening-track",
    loadActiveListeningTrack
  );

  window.addEventListener(
    "storage",
    loadActiveListeningTrack
  );

  return () => {
    window.removeEventListener(
      "diario-active-listening-track",
      loadActiveListeningTrack
    );

    window.removeEventListener(
      "storage",
      loadActiveListeningTrack
    );
  };
}, []);

const activeListeningLabel =
  activeListeningTrack?.owner === "together"
    ? "LISTENING TOGETHER"
    : activeListeningTrack?.owner === "dominic"
      ? "DOMINIC IS LISTENING"
      : "ALLOAH IS LISTENING";

  const [dominicState, setDominicState] =
  useState<DominicState | null>(null);

  const [dominicPresence, setDominicPresence] =
    useState<DominicPresence | null>(null);

  type AlloahLocation = "home" | "work" | "on_my_way" | "out";
  const [alloahLocation, setAlloahLocation] = useState<AlloahLocation | null>(null);
  const [alloahPresenceOpen, setAlloahPresenceOpen] = useState(false);
  const alloahLocationOptions: { value: AlloahLocation; label: string }[] = [
    { value: "home", label: "Home" },
    { value: "work", label: "Work" },
    { value: "on_my_way", label: "On my way" },
    { value: "out", label: "Out" },
  ];

  useEffect(() => {
    let cancelled = false;
    void supabase.from("world_state").select("alloah_location").eq("user_id", session.user.id).maybeSingle()
      .then(({ data, error }) => {
        if (error) throw error;
        const value = data?.alloah_location;
        if (!cancelled && ["home","work","on_my_way","out"].includes(value ?? "")) setAlloahLocation(value as AlloahLocation);
      })
      .catch((error) => console.error("Could not load Alloah presence:", error));
    return () => { cancelled = true; };
  }, [session.user.id]);

  const updateAlloahLocation = async (next: AlloahLocation) => {
    const previous = alloahLocation;
    setAlloahLocation(next);
    const { error } = await supabase.from("world_state").update({ alloah_location: next, updated_at: new Date().toISOString() }).eq("user_id", session.user.id);
    if (error) {
      setAlloahLocation(previous);
      console.error("Could not update Alloah presence:", error);
    }
  };

  const [
    dominicWearingLabel,
    setDominicWearingLabel,
  ] = useState<string | null>(null);

  const [nearbyCommitments, setNearbyCommitments] =
  useState<
    {
      kind: DiarioItem["kind"];
      title: string | null;
      note: string | null;
      plannedFor: string | null;
      place: string | null;
      timeKnown: boolean;
    }[]
  >([]);

useEffect(() => {
  let cancelled = false;

  const refreshDominicState =
    async () => {
      try {
        const state =
          await getCurrentDominicState(
            session.user.id
          );

        if (!cancelled) {
          setDominicState(state);
        }
      } catch (error) {
        console.error(
          "Could not refresh Dominic live state:",
          error
        );

        if (!cancelled) {
          setDominicState({
            location: "living",
            activity: "idle",
            mood: "calm",
            energy: 65,
            startedAt: new Date().toISOString(),
            nextChangeAt: new Date(Date.now() + 30 * 60_000).toISOString(),
            source: "schedule",
          });
        }
      }

      try {
        const presence =
          await resolveDominicPresence(
            session.user.id
          );

        if (!cancelled) {
          setDominicPresence(
            presence
          );
        }
      } catch (error) {
        console.error(
          "Could not resolve Dominic presence:",
          error
        );
      }

      try {
        const [
          wearing,
          looks,
          clothing,
        ] = await Promise.all([
          getWearingSelection({
            userId:
              session.user.id,
            owner:
              "dominic",
          }),
          getLooks(
            session.user.id
          ),
          getWardrobeItems(
            session.user.id
          ),
        ]);

        if (cancelled) return;

        if (
          wearing?.lookId
        ) {
          const look =
            looks.find(
              (item) =>
                item.id ===
                wearing.lookId &&
                item.owner ===
                  "dominic"
            );

          if (look) {
            setDominicWearingLabel(
              look.title ??
                "a saved look"
            );
            return;
          }
        }

        const pieces =
          clothing
            .filter(
              (item) =>
                item.owner ===
                  "dominic" &&
                wearing?.clothingIds
                  .includes(
                    item.id
                  )
            )
            .map(
              (item) =>
                item.title ??
                "piece"
            )
            .slice(
              0,
              3
            );

        setDominicWearingLabel(
          pieces.length
            ? pieces.join(
                " · "
              )
            : null
        );
      } catch (
        error
      ) {
        console.error(
          "Could not load Dominic's current outfit:",
          error
        );

        if (!cancelled) {
          setDominicWearingLabel(
            null
          );
        }
      }
    };

  void refreshDominicState();

  const refreshOnVisible = () => {
    if (document.visibilityState === "visible") {
      void refreshDominicState();
    }
  };

  const refreshOnFocus = () => {
    void refreshDominicState();
  };

  document.addEventListener("visibilitychange", refreshOnVisible);
  window.addEventListener("focus", refreshOnFocus);

  const processDueInitiative =
    async () => {
      try {
        const results =
          await processDominicStateCheckIns(
            session.user.id
          );

        if (
          results.some(
            (item) =>
              item.decision ===
              "send"
          )
        ) {
          await generateReadyDominicInitiative();
        }
      } catch (error) {
        console.error(
          "Could not process Dominic proactive events:",
          error
        );
      }
    };

  void processDueInitiative();

  const timer =
    window.setInterval(
      refreshDominicState,
      60_000
    );

  const proactiveTimer =
    window.setInterval(
      processDueInitiative,
      60_000
    );

  return () => {
    cancelled = true;
    window.clearInterval(timer);
    window.clearInterval(
      proactiveTimer
    );
    document.removeEventListener("visibilitychange", refreshOnVisible);
    window.removeEventListener("focus", refreshOnFocus);
  };
}, [session.user.id]);

const loadNearbyCommitmentsNow = useCallback(async () => {
  const dates =
    await getDates(session.user.id);

  const now = Date.now();
  const pastWindow =
    now - 24 * 60 * 60_000;
  const futureWindow =
    now + 48 * 60 * 60_000;

  return dates
    .filter((item) => {
      if (!item.planned_for) {
        return false;
      }

      const time =
        new Date(item.planned_for).getTime();

      return (
        time >= pastWindow &&
        time <= futureWindow
      );
    })
    .slice(0, 5)
    .map((item) => ({
      kind: item.kind,
      title: item.title,
      note: item.body,
      plannedFor: item.planned_for,
      place:
        typeof item.data?.place === "string"
          ? item.data.place
          : null,
      timeKnown: false,
    }));
}, [session.user.id]);

const scrollToLatestMessage = useCallback(() => {
  const runScroll = () => {
    const messagesArea =
      document.querySelector<HTMLElement>(
        ".screen-chat .messenger-messages, .screen-chat .live-messages"
      );

    if (!messagesArea) return;

    messagesArea.scrollTop = messagesArea.scrollHeight;
  };

  window.requestAnimationFrame(runScroll);
  window.setTimeout(runScroll, 120);
  window.setTimeout(runScroll, 450);
}, []);

useEffect(() => {
  if (loading) return;

  scrollToLatestMessage();
}, [loading, messages.length, sending, scrollToLatestMessage]);

useEffect(() => {
  let cancelled = false;

  void loadNearbyCommitmentsNow()
    .then((nearby) => {
      if (!cancelled) {
        setNearbyCommitments(nearby);
      }
    })
    .catch((error) => {
      console.error(
        "Could not load nearby commitments:",
        error
      );
    });

  return () => {
    cancelled = true;
  };
}, [loadNearbyCommitmentsNow]);

  
  useEffect(() => {
    let cancelled = false;

    getChatProfiles(
      session.user.id
    )
      .then((profiles) => {
        if (!cancelled) {
          setChatProfiles(
            profiles
          );
          setProfileError(
            null
          );
        }
      })
      .catch((error) => {
        console.error(
          "Could not load chat profiles:",
          error
        );

        if (!cancelled) {
          setProfileError(
            "Profile details could not be loaded."
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session.user.id]);

  useEffect(() => {
    let cancelled = false;

    getChatStickers(
      session.user.id
    )
      .then((stickers) => {
        if (!cancelled) {
          setCustomStickers(
            stickers
          );
        }
      })
      .catch((error) => {
        console.error(
          "Could not load custom stickers:",
          error
        );
      });

    return () => {
      cancelled = true;
    };
  }, [session.user.id]);

  useEffect(() => {
    setPreferences(readPreferences());
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(preferences));
    }
  }, [preferences]);

  async function uploadChatMedia({
    file,
    type,
    transcript,
  }: {
    file: File;
    type: "photo" | "voice";
    transcript?: string;
  }) {
    const extension =
      file.name.split(".").pop() ||
      (type === "photo" ? "jpg" : "webm");

    const storagePath =
      `${session.user.id}/chat/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } =
      await supabase.storage
        .from("diario-media")
        .upload(storagePath, file, {
          upsert: false,
          contentType: file.type,
        });

    if (uploadError) {
      throw uploadError;
    }

    const now =
      new Date().toISOString();

    const { error: itemError } =
      await supabase
        .from("diario_items")
        .insert({
          user_id: session.user.id,
          kind: "chat_media",
          owner: "alloah",
          status: "active",
          title:
            type === "photo"
              ? "Chat photo"
              : "Voice message",
          body:
            transcript || null,
          event_at: now,
          planned_for: null,
          data: {
            media_type: type,
            storage_bucket: "diario-media",
            storage_path: storagePath,
            transcript:
              transcript || null,
          },
        });

    if (itemError) {
      await supabase.storage
        .from("diario-media")
        .remove([storagePath]);

      throw itemError;
    }

    return {
      storagePath,
      createdAt: now,
    };
  }

  async function createChatSharedItem(
  share: PendingChatShare
) {
  const now =
    new Date().toISOString();

  const {
    data: chatShare,
    error: itemError,
  } = await supabase
    .from("diario_items")
    .insert({
      user_id:
        session.user.id,
      kind: "chat_media",
      owner: "alloah",
      status: "active",

      title: `Shared ${
        share.kind === "song"
          ? "song"
          : "item"
      }`,

      body: share.text,

      event_at: now,
      planned_for: null,

      data: {
        media_type:
          "shared_item",

        shared_item_id:
          share.itemId,

        shared_kind:
          share.kind,

        shared_title:
          share.title,

        shared_subtitle:
          share.subtitle ?? null,
      },
    })
    .select("id")
    .single();

  if (itemError) {
    throw itemError;
  }

  const { error: linkError } =
    await supabase
      .from("diario_links")
      .upsert(
        {
          user_id:
            session.user.id,

          source_item_id:
            chatShare.id,

          target_item_id:
            share.itemId,

          relation: "shared",

          data: {},
        },
        {
          onConflict:
            "user_id,source_item_id,target_item_id,relation",
        }
      );

  if (linkError) {
    await supabase
      .from("diario_items")
      .delete()
      .eq(
        "user_id",
        session.user.id
      )
      .eq(
        "id",
        chatShare.id
      );

    throw linkError;
  }

  return chatShare.id;
}

async function extractDominicActions({
  userMessage,
  replies,
  liveDateContext,
}: {
  userMessage:
    string;

  replies:
    string[];

  liveDateContext:
    Awaited<
      ReturnType<
        typeof loadDominicLiveDateContext
      >
    >;
}): Promise<
  
  DominicWorldAction[]
> {
  try {
    const {
      data: profilePhotoRows,
      error: profilePhotoError,
    } = await supabase
      .from("diario_items")
      .select("id,title,event_at,owner,data")
      .eq("user_id", session.user.id)
      .eq("kind", "photo")
      .eq("status", "active")
      .in("owner", ["dominic", "shared"])
      .order("event_at", { ascending: false })
      .limit(12);

    if (profilePhotoError) {
      console.error(
        "Could not load Dominic profile-photo candidates:",
        profilePhotoError
      );
    }

    const profilePhotoCandidates =
      (profilePhotoRows ?? [])
        .filter(
          (photo: any) =>
            typeof photo?.data?.storage_path === "string"
        )
        .map(
          (photo: any) => ({
            id: photo.id,
            title: photo.title ?? "Untitled photo",
            owner: photo.owner,
            eventAt: photo.event_at ?? null,
            generated: photo.data?.generated === true,
            sourceContext:
              typeof photo.data?.source_context === "string"
                ? photo.data.source_context
                : null,
          })
        );

    const response =
      await fetch(
        "/api/dominic-actions",
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${session.access_token}`,
          },

          body:
            JSON.stringify({
              userId:
                session.user.id,

              userMessage,

              replies,

              liveDateContext,

              dominicContext:
                dominicState
                  ? {
                      activity: dominicState.activity,
                      location: dominicState.location,
                      mood: dominicState.mood ?? null,
                      energy: dominicState.energy ?? null,
                      detail: dominicState.detail ?? null,
                      wearing: dominicWearingLabel,
                      listening: activeListeningTrack
                        ? {
                            title: activeListeningTrack.title,
                            artist: activeListeningTrack.artist ?? null,
                            owner: activeListeningTrack.owner,
                          }
                        : null,
                      togetherNow:
                        dominicPresence?.togetherNow ??
                        false,
                      presenceReason:
                        dominicPresence?.reason ??
                        "separate",
                      sharedPlace:
                        dominicPresence?.place ??
                        null,
                      interactionMode:
                        dominicPresence?.togetherNow
                          ? "co_present"
                          : "remote",
                      physicalActionsAllowed:
                        dominicPresence?.togetherNow ??
                        false,
                    }
                  : null,

              nearbyCommitments,

              profilePhotoCandidates,
            }),
        }
      );

    if (
      !response.ok
    ) {
      throw new Error(
        `Action interpreter returned ${response.status}.`
      );
    }

    const result =
      (await response.json()) as {
        actions?:
          unknown[];
      };

    if (
      !Array.isArray(
        result.actions
      )
    ) {
      return [];
    }

    return result.actions
      .filter(
        (
          value
        ): value is DominicWorldAction => {
          if (
            !value ||
            typeof value !==
              "object"
          ) {
            return false;
          }

          const type =
            (
              value as {
                type?: unknown;
              }
            ).type;

          return isDominicActionType(
            type
          );
        }
      )
      .slice(
        0,
        2
      );
  } catch (
    error
  ) {
    console.error(
      "Could not interpret Dominic world actions:",
      error
    );

    return [];
  }
}

async function hasExistingDominicAction(
  action:
    DominicWorldAction
) {
  const actionKey =
    JSON.stringify(
      action
    );

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "diario_items"
      )
      .select(
        "id"
      )
      .eq(
        "user_id",
        session.user.id
      )
      .eq(
        "kind",
        "chat_media"
      )
      .eq(
        "status",
        "active"
      )
      .contains(
        "data",
        {
          media_type:
            "agent_action",

          action_key:
            actionKey,
        }
      )
      .limit(1);

  if (error) {
    console.error(
      "Could not check Dominic action history:",
      error
    );

    return false;
  }

  return (
    data?.length ??
    0
  ) > 0;
}

async function createDominicActionChatItem({
  action,
  item,
}: {
  action:
    DominicWorldAction;

  item:
    DiarioItem;
}) {
  const now =
    new Date()
      .toISOString();

  const actionKey =
    JSON.stringify(
      action
    );

  const {
    data:
      chatAction,
    error:
      itemError,
  } =
    await supabase
      .from(
        "diario_items"
      )
      .insert({
        user_id:
          session.user.id,

        kind:
          "chat_media",

        owner:
          "dominic",

        status:
          "active",

        title:
          dominicActionLabel(
            action.type
          ),

        body:
          item.title ??
          null,

        event_at:
          now,

        planned_for:
          null,

        data: {
          media_type:
            "agent_action",

          chat_sender:
            "dominic",

          action_type:
            action.type,

          action_key:
            actionKey,

          target_item_id:
            item.id,

          target_kind:
            item.kind,

          target_title:
            item.title,
        },
      })
      .select(
        "id"
      )
      .single();

  if (
    itemError
  ) {
    throw itemError;
  }

  const {
    error:
      linkError,
  } =
    await supabase
      .from(
        "diario_links"
      )
      .upsert(
        {
          user_id:
            session.user.id,

          source_item_id:
            chatAction.id,

          target_item_id:
            item.id,

          relation:
            "created_from_chat",

          data: {},
        },
        {
          onConflict:
            "user_id,source_item_id,target_item_id,relation",
        }
      );

  if (
    linkError
  ) {
    await supabase
      .from(
        "diario_items"
      )
      .delete()
      .eq(
        "user_id",
        session.user.id
      )
      .eq(
        "id",
        chatAction.id
      );

    throw linkError;
  }
}

async function applyDominicAction(
  action:
    DominicWorldAction
): Promise<
  DiarioItem | null
> {
  if (
    action.type ===
      "change_live_state"
  ) {
    const nextState =
      await applyDominicWorldStateAction({
        userId:
          session.user.id,
        location:
          action.location,
        activity:
          action.activity,
        detail:
          action.detail ??
          null,
      });

    setDominicState(
      nextState
    );

    const presence =
      await resolveDominicPresence(
        session.user.id
      ).catch(() => null);

    if (presence) {
      setDominicPresence(
        presence
      );
    }

    return null;
  }

  if (
    action.type ===
    "update_profile_photo"
  ) {
    const duplicate =
      await hasExistingDominicAction(
        action
      );

    if (duplicate) {
      return null;
    }

    const {
      data: profilePhoto,
      error: profilePhotoError,
    } = await supabase
      .from("diario_items")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("id", action.photoId)
      .eq("kind", "photo")
      .eq("status", "active")
      .in("owner", ["dominic", "shared"])
      .maybeSingle();

    if (
      profilePhotoError ||
      !profilePhoto
    ) {
      return null;
    }

    const storagePath =
      typeof (profilePhoto.data as any)
        ?.storage_path === "string"
        ? (profilePhoto.data as any)
            .storage_path
        : null;

    if (!storagePath) {
      return null;
    }

    await saveChatProfile({
      userId: session.user.id,
      owner: "dominic",
      photoPath: storagePath,
    });

    try {
      const refreshed =
        await getChatProfiles(
          session.user.id
        );

      setChatProfiles(refreshed);
    } catch (error) {
      console.error(
        "Dominic changed his profile photo, but Chat could not refresh it:",
        error
      );
    }

    const item =
      profilePhoto as DiarioItem;

    try {
      await createDominicActionChatItem({
        action,
        item,
      });
    } catch (error) {
      console.error(
        "Dominic changed his profile photo, but its Chat action card failed:",
        error
      );
    }

    return item;
  }

  if (
    action.type ===
    "date_venue_action"
  ) {
    const liveDate =
      await getLiveDateExperience(
        session.user.id
      );

    if (
      !liveDate ||
      liveDate.id !==
        action.dateId
    ) {
      return null;
    }

    const experience =
      readDateExperience(
        liveDate
      );

 if (
  experience.currentLocationMode !==
    "place" ||
  !experience.currentPlaceId
) {
  return null;
}

    const {
      data: currentPlace,
      error: placeError,
    } = await supabase
      .from("diario_items")
      .select("*")
      .eq(
        "user_id",
        session.user.id
      )
      .eq(
        "id",
        experience.currentPlaceId
      )
      .eq(
        "kind",
        "place"
      )
      .maybeSingle();

    if (
      placeError ||
      !currentPlace
    ) {
      return null;
    }

    const place =
      currentPlace as DiarioItem;

    const catalog =
      readVenueWorldCatalog(
        place
      );

    if (!catalog) {
      return null;
    }

    const item =
      catalog.items.find(
        (candidate) =>
          candidate.id ===
          action.itemId
      );

    if (
      !item ||
      venueItemAction(item) !==
        action.venueAction
    ) {
      return null;
    }

    const existing =
      findDateVenuePurchase({
        date: liveDate,
        placeId: place.id,
        itemId: item.id,
        actor: "dominic",
      });

    if (existing) {
      return null;
    }

    const updatedDate =
      await recordDateVenuePurchase({
        userId:
          session.user.id,
        date: liveDate,
        place,
        catalog,
        item,
        actor: "dominic",
      });

    notifyDateVenueActionChanged(
      updatedDate.id
    );

    return updatedDate;
  }

  const duplicate =
    await hasExistingDominicAction(
      action
    );

  if (
    duplicate
  ) {
    return null;
  }

  let created:
    DiarioItem;

  if (
    action.type ===
    "create_date"
  ) {
    created =
      await createDate({
        userId:
          session.user.id,

        title:
          action.title,

        place:
          action.place,

        plannedFor:
          action.plannedFor,

        note:
          action.note,
      });
  } else if (
    action.type ===
    "create_letter"
  ) {
    created =
      await createLetter({
        userId:
          session.user.id,

        owner:
          "dominic",

        title:
          action.title,

        body:
          action.body,
      });
  } else if (
    action.type ===
    "create_memory"
  ) {
    created =
      await createMemory({
        userId:
          session.user.id,

        title:
          action.title,

        body:
          action.body,

        eventAt:
          action.eventAt,
      });
  } else if (
    action.type ===
    "create_place"
  ) {
    created =
      await createPlace({
        userId:
          session.user.id,

        title:
          action.title,

        neighborhood:
          action.neighborhood,

        placeType:
          action.placeType,

        placeStatus:
          action.placeStatus,

        note:
          action.note,
      });
  } else {
    created =
      await createSong({
        userId:
          session.user.id,

        owner:
          "dominic",

        title:
          action.title,

        artist:
          action.artist,

        album:
          action.album,

        note:
          action.note,
      });
  }

  try {
    await createDominicActionChatItem({
      action,
      item:
        created,
    });
  } catch (
    error
  ) {
    console.error(
      "Dominic created the diary object, but its Chat connection failed:",
      error
    );
  }

  return created;
}

async function runDominicActions(
  actions:
    DominicWorldAction[]
) {
  let createdSomething =
    false;

  for (
    const action of
    actions
  ) {
    try {
      const created =
        await applyDominicAction(
          action
        );

      if (
        created
      ) {
        createdSomething =
          true;
      }
    } catch (
      error
    ) {
      console.error(
        "Could not apply Dominic world action:",
        action,
        error
      );
    }
  }

  if (
    createdSomething
  ) {
    try {
      const nearby =
        await loadNearbyCommitmentsNow();

      setNearbyCommitments(
        nearby
      );
    } catch (
      error
    ) {
      console.error(
        "Could not refresh commitments after Dominic action:",
        error
      );
    }
  }
}

async function loadChatMedia(): Promise<
  ChatMedia[]
> {
  const { data, error } =
    await supabase
      .from("diario_items")
      .select("*")
      .eq(
        "user_id",
        session.user.id
      )
      .in("kind", [
        "chat_media",
        "photo",
      ])
      .eq("status", "active")
      .order("event_at", {
        ascending: true,
      });

  if (error) {
    throw error;
  }

  const media =
    await Promise.all(
      (data ?? []).map(
        async (
          item
        ): Promise<ChatMedia | null> => {
          const itemData =
            (item.data ?? {}) as any;

          const generatedChatPhoto =
            item.kind === "photo" &&
            itemData.generated === true &&
            itemData.source_context ===
              "chat";

          if (
            item.kind !== "chat_media" &&
            !generatedChatPhoto
          ) {
            return null;
          }

          const mediaType =
            generatedChatPhoto
              ? "photo"
              : itemData.media_type;

          const sender =
            generatedChatPhoto &&
            itemData.chat_sender ===
              "dominic"
              ? "assistant"
              : item.owner === "dominic"
                ? "assistant"
                : "user";

if (
            mediaType ===
            "shared_item"
          ) {
            const sharedItemId =
              typeof itemData
                .shared_item_id ===
              "string"
                ? itemData
                    .shared_item_id
                : null;

            if (
              !sharedItemId
            ) {
              return null;
            }

            return {
              id:
                item.id,

              type:
                "shared_item",

              transcript:
                item.body ??
                undefined,

              createdAt:
                item.event_at ??
                item.created_at,

              sender,

              sharedItemId,

              sharedTitle:
                typeof itemData
                  .shared_title ===
                "string"
                  ? itemData
                      .shared_title
                  : "Shared item",

              sharedSubtitle:
                typeof itemData
                  .shared_subtitle ===
                "string"
                  ? itemData
                      .shared_subtitle
                  : null,

              sharedKind:
                typeof itemData
                  .shared_kind ===
                "string"
                  ? itemData
                      .shared_kind
                  : undefined,
            };
          }

          if (
            mediaType ===
            "agent_action"
          ) {
            const targetItemId =
              typeof itemData
                .target_item_id ===
              "string"
                ? itemData
                    .target_item_id
                : null;

            const actionType =
              itemData
                .action_type;

            if (
              !targetItemId ||
              !isDominicActionType(
                actionType
              )
            ) {
              return null;
            }

            return {
              id:
                item.id,

              type:
                "agent_action",

              createdAt:
                item.event_at ??
                item.created_at,

              sender:
                "assistant",

              actionTargetItemId:
                targetItemId,

              actionType,

              actionTitle:
                typeof itemData
                  .target_title ===
                "string"
                  ? itemData
                      .target_title
                  : "Open",
            };
          }

          const storagePath =
            itemData.storage_path;

          const storageBucket =
            typeof itemData
              .storage_bucket ===
            "string"
              ? itemData
                  .storage_bucket
              : "diario-media";

          if (
            typeof storagePath !==
              "string" ||
            (mediaType !== "photo" &&
              mediaType !== "voice" &&
              mediaType !== "sticker")
          ) {
            return null;
          }

          const {
            data: signedData,
            error: signedError,
          } =
            await supabase.storage
              .from(storageBucket)
              .createSignedUrl(
                storagePath,
                60 * 60
              );

          if (signedError) {
            return null;
          }

          return {
            id: item.id,
            type: mediaType,
            url:
              signedData.signedUrl,
            transcript:
              typeof itemData
                .transcript ===
              "string"
                ? itemData
                    .transcript
                : undefined,
            createdAt:
              item.event_at ??
              item.created_at,
            sender,
            generated:
              generatedChatPhoto,
          };
        }
      )
    );

  return media.filter(
    (
      item
    ): item is ChatMedia =>
      item !== null
  );
}
  
 const loadHistory = useCallback(
    async (showLoading = true) => {
      if (showLoading) {
        setLoading(true);
      }

      const { data: conversations } =
        await supabase
          .from("conversations")
          .select(
            "id,title,updated_at"
          )
          .eq(
            "user_id",
            session.user.id
          )
          .order("updated_at", {
            ascending: false,
          });

      const conversation =
        conversations?.find((item) =>
          item.title
            ?.toLowerCase()
            .includes("dominic")
        ) ??
        conversations?.[0];

      const chatMedia =
        await loadChatMedia();

    if (!conversation) {
  const standaloneMedia =
    chatMedia.map(
      (
        media
      ): ChatMessage => ({
        id:
          media.id,

        role:
          media.sender ??
          "user",

        content:
          media.transcript ??
          "",

        createdAt:
          media.createdAt,

        kind:
          media.type,

        mediaUrl:
          media.url,

    diaryItemId:
          media.type ===
          "shared_item"
            ? media
                .sharedItemId
            : media.type ===
                "agent_action"
              ? media
                  .actionTargetItemId
              : media.id,

        sharedTitle:
          media.sharedTitle,

        sharedSubtitle:
          media.sharedSubtitle,

        sharedKind:
          media.sharedKind,

        actionTitle:
          media.actionTitle,

        actionType:
          media.actionType,
      })
    );

  setMessages(
    standaloneMedia
  );

  setLoading(false);

  return;
}
      
      const { data } =
        await supabase
          .from("messages")
          .select(
            "id,role,content,created_at,reply_to_message_id"
          )
          .eq(
            "user_id",
            session.user.id
          )
          .eq(
            "conversation_id",
            conversation.id
          )
          .in("role", [
            "user",
            "assistant",
          ])
          .order("created_at", {
            ascending: true,
          });

    const matchedSharedMediaIds =
  new Set<string>();

const messageLookup = new Map(
  (data ?? []).map((item) => [String(item.id), item])
);

const normalizeVoiceCopy = (value: string) =>
  value.replace(/\s+/g, " ").trim();

const suppressedDominicTextIds = new Set<string>();

for (const voice of chatMedia.filter(
  (media) =>
    media.type === "voice" &&
    media.sender === "assistant" &&
    Boolean(media.transcript)
)) {
  const voiceAt = new Date(voice.createdAt).getTime();
  const candidates = (data ?? []).filter(
    (message) =>
      message.role === "assistant" &&
      Math.abs(new Date(message.created_at).getTime() - voiceAt) < 5 * 60_000
  );

  for (let start = 0; start < candidates.length; start += 1) {
    let joined = "";
    for (let end = start; end < candidates.length; end += 1) {
      joined = normalizeVoiceCopy(
        [joined, candidates[end].content].filter(Boolean).join(" ")
      );
      if (joined === normalizeVoiceCopy(voice.transcript ?? "")) {
        for (let index = start; index <= end; index += 1) {
          suppressedDominicTextIds.add(String(candidates[index].id));
        }
        break;
      }
    }
  }
}

const normalMessages =
  (data ?? [])
    .filter((message) => {
      if (suppressedDominicTextIds.has(String(message.id))) {
        return false;
      }

      if (
        message.role !== "user" ||
        message.content.trim() !== "I sent you this photo."
      ) {
        return true;
      }

      const sentAt = new Date(message.created_at).getTime();
      return !chatMedia.some(
        (media) =>
          media.type === "photo" &&
          (media.sender ?? "user") === "user" &&
          Math.abs(new Date(media.createdAt).getTime() - sentAt) < 5 * 60_000
      );
    })
    .map(
    (
      message
    ): ChatMessage => {
      const matchingVoice =
        chatMedia.find(
          (media) => {
            if (
              media.type !==
              "voice"
            ) {
              return false;
            }

            if (
              media.transcript
                ?.trim() !==
              message.content.trim()
            ) {
              return false;
            }

            const difference =
              Math.abs(
                new Date(
                  media.createdAt
                ).getTime() -
                  new Date(
                    message.created_at
                  ).getTime()
              );

            return (
              difference <
              5 * 60_000
            );
          }
        );

      const matchingSharedItem =
        chatMedia.find(
          (media) => {
            if (
              media.type !==
              "shared_item"
            ) {
              return false;
            }

            if (
              media.transcript
                ?.trim() !==
              message.content.trim()
            ) {
              return false;
            }

            const difference =
              Math.abs(
                new Date(
                  media.createdAt
                ).getTime() -
                  new Date(
                    message.created_at
                  ).getTime()
              );

            return (
              difference <
              5 * 60_000
            );
          }
        );

      if (
        matchingSharedItem
      ) {
        matchedSharedMediaIds.add(
          matchingSharedItem.id
        );
      }

      return {
        id: String(
          message.id
        ),

        role:
          message.role ===
          "user"
            ? "user"
            : "assistant",

        content:
          stripInternalReplyDirective(message.content),

        createdAt:
          message.created_at,

        kind:
          matchingVoice
            ? "voice"
            : matchingSharedItem
              ? "shared_item"
              : "text",

        mediaUrl:
          matchingVoice?.url,

        diaryItemId:
          matchingVoice?.id ??
          matchingSharedItem
            ?.sharedItemId,

        sharedTitle:
          matchingSharedItem
            ?.sharedTitle,

        sharedSubtitle:
          matchingSharedItem
            ?.sharedSubtitle,

        sharedKind:
          matchingSharedItem
            ?.sharedKind,

        replyTo:
          message.reply_to_message_id
            ? (() => {
                const original = messageLookup.get(String(message.reply_to_message_id));
                return original
                  ? {
                      id: String(original.id),
                      role: original.role === "assistant" ? "assistant" : "user",
                      content: stripInternalReplyDirective(original.content),
                    }
                  : null;
              })()
            : null,
      };
    }
  );

const standaloneMedia =
  chatMedia
   .filter(
      (media) =>
        media.type ===
          "photo" ||
        media.type ===
          "sticker" ||
        media.type ===
          "agent_action" ||
        (media.type ===
          "shared_item" &&
          !matchedSharedMediaIds.has(
            media.id
          )) ||
        media.type ===
          "voice"
    )
    .map(
      (
        media
      ): ChatMessage => ({
        id:
          media.id,

        role:
          media.sender ??
          "user",

        content:
          media.transcript ??
          "",

        createdAt:
          media.createdAt,

        kind:
          media.type,

        mediaUrl:
          media.url,

      diaryItemId:
          media.type ===
          "shared_item"
            ? media
                .sharedItemId
            : media.type ===
                "agent_action"
              ? media
                  .actionTargetItemId
              : media.id,

        sharedTitle:
          media.sharedTitle,

        sharedSubtitle:
          media.sharedSubtitle,

        sharedKind:
          media.sharedKind,

        actionTitle:
          media.actionTitle,

        actionType:
          media.actionType,
      })
    );

const combined = [
  ...normalMessages,
  ...standaloneMedia,
].sort(
  (a, b) =>
    new Date(
      a.createdAt
    ).getTime() -
    new Date(
      b.createdAt
    ).getTime()
);
      
      setMessages(combined);
      setLoading(false);
    },
    [session.user.id]
  );

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    const refreshGeneratedChatPhoto = () => {
      void loadHistory(false);
    };

    window.addEventListener(
      "diario-generated-chat-photo",
      refreshGeneratedChatPhoto
    );

    return () => {
      window.removeEventListener(
        "diario-generated-chat-photo",
        refreshGeneratedChatPhoto
      );
    };
  }, [loadHistory]);
useEffect(() => {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  const rawShare =
    window.localStorage.getItem(
      "diario-pending-chat-share-v1"
    );

  const pendingMessage =
    window.localStorage.getItem(
      "diario-pending-chat-message"
    );

  window.localStorage.removeItem(
    "diario-pending-chat-share-v1"
  );

  window.localStorage.removeItem(
    "diario-pending-chat-message"
  );

  let pendingShare:
    | PendingChatShare
    | null = null;

  if (rawShare) {
    try {
      const parsed =
        JSON.parse(rawShare);

      if (
        typeof parsed?.text ===
          "string" &&
        typeof parsed?.itemId ===
          "string" &&
        typeof parsed?.kind ===
          "string" &&
        typeof parsed?.title ===
          "string"
      ) {
        pendingShare =
          parsed as PendingChatShare;
      }
    } catch (error) {
      console.error(
        "Could not read pending chat share:",
        error
      );
    }
  }

  if (
    !pendingShare &&
    !pendingMessage
  ) {
    return;
  }

  window.setTimeout(() => {
    if (pendingShare) {
      void (async () => {
        try {
          await createChatSharedItem(
            pendingShare
          );

          await sendMessage(
            pendingShare.text,
            "text",
            pendingShare
          );
        } catch (error) {
          console.error(
            "Could not share diary item to chat:",
            error
          );
        }
      })();

      return;
    }

    if (pendingMessage) {
      void sendMessage(
        pendingMessage
      );
    }
  }, 400);
}, []);
  
  useEffect(
    () => () => {
      recognitionRef.current?.abort();
    },
    [],
  );

async function generateReadyDominicInitiative() {
  const { data: readyEvents } =
    await supabase
      .from("proactive_events")
      .select("id,context,decision_reason")
      .eq("user_id", session.user.id)
      .eq("event_type", "dominic_state_checkin")
      .eq("status", "ready")
      .order("scheduled_for", { ascending: true })
      .limit(1);

  const event = readyEvents?.[0];
  if (!event) return false;

  const state =
    await getCurrentDominicState(
      session.user.id
    );
  const presence =
    await resolveDominicPresence(
      session.user.id
    );

  const prompt = presence.togetherNow
    ? "You are physically with Alloah right now. Initiate one natural in-person beat from your current state. You may use one brief physical/body-language action in single asterisks when natural. Do not talk like a distant text message. Do not invent events. Avoid generic check-ins."
    : "Initiate one natural message to Alloah from your actual current state. Do not invent events. Avoid generic check-ins and do not narrate physical contact with her while you are apart.";

  const { data, error } =
    await supabase.functions.invoke(
      "clever-service",
      {
        body: {
          message: prompt,
          proactive: true,
          proactiveEventId: event.id,
          proactiveContext: event.context,
          alloahPresence: { location: alloahLocation },
          dominicContext: {
            activity: state.activity,
            location: state.location,
            mood: state.mood ?? null,
            energy: state.energy ?? null,
            detail: state.detail ?? null,
            startedAt: state.startedAt,
            nextChangeAt: state.nextChangeAt,
            togetherNow: presence.togetherNow,
            presenceReason: presence.reason,
            sharedPlace: presence.place,
            interactionMode:
              presence.togetherNow
                ? "co_present"
                : "remote",
          },
        },
      }
    );

  if (error) {
    throw error;
  }

  const replies =
    Array.isArray(data?.replies)
      ? data.replies.filter(
          (value: unknown): value is string =>
            typeof value === "string" &&
            Boolean(value.trim())
        )
      : typeof data?.reply === "string" &&
          data.reply.trim()
        ? [data.reply.trim()]
        : [];

  if (!replies.length) {
    await supabase
      .from("proactive_events")
      .update({
        status: "skipped",
        processed_at:
          new Date().toISOString(),
        decision_reason:
          "The proactive generator found no natural initiative worth sending.",
      })
      .eq("id", event.id);

    return false;
  }

  const { data: conversations } =
    await supabase
      .from("conversations")
      .select("id,title,updated_at")
      .eq("user_id", session.user.id)
      .order("updated_at", { ascending: false });

  const conversation =
    conversations?.find((item) =>
      item.title
        ?.toLowerCase()
        .includes("dominic")
    ) ??
    conversations?.[0];

  if (!conversation) {
    await supabase
      .from("proactive_events")
      .update({
        status: "pending",
        processed_at: null,
        scheduled_for:
          new Date(
            Date.now() + 15 * 60_000
          ).toISOString(),
        decision_reason:
          "No Dominic conversation exists yet; retry after Chat has one.",
      })
      .eq("id", event.id);

    return false;
  }

  const now =
    new Date().toISOString();

  const rows =
    replies.map((content) => ({
      user_id: session.user.id,
      conversation_id:
        conversation.id,
      role: "assistant",
      speaker_name: "Dominic",
      content,
      created_at: now,
    }));

  const { data: inserted, error: insertError } =
    await supabase
      .from("messages")
      .insert(rows)
      .select("id");

  if (insertError) {
    throw insertError;
  }

  const messageId =
    inserted?.[0]?.id ?? null;

  await supabase
    .from("proactive_events")
    .update({
      status: "sent",
      processed_at: now,
      message_id: messageId,
      decision_reason:
        event.decision_reason ??
        "Dominic initiated from live context.",
      context: {
        ...(event.context &&
        typeof event.context === "object" &&
        !Array.isArray(event.context)
          ? event.context
          : {}),
        delivered_at: now,
        delivery_mode:
          presence.togetherNow
            ? "co_present"
            : "remote",
      },
    })
    .eq("id", event.id);

  if (
    !presence.togetherNow &&
    messageId
  ) {
    const preview =
      replies.join(" ").slice(0, 180);

    const { error: pushError } =
      await supabase
        .from("push_outbox")
        .insert({
          user_id:
            session.user.id,
          message_id:
            messageId,
          title:
            "Dominic",
          body:
            preview,
          notification_type:
            "dominic_proactive",
          target_route:
            "/?screen=chat",
          status:
            "pending",
          metadata: {
            source:
              "dominic_proactive",
            proactive_event_id:
              event.id,
            interaction_mode:
              "remote",
          },
        });

    if (pushError) {
      console.error(
        "Dominic proactive message was saved, but push could not be queued:",
        pushError
      );
    }
  }

  await supabase
    .from("conversations")
    .update({
      updated_at: now,
    })
    .eq("id", conversation.id)
    .eq("user_id", session.user.id);

  await loadHistory(false);
  return true;
}

async function requestDominicReply(
  combinedMessage: string,
  photoContext?: {
    storagePath: string;
    storageBucket: string;
  },
  replyTo?: {
    id: string;
    role: "user" | "assistant";
    content: string;
  } | null
) {
  const liveNearbyCommitments =
    await loadNearbyCommitmentsNow()
      .catch((error) => {
        console.error(
          "Could not refresh nearby commitments:",
          error
        );

        return nearbyCommitments;
      });

  setNearbyCommitments(
    liveNearbyCommitments
  );

const liveDateContext =
    await loadDominicLiveDateContext(session.user.id)
      .catch((error) => {
        console.error(
          "Could not load live Date context for Dominic:",
          error
        );

        return null;
      });

  const liveDatePrompt =
    liveDateContextForPrompt(liveDateContext);
  
  const {
    data,
    error,
  } =
    await supabase.functions.invoke(
      "clever-service",
      {
        body: {
          message:
            combinedMessage,

          photoContext:
            photoContext ?? null,

          replyTo:
            replyTo ?? null,

          interactionGuidance:
            dominicPresence?.togetherNow
              ? "Alloah and Dominic are physically together. Treat text wrapped in single asterisks from either side as real-time body language or physical action in the shared scene. Respond with grounded continuity; affectionate touch is possible when natural."
              : "Alloah and Dominic are physically separate. Do not treat physical touch as currently possible unless the conversation explicitly changes the physical context.",

                    liveDateContext,

          liveDatePrompt,

          dominicContext:
            dominicState
              ? {
                  activity:
                    dominicState.activity,

                  location:
                    dominicState.location,

                  mood:
                    dominicState.mood ??
                    null,

                  energy:
                    dominicState.energy ??
                    null,

                  startedAt:
                    dominicState.startedAt,

                  nextChangeAt:
                    dominicState.nextChangeAt,

                  detail:
                    dominicState.detail ??
                    null,

                  wearing:
                    dominicWearingLabel,

                  listening:
                    activeListeningTrack
                      ? {
                          title:
                            activeListeningTrack.title,
                          artist:
                            activeListeningTrack.artist ??
                            null,
                          owner:
                            activeListeningTrack.owner,
                        }
                      : null,

                  isHome:
                    dominicState.location !== "out",

                  togetherNow:
                    dominicPresence?.togetherNow ??
                    false,

                  presenceReason:
                    dominicPresence?.reason ??
                    "separate",

                  sharedPlace:
                    dominicPresence?.place ??
                    null,

                  availability:
                    [
                      "sleeping",
                      "showering",
                      "performing",
                      "rehearsing",
                      "recording",
                      "driving",
                    ].includes(
                      dominicState.activity
                    )
                      ? "low"
                      : [
                          "with_friends",
                          "working",
                          "at_the_studio",
                          "traveling",
                        ].includes(
                          dominicState.activity
                        )
                        ? "medium"
                        : "high",

                  interactionMode:
                    dominicPresence?.togetherNow
                      ? "co_present"
                      : "remote",

                  physicalActionPolicy:
                    dominicPresence?.togetherNow
                      ? {
                          allowed: true,
                          syntax:
                            "Wrap brief physical/body-language actions in single asterisks, e.g. *wraps an arm around her waist*. Keep spoken words outside the asterisks.",
                          naturalExamples: [
                            "hug",
                            "kiss forehead",
                            "hold hands",
                            "lean closer",
                            "play with her hair",
                            "sit beside her",
                            "hand her something",
                            "walk to another room",
                          ],
                          continuity:
                            "Actions must respect current room, activity, live Date context and what just happened. Small affectionate gestures are transient and should not become diary objects by default.",
                        }
                      : {
                          allowed: false,
                          syntax:
                            "Do not narrate impossible touch or co-present physical contact while separate. Use remote speech, intention or longing instead.",
                        },
                }
              : null,

          alloahPresence: { location: alloahLocation },

          nearbyCommitments:
            liveNearbyCommitments,
        },
      }
    );

  const replies =
    Array.isArray(
      data?.replies
    )
      ? data.replies
          .filter(
            (
              item: unknown
            ): item is string =>
              typeof item ===
              "string"
          )
          .map(
            (item) =>
              item.trim()
          )
          .filter(
            Boolean
          )
      : typeof data?.reply ===
          "string"
        ? [
            data.reply.trim(),
          ].filter(
            Boolean
          )
        : [];

  if (
    error ||
    replies.length === 0
  ) {
    throw (
      error ??
      new Error(
        "Missing reply"
      )
    );
  }

  setMessages(
    (current) => [
      ...current,

      ...replies.flatMap(
        (reply) =>
          parseDominicReplyParts(
            reply
          ).map((part) => ({
            id:
              `reply-${crypto.randomUUID()}`,

            role:
              "assistant" as const,

            content:
              stripInternalReplyDirective(part.content),

            createdAt:
              new Date()
                .toISOString(),

            kind:
              part.kind ===
              "action"
                ? "physical_action" as const
                : "text" as const,

            physicalAction:
              part.kind ===
              "action"
                ? part.content
                : undefined,
          }))
      ),
    ]
  );

  // Try to turn Dominic's spoken reply into a Cartesia voice note.
  // The Edge Function enforces the monthly free-budget ceiling before calling Cartesia.
  const spokenForVoice = replies
    .flatMap((reply) =>
      parseDominicReplyParts(reply)
        .filter((part) => part.kind === "speech")
        .map((part) => stripInternalReplyDirective(part.content))
    )
    .join(" ")
    .trim();

  const dominicReplyModality =
    data?.modality === "voice"
      ? "voice"
      : "text";

  if (spokenForVoice && dominicReplyModality === "voice") {
    try {
      const { error: voiceError } =
        await supabase.functions.invoke(
          "dominic-voice-tts",
          {
            body: {
              transcript: spokenForVoice,
            },
          }
        );

      if (!voiceError) {
        window.setTimeout(
          () => {
            void loadHistory(false);
          },
          350
        );
      }
    } catch (voiceError) {
      // Voice is optional: text reply must remain the reliable fallback.
      console.warn(
        "Dominic voice note unavailable; keeping text reply:",
        voiceError
      );
    }
  }

  const worldActions =
    await extractDominicActions({
      userMessage:
        combinedMessage,

      replies,
      
      liveDateContext,
    });

  if (
    worldActions.length >
    0
  ) {
    await runDominicActions(
      worldActions
    );
  }

  window.setTimeout(
    () => {
      void loadHistory(
        false
      );
    },
    worldActions.length >
      0
      ? 250
      : 800
  );
}

async function flushPendingMessages() {
  if (
    processingQueueRef.current
  ) {
    return;
  }

  const queuedMessages = [
    ...pendingMessagesRef.current,
  ];

  pendingMessagesRef.current =
    [];

  if (
    queuedMessages.length ===
    0
  ) {
    setSending(
      false
    );

    return;
  }

  processingQueueRef.current =
    true;

  setSending(
    true
  );

  setFailedMessage(
    null
  );

  const combinedMessage =
    queuedMessages.length ===
    1
      ? queuedMessages[0].text
      : queuedMessages
          .map(
            (
              item,
              index
            ) =>
              `Alloah message ${
                index + 1
              }: ${item.text}`
          )
          .join(
            "\n"
          );

  const queuedReply =
    [...queuedMessages]
      .reverse()
      .find((item) => item.replyTo)
      ?.replyTo ?? null;

  const queuedPhoto =
    [...queuedMessages]
      .reverse()
      .find(
        (item) =>
          item.kind === "photo" &&
          item.photoContext
      )
      ?.photoContext;

  try {
    await requestDominicReply(
      combinedMessage,
      queuedPhoto,
      queuedReply
    );
  } catch (
    error
  ) {
    console.error(
      "Could not reach Dominic:",
      error
    );

    setFailedMessage(
      combinedMessage
    );
  } finally {
    processingQueueRef.current =
      false;

    if (
      pendingMessagesRef.current
        .length > 0
    ) {
      queueTimerRef.current =
        window.setTimeout(
          () => {
            queueTimerRef.current =
              null;

            void flushPendingMessages();
          },
          1200
        );

      return;
    }

    setSending(
      false
    );
  }
}

async function retryFailedMessage() {
  const clean =
    failedMessage?.trim();

  if (
    !clean ||
    processingQueueRef.current
  ) {
    return;
  }

  processingQueueRef.current =
    true;

  setSending(
    true
  );

  setFailedMessage(
    null
  );

  try {
    await requestDominicReply(
      clean
    );
  } catch (
    error
  ) {
    console.error(
      "Could not retry Dominic message:",
      error
    );

    setFailedMessage(
      clean
    );
  } finally {
    processingQueueRef.current =
      false;

    if (
      pendingMessagesRef.current
        .length > 0
    ) {
      queueTimerRef.current =
        window.setTimeout(
          () => {
            queueTimerRef.current =
              null;

            void flushPendingMessages();
          },
          1200
        );

      return;
    }

    setSending(
      false
    );
  }
}

async function sendMessage(
  text: string,
  kind: MessageKind =
    "text",
  sharedItem?:
    PendingChatShare,
  photoContext?: {
    storagePath: string;
    storageBucket: string;
  },
  options?: {
    silentLocal?: boolean;
  }
) {
  const clean =
    text.trim();

  if (!clean) {
    return;
  }

  const activeReply = replyTarget
    ? {
        id: replyTarget.id,
        role: replyTarget.role,
        content: replyTarget.content || (replyTarget.kind === "photo" ? "Photo" : replyTarget.kind === "voice" ? "Voice message" : "Message"),
      }
    : null;

  setReplyTarget(null);

  const now =
    new Date()
      .toISOString();

  if (
    kind ===
    "voice"
  ) {
    rememberVoice(
      clean,
      now
    );
  }

  if (!options?.silentLocal) {
    setMessages(
      (current) => [
        ...current,
        {
          id:
            `local-${crypto.randomUUID()}`,

          role:
            "user",

          content:
            clean,

          createdAt:
            now,

          kind:
            sharedItem
              ? "shared_item"
              : kind,

          diaryItemId:
            sharedItem
              ?.itemId,

          sharedTitle:
            sharedItem
              ?.title,

          sharedSubtitle:
            sharedItem
              ?.subtitle,

          sharedKind:
            sharedItem
              ?.kind,

          replyTo:
            activeReply,
        },
      ]
    );
  }

  pendingMessagesRef.current.push(
    {
      text:
        clean,

      kind,
      photoContext,
      replyTo: activeReply,
    }
  );

  if (
    queueTimerRef.current
  ) {
    window.clearTimeout(
      queueTimerRef.current
    );
  }

  setSending(
    true
  );

  setFailedMessage(
    null
  );

  queueTimerRef.current =
    window.setTimeout(
      () => {
        queueTimerRef.current =
          null;

        void flushPendingMessages();
      },
      4500
    );
}

function handleSubmit(
  message:
    PromptInputMessage
) {
  return sendMessage(
    message.text
  );
}
  
async function sendPhoto(file: File) {
  if (!file.type.startsWith("image/")) {
    return;
  }

  const photoUrl =
    URL.createObjectURL(file);

  const now =
    new Date().toISOString();

  setUploadingMedia(true);

  setMessages((current) => [
    ...current,
    {
      id: `photo-${Date.now()}`,
      role: "user",
      content: "",
      createdAt: now,
      kind: "photo",
      mediaUrl: photoUrl,
    },
  ]);

  try {
    const uploaded =
      await uploadChatMedia({
        file,
        type: "photo",
      });

    await loadHistory(false);

    await sendMessage(
      "I sent you this photo.",
      "photo",
      undefined,
      {
        storagePath:
          uploaded.storagePath,
        storageBucket:
          "diario-media",
      },
      {
        silentLocal: true,
      }
    );
  } catch (error) {
    console.error(
      "Could not send chat photo:",
      error
    );
  } finally {
    setUploadingMedia(false);

    URL.revokeObjectURL(
      photoUrl
    );
  }
}
 function handlePhotoInput(
  event: React.ChangeEvent<HTMLInputElement>
) {
  const file = event.target.files?.[0];

 

  if (!file) return;

  void sendPhoto(file);

  event.target.value = "";
}
  
function cancelVoiceCapture() {
    if (voiceStatus !== "listening") return;
    cancelVoiceRef.current = true;
    recognitionRef.current?.stop();
    mediaRecorderRef.current?.stop();
    setVoiceNotice("Voice cancelled.");
  }

async function startVoiceCapture() {
    if (
      voiceStatus ===
      "listening"
    ) {
      recognitionRef.current?.stop();
      mediaRecorderRef.current?.stop();
      return;
    }

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            audio: true,
          }
        );

      const recorder =
        new MediaRecorder(stream);

      mediaRecorderRef.current =
        recorder;

      audioChunksRef.current =
        [];

      audioTranscriptRef.current =
        "";

      cancelVoiceRef.current =
        false;

      recorder.ondataavailable = (
        event
      ) => {
        if (
          event.data.size >
          0
        ) {
          audioChunksRef.current.push(
            event.data
          );
        }
      };

      recorder.onstop =
        async () => {
          stream
            .getTracks()
            .forEach((track) =>
              track.stop()
            );

          const blob =
            new Blob(
              audioChunksRef.current,
              {
                type:
                  recorder.mimeType ||
                  "audio/webm",
              }
            );

          const transcript =
            audioTranscriptRef.current.trim();

          if (cancelVoiceRef.current) {
            cancelVoiceRef.current = false;
            audioChunksRef.current = [];
            audioTranscriptRef.current = "";
            setVoiceNotice(null);
            setVoiceStatus("idle");
            mediaRecorderRef.current = null;
            return;
          }

          if (!blob.size) {
            setVoiceStatus("idle");
            return;
          }

          try {
            setVoiceStatus(
              "processing"
            );

            const file =
              new File(
                [blob],
                `voice-${Date.now()}.webm`,
                {
                  type:
                    blob.type ||
                    "audio/webm",
                }
              );
const voiceUrl = URL.createObjectURL(file);
const now = new Date().toISOString();

setMessages((current) => [
  ...current,
  {
    id: `voice-${Date.now()}`,
    role: "user",
    content:
      transcript ||
      "Voice message",
    createdAt: now,
    kind: "voice",
    mediaUrl: voiceUrl,
  },
]);
            
          try {
  await uploadChatMedia({
    file,
    type: "voice",
    transcript,
  });
} catch {
  // ignore upload failure for now
}
            if (transcript) {
              rememberVoice(
                transcript,
                new Date().toISOString()
              );

              await sendMessage(
                transcript,
                "voice"
              );
     } else {
  await sendMessage(
    "I sent you a voice message, but the app couldn't transcribe it.",
    "voice"
  );

  setVoiceNotice(
    "Voice sent without transcript."
  );
}
          } finally {
            setVoiceStatus(
              "idle"
            );

            mediaRecorderRef.current =
              null;

            window.setTimeout(
              () =>
                setVoiceNotice(
                  null
                ),
              1600
            );
          }
        };

      const Recognition =
        window.SpeechRecognition ??
        window.webkitSpeechRecognition;

      if (Recognition) {
        const recognition =
          new Recognition();

        recognition.continuous =
          true;

        recognition.interimResults =
          true;

        // Alloah speaks to Dominic in English; do not inherit the iPhone UI language.
        recognition.lang =
          "en-US";

        recognitionRef.current =
          recognition;

        recognition.onresult = (
          event
        ) => {
          const transcript =
            Array.from(
              event.results
            )
              .map(
                (result) =>
                  result[0]
                    ?.transcript ??
                  ""
              )
              .join(" ")
              .trim();

          audioTranscriptRef.current =
            transcript;

          if (transcript) {
            setVoiceNotice(
              `“${transcript}”`
            );
          }
        };

        recognition.onerror =
          () => {
            setVoiceNotice(
              "Recording audio…"
            );
          };

        recognition.onend =
          () => {
            recognitionRef.current =
              null;
          };

        recognition.start();
      } else {
        setVoiceNotice(
          "Recording audio…"
        );
      }

      recorder.start();

      setVoiceStatus(
        "listening"
      );

      if (!Recognition) {
        setVoiceNotice(
          "Recording audio…"
        );
      }
    } catch {
      setVoiceStatus("idle");

      setVoiceNotice(
        "Microphone permission is needed."
      );
    }
  }
  
  const sendStickerAsset =
    async (
      sticker:
        ChatStickerAsset
    ) => {
      setStickerBusy(true);
      setStickerNotice(
        null
      );

      try {
        const now =
          new Date()
            .toISOString();

        const {
          error,
        } =
          await supabase
            .from(
              "diario_items"
            )
            .insert({
              user_id:
                session.user.id,
              kind:
                "chat_media",
              owner:
                "alloah",
              status:
                "active",
              title:
                sticker.label,
              body:
                null,
              event_at:
                now,
              planned_for:
                null,
              data: {
                media_type:
                  "sticker",
                storage_bucket:
                  "diario-media",
                storage_path:
                  sticker.storagePath,
                sticker_asset_id:
                  sticker.id,
                sticker_owner:
                  sticker.owner,
                chat_sender:
                  "alloah",
              },
            });

        if (error) {
          throw error;
        }

        setStickersOpen(
          false
        );

        await loadHistory(
          false
        );
      } catch (
        error
      ) {
        console.error(
          "Could not send sticker:",
          error
        );

        setStickerNotice(
          "That sticker could not be sent."
        );
      } finally {
        setStickerBusy(false);
      }
    };

  const addCustomSticker =
    async (
      file:
        File | null
    ) => {
      if (!file) {
        return;
      }

      setStickerBusy(true);
      setStickerNotice(
        null
      );

      try {
        const sticker =
          await uploadChatSticker({
            userId:
              session.user.id,
            owner:
              stickerUploadOwner,
            file,
          });

        setCustomStickers(
          (current) => [
            sticker,
            ...current,
          ]
        );

        setStickerNotice(
          stickerUploadOwner ===
            "dominic"
            ? "Sticker added to Dominic's tray."
            : stickerUploadOwner ===
                "shared"
              ? "Sticker added to the shared tray."
              : "Sticker added to your tray."
        );
      } catch (
        error
      ) {
        console.error(
          "Could not add sticker:",
          error
        );

        setStickerNotice(
          "That image could not be added as a sticker."
        );
      } finally {
        setStickerBusy(false);

        if (
          stickerInputRef
            .current
        ) {
          stickerInputRef
            .current
            .value = "";
        }
      }
    };

  const forgetCustomSticker =
    async (
      sticker:
        ChatStickerAsset
    ) => {
      setStickerBusy(true);
      setStickerNotice(
        null
      );

      try {
        await removeChatSticker({
          userId:
            session.user.id,
          stickerId:
            sticker.id,
        });

        setCustomStickers(
          (current) =>
            current.filter(
              (item) =>
                item.id !==
                sticker.id
            )
        );
      } catch (
        error
      ) {
        console.error(
          "Could not remove sticker:",
          error
        );

        setStickerNotice(
          "That sticker could not be removed from the tray."
        );
      } finally {
        setStickerBusy(false);
      }
    };

  const searchResults =
    searchTerm.trim()
      ? messages.filter((message) =>
          message.content
            .toLowerCase()
            .includes(
              searchTerm
                .trim()
                .toLowerCase()
            )
        )
      : [];
 const statusCopy = useMemo(
  () =>
    dominicPresenceCopy(
      dominicState
    ),
  [dominicState]
);

  const clearActiveListeningTrack = () => {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(
      "diario-active-listening-track-v1"
    );

    window.dispatchEvent(
      new Event("diario-active-listening-track")
    );
  }

  setActiveListeningTrack(null);
};

const inviteToListenTogether = () => {
  if (!activeListeningTrack) return;

  const songText = activeListeningTrack.artist
    ? `"${activeListeningTrack.title}" by ${activeListeningTrack.artist}`
    : `"${activeListeningTrack.title}"`;

  void sendMessage(
    activeListeningTrack.owner === "dominic"
      ? `I'm listening to what you're playing: ${songText}.`
      : `Listen to this with me: ${songText}.`
  );
};

  const openPhotoEngine = (
  draft: {
    mode?: "request" | "surprise" | "chat_context" | "chat_photo" | "memory" | "daily_life" | "spontaneous" | "adjust";
    subjectType?: "me" | "dominic" | "both";
    scene?: string;
    mood?: string;
    conversationSummary?: string;
  }
) => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      "diario-photo-engine-draft-v1",
      JSON.stringify(draft)
    );
  }

  onOpen("photo-engine");
};

const recentConversationForPhoto = () =>
  messages
    .slice(-12)
    .map((message) =>
      `${message.role === "user" ? preferredName : "Dominic"}: ${message.content}`
    )
    .filter((line) => line.trim().length > 0)
    .join("\n");
  
  const dominicProfile =
    chatProfiles?.dominic ??
    null;

  const alloahProfile =
    chatProfiles?.alloah ??
    null;

  const dominicAvatar =
    dominicProfile?.photoUrl ??
    null;

  const dominicProfileReady =
    chatProfiles !== null;

  const alloahInitial =
    (
      alloahProfile
        ?.displayName ??
      preferredName ??
      "A"
    )
      .trim()
      .charAt(0)
      .toUpperCase() ||
    "A";

  const updateProfile = (
    profile:
      ChatProfile
  ) => {
    setChatProfiles(
      (current) => {
        const fallback = {
          alloah:
            current
              ?.alloah ??
            ({
              owner:
                "alloah",
              displayName:
                preferredName ||
                "Alloah",
              bio:
                null,
              photoPath:
                null,
              photoUrl:
                null,
              updatedAt:
                null,
            } as ChatProfile),
          dominic:
            current
              ?.dominic ??
            ({
              owner:
                "dominic",
              displayName:
                "Dominic",
              bio:
                null,
              photoPath:
                null,
              photoUrl:
                null,
              updatedAt:
                null,
            } as ChatProfile),
        };

        return {
          ...fallback,
          [profile.owner]:
            profile,
        };
      }
    );
  };

  const chatClassName = [
    "live-chat-screen messenger-chat",
    `chat-theme-${preferences.theme}`,
    `chat-bubbles-${preferences.bubbles}`,
    preferences.adaptToTime ? `chat-adapt-time chat-time-${time.mood}` : "",
]
    .filter(Boolean)
    .join(" ");

  if (selectedChatObjectId) {
    return (
      <ConnectedObjectDetailScreen
        itemId={selectedChatObjectId}
        onOpenRelated={
          setSelectedChatObjectId
        }
        onBack={() =>
          setSelectedChatObjectId(null)
        }
      />
    );
  }

  return (
    <section className={chatClassName}>
      <header className="messenger-header">
        <Sheet>
          <SheetTrigger asChild>
            <button
              className="messenger-avatar"
              aria-label="Open Dominic profile"
            >
              {dominicAvatar ? (
                <img
                  src={dominicAvatar}
                  alt="Dominic"
                />
              ) : (
                <span
                  className="messenger-avatar-placeholder"
                  aria-hidden="true"
                >
                  D
                </span>
              )}
              <span
                className={`presence-dot ${
                  dominicState?.activity === "sleeping"
                    ? "is-asleep"
                    : dominicState?.location === "out"
                      ? "is-away"
                      : [
                          "showering",
                          "recording",
                          "rehearsing",
                          "performing",
                          "on_the_phone",
                        ].includes(dominicState?.activity ?? "")
                        ? "is-occupied"
                        : "is-available"
                }`}
                title={
                  dominicState?.activity === "sleeping"
                    ? "asleep"
                    : dominicState?.location === "out"
                      ? "away"
                      : "available"
                }
              />
            </button>
          </SheetTrigger>

          <ChatProfileSheet
            userId={
              session.user.id
            }
            profile={
              dominicProfile
            }
            owner="dominic"
            fallbackPhoto={
              dominic
            }
            statusCopy={
              statusCopy
            }
            onSaved={
              updateProfile
            }
            onOpen={
              onOpen
            }
          />
        </Sheet>

        <div className="messenger-person">
          <h1>
            <span className="messenger-person-name">
              {dominicProfile?.displayName ?? DOMINIC_NAME}
            </span>
            <span className="messenger-person-heart" aria-hidden="true">♡</span>
          </h1>
          <p>
            {statusCopy}
          </p>

          {(dominicState?.mood ||
            dominicWearingLabel) && (
            <div className="messenger-presence-meta">
              {dominicState?.mood && (
                <span>
                  {dominicState.mood}
                </span>
              )}

              {dominicWearingLabel && (
                <span
                  className="messenger-wearing"
                  title={
                    dominicWearingLabel
                  }
                >
                  wearing · {
                    dominicWearingLabel
                  }
                </span>
              )}
            </div>
          )}
        </div>

        <div className="messenger-header-actions">
          <div className="alloah-presence-menu">
            <button
              type="button"
              className="alloah-presence-trigger"
              aria-label="Change your presence"
              aria-expanded={alloahPresenceOpen}
              title="Your presence"
              onClick={() => setAlloahPresenceOpen((open) => !open)}
            >
              You · {alloahLocationOptions.find((option) => option.value === alloahLocation)?.label ?? "Set"} ▾
            </button>
            <div className={`alloah-presence-popover${alloahPresenceOpen ? " is-open" : ""}`}>
              {alloahLocationOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={alloahLocation === option.value ? "is-active" : ""}
                  aria-pressed={alloahLocation === option.value}
                  onClick={() => {
                    setAlloahPresenceOpen(false);
                    void updateAlloahLocation(option.value);
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <button
            aria-label="Call Dominic"
            title="Call"
          >
            <Phone />
          </button>

          <button
            aria-label="Video call Dominic"
            title="Video"
          >
            <Video />
          </button>

          <Sheet>
            <SheetTrigger asChild>
              <button
                aria-label="Customize chat"
                title="Customize chat"
              >
                <Palette />
              </button>
            </SheetTrigger>

            <ChatAppearanceSheet
              preferences={
                preferences
              }
              onChange={
                setPreferences
              }
            />
          </Sheet>

          <Sheet>
            <SheetTrigger asChild>
              <button
                className="messenger-self-avatar"
                aria-label="Open my profile"
                title="My profile"
              >
                {alloahProfile
                  ?.photoUrl ? (
                  <img
                    src={
                      alloahProfile
                        .photoUrl
                    }
                    alt={
                      alloahProfile
                        .displayName
                    }
                  />
                ) : (
                  <span>
                    {alloahInitial}
                  </span>
                )}
              </button>
            </SheetTrigger>

            <ChatProfileSheet
              userId={
                session.user.id
              }
              profile={
                alloahProfile
              }
              owner="alloah"
              fallbackPhoto={
                null
              }
              statusCopy="your side of this conversation"
              onSaved={
                updateProfile
              }
              onOpen={
                onOpen
              }
            />
          </Sheet>
        </div>
      </header>

{profileError && (
  <div className="chat-profile-inline-error">
    {profileError}
  </div>
)}

<DateModeChatBridge
  userId={session.user.id}
  onOpenDates={() => onOpen("dates")}
  onOpenPlaces={() => onOpen("places")}
/>

      
  {activeListeningTrack && (
  <section className="chat-now-playing">
    <button
      type="button"
      className="chat-now-playing-main"
      onClick={() => {
        if (activeListeningTrack.spotifyUrl) {
          window.open(
            activeListeningTrack.spotifyUrl,
            "_blank",
            "noopener,noreferrer"
          );

          return;
        }

        onOpen("music");
      }}
    >
      <div className="mini-album-art">
        {activeListeningTrack.coverUrl ? (
          <img
            src={activeListeningTrack.coverUrl}
            alt=""
            aria-hidden="true"
          />
        ) : (
          <Music2 />
        )}
      </div>

      <span>
        <small>{activeListeningLabel}</small>
        <strong>
          {activeListeningTrack.artist
            ? `${activeListeningTrack.title} · ${activeListeningTrack.artist}`
            : activeListeningTrack.title}
        </strong>
      </span>

      <ChevronRight />
    </button>

    <div className="chat-now-playing-actions">
      <button
        type="button"
        onClick={inviteToListenTogether}
      >
        listen together
      </button>

      <button
        type="button"
        onClick={clearActiveListeningTrack}
      >
        stop
      </button>
    </div>
  </section>
)}

      <Conversation className="live-conversation messenger-conversation">
        <ConversationContent className="live-messages messenger-messages">
          <div className="messenger-day-divider"><span>Today</span></div>
          {loading ? (
            <div className="history-loading">
              <span>finding your conversation</span>
              <span className="ink-dots"><i /><i /><i /></span>
            </div>
          ) : messages.length === 0 ? (
            <ConversationEmptyState className="chat-empty">
              <p>it’s quiet here.</p>
              <span>say something to him, {preferredName}.</span>
            </ConversationEmptyState>
          ) : (
            messages.map((message) => (
              <Message
                from={message.role}
                key={message.id}
                id={`chat-message-${message.id}`}
                className={`diario-message messenger-message ${message.kind === "voice" ? "voice-message" : ""}`}
                onTouchStart={(event) => {
                  const touch = event.touches[0];
                  if (!touch) return;
                  const timer = window.setTimeout(() => setReplyTarget(message), 520);
                  replyTouchRef.current = { id: message.id, x: touch.clientX, y: touch.clientY, timer };
                }}
                onTouchMove={(event) => {
                  const state = replyTouchRef.current;
                  const touch = event.touches[0];
                  if (!state || !touch || state.id !== message.id) return;
                  const dx = touch.clientX - state.x;
                  const dy = touch.clientY - state.y;
                  if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
                    if (state.timer) window.clearTimeout(state.timer);
                    state.timer = null;
                  }
                  if (Math.abs(dx) > Math.abs(dy) * 1.15) {
                    const direction = message.role === "user" ? -1 : 1;
                    const directed = Math.max(0, dx * direction);
                    setSwipingMessageId(message.id);
                    setSwipeOffset(Math.min(64, directed));
                  }
                }}
                onTouchEnd={() => {
                  const state = replyTouchRef.current;
                  if (state?.timer) window.clearTimeout(state.timer);
                  if (swipingMessageId === message.id && swipeOffset >= 52) {
                    setReplyTarget(message);
                  }
                  setSwipingMessageId(null);
                  setSwipeOffset(0);
                  replyTouchRef.current = null;
                  window.getSelection()?.removeAllRanges();
                }}
                style={
                  swipingMessageId === message.id
                    ? ({
                        "--reply-swipe-x": `${message.role === "user" ? -swipeOffset : swipeOffset}px`,
                        "--reply-swipe-progress": Math.min(1, swipeOffset / 52),
                      } as React.CSSProperties)
                    : undefined
                }
                onContextMenu={(event) => {
                  event.preventDefault();
                  window.getSelection()?.removeAllRanges();
                  setReplyTarget(message);
                }}
              >
                <span className="chat-swipe-reply-indicator" aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false">
                    <path d="M9.2 7.1 4.3 12l4.9 4.9M5 12h7.2c4.3 0 6.8 2 7.5 5.2" />
                  </svg>
                </span>
                <div className="chat-swipe-message-body">
                {message.replyTo && (
                  <button
                    type="button"
                    className="chat-reply-quote"
                    onClick={() => document.getElementById(`chat-message-${message.replyTo?.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}
                  >
                    <strong>{message.replyTo.role === "assistant" ? "Dominic" : preferredName}</strong>
                    <span>{message.replyTo.content || "Message"}</span>
                  </button>
                )}
{message.kind ===
"physical_action" ? (
  <div
    className="chat-physical-action"
    aria-label="Dominic action"
  >
    <em>
      {message.physicalAction ??
        message.content}
    </em>
  </div>
) : message.kind ===
"agent_action" ? (
  <button
    type="button"
    className="letter-connected-button"
    onClick={() => {
      if (
        !message.diaryItemId
      ) {
        return;
      }

      setSelectedChatObjectId(
        message.diaryItemId
      );
    }}
  >
    {dominicActionLabel(
      message.actionType
    )}

    {" · "}

    {message.actionTitle ??
      "Open"}
  </button>
) : message.kind ===
"shared_item" ? (
  <button
    type="button"
    className="letter-connected-button"
    onClick={() => {
      if (
        !message.diaryItemId
      ) {
        return;
      }

      setSelectedChatObjectId(
        message.diaryItemId
      );
    }}
  >
    {message.sharedKind ===
    "song"
      ? "Shared song"
      : "Shared item"}

    {" · "}

    {message.sharedTitle ??
      "Open"}

    {message.sharedSubtitle
      ? ` · ${message.sharedSubtitle}`
      : ""}
  </button>
) : message.kind ===
    "sticker" &&
  message.mediaUrl ? (
  <div className="chat-sticker-message">
    <img
      src={message.mediaUrl}
      alt="Sticker"
    />
  </div>
) : message.kind ===
    "photo" &&
  message.mediaUrl ? (
  <div className="chat-photo-message">
    <img
      src={message.mediaUrl}
      alt="Photo sent in chat"
    />
  </div>
) : message.kind ===
  "voice" ? (
  <DiarioVoiceNote
    src={message.mediaUrl}
    transcript={message.content}
    open={openTranscript === message.id}
    onToggleTranscript={() =>
      setOpenTranscript((current) =>
        current === message.id ? null : message.id
      )
    }
  />
) : (
  <MessageContent className="diario-message-content messenger-bubble">
    <MessageResponse>
      {message.content}
    </MessageResponse>
  </MessageContent>
)}

{message.diaryItemId &&
  message.kind !==
    "shared_item" &&
  message.kind !==
    "agent_action" &&
  message.kind !==
    "sticker" &&
  message.kind !==
    "photo" &&
  message.kind !==
    "voice" && (
    <button
      type="button"
      className="letter-connected-button"
      onClick={() =>
        setSelectedChatObjectId(
          message.diaryItemId ??
            null
        )
      }
    >
      View connections
    </button>
  )}
                
                {preferences.showTimestamps && (
                  <time>{formatTime(message.createdAt)}{message.role === "user" ? "  ✓✓" : ""}</time>
                )}
                </div>
              </Message>
            ))
          )}
          {sending && (
            <Message from="assistant" className="diario-message messenger-message typing-message">
              <MessageContent className="diario-message-content messenger-bubble">
                <span className="ink-dots" aria-label="Dominic is typing"><i /><i /><i /></span>
              </MessageContent>
            </Message>
          )}
  
        </ConversationContent>
        <ConversationScrollButton className="conversation-scroll" aria-label="Go to newest message" />
      </Conversation>

      <div className="live-composer-wrap messenger-composer-wrap">
        {replyTarget && (
          <div className="chat-reply-composer">
            <div>
              <small>Replying to {replyTarget.role === "assistant" ? "Dominic" : preferredName}</small>
              <span>{replyTarget.content || (replyTarget.kind === "photo" ? "Photo" : replyTarget.kind === "voice" ? "Voice message" : "Message")}</span>
            </div>
            <button type="button" aria-label="Cancel reply" onClick={() => setReplyTarget(null)}>×</button>
          </div>
        )}
     {failedMessage && (
  <div
    className="send-error"
    role="status"
  >
    <span>
      couldn’t reach him.
      try again.
    </span>

    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() =>
        void retryFailedMessage()
      }
      disabled={
        sending
      }
    >
      <RotateCcw />

      Retry
    </Button>
  </div>
)}
        {voiceNotice && <div className={`voice-transcription-status ${voiceStatus}`}>{voiceNotice}</div>}

        <SpontaneousPhotoOpportunity
  userId={session.user.id}
  dominicState={dominicState}
  conversationSummary={recentConversationForPhoto()}
  onOpenPhoto={openPhotoEngine}
/>
        
        <PromptInput onSubmit={handleSubmit} className="live-composer messenger-composer">
        <PromptInputTextarea
  placeholder="Message Dominic…"
  disabled={voiceStatus === "listening"}
  aria-label="Message Dominic"
  onKeyDown={(event) => {
    if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      event.preventDefault();

      const textarea = event.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const nextValue =
        textarea.value.slice(0, start) +
        "\n" +
        textarea.value.slice(end);

      const nativeValueSetter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value"
      )?.set;

      nativeValueSetter?.call(textarea, nextValue);
      textarea.dispatchEvent(new Event("input", { bubbles: true }));

      requestAnimationFrame(() => {
        textarea.selectionStart = start + 1;
        textarea.selectionEnd = start + 1;
      });
    }
  }}
/>
          <PromptInputFooter>
            <PromptInputTools>
              <Sheet>
                <SheetTrigger asChild>
                  <Button type="button" size="icon" variant="ghost" aria-label="Open chat actions" className="composer-plus">
                    <Plus />
                  </Button>
                </SheetTrigger>
<ChatActionsSheet
  onPhotos={() =>
    photoInputRef.current?.click()
  }
  onCamera={() =>
    cameraInputRef.current?.click()
  }
  onStickers={() =>
    setStickersOpen(true)
  }
  onMusic={() =>
    onOpen("music")
  }
  onLetter={() =>
    onOpen("letters")
  }
  onDate={() =>
    onOpen("dates")
  }
  onSearch={() =>
    setSearchOpen(true)
  }
  onPhotoDominic={() =>
  openPhotoEngine({
    mode: "chat_photo",
    subjectType: "dominic",
  })
}
onPhotoMe={() =>
  openPhotoEngine({
    mode: "chat_photo",
    subjectType: "me",
  })
}
onPhotoUs={() =>
  openPhotoEngine({
    mode: "chat_photo",
    subjectType: "both",
  })
}
onPhotoSurprise={() =>
  openPhotoEngine({
    mode: "surprise",
    subjectType: "both",
  })
}
onPhotoFromConversation={() =>
  openPhotoEngine({
    mode: "chat_context",
    subjectType: "both",
    conversationSummary: recentConversationForPhoto(),
  })
}
/>
              </Sheet>
<Button
  type="button"
  size="icon"
  variant="ghost"
  aria-label="Choose a photo"
  title="Photos"
  disabled={uploadingMedia}
  onClick={() =>
    photoInputRef.current?.click()
  }
>
  <Image />
</Button>
            <Button
  type="button"
  size="icon"
  variant="ghost"
  aria-label="Stickers"
  title="Stickers"
  onClick={() =>
    setStickersOpen(true)
  }
>
  <Smile />
</Button>
            </PromptInputTools>
            <div className="composer-end-tools">
              {voiceStatus === "listening" && (
                <Button
                  type="button"
                  variant="ghost"
                  className="voice-cancel"
                  aria-label="Cancel voice note"
                  onClick={cancelVoiceCapture}
                >
                  Cancel
                </Button>
              )}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={voiceStatus === "listening" ? "Stop voice transcription" : "Record a voice note"}
                title="Voice note"
                className={voiceStatus === "listening" ? "voice-active" : ""}
                onClick={startVoiceCapture}
                disabled={sending || voiceStatus === "processing"}
              >
                <Mic />
              </Button>
             <PromptInputSubmit
  status="ready"
  disabled={voiceStatus === "listening"}
  className="live-send"
>
                <SendHorizontal />
              </PromptInputSubmit>
            </div>
          </PromptInputFooter>
        </PromptInput>
      </div>
      <input
  ref={photoInputRef}
  type="file"
  accept="image/*"
  hidden
  onChange={handlePhotoInput}
/>

<input
  ref={cameraInputRef}
  type="file"
  accept="image/*"
  capture="environment"
  hidden
  onChange={handlePhotoInput}
/>

<input
  ref={stickerInputRef}
  type="file"
  accept="image/png,image/jpeg,image/webp,image/gif"
  hidden
  onChange={(event) =>
    void addCustomSticker(
      event.target
        .files?.[0] ??
        null
    )
  }
/>

      <Sheet
  open={stickersOpen}
  onOpenChange={
    setStickersOpen
  }
>
  <SheetContent
    side="bottom"
    className="chat-actions-sheet chat-stickers-sheet"
  >
    <SheetHeader>
      <SheetTitle>
        Stickers
      </SheetTitle>
    </SheetHeader>

    <p className="settings-script">
      yours, his and shared — one visual language, three little trays.
    </p>

    <div
      className="chat-sticker-owner-tabs"
      role="tablist"
      aria-label="Sticker owner"
    >
      {[
        ["all", "All"],
        ["alloah", "Mine"],
        ["dominic", "Dominic"],
        ["shared", "Ours"],
      ].map(([id, label]) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={
            stickerOwnerView === id
          }
          className={
            stickerOwnerView === id
              ? "active"
              : ""
          }
          onClick={() =>
            setStickerOwnerView(
              id as
                | ChatStickerOwner
                | "all"
            )
          }
        >
          {label}
        </button>
      ))}
    </div>

    <div className="chat-sticker-upload-owner">
      <span>Add new sticker to</span>

      <select
        value={stickerUploadOwner}
        onChange={(event) =>
          setStickerUploadOwner(
            event.target
              .value as ChatStickerOwner
          )
        }
      >
        <option value="alloah">
          My tray
        </option>
        <option value="dominic">
          Dominic's tray
        </option>
        <option value="shared">
          Our tray
        </option>
      </select>
    </div>

    <div className="chat-sticker-toolbar">
      <button
        type="button"
        disabled={
          stickerBusy
        }
        onClick={() =>
          stickerInputRef
            .current
            ?.click()
        }
      >
        <Plus size={14} />
        Add sticker
      </button>

      <span>
        {customStickers.filter(
          (sticker) =>
            stickerOwnerView ===
              "all" ||
            sticker.owner ===
              stickerOwnerView
        ).length} visible
      </span>
    </div>

    {customStickers.length >
      0 && (
      <section className="chat-custom-stickers">
        <small>
          CUSTOM
        </small>

        <div>
          {customStickers
            .filter(
              (sticker) =>
                stickerOwnerView ===
                  "all" ||
                sticker.owner ===
                  stickerOwnerView
            )
            .map(
            (sticker) => (
              <article
                key={
                  sticker.id
                }
                className="chat-custom-sticker"
              >
                <button
                  type="button"
                  className="chat-custom-sticker-send"
                  disabled={
                    stickerBusy ||
                    !sticker.url
                  }
                  onClick={() =>
                    void sendStickerAsset(
                      sticker
                    )
                  }
                >
                  {sticker.url ? (
                    <img
                      src={
                        sticker.url
                      }
                      alt={
                        sticker.label
                      }
                    />
                  ) : (
                    <span>
                      loading…
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  className="chat-custom-sticker-remove"
                  aria-label={`Remove ${sticker.label} from sticker tray`}
                  disabled={
                    stickerBusy
                  }
                  onClick={() =>
                    void forgetCustomSticker(
                      sticker
                    )
                  }
                >
                  ×
                </button>
              </article>
            )
          )}
        </div>
      </section>
    )}

    <section className="chat-built-in-stickers">
      <small>
        QUICK REACTIONS
      </small>

      <div className="chat-sticker-grid">
        {[
          "♡",
          "♥",
          "🥺",
          "😭",
          "😂",
          "🫶",
          "😘",
          "😒",
          "🙄",
          "😴",
          "🍒",
          "🌙",
          "✨",
          "💌",
          "🌹",
          "🧸",
        ].map((sticker) => (
          <button
            key={sticker}
            type="button"
            onClick={() => {
              void sendMessage(
                sticker
              );

              setStickersOpen(
                false
              );
            }}
          >
            {sticker}
          </button>
        ))}
      </div>
    </section>

    {stickerNotice && (
      <p
        className="chat-sticker-notice"
        role="status"
      >
        {stickerNotice}
      </p>
    )}
  </SheetContent>
</Sheet>

<Sheet
  open={searchOpen}
  onOpenChange={setSearchOpen}
>
  <SheetContent
    side="bottom"
    className="chat-actions-sheet"
  >
    <SheetHeader>
      <SheetTitle>
        Search conversation
      </SheetTitle>
    </SheetHeader>

    <input
      className="chat-search-input"
      value={searchTerm}
      onChange={(event) =>
        setSearchTerm(
          event.target.value
        )
      }
      placeholder="Search messages..."
    />

    <div className="chat-search-results">
      {!searchTerm.trim() ? (
        <p>
          Type something to search
          your conversation.
        </p>
      ) : searchResults.length ===
        0 ? (
        <p>No messages found.</p>
      ) : (
        searchResults.map(
          (message) => (
            <div
              key={message.id}
              className="chat-search-result"
            >
              <strong>
                {message.role ===
                "user"
                  ? preferredName
                  : "Dominic"}
              </strong>

              <p>
                {message.content}
              </p>

              <small>
                {formatTime(
                  message.createdAt
                )}
              </small>
            </div>
          )
        )
      )}
    </div>
  </SheetContent>
</Sheet>
    </section>
  );
}

function ChatProfileSheet({
  userId,
  profile,
  owner,
  fallbackPhoto,
  statusCopy,
  onSaved,
  onOpen,
}: {
  userId:
    string;
  profile:
    ChatProfile | null;
  owner:
    ChatProfileOwner;
  fallbackPhoto:
    string | null;
  statusCopy:
    string;
  onSaved:
    (
      profile:
        ChatProfile
    ) => void;
  onOpen:
    (
      screen:
        | "letters"
        | "music"
        | "dates"
        | "photo-engine"
        | "gallery"
        | "memories"
        | "wardrobe"
        | "places"
        | "settings"
    ) => void;
}) {
  const [
    displayName,
    setDisplayName,
  ] =
    useState(
      profile
        ?.displayName ??
        (
          owner ===
          "dominic"
            ? "Dominic"
            : "Alloah"
        )
    );

  const [
    bio,
    setBio,
  ] =
    useState(
      profile?.bio ??
      ""
    );

  const [
    savingProfile,
    setSavingProfile,
  ] =
    useState(false);

  const [
    profileNotice,
    setProfileNotice,
  ] =
    useState<string | null>(
      null
    );

  const [
    choosingDiaryPhoto,
    setChoosingDiaryPhoto,
  ] = useState(false);

  const [
    diaryProfilePhotos,
    setDiaryProfilePhotos,
  ] = useState<GalleryPhoto[]>([]);

  const [
    loadingDiaryPhotos,
    setLoadingDiaryPhotos,
  ] = useState(false);

  useEffect(() => {
    setDisplayName(
      profile
        ?.displayName ??
        (
          owner ===
          "dominic"
            ? "Dominic"
            : "Alloah"
        )
    );

    setBio(
      profile?.bio ??
      ""
    );
  }, [
    owner,
    profile?.bio,
    profile
      ?.displayName,
  ]);

  const photo =
    profile?.photoUrl ??
    fallbackPhoto;

  const initial =
    displayName
      .trim()
      .charAt(0)
      .toUpperCase() ||
    (
      owner ===
      "dominic"
        ? "D"
        : "A"
    );

  const persistText =
    async () => {
      setSavingProfile(true);
      setProfileNotice(
        null
      );

      try {
        const saved =
          await saveChatProfile({
            userId,
            owner,
            displayName,
            bio,
          });

        onSaved(saved);
        setProfileNotice(
          "Profile saved."
        );
      } catch (
        error
      ) {
        console.error(
          "Could not save chat profile:",
          error
        );

        setProfileNotice(
          "Profile could not be saved."
        );
      } finally {
        setSavingProfile(false);
      }
    };

  const uploadPhoto =
    async (
      file:
        File | null
    ) => {
      if (!file) {
        return;
      }

      setSavingProfile(true);
      setProfileNotice(
        null
      );

      try {
        const path =
          await uploadChatProfilePhoto({
            userId,
            owner,
            file,
          });

        const saved =
          await saveChatProfile({
            userId,
            owner,
            displayName,
            bio,
            photoPath:
              path,
          });

        onSaved(saved);
        setProfileNotice(
          owner ===
            "dominic"
            ? "Dominic's current profile photo changed."
            : "Your profile photo changed."
        );
      } catch (
        error
      ) {
        console.error(
          "Could not change chat profile photo:",
          error
        );

        setProfileNotice(
          "Profile photo could not be changed."
        );
      } finally {
        setSavingProfile(false);
      }
    };

  const clearPhoto =
    async () => {
      setSavingProfile(true);
      setProfileNotice(
        null
      );

      try {
        const saved =
          await removeChatProfilePhoto({
            userId,
            owner,
          });

        onSaved(saved);
        setProfileNotice(
          "Profile photo reset."
        );
      } catch (
        error
      ) {
        console.error(
          "Could not reset chat profile photo:",
          error
        );

        setProfileNotice(
          "Profile photo could not be reset."
        );
      } finally {
        setSavingProfile(false);
      }
    };

  const openDiaryPhotoPicker =
    async () => {
      setChoosingDiaryPhoto(true);
      setLoadingDiaryPhotos(true);
      setProfileNotice(null);

      try {
        const photos =
          await getGalleryPhotos(
            userId
          );

        setDiaryProfilePhotos(
          photos.filter(
            (photo) =>
              photo.item.owner ===
                owner ||
              photo.item.owner ===
                "shared"
          )
        );
      } catch (error) {
        console.error(
          "Could not load diary profile photos:",
          error
        );

        setProfileNotice(
          "Diary photos could not be opened."
        );
      } finally {
        setLoadingDiaryPhotos(false);
      }
    };

  const useDiaryProfilePhoto =
    async (
      photo: GalleryPhoto
    ) => {
      const storagePath =
        typeof photo.item.data
          ?.storage_path ===
          "string"
          ? photo.item.data
              .storage_path
          : null;

      if (!storagePath) {
        setProfileNotice(
          "That photo is not available as a profile picture."
        );
        return;
      }

      setSavingProfile(true);
      setProfileNotice(null);

      try {
        const saved =
          await saveChatProfile({
            userId,
            owner,
            displayName,
            bio,
            photoPath:
              storagePath,
          });

        onSaved(saved);
        setChoosingDiaryPhoto(false);
        setProfileNotice(
          owner === "dominic"
            ? "Dominic's profile photo now comes from his Diary photos."
            : "Your profile photo now comes from your Diary photos."
        );
      } catch (error) {
        console.error(
          "Could not use Diary photo as profile picture:",
          error
        );

        setProfileNotice(
          "That Diary photo could not become the profile picture."
        );
      } finally {
        setSavingProfile(false);
      }
    };

  const shortcuts =
    owner ===
    "dominic"
      ? [
          {
            label:
              "Photos",
            screen:
              "gallery",
          },
          {
            label:
              "Music",
            screen:
              "music",
          },
          {
            label:
              "Letters",
            screen:
              "letters",
          },
          {
            label:
              "Dates",
            screen:
              "dates",
          },
          {
            label:
              "Wardrobe",
            screen:
              "wardrobe",
          },
          {
            label:
              "Memories",
            screen:
              "memories",
          },
        ]
      : [
          {
            label:
              "Photos",
            screen:
              "gallery",
          },
          {
            label:
              "Wardrobe",
            screen:
              "wardrobe",
          },
          {
            label:
              "Memories",
            screen:
              "memories",
          },
          {
            label:
              "Places",
            screen:
              "places",
          },
          {
            label:
              "Settings",
            screen:
              "settings",
          },
        ];

  return (
    <SheetContent
      side="bottom"
      className="chat-profile-sheet"
    >
      <SheetHeader>
        <SheetTitle>
          {owner ===
          "dominic"
            ? "Dominic"
            : "My profile"}
        </SheetTitle>
      </SheetHeader>

      <section className="chat-profile-hero">
        <div className="chat-profile-photo">
          {photo ? (
            <img
              src={photo}
              alt=""
            />
          ) : (
            <span>
              {initial}
            </span>
          )}
        </div>

        <div>
          <strong>
            {displayName}
          </strong>

          <small>
            {statusCopy}
          </small>
        </div>
      </section>

      <div className="chat-profile-photo-actions">
        <label>
          <Image size={14} />
          Upload
          <input
            type="file"
            accept="image/*"
            disabled={
              savingProfile
            }
            onChange={(event) =>
              void uploadPhoto(
                event.target
                  .files?.[0] ??
                  null
              )
            }
          />
        </label>

        <button
          type="button"
          disabled={
            savingProfile
          }
          onClick={() =>
            void openDiaryPhotoPicker()
          }
        >
          <Image size={14} />
          Diary photos
        </button>

        {profile
          ?.photoPath && (
          <button
            type="button"
            disabled={
              savingProfile
            }
            onClick={() =>
              void clearPhoto()
            }
          >
            Reset
          </button>
        )}
      </div>

      {choosingDiaryPhoto && (
        <section className="chat-profile-photo-picker">
          <header>
            <div>
              <small>
                {owner ===
                "dominic"
                  ? "DOMINIC'S PHOTOS"
                  : "MY PHOTOS"}
              </small>

              <strong>
                Choose a profile photo
              </strong>
            </div>

            <button
              type="button"
              onClick={() =>
                setChoosingDiaryPhoto(
                  false
                )
              }
            >
              ×
            </button>
          </header>

          {loadingDiaryPhotos ? (
            <p>
              Opening the camera roll…
            </p>
          ) : diaryProfilePhotos.length ===
            0 ? (
            <p>
              No matching Diary photos yet.
            </p>
          ) : (
            <div>
              {diaryProfilePhotos
                .slice(
                  0,
                  24
                )
                .map(
                  (photo) => (
                    <button
                      key={
                        photo.item.id
                      }
                      type="button"
                      disabled={
                        savingProfile
                      }
                      onClick={() =>
                        void useDiaryProfilePhoto(
                          photo
                        )
                      }
                    >
                      <img
                        src={
                          photo.url
                        }
                        alt={
                          photo.item
                            .title ??
                          "Diary photo"
                        }
                      />
                    </button>
                  )
                )}
            </div>
          )}
        </section>
      )}

      <section className="chat-profile-fields">
        <label>
          <span>
            Name
          </span>

          <input
            value={
              displayName
            }
            onChange={(
              event
            ) =>
              setDisplayName(
                event
                  .target
                  .value
              )
            }
          />
        </label>

        <label>
          <span>
            About
          </span>

          <textarea
            value={
              bio
            }
            onChange={(
              event
            ) =>
              setBio(
                event
                  .target
                  .value
              )
            }
            placeholder={
              owner ===
              "dominic"
                ? "A small line on his profile…"
                : "A small line on your profile…"
            }
            rows={2}
          />
        </label>

        <button
          type="button"
          className="chat-profile-save"
          disabled={
            savingProfile ||
            !displayName
              .trim()
          }
          onClick={() =>
            void persistText()
          }
        >
          {savingProfile
            ? "Saving…"
            : "Save profile"}
        </button>
      </section>

      <section className="chat-profile-shortcuts">
        <small>
          {owner ===
          "dominic"
            ? "his world"
            : "my side"}
        </small>

        <div>
          {shortcuts.map(
            (shortcut) => (
              <button
                key={
                  shortcut.label
                }
                type="button"
                onClick={() =>
                  onOpen(
                    shortcut.screen as any
                  )
                }
              >
                <span>
                  {shortcut.label}
                </span>

                <ChevronRight
                  size={14}
                />
              </button>
            )
          )}
        </div>
      </section>

      {owner ===
        "dominic" && (
        <p className="chat-profile-ownership-note">
          This is Dominic's profile state.
          His autonomy can update the same
          photo, bio and presence instead of
          creating a separate fake profile.
        </p>
      )}

      {profileNotice && (
        <p
          className="chat-profile-notice"
          role="status"
        >
          {profileNotice}
        </p>
      )}
    </SheetContent>
  );
}

function ChatAppearanceSheet({
  preferences,
  onChange,
}: {
  preferences: ChatPreferences;
  onChange: (value: ChatPreferences) => void;
}) {
  function patch(next: Partial<ChatPreferences>) {
    onChange({ ...preferences, ...next });
  }

  return (
    <SheetContent side="bottom" className="chat-settings-sheet">
      <SheetHeader>
        <SheetTitle>Chat appearance</SheetTitle>
      </SheetHeader>
      <p className="settings-script">same conversation. a different mood whenever you want.</p>

      <section className="settings-section">
        <div className="settings-row-title"><strong>Theme</strong><small>wallpaper + color mood</small></div>
        <div className="theme-grid">
          {themeOptions.map((theme) => (
            <button key={theme.id} className={preferences.theme === theme.id ? "active" : ""} onClick={() => patch({ theme: theme.id })}>
              <span className={`theme-swatch swatch-${theme.id}`} />
              <b>{theme.label}</b>
              <small>{theme.note}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-row-title"><strong>Bubbles</strong><small>different styles, same chat</small></div>
        <div className="bubble-choice-grid">
          {bubbleOptions.map((bubble) => (
            <button key={bubble.id} className={preferences.bubbles === bubble.id ? "active" : ""} onClick={() => patch({ bubbles: bubble.id })}>
              <span className={`bubble-preview preview-${bubble.id}`}>this is how your messages will look. ♡</span>
              <b>{bubble.label}</b>
            </button>
          ))}
        </div>
      </section>

      <section className="settings-section settings-toggles">
        <label><span><strong>Adapt to time of day</strong><small>chat darkens with the rest of Diário</small></span><Switch checked={preferences.adaptToTime} onCheckedChange={(checked) => patch({ adaptToTime: checked })} /></label>
        <label><span><strong>Show timestamps</strong><small>time + read state</small></span><Switch checked={preferences.showTimestamps} onCheckedChange={(checked) => patch({ showTimestamps: checked })} /></label>
        <label><span><strong>Show Dominic's avatar</strong><small>beside his messages</small></span><Switch checked={preferences.showDominicAvatar} onCheckedChange={(checked) => patch({ showDominicAvatar: checked })} /></label>
      </section>
    </SheetContent>
  );
}

function ChatActionsSheet({
  onPhotos,
  onCamera,
  onStickers,
  onMusic,
  onLetter,
  onDate,
  onSearch,
  onPhotoDominic,
  onPhotoMe,
  onPhotoUs,
  onPhotoSurprise,
  onPhotoFromConversation,
}: {
  onPhotos: () => void;
  onCamera: () => void;
  onStickers: () => void;
  onMusic: () => void;
  onLetter: () => void;
  onDate: () => void;
  onSearch: () => void;
  onPhotoDominic: () => void;
onPhotoMe: () => void;
onPhotoUs: () => void;
onPhotoSurprise: () => void;
onPhotoFromConversation: () => void;
}) {
const actions = [
  {
    label: "Photos",
    note: "from your library",
    icon: <Image />,
    action: onPhotos,
  },
  {
    label: "Camera",
    note: "real moments",
    icon: <Camera />,
    action: onCamera,
  },
  {
    label: "Stickers",
    note: "react or send",
    icon: <Smile />,
    action: onStickers,
  },
  {
    label: "Music",
    note: "share a song",
    icon: <Music2 />,
    action: onMusic,
  },
  {
    label: "Letter",
    note: "I wrote you something",
    icon: <Mail />,
    action: onLetter,
  },
  {
    label: "Date",
    note: "make a plan together",
    icon: <Heart />,
    action: onDate,
  },
{
  label: "Photo · From conversation",
  note: "uses what you were just talking about",
  icon: <MessageCircle />,
  action: onPhotoFromConversation,
},
{
  label: "Photo · Dominic",
  note: "ask him for a photo",
  icon: <Camera />,
  action: onPhotoDominic,
},
{
  label: "Photo · Me",
  note: "generate Alloah",
  icon: <Image />,
  action: onPhotoMe,
},
{
  label: "Photo · Us",
  note: "a shared moment",
  icon: <Heart />,
  action: onPhotoUs,
},
{
  label: "Photo · Surprise",
  note: "let the moment choose itself",
  icon: <Sparkles />,
  action: onPhotoSurprise,
},
  {
    label: "Search",
    note:
      "messages, media & links",
    icon: <Search />,
    action: onSearch,
  },
];
  return (
    <SheetContent
      side="bottom"
      className="chat-actions-sheet"
    >
      <SheetHeader>
        <SheetTitle>
          Send something
        </SheetTitle>
      </SheetHeader>

      <p className="settings-script">
        different ways to be close.
      </p>

      <div className="chat-actions-grid">
        {actions.map(
          (action) => (
            <button
              key={action.label}
              type="button"
              onClick={action.action}
            >
              <span>
                {action.icon}
              </span>

              <div>
                <strong>
                  {action.label}
                </strong>

                <small>
                  {action.note}
                </small>
              </div>

              <ChevronRight />
            </button>
          )
        )}
      </div>
    </SheetContent>
  );
}
