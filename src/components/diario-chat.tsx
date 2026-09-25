import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useTimeMood } from "@/lib/time-mood";
import dominic from "@/assets/dominic-candid.jpg";

type MessageKind = "text" | "voice" | "photo";

type ChatMedia = {
  id: string;
  type: "photo" | "voice";
  url: string;
  transcript?: string;
  createdAt: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  kind?: MessageKind | undefined;
  mediaUrl?: string | undefined;
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

  async function loadChatMedia(): Promise<ChatMedia[]> {
    const { data, error } =
      await supabase
        .from("diario_items")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("kind", "chat_media")
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
          async (item): Promise<ChatMedia | null> => {
            const storagePath =
              (item.data as any)?.storage_path;

            const mediaType =
              (item.data as any)?.media_type;

            if (
              typeof storagePath !== "string" ||
              (mediaType !== "photo" &&
                mediaType !== "voice")
            ) {
              return null;
            }

            const {
              data: signedData,
              error: signedError,
            } = await supabase.storage
              .from("diario-media")
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
              url: signedData.signedUrl,
              transcript:
                typeof (item.data as any)?.transcript ===
                "string"
                  ? (item.data as any).transcript
                  : undefined,
              createdAt:
                item.event_at ??
                item.created_at,
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
        const photos =
          chatMedia
            .filter(
              (media) =>
                media.type === "photo"
            )
            .map(
              (media): ChatMessage => ({
                id: media.id,
                role: "user",
                content: "",
                createdAt:
                  media.createdAt,
                kind: "photo",
                mediaUrl: media.url,
              })
            );

        setMessages(photos);
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

      const normalMessages =
        (data ?? []).map(
          (message): ChatMessage => {
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
                    media.transcript?.trim() !==
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
                  : "text",
              mediaUrl:
                matchingVoice?.url,
            };
          }
        );

      const photos =
        chatMedia
          .filter(
            (media) =>
              media.type === "photo"
          )
          .map(
            (media): ChatMessage => ({
              id: media.id,
              role: "user",
              content: "",
              createdAt:
                media.createdAt,
              kind: "photo",
              mediaUrl: media.url,
            })
          );

      const combined = [
        ...normalMessages,
        ...photos,
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
  if (typeof window === "undefined") return;

  const pendingMessage =
    window.localStorage.getItem(
      "diario-pending-chat-message"
    );

  if (!pendingMessage) return;

  window.localStorage.removeItem(
    "diario-pending-chat-message"
  );

  window.setTimeout(() => {
    void sendMessage(pendingMessage);
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
    const { data, error } =
      await supabase.functions.invoke(
        "clever-service",
        {
          body: {
            message: combinedMessage,
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
      ...replies.map((reply) => ({
        id: `reply-${crypto.randomUUID()}`,
        role: "assistant" as const,
        content: reply,
        createdAt:
          new Date().toISOString(),
        kind: "text" as const,
      })),
    ]);

    window.setTimeout(() => {
      void loadHistory(false);
    }, 800);
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
  kind: MessageKind = "text"
) {
  const clean = text.trim();

  if (!clean) return;

  const now = new Date().toISOString();

  if (kind === "voice") {
    rememberVoice(clean, now);
  }

  setMessages((current) => [
    ...current,
    {
      id: `local-${crypto.randomUUID()}`,
      role: "user",
      content: clean,
      createdAt: now,
      kind,
    },
  ]);

  pendingMessagesRef.current.push({
    text: clean,
    kind,
  });

  if (queueTimerRef.current) {
    window.clearTimeout(queueTimerRef.current);
  }

  setSending(true);
  setFailedMessage(null);

queueTimerRef.current =
  window.setTimeout(() => {
    queueTimerRef.current = null;
    void flushPendingMessages();
  }, 4500);
}
  
useEffect(() => {
  if (typeof window === "undefined") return;

  const pendingMessage =
    window.localStorage.getItem(
      "diario-pending-chat-message"
    );

  if (!pendingMessage) return;

  window.localStorage.removeItem(
    "diario-pending-chat-message"
  );

  window.setTimeout(() => {
    void sendMessage(pendingMessage);
  }, 400);
}, []);
  function handleSubmit(message: PromptInputMessage) {
    return sendMessage(message.text);
  }
async function sendPhoto(file: File) {
  if (!file.type.startsWith("image/")) {
    return;
  }

  const photoUrl = URL.createObjectURL(file);
  const now = new Date().toISOString();

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

  await sendMessage(
    "I sent you a photo, but the app can't show it to you yet."
  );
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
    if (time.mood === "late") return "still here";
    if (time.mood === "night") return "with you tonight";
    if (time.mood === "golden") return "thinking about you";
    return "online now";
  }, [time.mood]);

  const chatClassName = [
    "live-chat-screen messenger-chat",
    `chat-theme-${preferences.theme}`,
    `chat-bubbles-${preferences.bubbles}`,
    preferences.adaptToTime ? `chat-adapt-time chat-time-${time.mood}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={chatClassName}>
      <header className="messenger-header">
        <button className="messenger-avatar" aria-label="Dominic profile">
          <img src={dominic} alt="Dominic" />
          <span className="presence-dot" />
        </button>
        <div className="messenger-person">
          <h1>Dominic <span>♡</span></h1>
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

      <button className="chat-now-playing" type="button">
        <div className="mini-album-art"><Music2 /></div>
        <span><small>NOW PLAYING</small><strong>your shared music will live here</strong></span>
        <ChevronRight />
      </button>

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
{message.kind === "photo" &&
message.mediaUrl ? (
  <div className="chat-photo-message">
    <img
      src={message.mediaUrl}
      alt="Photo sent in chat"
    />
  </div>
) : message.kind === "voice" ? (
  <div className="voice-note-real">
    {message.mediaUrl && (
      <audio
        controls
        preload="metadata"
        src={message.mediaUrl}
      />
    )}
    
{(message.kind as MessageKind) === "photo" && message.mediaUrl ? (
  <img
    src={message.mediaUrl}
    alt="Sent photo"
    className="chat-photo-message"
  />
) : null}

{message.kind === "voice" && message.mediaUrl ? (
  <audio
    controls
    src={message.mediaUrl}
    className="chat-voice-message"
  />
) : null}
    
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
}: {
  onPhotos: () => void;
  onCamera: () => void;
  onStickers: () => void;
  onMusic: () => void;
  onLetter: () => void;
  onDate: () => void;
  onSearch: () => void;
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
    label:
      "Ask Dominic for a Photo",
    note:
      "generated → keep or discard",
    icon: <Camera />,
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
