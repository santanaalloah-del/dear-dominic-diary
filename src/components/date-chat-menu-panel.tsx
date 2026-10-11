import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DiarioItem } from "@/lib/diario-world";
import { readChatMenu, type ChatMenuStop } from "@/lib/date-chat-menu";
import { syncChatMenu } from "@/lib/date-chat-menu-sync";
import { readDateExperience } from "@/lib/date-experience";
import {
  fictionalMenuForStop, menuMentionMatches,
  readFictionalMenuChoices, readFictionalMenuOrders, updateFictionalMenuChoice,
  type FictionalMenuItem, type FictionalMenuAction,
} from "@/lib/date-fictional-menu";
import { notifyDateExperienceChanged } from "@/lib/date-live-events";
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
function CompleteFictionalMenu({
  userId, date, stop, onDateUpdated,
}: {
  userId: string;
  date: DiarioItem;
  stop: ChatMenuStop;
  onDateUpdated: (date: DiarioItem) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const template = fictionalMenuForStop(stop.name);
  const sections = [...new Set(template.items.map((item) => item.section))];
  const chosen = readFictionalMenuChoices(stop);
  const recorded = readFictionalMenuOrders(stop);

  async function apply(item: FictionalMenuItem, action: FictionalMenuAction) {
    if (busy) return;
    setBusy(item.id);
    setError(null);
    try {
      const updated = await updateFictionalMenuChoice({
        userId, dateId: date.id, stopId: stop.id, item, action,
      });
      onDateUpdated(updated);
      notifyDateExperienceChanged(updated.id);
    } catch (failure) {
      console.error("Could not save the in-world menu choice:", failure);
      setError(failure instanceof Error ? failure.message : "Could not save your choice.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="date-fictional-menu" aria-label="Full fictional menu">
      <div className="date-chat-menu-sheet">
        <div className="date-chat-menu-sheet-inner">
          <div className="date-chat-menu-sheet-heading">
            <small>AN IN-WORLD MENU · FICTIONAL</small>
            <h4>{template.title}</h4>
            <p>{stop.name}</p>
          </div>
          <div className="date-chat-menu-ornament" aria-hidden="true" />
          <p className="date-fictional-menu-disclaimer">
            A little imagined selection for this stop — not a verified real-world menu.
            No prices are claimed. Your picks are not orders.
          </p>
          {sections.map((section) => (
            <section className="date-chat-menu-section" key={section}>
              <h5>{section}</h5>
              <ul>
                {template.items.filter((item) => item.section === section).map((item) => {
                  const mentioned = stop.items.some((fromChat) =>
                    menuMentionMatches(fromChat.name, item.name));
                  const selected = chosen.includes(item.id);
                  const ordered = recorded.some((order) => order.itemId === item.id);
                  return (
                    <li key={item.id} className="date-fictional-menu-item">
                      <div className="date-fictional-menu-item-top">
                        <strong>{item.name}</strong>
                        {mentioned && <small>Dominic mentioned</small>}
                      </div>
                      <p>{item.description}</p>
                      <div className="date-fictional-menu-actions">
                        {ordered ? (
                          <>
                            <span className="date-fictional-menu-ordered">You ordered</span>
                            <button type="button" disabled={busy !== null}
                              onClick={() => void apply(item, "undo_order")}>Undo order</button>
                          </>
                        ) : (
                          <>
                            <button type="button" className={selected ? "selected" : ""}
                              disabled={busy !== null}
                              aria-pressed={selected}
                              onClick={() => void apply(item, "toggle_pick")}>
                              {selected ? "Selected" : "Choose"}
                            </button>
                            {selected && (
                              <button type="button" disabled={busy !== null}
                                className="date-fictional-menu-confirm"
                                onClick={() => void apply(item, "confirm_order")}>
                                Confirm I ordered
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          <div className="date-chat-menu-sheet-footer">
            <span>Chosen by you · for this stop only</span>
            <span>Fictional selection · no verified prices</span>
          </div>
        </div>
      </div>
      {error && <p role="alert" className="date-fictional-menu-error">{error}</p>}
    </section>
  );
}

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
              <small>ACTUALLY MENTIONED IN CHAT</small>
              <h4>Dominic’s suggestions</h4>
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
      <section className="date-chat-menu-orders" aria-label="Orders confirmed in chat or directly in Here">
        <h4>At our table</h4>
        <small>RECORDED FROM CHAT OR BY YOU</small>
        {stop.orders.length || readFictionalMenuOrders(stop).length ? (
          <div className="date-chat-menu-order-list">
            {readFictionalMenuOrders(stop).map((order) => (
              <blockquote key={order.itemId}>
                <p>You recorded: {order.itemName}</p>
                <time dateTime={order.at}>
                  {new Date(order.at).toLocaleTimeString("en-US", {
                    timeZone: "America/Sao_Paulo", hour: "numeric", minute: "2-digit",
                  })}
                </time>
              </blockquote>
            ))}
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
          <p>Nothing ordered yet. Choosing an item does not place an order.</p>
        )}
      </section>
    </div>
  );
}

export function DateChatMenuPanel({
  userId,
  date,
  onDateUpdated,
  showFictionalMenu = false,
}: {
  userId: string;
  date: DiarioItem;
  onDateUpdated: (date: DiarioItem) => void;
  showFictionalMenu?: boolean;
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
  const currentStop: ChatMenuStop | null = current ?? (arrivalId ? {
    id: arrivalId, name: experience.currentPlaceName || "This stop", items: [], orders: [],
  } : null);
  const older = menu.stops.filter((s) => s.id !== arrivalId && (s.items.length || s.orders.length || readFictionalMenuOrders(s).length));
  return (
    <section className="date-chat-menu" aria-label="Fictional menu and chat mentions">
      <header>
        <small>THINGS HERE</small>
        <h3>Something to choose</h3>
      </header>
      <p>
        Browse a fictional in-world menu, or see exactly what Dominic mentioned.
        Choices stay separate from confirmed orders.
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
      {live && showFictionalMenu && currentStop && (
        <CompleteFictionalMenu userId={userId} date={date}
          stop={currentStop} onDateUpdated={onDateUpdated} />
      )}
      {current && (current.items.length || current.orders.length || readFictionalMenuOrders(current).length) ? (
        <StopMenu stop={current} />
      ) : (
        <p>Dominic’s suggestions will appear here as the conversation continues.</p>
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
  const stops = readChatMenu(date).stops.filter((s) => s.items.length || s.orders.length || readFictionalMenuOrders(s).length);
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
