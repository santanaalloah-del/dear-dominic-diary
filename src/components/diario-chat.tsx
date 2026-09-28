import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SpontaneousPhotoOpportunity } from "@/components/spontaneous-photo-opportunity";
import {
  Camera,
  ChevronRight,
  Heart,
  Image,
  Mail,
  Mic,
  MoreVertical,
  Music2,
  Palette,
  Phone,
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
  getCurrentDominicState,
  type DominicState,
} from "@/lib/dominic-state";
import { useTimeMood } from "@/lib/time-mood";
import {
  createDate,
  createLetter,
  createMemory,
  createPlace,
  createSong,
  getDates,
  type DiarioItem,
} from "@/lib/diario-world";
import dominic from "@/assets/dominic-candid.jpg";

type DominicActionType =
  | "create_date"
  | "create_letter"
  | "create_memory"
  | "create_place"
  | "create_song";

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
    };

type MessageKind =
  | "text"
  | "voice"
  | "photo"
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
};

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
      "create_song"
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
const DOMINIC_STATUS = "home";

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

export function DiarioChat({
  onOpen,
}: {
onOpen: (
  screen:
    | "letters"
    | "music"
    | "dates"
    | "photo-engine"
) => void;
}) {
  const { session, preferredName } = usePrivateDiario();
  const time = useTimeMood();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [failedMessage, setFailedMessage] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<ChatPreferences>(defaultPreferences);
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

  const [uploadingMedia, setUploadingMedia] =
    useState(false);

  const [searchOpen, setSearchOpen] =
    useState(false);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [stickersOpen, setStickersOpen] =
    useState(false);

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
      const state =
        await getCurrentDominicState(
          session.user.id
        );

      if (!cancelled) {
        setDominicState(state);
      }
    };

  void refreshDominicState();

  const timer =
    window.setInterval(
      refreshDominicState,
      60_000
    );

  return () => {
    cancelled = true;
    window.clearInterval(timer);
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
}: {
  userMessage:
    string;

  replies:
    string[];
}): Promise<
  DominicWorldAction[]
