import { useCallback, useEffect, useState } from "react";
import { Image, Mic, RotateCcw } from "lucide-react";
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
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { usePrivateDiario } from "@/components/private-diario";
import dominic from "@/assets/dominic-candid.jpg";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

const formatTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(
    new Date(value),
  );

export function DiarioChat() {
  const { session, preferredName } = usePrivateDiario();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [failedMessage, setFailedMessage] = useState<string | null>(null);

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
        })),
      );
      setLoading(false);
    },
    [session.user.id],
  );

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  async function sendMessage(text: string) {
    const clean = text.trim();
    if (!clean || sending) return;

    const now = new Date().toISOString();
    setMessages((current) => [
      ...current,
      { id: `local-${Date.now()}`, role: "user", content: clean, createdAt: now },
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
        },
      ]);
      window.setTimeout(() => {
        void loadHistory(false);
      }, 500);
    } catch {
      setFailedMessage(clean);
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(message: PromptInputMessage) {
    return sendMessage(message.text);
  }

  return (
    <section className="live-chat-screen">
      <header className="live-chat-header">
        <div className="dominic-avatar">
          <img src={dominic} alt="Dominic" />
        </div>
        <div>
          <h1>Dominic</h1>
          <p>
            <i /> with you
          </p>
        </div>
        <span className="chat-keepsake" aria-hidden="true">
          always, here
        </span>
      </header>

      <Conversation className="live-conversation">
        <ConversationContent className="live-messages">
          {loading ? (
            <div className="history-loading">
              <Shimmer>finding the page…</Shimmer>
            </div>
          ) : messages.length === 0 ? (
            <ConversationEmptyState className="chat-empty">
              <p>the page is quiet.</p>
              <span>write when you’re ready, {preferredName}.</span>
            </ConversationEmptyState>
          ) : (
            messages.map((message) => (
              <Message from={message.role} key={message.id} className="diario-message">
                <MessageContent className="diario-message-content">
                  <MessageResponse>{message.content}</MessageResponse>
                </MessageContent>
                <time>{formatTime(message.createdAt)}</time>
              </Message>
            ))
          )}
          {sending && (
            <Message from="assistant" className="diario-message typing-message">
              <MessageContent className="diario-message-content">
                <Shimmer>Dominic is writing…</Shimmer>
              </MessageContent>
            </Message>
          )}
        </ConversationContent>
        <ConversationScrollButton
          className="conversation-scroll"
          aria-label="Go to newest message"
        />
      </Conversation>

      <div className="live-composer-wrap">
        {failedMessage && (
          <div className="send-error" role="status">
            <span>couldn’t reach him. try again.</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => sendMessage(failedMessage)}
              disabled={sending}
            >
              <RotateCcw /> Retry
            </Button>
          </div>
        )}
        <PromptInput onSubmit={handleSubmit} className="live-composer">
          <PromptInputTextarea
            placeholder="write to him..."
            disabled={sending}
            aria-label="Message Dominic"
          />
          <PromptInputFooter>
            <PromptInputTools>
              <Button type="button" size="icon" variant="ghost" aria-label="Add a photo" disabled>
                <Image />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Record a voice note"
                disabled
              >
                <Mic />
              </Button>
            </PromptInputTools>
            <PromptInputSubmit
              status={sending ? "submitted" : "ready"}
              disabled={sending}
              className="live-send"
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </section>
  );
}
