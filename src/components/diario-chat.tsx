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

type MessageKind = "text" | "voice";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  kind?: MessageKind;
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

export function DiarioChat() {
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

  useEffect(() => {
    setPreferences(readPreferences());
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(preferences));
    }
  }, [preferences]);

  const loadHistory = useCallback(
    async (showLoading = true) => {
      if (showLoading) setLoading(true);
      const { data: conversations } = await supabase
        .from("conversations")
        .select("id,title,updated_at")
        .eq("user_id", session.user.id)
        .order("updated_at", { ascending: false });

      const conversation =
        conversations?.find((item) => item.title?.toLowerCase().includes("dominic")) ??
        conversations?.[0];

      if (!conversation) {
        setMessages([]);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("messages")
        .select("id,role,content,created_at")
        .eq("user_id", session.user.id)
        .eq("conversation_id", conversation.id)
        .in("role", ["user", "assistant"])
        .order("created_at", { ascending: true });

      setMessages(
        (data ?? []).map((message) => ({
          id: String(message.id),
          role: message.role === "user" ? "user" : "assistant",
          content: message.content,
          createdAt: message.created_at,
          kind:
            message.role === "user" && wasVoiceMessage(message.content, message.created_at)
              ? "voice"
              : "text",
        })),
      );
      setLoading(false);
    },
    [session.user.id],
  );

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(
    () => () => {
      recognitionRef.current?.abort();
    },
    [],
  );

  async function sendMessage(text: string, kind: MessageKind = "text") {
    const clean = text.trim();
    if (!clean || sending) return;

    const now = new Date().toISOString();
    if (kind === "voice") rememberVoice(clean, now);

    setMessages((current) => [
      ...current,
      { id: `local-${Date.now()}`, role: "user", content: clean, createdAt: now, kind },
    ]);
    setSending(true);
    setFailedMessage(null);

    try {
      const { data, error } = await supabase.functions.invoke("clever-service", {
        body: { message: clean },
      });
      if (error || typeof data?.reply !== "string") throw error ?? new Error("Missing reply");
      setMessages((current) => [
        ...current,
        {
          id: `reply-${Date.now()}`,
          role: "assistant",
          content: data.reply,
          createdAt: new Date().toISOString(),
          kind: "text",
        },
      ]);
      window.setTimeout(() => {
        void loadHistory(false);
      }, 800);
    } catch {
      setFailedMessage(clean);
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(message: PromptInputMessage) {
    return sendMessage(message.text);
  }

  function startVoiceCapture() {
    if (voiceStatus === "listening") {
      recognitionRef.current?.stop();
      return;
    }

    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceNotice("Voice transcription is not available in this browser yet.");
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "pt-BR";
    recognitionRef.current = recognition;
    let transcript = "";

    recognition.onresult = (event) => {
      transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (transcript) setVoiceNotice(`“${transcript}”`);
    };

    recognition.onerror = () => {
      setVoiceStatus("idle");
      setVoiceNotice("I couldn't hear that clearly. Tap the mic and try again.");
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      if (!transcript) {
        setVoiceStatus("idle");
        return;
      }
      setVoiceStatus("processing");
      void sendMessage(transcript, "voice").finally(() => {
        setVoiceStatus("idle");
        window.setTimeout(() => setVoiceNotice(null), 1600);
      });
    };

    setVoiceNotice("listening…");
    setVoiceStatus("listening");
    recognition.start();
  }

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
                {message.kind === "voice" ? (
                  <button
                    className="voice-note-bubble"
                    type="button"
                    onClick={() => setOpenTranscript((current) => (current === message.id ? null : message.id))}
                    aria-label="Show voice note transcript"
                  >
                    <span className="voice-play">▶</span>
                    <span className="voice-wave" aria-hidden="true">▂▅▃▆▂▇▅▃▆▂▅▇▃▂▆▅▃</span>
                    <span className="voice-length">{voiceDuration(message.content)}</span>
                    {openTranscript === message.id && <em>{message.content}</em>}
                  </button>
                ) : (
                  <MessageContent className="diario-message-content messenger-bubble">
                    <MessageResponse>{message.content}</MessageResponse>
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
          <PromptInputTextarea placeholder="Message Dominic…" disabled={sending || voiceStatus === "listening"} aria-label="Message Dominic" />
          <PromptInputFooter>
            <PromptInputTools>
              <Sheet>
                <SheetTrigger asChild>
                  <Button type="button" size="icon" variant="ghost" aria-label="Open chat actions" className="composer-plus">
                    <Plus />
                  </Button>
                </SheetTrigger>
                <ChatActionsSheet />
              </Sheet>
              <Button type="button" size="icon" variant="ghost" aria-label="Choose a photo" title="Photos">
                <Image />
              </Button>
              <Button type="button" size="icon" variant="ghost" aria-label="Stickers" title="Stickers">
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
              <PromptInputSubmit status={sending ? "submitted" : "ready"} disabled={sending || voiceStatus === "listening"} className="live-send">
                <SendHorizontal />
              </PromptInputSubmit>
            </div>
          </PromptInputFooter>
        </PromptInput>
      </div>
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

function ChatActionsSheet() {
  const actions = [
    { label: "Photos", note: "from your library", icon: <Image /> },
    { label: "Camera", note: "real moments", icon: <Camera /> },
    { label: "Stickers", note: "react or send", icon: <Smile /> },
    { label: "Music", note: "share from Spotify", icon: <Music2 /> },
    { label: "Letter", note: "I wrote you something", icon: <Mail /> },
    { label: "Date", note: "make a plan together", icon: <Heart /> },
    { label: "Ask Dominic for a Photo", note: "generated → keep or discard", icon: <Camera /> },
    { label: "Search", note: "messages, media & links", icon: <Search /> },
  ];

  return (
    <SheetContent side="bottom" className="chat-actions-sheet">
      <SheetHeader><SheetTitle>Send something</SheetTitle></SheetHeader>
      <p className="settings-script">different ways to be close.</p>
      <div className="chat-actions-grid">
        {actions.map((action) => (
          <button key={action.label} type="button">
            <span>{action.icon}</span>
            <div><strong>{action.label}</strong><small>{action.note}</small></div>
            <ChevronRight />
          </button>
        ))}
      </div>
    </SheetContent>
  );
}