> {
  try {
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

              nearbyCommitments,
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
              mediaType !== "voice")
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
            "id,role,content,created_at"
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

const normalMessages =
  (data ?? []).map(
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
          message.content,

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
          "agent_action" ||
        (media.type ===
          "shared_item" &&
          !matchedSharedMediaIds.has(
            media.id
          ))
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

async function flushPendingMessages() {
  if (processingQueueRef.current) {
    return;
  }

  const queuedMessages = [
    ...pendingMessagesRef.current,
  ];

  pendingMessagesRef.current = [];

  if (queuedMessages.length === 0) {
    setSending(false);
    return;
  }

  processingQueueRef.current = true;
  setSending(true);
  setFailedMessage(null);

 const combinedMessage =
  queuedMessages.length === 1
    ? queuedMessages[0].text
    : queuedMessages
        .map(
          (item, index) =>
            `Alloah message ${index + 1}: ${item.text}`
        )
        .join("\n");

try {
  const liveNearbyCommitments =
    await loadNearbyCommitmentsNow()
      .catch((error) => {
        console.error(
          "Could not refresh nearby commitments:",
          error
        );

        return nearbyCommitments;
      });

  setNearbyCommitments(liveNearbyCommitments);

  const { data, error } =
    await supabase.functions.invoke(
      "clever-service",
      {
        body: {
  message: combinedMessage,
  dominicContext: dominicState
    ? {
        activity: dominicState.activity,
        location: dominicState.location,
        mood: dominicState.mood ?? null,
        energy: dominicState.energy ?? null,
        startedAt: dominicState.startedAt,
        nextChangeAt: dominicState.nextChangeAt,
      }
       : null,
  nearbyCommitments: liveNearbyCommitments,
},
        }
      );

    const replies =
      Array.isArray(data?.replies)
        ? data.replies
            .filter(
              (item: unknown): item is string =>
                typeof item === "string"
            )
            .map((item) => item.trim())
            .filter(Boolean)
        : typeof data?.reply === "string"
          ? [data.reply.trim()].filter(Boolean)
          : [];

    if (error || replies.length === 0) {
      throw (
        error ??
        new Error("Missing reply")
      );
    }

 setMessages((current) => [
      ...current,

      ...replies.map(
        (
          reply
        ) => ({
          id:
            `reply-${crypto.randomUUID()}`,

          role:
            "assistant" as const,

          content:
            reply,

          createdAt:
            new Date()
              .toISOString(),

          kind:
            "text" as const,
        })
      ),
    ]);

    const worldActions =
      await extractDominicActions({
        userMessage:
          combinedMessage,

        replies,
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
  } catch {
    setFailedMessage(combinedMessage);
  } finally {
    processingQueueRef.current = false;

    if (pendingMessagesRef.current.length > 0) {
      queueTimerRef.current =
        window.setTimeout(() => {
          queueTimerRef.current = null;
          void flushPendingMessages();
        }, 1200);

      return;
    }

    setSending(false);
  }
}

async function sendMessage(
  text: string,
  kind: MessageKind = "text",
  sharedItem?: PendingChatShare
) {
  const clean =
    text.trim();

  if (!clean) return;

  const now =
    new Date().toISOString();

  if (kind === "voice") {
    rememberVoice(
      clean,
      now
    );
  }

  setMessages(
    (current) => [
      ...current,
      {
        id: `local-${crypto.randomUUID()}`,

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
      },
    ]
  );

  pendingMessagesRef.current.push(
    {
      text: clean,
      kind,
    }
  );

  if (
    queueTimerRef.current
  ) {
    window.clearTimeout(
      queueTimerRef.current
    );
  }

  setSending(true);
  setFailedMessage(null);

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
  
  function handleSubmit(message: PromptInputMessage) {
    return sendMessage(message.text);
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
    await uploadChatMedia({
      file,
      type: "photo",
    });

    await loadHistory(false);

    await sendMessage(
      "I sent you a photo."
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

        recognition.lang =
          navigator.language ||
          "pt-BR";

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
 const statusCopy = useMemo(() => {
  if (!dominicState) {
return "checking where he is";
  }

  const activity =
    dominicState.activity.replaceAll(
      "_",
      " "
    );

  const location =
    dominicState.location === "living"
      ? "living room"
      : dominicState.location;

  return `${activity} · ${location}`;
}, [dominicState]);

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
        <button className="messenger-avatar" aria-label="Dominic profile">
          <img src={dominic} alt="Dominic" />
          <span className="presence-dot" />
        </button>
        <div className="messenger-person">
         <h1>{DOMINIC_NAME} <span>♡</span></h1>
          <p>{statusCopy}</p>
        </div>
        <div className="messenger-header-actions">
          <button aria-label="Call Dominic" title="Call"><Phone /></button>
          <button aria-label="Video call Dominic" title="Video"><Video /></button>
          <Sheet>
            <SheetTrigger asChild>
              <button aria-label="Customize chat" title="Customize chat"><Palette /></button>
            </SheetTrigger>
            <ChatAppearanceSheet preferences={preferences} onChange={setPreferences} />
          </Sheet>
          <button aria-label="More chat options"><MoreVertical /></button>
        </div>
      </header>

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
                className={`diario-message messenger-message ${message.kind === "voice" ? "voice-message" : ""}`}
              >
                {message.role === "assistant" && preferences.showDominicAvatar && (
                  <img className="message-avatar" src={dominic} alt="" aria-hidden="true" />
                )}
{message.kind ===
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
  <div className="voice-note-real">
    {message.mediaUrl && (
      <audio
        controls
        preload="metadata"
        src={message.mediaUrl}
      />
    )}

    {message.content && (
      <button
        type="button"
        className="voice-transcript-toggle"
        onClick={() =>
          setOpenTranscript(
            (current) =>
              current ===
              message.id
                ? null
                : message.id
          )
        }
      >
        Transcript
      </button>
    )}

    {openTranscript ===
      message.id && (
      <em>
        {message.content}
      </em>
    )}
  </div>
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
    "agent_action" && (
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
              </Message>
            ))
          )}
          {sending && (
            <Message from="assistant" className="diario-message messenger-message typing-message">
              {preferences.showDominicAvatar && <img className="message-avatar" src={dominic} alt="" aria-hidden="true" />}
              <MessageContent className="diario-message-content messenger-bubble">
                <span className="ink-dots" aria-label="Dominic is typing"><i /><i /><i /></span>
              </MessageContent>
            </Message>
          )}
  
        </ConversationContent>
        <ConversationScrollButton className="conversation-scroll" aria-label="Go to newest message" />
      </Conversation>

      <div className="live-composer-wrap messenger-composer-wrap">
        {failedMessage && (
          <div className="send-error" role="status">
            <span>couldn’t reach him. try again.</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => sendMessage(failedMessage)} disabled={sending}>
              <RotateCcw /> Retry
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
      <Sheet
  open={stickersOpen}
  onOpenChange={setStickersOpen}
>
  <SheetContent
    side="bottom"
    className="chat-actions-sheet"
  >
    <SheetHeader>
      <SheetTitle>
        Stickers
      </SheetTitle>
    </SheetHeader>

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
