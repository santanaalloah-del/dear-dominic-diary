import { useEffect, useState } from "react";
import { Camera, X } from "lucide-react";

import type { DominicState } from "@/lib/dominic-state";
import {
  createPhotoGenerationRequest,
  saveGeneratedPhoto,
  updatePhotoRequest,
} from "@/lib/photo-engine";
import {
  dataUrlToBlob,
  generatePhotoProviderPreview,
} from "@/lib/photo-provider";
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
    if (busy || !opportunity || !dominicState) return;

    setBusy(true);

    try {
      const request = await createPhotoGenerationRequest({
        userId,
        mode: "chat_photo",
        subjectType: "dominic",
        sourceContext: "chat",
        scene: opportunity.scene,
        mood: opportunity.mood,
        photoStyle: "natural_iphone",
        spontaneityLevel: "high",
        useCurrentLook: true,
        avoidRecentPoses: true,
        avoidRecentLocations: true,
        avoidRecentCompositions: true,
        contextSnapshot: {
          source: "chat",
          mood: opportunity.mood,
          activity: dominicState.activity,
          location: dominicState.location,
          localTime: new Date().toISOString(),
          dominicState: dominicState as unknown as Record<string, unknown>,
          conversationSummary:
            opportunity.conversationSummary || conversationSummary || null,
          custom: {
            requestedFrom: "dominic-right-now",
            directToChat: true,
          },
        },
      });

      // The server claims queued requests atomically before spending credits.
      const generated = await generatePhotoProviderPreview({
        userId,
        request,
      });

      await updatePhotoRequest({
        userId,
        requestId: request.id,
        values: {
          status: "preparing",
          provider: generated.provider,
          provider_model: generated.model,
          final_prompt: generated.prompt,
          error_message: null,
        },
      });

      await saveGeneratedPhoto({
        userId,
        request,
        blob: dataUrlToBlob(generated.dataUrl),
        mimeType: generated.mimeType,
        title: "Chat photo",
        owner: "dominic",
        feature: generated.feature,
        extraData: {
          provider: generated.provider,
          provider_model: generated.model,
          chat_sender: "dominic",
          right_now: true,
        },
      });

      await acceptSpontaneousPhotoOpportunity({
        userId,
        opportunity,
      });

      setOpportunity(null);
      window.dispatchEvent(new Event("diario-generated-chat-photo"));
    } catch (error) {
      console.error("Could not generate right-now photo:", error);
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
          {busy ? "Taking photo…" : "Let me see"}
        </button>
      </div>

      <p>
        Generate one photo from Dominic's real current moment and send it here.
      </p>
    </aside>
  );
}
