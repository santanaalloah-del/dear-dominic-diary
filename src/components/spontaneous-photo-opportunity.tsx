import { useEffect, useRef, useState } from "react";
import { Bookmark, Camera, X } from "lucide-react";
import type { DominicState } from "@/lib/dominic-state";
import {
  dismissSpontaneousPhotoOpportunity,
  evaluateSpontaneousPhotoOpportunity,
  getSpontaneousPhotoState,
  markSpontaneousPhotoIdeaReviewed,
  removeSavedSpontaneousPhotoIdea,
  saveSpontaneousPhotoIdea,
  setSpontaneousPhotoPreferences,
  type SpontaneousPhotoOpportunity as Opportunity,
  type SpontaneousPhotoState,
} from "@/lib/spontaneous-photo";
import "./spontaneous-photo-opportunity.css";

type PhotoDraft = {
  mode: "request";
  subjectType: "dominic" | "both";
  scene: string;
  mood: string;
  photoStyle: "natural_iphone" | "candid" | "mirror" | "selfie";
  sourceContext: "chat";
  spontaneousIdeaId: string;
  conversationSummary?: string;
};

function activityLabel(activity: string) {
  return activity.replaceAll("_", " ");
}

/**
 * Dominic can make a suggestion without costing image credits.
 * The existing Photo Engine is the single paid entry point: it requires a
 * free reference preflight and the user's Create photo action.
 */
