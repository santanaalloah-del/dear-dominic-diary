import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DiarioItem } from "@/lib/diario-world";
import { readChatMenu, type ChatMenuStop } from "@/lib/date-chat-menu";
import { syncChatMenu } from "@/lib/date-chat-menu-sync";
import { readDateExperience } from "@/lib/date-experience";
import "./date-chat-menu-panel.css";

type MenuSection = "From the kitchen" | "Coffee & drinks" | "From the oven" | "Other mentions";

const menuSectionOrder: MenuSection[] = [
  "From the oven",
  "Coffee & drinks",
  "From the kitchen",
  "Other mentions",
];

function sectionForMention(name: string): MenuSection {
  if (/\b(?:eggs?|scrambled|sandwich|toastie|gruy[eè]re)\b/i.test(name)) {
    return "From the kitchen";
  }
  if (/\b(?:americano|espresso|latte|cappuccino|coffees?|brew|juice|tea)\b/i.test(name)) {
    return "Coffee & drinks";
  }
  if (/\b(?:croissant|muffin|pastry|bread)\b/i.test(name)) {
    return "From the oven";
  }
  return "Other mentions";
}

/** The physical-looking menu is a VIEW of saved chat evidence, never a new inventory. */
function StopMenu({ stop }: { stop: ChatMenuStop }) {
  const grouped = new Map<MenuSection, ChatMenuStop["items"]>();
  for (const item of stop.items) {
    const section = sectionForMention(item.name);
    grouped.set(section, [...(grouped.get(section) ?? []), item]);
  }

  return (
    <div className="date-chat-menu-stop">
      {stop.items.length > 0 && (
        <div className="date-chat-menu-sheet" aria-label="Fictional café menu from our conversation">
          <div className="date-chat-menu-sheet-inner">
            <div className="date-chat-menu-sheet-heading">
              <small>AN IN-WORLD MENU</small>
              <h4>Our little café</h4>
              <p>{stop.name}</p>
            </div>
            <div className="date-chat-menu-ornament" aria-hidden="true" />
            {menuSectionOrder.map((section) => {
              const items = grouped.get(section);
              if (!items?.length) return null;
              return (
                <section className="date-chat-menu-section" key={section} aria-label={section}>
                  <h5>{section}</h5>
                  <ul>
                    {items.map((item) => (
                      <li key={item.id}>
                        <strong>{item.name}</strong>
                        <details className="date-chat-menu-evidence">
                          <summary>From Dominic's words</summary>
                          <p>{item.evidence.text}</p>
                        </details>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
            <div className="date-chat-menu-sheet-footer">
              <span>Only things mentioned in our chat</span>
              <span>No prices provided</span>
            </div>
          </div>
        </div>
      )}
      <section className="date-chat-menu-orders" aria-label="Orders confirmed in chat">
        <h4>At our table</h4>
        <small>ORDERS CONFIRMED IN CHAT</small>
        {stop.orders.length ? (
          <div className="date-chat-menu-order-list">
            {stop.orders.map((order) => (
              <blockquote key={order.messageId}>
                <p>{order.text}</p>
                <time dateTime={order.at}>
                  {new Date(order.at).toLocaleTimeString("en-US", {
                    timeZone: "America/Sao_Paulo",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </time>
              </blockquote>
            ))}
          </div>
        ) : (
          <p>Nothing ordered yet. Talking about something doesn't place an order.</p>
        )}
      </section>
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
        <small>FROM OUR CONVERSATION</small>
        <h3>The café menu</h3>
      </header>
      <p>
        A little fictional menu made from what Dominic has actually mentioned. Not a verified
        venue menu; no items or orders are added to the story.
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
        <p>Our menu will take shape as Dominic mentions things to eat or drink.</p>
      )}
      {older.map((stop) => (
        <details key={stop.id}>
          <summary>Previous café menu · {stop.name}</summary>
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
        <small>KEPT FROM OUR DATE</small>
        <h3>The menus we found</h3>
      </header>
      <p>Fictional menus assembled from our conversation, with original order confirmations. Not official venue menus.</p>
      {stops.map((stop) => (
        <details key={stop.id}>
          <summary>{stop.name}</summary>
          <StopMenu stop={stop} />
        </details>
      ))}
    </section>
  );
}
