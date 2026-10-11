import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DiarioItem } from "@/lib/diario-world";
import { readChatMenu, type ChatMenuStop } from "@/lib/date-chat-menu";
import { syncChatMenu } from "@/lib/date-chat-menu-sync";
import { readDateExperience } from "@/lib/date-experience";
import "./date-chat-menu-panel.css";

function StopMenu({ stop }: { stop: ChatMenuStop }) {
  return (
    <div className="date-chat-menu-stop">
      <ul>
        {stop.items.map((item) => (
          <li key={item.id}>
            <strong>{item.name}</strong>
            <details>
              <summary>From our conversation</summary>
              <p>{item.evidence.text}</p>
            </details>
          </li>
        ))}
      </ul>
      <h4>Orders confirmed in chat</h4>
      {stop.orders.length ? (
        stop.orders.map((order) => (
          <blockquote key={order.messageId}>
            <p>{order.text}</p>
            <small>
              {new Date(order.at).toLocaleTimeString("en-US", {
                timeZone: "America/Sao_Paulo",
                hour: "numeric",
                minute: "2-digit",
              })}
            </small>
          </blockquote>
        ))
      ) : (
        <p>No confirmed orders yet. Suggestions and plans stay on the menu.</p>
      )}
    </div>
  );
}
export function DateChatMenuPanel({
  userId,
  date,
  onDateUpdated,
}: {
  userId: string;
  date: DiarioItem;
  onDateUpdated: (date: DiarioItem) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  const onUpdated = useRef(onDateUpdated);
  onUpdated.current = onDateUpdated;
  const experience = readDateExperience(date);
  const arrivalId =
    experience.currentLocationMode === "place"
      ? [...experience.events].reverse().find((e) => e.type === "arrived")?.id
      : undefined;
  const live = date.data?.flow_state === "live";
  useEffect(() => {
    let active = true;
    if (!live) return;
    setLoading(true);
    setError(null);
    void (async () => {
      // Saved dialogue only. No chat generation or venue-world API call.
      const { data, error: readError } = await supabase
        .from("messages")
        .select("id,role,content,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(160);
      if (readError) throw readError;
      if (!active) return;
      const updated = await syncChatMenu(userId, (data ?? []).reverse(), date.id);
      if (active && updated) onUpdated.current(updated);
    })()
      .catch(() => {
        if (active) setError("Could not sync the conversation. Your Date is safe; try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId, date.id, arrivalId, retry, live]);
  const menu = readChatMenu(date);
  const current = menu.stops.find((s) => s.id === arrivalId);
  const older = menu.stops.filter((s) => s.id !== arrivalId && (s.items.length || s.orders.length));
  return (
    <section className="date-chat-menu" aria-label="Menu mentioned in chat">
      <header>
        <small>MENTIONED IN CHAT</small>
        <h3>At our table</h3>
      </header>
      <p>
        Options described by Dominic in our conversation. This is a narrative menu, not a verified
        official menu. Prices are unknown.
      </p>
      {loading && <p role="status">Catching up with our conversation…</p>}
      {error && (
        <p role="alert">
          {error}{" "}
          <button type="button" onClick={() => setRetry((n) => n + 1)}>
            Try again
          </button>
        </p>
      )}
      {current?.items.length ? (
        <StopMenu stop={current} />
      ) : (
        <p>New options will appear here as Dominic mentions them.</p>
      )}
      {older.map((stop) => (
        <details key={stop.id}>
          <summary>Earlier stop · {stop.name}</summary>
          <StopMenu stop={stop} />
        </details>
      ))}
    </section>
  );
}

export function DateChatMenuHistory({ date }: { date: DiarioItem }) {
  const stops = readChatMenu(date).stops.filter((s) => s.items.length || s.orders.length);
  if (!stops.length) return null;
  return (
    <section className="date-chat-menu" aria-label="Menu and orders from this Date">
      <header>
        <small>FROM OUR CONVERSATION</small>
        <h3>At our tables</h3>
      </header>
      <p>Narrative menus and order confirmations from chat. Not verified official menus.</p>
      {stops.map((stop) => (
        <details key={stop.id}>
          <summary>{stop.name}</summary>
          <StopMenu stop={stop} />
        </details>
      ))}
    </section>
  );
}
