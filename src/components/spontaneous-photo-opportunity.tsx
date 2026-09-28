import { useEffect, useState } from "react";
import { Camera, X } from "lucide-react";

import type { DominicState } from "@/lib/dominic-state";
import {
  acceptSpontaneousPhotoOpportunity,
  dismissSpontaneousPhotoOpportunity,
  evaluateSpontaneousPhotoOpportunity,
  type SpontaneousPhotoOpportunity as Opportunity,
} from "@/lib/spontaneous-photo";

import "./spontaneous-photo-opportunity.css";

type PhotoDraft = {
  mode: "spontaneous";
  subjectType: "dominic";
  scene: string;
  mood: string;
  conversationSummary?: string;
};

function activityLabel(activity: string) {
  return activity.replaceAll("_", " ");
}

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
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!dominicState?.startedAt) {
      setOpportunity(null);
      return;
    }

    void evaluateSpontaneousPhotoOpportunity({
      userId,
      dominicState,
      conversationSummary,
    })
      .then((next) => {
        if (!cancelled) setOpportunity(next);
      })
      .catch((error) => {
        console.error(
          "Could not evaluate spontaneous photo opportunity:",
          error
        );
      });

    return () => {
      cancelled = true;
    };
    // A new Dominic state is the meaningful trigger. We intentionally do not
    // re-evaluate on every new chat message.
  }, [userId, dominicState?.startedAt]);

  if (!opportunity) return null;

  async function dismiss() {
    if (busy || !opportunity) return;

    setBusy(true);

    try {
      await dismissSpontaneousPhotoOpportunity({
        userId,
        opportunity,
      });
      setOpportunity(null);
    } catch (error) {
      console.error("Could not dismiss spontaneous photo:", error);
    } finally {
      setBusy(false);
    }
  }

  async function open() {
    if (busy || !opportunity) return;

    setBusy(true);

    try {
      await acceptSpontaneousPhotoOpportunity({
        userId,
        opportunity,
      });

      setOpportunity(null);

      onOpenPhoto({
        mode: "spontaneous",
        subjectType: "dominic",
        scene: opportunity.scene,
        mood: opportunity.mood,
        ...(opportunity.conversationSummary
          ? { conversationSummary: opportunity.conversationSummary }
          : {}),
      });
    } catch (error) {
      console.error("Could not open spontaneous photo:", error);
      setBusy(false);
    }
  }

  return (
    <aside className="spontaneous-photo-opportunity">
      <div className="spontaneous-photo-opportunity-icon" aria-hidden="true">
        <Camera size={18} strokeWidth={1.4} />
      </div>

      <div className="spontaneous-photo-opportunity-copy">
        <small>DOMINIC · RIGHT NOW</small>
        <strong>He almost sent you a photo.</strong>
        <span>
          {activityLabel(opportunity.sourceActivity)}
          {" · "}
          {activityLabel(opportunity.sourceLocation)}
        </span>
      </div>

      <div className="spontaneous-photo-opportunity-actions">
        <button
          type="button"
          className="spontaneous-photo-dismiss"
          onClick={() => void dismiss()}
          disabled={busy}
          aria-label="Not now"
          title="Not now"
        >
          <X size={14} />
        </button>

        <button
          type="button"
          className="spontaneous-photo-open"
          onClick={() => void open()}
          disabled={busy}
        >
          {busy ? "Opening…" : "Let me see"}
        </button>
      </div>

      <p>
        No image is generated until you choose to continue in Photo Engine.
      </p>
    </aside>
  );
}
