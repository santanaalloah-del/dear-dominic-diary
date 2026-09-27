import { useEffect, useMemo, useState } from "react";
import {
  Camera,
  Check,
  ChevronDown,
  Heart,
  Image as ImageIcon,
  MessageCircle,
  RefreshCw,
  Sparkles,
  User,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePrivateDiario } from "@/components/private-diario";
import { getCurrentDominicState } from "@/lib/dominic-state";
import { useTimeMood } from "@/lib/time-mood";
import {
  createDailyLifeBatch,
  createPhotoGenerationRequest,
  type PhotoCloseness,
  type PhotoGenerationMode,
  type PhotoGenerationRequest,
  type PhotoStyle,
  type PhotoSubject,
} from "@/lib/photo-engine";
import "./photo-engine.css";

const PHOTO_DRAFT_KEY = "diario-photo-engine-draft-v1";

type PhotoEngineDraft = {
  mode?: PhotoGenerationMode;
  subjectType?: PhotoSubject;
  scene?: string;
  mood?: string;
  conversationSummary?: string;
  sourceContext?: "manual" | "chat" | "memory" | "calendar" | "timeline" | "spontaneous";
};

type ModeOption = {
  id: PhotoGenerationMode;
  label: string;
  note: string;
  icon: typeof Camera;
};

const subjectOptions: Array<{
  id: PhotoSubject;
  label: string;
  note: string;
  icon: typeof User;
}> = [
  { id: "me", label: "Me", note: "Alloah", icon: User },
  { id: "dominic", label: "Dominic", note: "him", icon: Camera },
  { id: "both", label: "Us", note: "together", icon: Users },
];

const modeOptions: ModeOption[] = [
  {
    id: "request",
    label: "Request",
    note: "you choose the moment",
    icon: Camera,
  },
  {
    id: "surprise",
    label: "Surprise",
    note: "let the engine decide",
    icon: Sparkles,
  },
  {
    id: "daily_life",
    label: "Daily Life",
    note: "ordinary, lived-in photos",
    icon: Heart,
  },
  {
    id: "memory",
    label: "Memory",
    note: "a photo that feels remembered",
    icon: ImageIcon,
  },
  {
    id: "chat_photo",
    label: "Chat Photo",
    note: "made to be sent in chat",
    icon: MessageCircle,
  },
  {
    id: "chat_context",
    label: "From conversation",
    note: "uses the current chat context",
    icon: MessageCircle,
  },
];

const styleOptions: Array<{ id: PhotoStyle; label: string }> = [
  { id: "natural_iphone", label: "Natural iPhone" },
  { id: "selfie", label: "Selfie" },
  { id: "mirror", label: "Mirror" },
  { id: "candid", label: "Candid" },
  { id: "flash", label: "Flash" },
  { id: "disposable", label: "Disposable" },
  { id: "memory_like", label: "Memory-like" },
];

const closenessOptions: Array<{ id: PhotoCloseness; label: string }> = [
  { id: "casual", label: "Casual" },
  { id: "sweet", label: "Sweet" },
  { id: "romantic", label: "Romantic" },
  { id: "flirty", label: "Flirty" },
  { id: "intimate", label: "Intimate-soft" },
];

function readDraft(): PhotoEngineDraft | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(PHOTO_DRAFT_KEY);
    return raw ? (JSON.parse(raw) as PhotoEngineDraft) : null;
  } catch {
    return null;
  }
}

function modeSource(mode: PhotoGenerationMode) {
  if (mode === "chat_context" || mode === "chat_photo") return "chat" as const;
  if (mode === "memory") return "memory" as const;
  if (mode === "spontaneous") return "spontaneous" as const;
  return "manual" as const;
}

