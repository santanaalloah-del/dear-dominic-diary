import { useEffect, useRef, useState } from "react";
import { Bookmark, Camera, ChevronDown, RefreshCw, Settings2, X } from "lucide-react";
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
}: {
  userId: string;
  dominicState: DominicState | null;
  conversationSummary: string;
  onOpenPhoto: (draft: PhotoDraft) => void;
}) {
  const [settings, setSettings] = useState<SpontaneousPhotoState | null>(null);
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshing = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      if (refreshing.current) return;
      refreshing.current = true;
      try {
        const next = dominicState
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
  }, [userId, dominicState?.startedAt, dominicState?.activity, dominicState?.location]);

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
      "enabled" | "frequency" | "includeCouple" | "useLocationContext">>
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
      setSavedOpen(true);
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

  async function anotherIdea() {
    if (busy || !dominicState) return;
    setBusy(true);
    try {
      const next = await evaluateSpontaneousPhotoOpportunity({
        userId, dominicState, conversationSummary, force: true,
      });
      await reload();
      setOpportunity(next);
      setError(null);
    } catch {
      setError("Couldn't think of another moment just yet.");
    } finally {
      setBusy(false);
    }
  }

  const savedIdeas = settings?.savedIdeas ?? [];
  return (
    <aside className="spontaneous-photo-opportunity" aria-label="Dominic photo ideas">
      <div className="spontaneous-photo-opportunity-icon" aria-hidden="true">
        <Camera size={18} strokeWidth={1.4} />
      </div>

      <div className="spontaneous-photo-opportunity-copy">
        <small>DOMINIC · LITTLE MOMENTS</small>
        <strong>{opportunity ? opportunity.note : "Some moments are worth keeping."}</strong>
        <span>
          {opportunity
            ? activityLabel(opportunity.sourceActivity) + " · " +
              (opportunity.subjectType === "both" ? "us" : "him") + " · " +
              activityLabel(opportunity.sourceLocation)
            : "Natural photo ideas, never automatic paid photos."}
        </span>
      </div>

      <div className="spontaneous-photo-opportunity-actions">
        <button type="button" className="spontaneous-photo-dismiss"
          onClick={() => setSettingsOpen(value => !value)}
          aria-label="Photo idea settings" aria-expanded={settingsOpen}>
          <Settings2 size={16} />
        </button>
        {opportunity && (
          <>
            <button type="button" className="spontaneous-photo-dismiss"
              onClick={() => void dismiss()} disabled={busy}
              aria-label="Not now" title="Not now"><X size={16} /></button>
            <button type="button" className="spontaneous-photo-open"
              onClick={() => void review(opportunity)} disabled={busy}>
              Review photo
            </button>
          </>
        )}
      </div>

      {opportunity && (
        <div className="spontaneous-photo-details">
          <p>{opportunity.scene}</p>
          <div className="spontaneous-photo-secondary">
            <button type="button" onClick={() => void save(opportunity)} disabled={busy}>
              <Bookmark size={13} /> Save for later
            </button>
            <button type="button" onClick={() => void anotherIdea()} disabled={busy}>
              <RefreshCw size={13} /> Another idea
            </button>
          </div>
        </div>
      )}

      <div className="spontaneous-photo-tools">
        <button type="button" onClick={() => setSavedOpen(value => !value)}
          aria-expanded={savedOpen}>
          <Bookmark size={13} /> Saved ideas ({savedIdeas.length})
          <ChevronDown size={12} />
        </button>
        {settings?.enabled && !opportunity && dominicState && (
          <button type="button" onClick={() => void anotherIdea()} disabled={busy}>
            <RefreshCw size={13} /> Suggest a moment (free)
          </button>
        )}
      </div>

      {savedOpen && (
        <div className="spontaneous-photo-saved">
          {savedIdeas.length ? [...savedIdeas].reverse().map(idea => (
            <div className="spontaneous-photo-saved-item" key={idea.id}>
              <span>{idea.note} <small>{activityLabel(idea.sourceActivity)}</small></span>
              <button type="button" disabled={busy} onClick={() => void review(idea)}>Review</button>
              <button type="button" disabled={busy} onClick={() => void remove(idea)}
                aria-label="Remove saved idea"><X size={13} /></button>
            </div>
          )) : <small>Nothing saved yet.</small>}
        </div>
      )}

      {settingsOpen && (
        <div className="spontaneous-photo-settings">
          <label>
            <input type="checkbox" checked={settings?.enabled ?? true} disabled={busy}
              onChange={event => void choosePreferences({ enabled: event.target.checked })} />
            Dominic may suggest photos
          </label>
          <label>
            Frequency
            <select value={settings?.frequency ?? "balanced"} disabled={busy}
              onChange={event => void choosePreferences({
                frequency: event.target.value as SpontaneousPhotoState["frequency"],
              })}>
              <option value="rare">Rarely · up to 1/day</option>
              <option value="balanced">Sometimes · up to 2/day</option>
              <option value="often">Often · up to 4/day</option>
            </select>
          </label>
          <label>
            <input type="checkbox" checked={settings?.includeCouple ?? true} disabled={busy}
              onChange={event => void choosePreferences({ includeCouple: event.target.checked })} />
            Include us when we are actually together
          </label>
          <label>
            <input type="checkbox" checked={settings?.useLocationContext ?? true} disabled={busy}
              onChange={event => void choosePreferences({ useLocationContext: event.target.checked })} />
            Use saved location and daily-life context
          </label>
        </div>
      )}

      <p>
        Ideas appear during daily life and when you return to Chat.
        Review opens Photo Engine's free reference check; only you can approve
        a paid generation. Generated photos are saved to Gallery.
      </p>
      {error && <p role="alert">{error}</p>}
    </aside>
  );
}