export function SpontaneousPhotoOpportunity({
  userId,
  dominicState,
  conversationSummary,
  onOpenPhoto,
  displayMode = "message",
}: {
  userId: string;
  dominicState: DominicState | null;
  conversationSummary: string;
  onOpenPhoto: (draft: PhotoDraft) => void;
  displayMode?: "message" | "preferences";
}) {
  const [settings, setSettings] = useState<SpontaneousPhotoState | null>(null);
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshing = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      if (refreshing.current) return;
      refreshing.current = true;
      try {
        // Preferences are loaded passively. Only the chat message surface
        // can evaluate an actual spontaneous moment.
        const next = displayMode === "message" && dominicState
          ? await evaluateSpontaneousPhotoOpportunity({
              userId, dominicState, conversationSummary,
            })
          : null;
        const state = await getSpontaneousPhotoState(userId);
        if (!cancelled) {
          setSettings(state);
          setOpportunity(
            state.enabled && state.pending?.status === "pending" &&
            Date.parse(state.pending.expiresAt) > Date.now()
              ? state.pending : next
          );
          setError(null);
        }
      } catch (cause) {
        console.warn("Spontaneous photo availability:", cause);
        if (!cancelled) setError("Photo ideas are temporarily unavailable.");
      } finally {
        refreshing.current = false;
      }
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30 * 60 * 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [userId, displayMode, dominicState?.startedAt, dominicState?.activity, dominicState?.location]);

  async function reload() {
    const next = await getSpontaneousPhotoState(userId);
    setSettings(next);
    setOpportunity(
      next.enabled && next.pending?.status === "pending" &&
      Date.parse(next.pending.expiresAt) > Date.now()
        ? next.pending : null
    );
  }

  async function choosePreferences(
    values: Partial<Pick<SpontaneousPhotoState,
      "enabled" | "frequency" | "includeCouple" | "useLocationContext" | "backgroundSuggestions" | "notifyOffApp">>
  ) {
    if (busy) return;
    setBusy(true);
    try {
      const next = await setSpontaneousPhotoPreferences(userId, values);
      setSettings(next);
      if (!next.enabled) setOpportunity(null);
      setError(null);
    } catch {
      setError("Could not save photo preferences. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function review(idea: Opportunity) {
    if (busy) return;
    setBusy(true);
    try {
      await markSpontaneousPhotoIdeaReviewed(userId, idea);
      setOpportunity(null);
      await reload();
      onOpenPhoto({
        mode: "request",
        subjectType: idea.subjectType,
        scene: idea.scene,
        mood: idea.mood,
        photoStyle: idea.photoStyle,
        sourceContext: "chat",
        spontaneousIdeaId: idea.id,
        conversationSummary: idea.conversationSummary ?? conversationSummary,
      });
    } catch {
      setError("Could not open the photo idea. Nothing was generated or charged.");
    } finally {
      setBusy(false);
    }
  }

  async function save(idea: Opportunity) {
    if (busy) return;
    setBusy(true);
    try {
      await saveSpontaneousPhotoIdea(userId, idea);
      await reload();
    } catch {
      setError("Could not save the idea. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function dismiss() {
    if (busy || !opportunity) return;
    setBusy(true);
    try {
      await dismissSpontaneousPhotoOpportunity({ userId, opportunity });
      await reload();
    } catch {
      setError("Could not dismiss this idea. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(idea: Opportunity) {
    if (busy) return;
    setBusy(true);
    try {
      await removeSavedSpontaneousPhotoIdea(userId, idea.id);
      await reload();
    } catch {
      setError("Could not remove the saved idea.");
    } finally {
      setBusy(false);
    }
  }

  const savedIdeas = settings?.savedIdeas ?? [];

  if (displayMode === "preferences") {
    return (
      <div className="spontaneous-photo-preferences-panel">
        <div className="spontaneous-photo-settings">
          <label>
            <input type="checkbox" checked={settings?.enabled ?? true} disabled={busy || !settings}
              onChange={event => void choosePreferences({ enabled: event.target.checked })} />
            Dominic may suggest photos in chat
          </label>
          <label>
            Frequency
            <select value={settings?.frequency ?? "balanced"} disabled={busy || !settings}
              onChange={event => void choosePreferences({
                frequency: event.target.value as SpontaneousPhotoState["frequency"],
              })}>
              <option value="rare">Rarely · up to 1/day</option>
              <option value="balanced">Sometimes · up to 2/day</option>
              <option value="often">Often · up to 4/day</option>
            </select>
          </label>
          <label>
            <input type="checkbox" checked={settings?.includeCouple ?? true} disabled={busy || !settings}
              onChange={event => void choosePreferences({ includeCouple: event.target.checked })} />
            Include us only when we are actually together
          </label>
          <label>
            <input type="checkbox" checked={settings?.useLocationContext ?? true} disabled={busy || !settings}
              onChange={event => void choosePreferences({ useLocationContext: event.target.checked })} />
            Use saved locations and daily-life context
          </label>
          <label>
            <input type="checkbox" checked={settings?.backgroundSuggestions ?? false} disabled={busy || !settings}
              onChange={event => void choosePreferences({ backgroundSuggestions: event.target.checked })} />
            Look for moments while the app is closed
          </label>
          <label>
            <input type="checkbox" checked={settings?.notifyOffApp ?? false}
              disabled={busy || !settings || !settings.backgroundSuggestions}
              onChange={event => void choosePreferences({ notifyOffApp: event.target.checked })} />
            Notify me about a background idea (opt-in)
          </label>
        </div>
        <div className="spontaneous-photo-saved">
          <strong>Saved photo ideas ({savedIdeas.length})</strong>
          {savedIdeas.length ? [...savedIdeas].reverse().map(idea => (
            <div className="spontaneous-photo-saved-item" key={idea.id}>
              <span>{idea.note} <small>{activityLabel(idea.sourceActivity)}</small></span>
              <button type="button" disabled={busy} onClick={() => void review(idea)}>Review</button>
              <button type="button" disabled={busy} onClick={() => void remove(idea)}
                aria-label="Remove saved idea"><X size={13} /></button>
            </div>
          )) : <small>Nothing saved yet.</small>}
        </div>
        <small className="spontaneous-photo-settings-note">
          Photo ideas are free. A real photo is generated only when you separately approve Create photo in Photo Engine.
        </small>
        {error && <p role="alert">{error}</p>}
      </div>
    );
  }

  // Never show a permanent dashboard in Chat. Only a real pending initiative
  // becomes a temporary message within the scrolling conversation.
  if (!opportunity) return null;

  const realActivity = activityLabel(opportunity.sourceActivity);
  const messageText = opportunity.subjectType === "both"
    ? "just thought about taking a picture of us like this. kinda want to keep this moment."
    : opportunity.sourceActivity === "relaxing" || opportunity.sourceActivity === "idle"
      ? "just chilling here. kinda felt like sending you a picture."
      : opportunity.sourceActivity === "making_coffee" || opportunity.sourceActivity === "cooking"
        ? "in the middle of " + realActivity + ". thought you might like a picture."
        : "was " + realActivity + " and thought about sending you a little picture.";

  return (
    <div className="spontaneous-photo-chat-message" aria-label="Dominic photo idea">
      <div className="spontaneous-photo-chat-bubble">
        <p>{messageText}</p>
        <span className="spontaneous-photo-chat-subtitle">
          <Camera size={13} aria-hidden="true" /> Photo idea · nothing generated yet
        </span>
        <div className="spontaneous-photo-chat-actions">
          <button type="button" onClick={() => void review(opportunity)} disabled={busy}>
            See the idea
          </button>
          <button type="button" onClick={() => void save(opportunity)} disabled={busy}>
            <Bookmark size={13} aria-hidden="true" /> Save
          </button>
          <button type="button" onClick={() => void dismiss()} disabled={busy}>
            Not now
          </button>
        </div>
        {error && <p role="alert">{error}</p>}
      </div>
    </div>
  );
}

/** Chat appearance settings owns controls without taking space in the composer. */
export function SpontaneousPhotoPreferencesPanel({
  userId,
  onOpenPhoto,
}: {
  userId: string;
  onOpenPhoto: (draft: PhotoDraft) => void;
}) {
  return (
    <SpontaneousPhotoOpportunity
      userId={userId}
      dominicState={null}
      conversationSummary=""
      onOpenPhoto={onOpenPhoto}
      displayMode="preferences"
    />
  );
}