export function PhotoEngineScreen() {
  const { session } = usePrivateDiario();
  const time = useTimeMood();

  const [mode, setMode] = useState<PhotoGenerationMode>("request");
  const [subjectType, setSubjectType] = useState<PhotoSubject>("both");
  const [scene, setScene] = useState("");
  const [mood, setMood] = useState("everyday");
  const [photoStyle, setPhotoStyle] = useState<PhotoStyle>("natural_iphone");
  const [closeness, setCloseness] = useState<PhotoCloseness>("casual");
  const [useCurrentLook, setUseCurrentLook] = useState(true);
  const [dailyCount, setDailyCount] = useState<3 | 5 | 8>(5);
  const [conversationSummary, setConversationSummary] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdRequests, setCreatedRequests] = useState<PhotoGenerationRequest[]>([]);

  useEffect(() => {
    const draft = readDraft();
    if (!draft) return;

    if (draft.mode) setMode(draft.mode);
    if (draft.subjectType) setSubjectType(draft.subjectType);
    if (draft.scene) setScene(draft.scene);
    if (draft.mood) setMood(draft.mood);
    if (draft.conversationSummary) {
      setConversationSummary(draft.conversationSummary);
    }

    window.localStorage.removeItem(PHOTO_DRAFT_KEY);
  }, []);

  const selectedMode = useMemo(
    () => modeOptions.find((option) => option.id === mode),
    [mode]
  );

  const isDailyLife = mode === "daily_life";
  const isConversation = mode === "chat_context";

  async function preparePhoto() {
    if (!session?.user?.id || creating) return;

    setCreating(true);
    setError(null);

    try {
      const dominicState = await getCurrentDominicState(session.user.id).catch(
        () => null
      );

      if (isDailyLife) {
        const batch = await createDailyLifeBatch({
          userId: session.user.id,
          subjectType,
          count: dailyCount,
          mood: mood.trim() || "everyday",
        });

        setCreatedRequests(batch.requests);
        return;
      }

      const request = await createPhotoGenerationRequest({
        userId: session.user.id,
        mode,
        subjectType,
        sourceContext: modeSource(mode),
        scene: scene.trim() || null,
        mood: mood.trim() || null,
        shotType: photoStyle === "natural_iphone" ? null : photoStyle,
        photoStyle,
        closenessLevel: subjectType === "both" ? closeness : null,
        spontaneityLevel:
          mode === "surprise" || mode === "spontaneous" ? "high" : "medium",
        useCurrentLook,
        avoidRecentPoses: true,
        avoidRecentLocations: true,
        avoidRecentCompositions: true,
        contextSnapshot: {
          source: modeSource(mode),
          mood: mood.trim() || null,
          activity: dominicState?.activity ?? null,
          location: dominicState?.location ?? null,
          timeOfDay: time.mood,
          localTime: new Date().toISOString(),
          dominicState: dominicState
            ? (dominicState as unknown as Record<string, unknown>)
            : null,
          conversationSummary: conversationSummary.trim() || null,
          custom: {
            requestedFrom: "photo-engine-screen",
            defaultCameraLanguage: "natural imperfect phone photo",
          },
        },
      });

      setCreatedRequests([request]);
    } catch (nextError) {
      console.error("Could not prepare Photo Engine request:", nextError);
      setError(
        nextError instanceof Error
          ? nextError.message
          : "The photo request could not be prepared."
      );
    } finally {
      setCreating(false);
    }
  }

  function resetComposer() {
    setCreatedRequests([]);
    setError(null);
  }

  return (
    <section className="photo-engine-screen">
      <header className="photo-engine-intro">
        <small>DOMINIC PHOTO ENGINE</small>
        <h1>Create a photo</h1>
        <p>
          Real-life first: imperfect phone framing, natural expressions, current
          look, visual canon and anti-repeat built into every request.
        </p>
      </header>

      {createdRequests.length > 0 ? (
        <section className="photo-engine-ready-card">
          <div className="photo-engine-ready-icon">
            <Check />
          </div>

          <small>{createdRequests.length > 1 ? "BATCH READY" : "REQUEST READY"}</small>
          <h2>
            {createdRequests.length > 1
              ? `${createdRequests.length} Daily Life photos are prepared.`
              : "The generation request is prepared."}
          </h2>
          <p>
            Canon references, Current Look and recent-photo anti-repeat were
            attached to the request. The provider layer can now generate the
            image without duplicating Gallery data.
          </p>

          <div className="photo-engine-request-list">
            {createdRequests.map((request, index) => (
              <article key={request.id}>
                <span>{createdRequests.length > 1 ? `#${index + 1}` : selectedMode?.label}</span>
                <strong>{request.subject_type}</strong>
                <small>{request.reference_ids.length} visual refs · {request.photo_style.replaceAll("_", " ")}</small>
              </article>
            ))}
          </div>

          <div className="photo-engine-foundation-note">
            <Sparkles />
            <div>
              <strong>Preview controls are reserved here.</strong>
              <span>
                When the provider returns the image this same stage becomes
                Preview · Regenerate · Adjust · Keep.
              </span>
            </div>
          </div>

          <Button type="button" variant="outline" onClick={resetComposer}>
            <RefreshCw /> Prepare another
          </Button>
        </section>
      ) : (
        <>
          <section className="photo-engine-block">
            <div className="photo-engine-block-heading">
              <small>1 · WHO</small>
              <strong>Who is in it?</strong>
            </div>

            <div className="photo-engine-subject-grid">
              {subjectOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={subjectType === option.id ? "active" : ""}
                    onClick={() => setSubjectType(option.id)}
                  >
                    <Icon />
                    <strong>{option.label}</strong>
                    <small>{option.note}</small>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="photo-engine-block">
            <div className="photo-engine-block-heading">
              <small>2 · WHY</small>
              <strong>What kind of photo?</strong>
            </div>

            <div className="photo-engine-mode-grid">
              {modeOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={mode === option.id ? "active" : ""}
                    onClick={() => setMode(option.id)}
                  >
                    <span><Icon /></span>
                    <div>
                      <strong>{option.label}</strong>
                      <small>{option.note}</small>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="photo-engine-block photo-engine-scene-block">
            <div className="photo-engine-block-heading">
              <small>3 · MOMENT</small>
              <strong>Give it a little context.</strong>
            </div>

            {isConversation && conversationSummary && (
              <div className="photo-engine-context-chip">
                <MessageCircle />
                <span>Recent conversation attached</span>
              </div>
            )}

            <label>
              <span>Scene</span>
              <textarea
                value={scene}
                onChange={(event) => setScene(event.target.value)}
                placeholder={
                  mode === "surprise"
                    ? "Optional — leave blank and let it surprise you"
                    : "e.g. sleepy Sunday morning in the kitchen, messy hair, coffee on the counter"
                }
                rows={4}
              />
            </label>

            <label>
              <span>Mood</span>
              <input
                value={mood}
                onChange={(event) => setMood(event.target.value)}
                placeholder="everyday, sleepy, playful, tender..."
              />
            </label>

            {isDailyLife && (
              <div className="photo-engine-count-row">
                <span>How many?</span>
                <div>
                  {[3, 5, 8].map((count) => (
                    <button
                      key={count}
                      type="button"
                      className={dailyCount === count ? "active" : ""}
                      onClick={() => setDailyCount(count as 3 | 5 | 8)}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="photo-engine-block">
            <button
              type="button"
              className="photo-engine-advanced-toggle"
              onClick={() => setAdvancedOpen((current) => !current)}
            >
              <span>
                <small>4 · CAMERA</small>
                <strong>Natural by default</strong>
              </span>
              <ChevronDown className={advancedOpen ? "open" : ""} />
            </button>

            {advancedOpen && (
              <div className="photo-engine-advanced">
                <label>
                  <span>Photo language</span>
                  <select
                    value={photoStyle}
                    onChange={(event) => setPhotoStyle(event.target.value as PhotoStyle)}
                  >
                    {styleOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                {subjectType === "both" && (
                  <label>
                    <span>Closeness</span>
                    <select
                      value={closeness}
                      onChange={(event) => setCloseness(event.target.value as PhotoCloseness)}
                    >
                      {closenessOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <label className="photo-engine-switch-row">
                  <span>
                    <strong>Use Current Look</strong>
                    <small>hair, nails, clothes and temporary details</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={useCurrentLook}
                    onChange={(event) => setUseCurrentLook(event.target.checked)}
                  />
                </label>

                <div className="photo-engine-rule-list">
                  <span>✓ avoid recent poses</span>
                  <span>✓ avoid recent framing</span>
                  <span>✓ avoid recent locations</span>
                  <span>✓ imperfect phone-photo bias</span>
                </div>
              </div>
            )}
          </section>

          {error && <p className="photo-engine-error">{error}</p>}

          <Button
            type="button"
            className="photo-engine-create-button"
            onClick={() => void preparePhoto()}
            disabled={creating}
          >
            {creating ? <RefreshCw className="photo-engine-spin" /> : <Sparkles />}
            {creating
              ? "Preparing..."
              : isDailyLife
                ? `Prepare ${dailyCount} photos`
                : "Prepare photo"}
          </Button>

          <p className="photo-engine-footer-note">
            Nothing is saved to Gallery until a generated image is kept.
          </p>
        </>
      )}
    </section>
  );
}
