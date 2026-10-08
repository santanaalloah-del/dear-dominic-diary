import { useEffect, useMemo, useRef, useState } from "react";
import { PhotoIdentityFeedback } from "@/components/photo-identity-feedback";
import {
  Camera,
  Check,
  ChevronDown,
  Heart,
  Image as ImageIcon,
  MessageCircle,
  RefreshCw,
  Save,
  SlidersHorizontal,
  Sparkles,
  User,
  Users,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePrivateDiario } from "@/components/private-diario";
import { loadDominicState } from "@/lib/dominic-state";
import { supabase } from "@/integrations/supabase/client";
import { useTimeMood } from "@/lib/time-mood";
import {
  createPhotoGenerationRequest,
  linkPhotoToItem,
  saveGeneratedPhoto,
  updatePhotoRequest,
  type PhotoCloseness,
  type PhotoGenerationMode,
  type PhotoGenerationRequest,
  type PhotoSourceContext,
  type PhotoStyle,
  type PhotoSubject,
} from "@/lib/photo-engine";
import {
  dataUrlToBlob,
  enqueuePhotoProviderJob,
  type PhotoProviderPreview,
} from "@/lib/photo-provider";
import "./photo-engine.css";

const PHOTO_DRAFT_KEY = "diario-photo-engine-draft-v1";

type PhotoEngineDraft = {
  mode?: PhotoGenerationMode;
  subjectType?: PhotoSubject;
  scene?: string;
  mood?: string;
  conversationSummary?: string;
  sourceContext?: PhotoSourceContext;
  memoryId?: string;
};

type ModeOption = {
  id: PhotoGenerationMode;
  label: string;
  note: string;
  icon: typeof Camera;
};

type PreviewState = {
  key: string;
  request: PhotoGenerationRequest;
  status: "waiting" | "generating" | "ready" | "saving" | "saved" | "error";
  preview: PhotoProviderPreview | null;
  error: string | null;
  adjustOpen: boolean;
  adjustText: string;
  savedPhotoId: string | null;
};

/** Milestone estimate, not provider-reported completion. Never pretend to know image render progress. */
function photoProgress(request: PhotoGenerationRequest, status: PreviewState["status"]) {
  if (status === "saved" || request.status === "completed") return 100;
  if (status === "error" || request.status === "failed") return 0;
  if (request.status === "generating") return 65;
  if (request.status === "preparing") return 35;
  return 10;
}

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

function modeSource(mode: PhotoGenerationMode): PhotoSourceContext {
  if (mode === "chat_context" || mode === "chat_photo") return "chat";
  if (mode === "memory") return "memory";
  if (mode === "spontaneous") return "spontaneous";
  return "manual";
}

function previewKey(request: PhotoGenerationRequest) {
  return `${request.id}-${crypto.randomUUID()}`;
}

function messageFromError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === "object") {
    const candidate = error as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
    };

    const parts = [
      typeof candidate.message === "string" ? candidate.message : null,
      typeof candidate.details === "string" ? candidate.details : null,
      typeof candidate.hint === "string" ? candidate.hint : null,
      typeof candidate.code === "string" ? `Code: ${candidate.code}` : null,
    ].filter((part): part is string => Boolean(part?.trim()));

    if (parts.length > 0) {
      return parts.join(" · ");
    }
  }

  return fallback;
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
  const [dailyCount, setDailyCount] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [conversationSummary, setConversationSummary] = useState("");
  const [sourceContextOverride, setSourceContextOverride] =
    useState<PhotoSourceContext | null>(null);
  const [memoryId, setMemoryId] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<string | null>(null);
  const [previews, setPreviews] = useState<PreviewState[]>([]);
  const [showRecentPreviews, setShowRecentPreviews] = useState(false);
  const activeRequestIds = useRef(new Set<string>());
  const componentActive = useRef(true);

  useEffect(() => {
    componentActive.current = true;
    return () => { componentActive.current = false; };
  }, []);

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
    if (draft.sourceContext) {
      setSourceContextOverride(draft.sourceContext);
    }
    if (draft.memoryId) {
      setMemoryId(draft.memoryId);
    }

    window.localStorage.removeItem(PHOTO_DRAFT_KEY);
  }, []);

  const selectedMode = useMemo(
    () => modeOptions.find((option) => option.id === mode),
    [mode]
  );

  const isDailyLife = mode === "daily_life";
  const isConversation = mode === "chat_context";
  const hasPreviews = previews.length > 0 && showRecentPreviews;
  const savedCount = previews.filter((item) => item.status === "saved").length;
  const readyCount = previews.filter((item) => item.status === "ready").length;

  const patchPreview = (key: string, values: Partial<PreviewState>) => {
    setPreviews((current) =>
      current.map((item) => (item.key === key ? { ...item, ...values } : item))
    );
  };

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    let cancelled = false;
    async function refresh() {
      const { data } = await (supabase as any)
        .from("photo_generation_requests")
        .select("*")
        .eq("user_id", userId)
        .gte("created_at", new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false })
        .limit(6);
      if (cancelled || !data) return;
      const requestIds = (data as PhotoGenerationRequest[]).map(request => request.id);
      const { data: existingPhotos } = requestIds.length
        ? await (supabase as any)
            .from("diario_items")
            .select("id,data")
            .eq("user_id", userId)
            .eq("kind", "photo")
            .in("data->>generation_request_id", requestIds)
        : { data: [] };
      if (cancelled) return;
      // Surface a failure from the current session even after the background
      // worker accepted the dispatch. Older failed attempts stay hidden.
      for (const failed of (data as PhotoGenerationRequest[]).filter(
        request => request.status === "failed" && activeRequestIds.current.has(request.id)
      )) {
        activeRequestIds.current.delete(failed.id);
        setError(failed.error_message || "Photo processing failed. No automatic retry was made.");
      }
      const savedPhotoIds = new Map<string, string>(
        ((existingPhotos ?? []) as Array<{ id: string; data: { generation_request_id?: string } }>).flatMap(
          photo => photo.data?.generation_request_id ? [[photo.data.generation_request_id, photo.id] as [string, string]] : []
        )
      );
      setPreviews(previous => {
        const next = [...previous];
        for (const request of (data as PhotoGenerationRequest[]).filter(request => request.status !== "failed")) {
          const existing = next.findIndex(item => item.request.id === request.id);
          const recoveredPhotoId = request.photo_item_id ?? savedPhotoIds.get(request.id) ?? null;
          const status: PreviewState["status"] = recoveredPhotoId ? "saved" : request.status === "failed" ? "error" : request.status === "completed" ? "error" : "generating";
          const item = {
            key: request.id, request, status, preview: null,
            error: request.status === "failed" ? request.error_message : request.status === "completed" && !recoveredPhotoId ? "Photo marked completed but missing from Gallery. Check storage before regenerating." : null,
            savedPhotoId: recoveredPhotoId, adjustOpen: false, adjustText: "",
          };
          if (existing < 0) next.push(item);
          else next[existing] = { ...next[existing], request, status, savedPhotoId: item.savedPhotoId, error: item.error };
        }
        const failedIds = new Set(
          (data as PhotoGenerationRequest[]).filter(request => request.status === "failed").map(request => request.id)
        );
        return next.filter(item => item.status !== "error" && !failedIds.has(item.request.id)).slice(-8);
      });
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), 2000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [session?.user?.id]);

  async function buildRequest({
    dominicState,
    batchId,
    batchIndex,
  }: {
    dominicState: Awaited<ReturnType<typeof loadDominicState>> | null;
    batchId?: string | null;
    batchIndex?: number | null;
  }) {
    const sourceContext = sourceContextOverride ?? modeSource(mode);

    return createPhotoGenerationRequest({
      userId: session.user.id,
      mode,
      subjectType,
      sourceContext,
      scene: scene.trim() || null,
      mood: mood.trim() || null,
      shotType: photoStyle === "natural_iphone" ? null : photoStyle,
      photoStyle,
      closenessLevel: subjectType === "both" ? closeness : null,
      spontaneityLevel:
        mode === "surprise" || mode === "spontaneous" || mode === "daily_life"
          ? "high"
          : "medium",
      useCurrentLook,
      avoidRecentPoses: true,
      avoidRecentLocations: true,
      avoidRecentCompositions: true,
      batchId: batchId ?? null,
      batchIndex: batchIndex ?? null,
      contextSnapshot: {
        source: sourceContext,
        memoryId,
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
  }

  async function generateIntoPreview(
    key: string,
    request: PhotoGenerationRequest,
    sourceImageDataUrl?: string | null
  ) {
    patchPreview(key, { request, status: "generating", preview: null, error: null, savedPhotoId: null });
    try {
      await enqueuePhotoProviderJob({ userId: session.user.id, request, sourceImageDataUrl });
      patchPreview(key, { status: "generating" });
      return true;
    } catch (nextError) {
      const reason = messageFromError(nextError, "Could not queue photo.");
      // The request was persisted before dispatch. Never leave it as a
      // permanent spinner when dispatch fails; only touch still-queued jobs.
      // If the worker already claimed the job, this conditional update does nothing.
      await (supabase as any)
        .from("photo_generation_requests")
        .update({
          status: "failed",
          error_message: `Dispatch did not complete: ${reason.slice(0, 200)}. Check provider usage before a new attempt.`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", request.id)
        .eq("user_id", session.user.id)
        .eq("status", "queued")
        .then(() => null, () => null);
      patchPreview(key, { status: "error", error: reason });
      activeRequestIds.current.delete(request.id);
      setError(reason);
      return false;
    }
  }

  async function checkPhotoConnection() {
    if (checkingConnection || creating) return;
    setCheckingConnection(true);
    setConnectionResult(null);
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession?.access_token) throw new Error("Sign in again to check the photo connection.");
      const response = await fetch("/api/photo-engine", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + currentSession.access_token,
        },
        body: JSON.stringify({ userId: currentSession.user.id, checkConnection: true }),
      });
      const payload = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "Photo connection failed (HTTP " + response.status + ").");
      setConnectionResult(payload?.message || "Photo connection verified. No credits used.");
    } catch (nextError) {
      setConnectionResult(messageFromError(nextError, "Could not verify the photo connection.") + " No image was requested.");
    } finally {
      setCheckingConnection(false);
    }
  }

  async function waitForBatchPhoto(request: PhotoGenerationRequest): Promise<boolean> {
    // Daily Life multi-photo batches must not start the next paid image while
    // an earlier provider job is still generating or has failed.
    for (let attempt = 0; attempt < 72; attempt += 1) {
      if (!componentActive.current) return false;
      await new Promise<void>(resolve => window.setTimeout(resolve, 2500));
      if (!componentActive.current) return false;
      const { data, error: pollError } = await (supabase as any)
        .from("photo_generation_requests")
        .select("status,error_message")
        .eq("id", request.id)
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (pollError || !data) {
        setError("Could not confirm whether the previous photo finished. Remaining photos were not requested.");
        return false;
      }
      if (data.status === "completed") return true;
      if (data.status === "failed") {
        activeRequestIds.current.delete(request.id);
        setError(data.error_message || "The previous photo failed. Remaining photos were not requested.");
        return false;
      }
    }
    setError("The previous photo is still processing. Remaining photos were not requested. Check Gallery before trying again.");
    return false;
  }

  async function createPhotos() {
    if (!session?.user?.id || creating) return;

    setCreating(true);
    setError(null);
    activeRequestIds.current.clear();
    setPreviews([]);

    try {
      const dominicState = await loadDominicState(session.user.id).catch(
        () => null
      );

      const count = isDailyLife ? dailyCount : 1;
      const batchId = count > 1 ? crypto.randomUUID() : null;
      setShowRecentPreviews(true);

      // Create and dispatch only one request at a time. If dispatch fails,
      // do not create more queued records or attempt the rest of the batch.
      for (let index = 0; index < count; index += 1) {
        const request = await buildRequest({
          dominicState,
          batchId,
          batchIndex: count > 1 ? index : null,
        });
        const item = {
          key: previewKey(request),
          request,
          status: "waiting" as const,
          preview: null,
          error: null,
          adjustOpen: false,
          adjustText: "",
          savedPhotoId: null,
        };
        activeRequestIds.current.add(request.id);
        setPreviews(current => [...current, item]);
        if (!componentActive.current) break;
        const queued = await generateIntoPreview(item.key, item.request);
        if (!queued) break;
        if (index < count - 1 && !(await waitForBatchPhoto(request))) break;
      }
    } catch (nextError) {
      console.error("Could not create Photo Engine request:", nextError);
      setError(
        messageFromError(nextError, "The photo request could not be created.")
      );
    } finally {
      setCreating(false);
    }
  }

  async function regeneratePreview(item: PreviewState) {
    if (creating) return;
    setCreating(true);
    setError(null);

    try {
      const previous = item.request;
      const nextRequest = await createPhotoGenerationRequest({
        userId: session.user.id,
        mode: previous.mode,
        subjectType: previous.subject_type,
        sourceContext: previous.source_context,
        scene: previous.scene,
        mood: previous.mood,
        shotType: previous.shot_type,
        photoStyle: previous.photo_style,
        closenessLevel: previous.closeness_level,
        spontaneityLevel: previous.spontaneity_level,
        useCurrentLook: previous.use_current_look,
        avoidRecentPoses: true,
        avoidRecentLocations: true,
        avoidRecentCompositions: true,
        contextSnapshot: previous.context_snapshot,
        parentRequestId: previous.id,
        batchId: previous.batch_id,
        batchIndex: previous.batch_index,
        adjustmentInstruction: previous.adjustment_instruction,
      });

      activeRequestIds.current.add(nextRequest.id);
      await generateIntoPreview(item.key, nextRequest);
    } catch (nextError) {
      patchPreview(item.key, {
        status: "error",
        error: messageFromError(nextError, "Could not regenerate this photo."),
      });
    } finally {
      setCreating(false);
    }
  }

  async function adjustPreview(item: PreviewState) {
    const instruction = item.adjustText.trim();
    if (!item.preview || !instruction || creating) return;

    setCreating(true);
    setError(null);

    try {
      const previous = item.request;
      const nextRequest = await createPhotoGenerationRequest({
        userId: session.user.id,
        mode: "adjust",
        subjectType: previous.subject_type,
        sourceContext: previous.source_context,
        scene: previous.scene,
        mood: previous.mood,
        shotType: previous.shot_type,
        photoStyle: previous.photo_style,
        closenessLevel: previous.closeness_level,
        spontaneityLevel: previous.spontaneity_level,
        useCurrentLook: previous.use_current_look,
        avoidRecentPoses: previous.avoid_recent_poses,
        avoidRecentLocations: previous.avoid_recent_locations,
        avoidRecentCompositions: previous.avoid_recent_compositions,
        contextSnapshot: previous.context_snapshot,
        parentRequestId: previous.id,
        batchId: previous.batch_id,
        batchIndex: previous.batch_index,
        adjustmentInstruction: instruction,
      });

      patchPreview(item.key, {
        adjustOpen: false,
        adjustText: "",
      });

      activeRequestIds.current.add(nextRequest.id);
      await generateIntoPreview(item.key, nextRequest, item.preview.dataUrl);
    } catch (nextError) {
      patchPreview(item.key, {
        status: "error",
        error: messageFromError(nextError, "Could not adjust this photo."),
      });
    } finally {
      setCreating(false);
    }
  }

  async function keepPreview(item: PreviewState) {
    if (!item.preview || item.status !== "ready") return;

    patchPreview(item.key, { status: "saving", error: null });

    try {
      const blob = dataUrlToBlob(item.preview.dataUrl);
      const request = item.request;
      const chatSender =
        request.source_context === "chat"
          ? request.subject_type === "me"
            ? "alloah"
            : "dominic"
          : null;

      const saved = await saveGeneratedPhoto({
        userId: session.user.id,
        request,
        blob,
        mimeType: item.preview.mimeType,
        title:
          request.mode === "memory"
            ? "Memory photo"
            : request.mode === "daily_life"
              ? "Daily life"
              : request.mode === "chat_photo" || request.mode === "chat_context"
                ? "Chat photo"
                : "Photo",
        feature: item.preview.feature,
        extraData: {
          provider: item.preview.provider,
          provider_model: item.preview.model,
          kept_from_preview: true,
          ...(chatSender ? { chat_sender: chatSender } : {}),
        },
      });

      const linkedMemoryId = request.context_snapshot?.memoryId;
      if (typeof linkedMemoryId === "string" && linkedMemoryId) {
        await linkPhotoToItem({
          userId: session.user.id,
          photoId: saved.item.id,
          targetItemId: linkedMemoryId,
          relation: "appears_in",
          data: { source: "photo_engine" },
        }).catch((linkError) => {
          console.error("Could not link generated photo to memory:", linkError);
        });
      }

      patchPreview(item.key, {
        status: "saved",
        savedPhotoId: saved.item.id,
      });

      if (request.source_context === "chat") {
        window.dispatchEvent(new Event("diario-generated-chat-photo"));
      }
    } catch (nextError) {
      patchPreview(item.key, {
        status: "ready",
        error: messageFromError(nextError, "Could not keep this photo."),
      });
    }
  }

  async function keepAll() {
    for (const item of previews) {
      if (item.status === "ready" && item.preview) {
        await keepPreview(item);
      }
    }
  }

  function resetComposer() {
    activeRequestIds.current.clear();
    setShowRecentPreviews(false);
    setPreviews([]);
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

      {error && <p className="photo-engine-error" role="alert">{error}</p>}

      {!hasPreviews && previews.length > 0 && (
        <Button type="button" variant="outline" onClick={() => setShowRecentPreviews(true)}>
          View recent photo attempts ({previews.length})
        </Button>
      )}

      {hasPreviews ? (
        <section className="photo-engine-preview-stage">
          <div className="photo-engine-preview-heading">
            <div>
              <small>
                {previews.length > 1 ? "DAILY LIFE PREVIEWS" : "PREVIEW"}
              </small>
              <h2>
                {creating
                  ? "Making it feel real…"
                  : savedCount === previews.length
                    ? "Kept in your world."
                    : "Keep it, change it, or try again."}
              </h2>
            </div>

            {previews.length > 1 && readyCount > 0 && (
              <Button type="button" size="sm" onClick={() => void keepAll()}>
                <Save /> Keep all
              </Button>
            )}
          </div>

          <div
            className={`photo-engine-preview-grid ${
              previews.length === 1 ? "single" : ""
            }`}
          >
            {previews.map((item, index) => (
              <article className="photo-engine-preview-card" key={item.key}>
                <div className="photo-engine-preview-media">
                  {item.preview ? (
                    <img
                      src={item.preview.dataUrl}
                      alt={`Generated Photo Engine preview ${index + 1}`}
                    />
                  ) : (
                    <div className="photo-engine-preview-placeholder">
                      {item.status === "error" ? <X /> : <RefreshCw />}
                      <span>
                        {item.status === "waiting"
                          ? "waiting"
                          : item.status === "error"
                            ? "generation failed"
                            : item.status === "saved" ? "Saved to Gallery" : "generating"}
                      </span>
                      {item.status !== "error" && (
                        <div style={{ width: "85%", maxWidth: 270, marginTop: 12, textAlign: "center" }}>
                          <div role="progressbar" aria-label="Photo processing stage (live server status)" aria-valuenow={photoProgress(item.request, item.status)} aria-valuemin={0} aria-valuemax={100} style={{ height: 7, borderRadius: 99, background: "rgba(105,40,51,.18)", overflow: "hidden" }}>
                            <div style={{ width: `${photoProgress(item.request, item.status)}%`, height: "100%", borderRadius: 99, background: "#762b3c", transition: "width .4s ease" }} />
                          </div>
                          <small style={{ display: "block", marginTop: 6 }}>
                            {photoProgress(item.request, item.status)}% · {item.request.status === "queued" ? "Waiting for processing" : item.request.status === "preparing" ? "Preparing references" : item.request.status === "generating" ? "Generating image" : "Saved"}
                          </small>
                          {item.request.status === "queued" && Date.now() - new Date(item.request.created_at).getTime() > 120000 && (
                            <small style={{ display: "block", marginTop: 6 }}>Taking longer than expected. Please do not submit again; check Gallery.</small>
                          )}
                          <small style={{ display: "block", marginTop: 3, opacity: .7 }}>Live server stage, updated every 2 seconds. The image provider does not report a precise percentage.</small>
                        </div>
                      )}
                    </div>
                  )}

                  <span className={`photo-engine-preview-status ${item.status}`}>
                    {item.status === "saved"
                      ? "kept"
                      : item.status === "saving"
                        ? "saving"
                        : item.status === "ready"
                          ? "preview"
                          : item.status}
                  </span>
                </div>

                <div className="photo-engine-preview-copy">
                  <small>
                    {item.status === "error"
                      ? "FAILED ATTEMPT · NOT A GENERATED PHOTO"
                      : previews.length > 1
                        ? `PHOTO ${index + 1} OF ${previews.length}`
                        : selectedMode?.label ?? "PHOTO"}
                  </small>
                  <strong>
                    {item.request.subject_type === "both"
                      ? "Alloah + Dominic"
                      : item.request.subject_type === "me"
                        ? "Alloah"
                        : "Dominic"}
                  </strong>
                  <span>
                    {item.request.photo_style.replaceAll("_", " ")} · {item.request.reference_ids.length} saved references (up to 14 chosen)
                  </span>
                </div>

                {item.error && (
                  <p className="photo-engine-preview-error">{item.error}</p>
                )}

                {item.status === "error" && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void regeneratePreview(item)}
                    disabled={creating}
                  >
                    <RefreshCw /> New attempt (may use credits)
                  </Button>
                )}

                {item.preview &&
  (item.status === "ready" || item.status === "saved") && (
    <PhotoIdentityFeedback
      userId={session.user.id}
      request={item.request}
      preview={item.preview}
    />
  )}
                
                {(item.status === "ready" || item.status === "saved") && (
                  <div className="photo-engine-preview-actions">
                    <button
                      type="button"
                      onClick={() => void regeneratePreview(item)}
                      disabled={creating || item.status === "saved"}
                    >
                      <RefreshCw /> Regenerate
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        patchPreview(item.key, {
                          adjustOpen: !item.adjustOpen,
                        })
                      }
                      disabled={creating || item.status === "saved"}
                    >
                      <SlidersHorizontal /> Adjust
                    </button>
                    <button
                      type="button"
                      className="keep"
                      onClick={() => void keepPreview(item)}
                      disabled={creating || item.status === "saved"}
                    >
                      {item.status === "saved" ? <Check /> : <Save />}
                      {item.status === "saved" ? "Kept" : "Keep"}
                    </button>
                  </div>
                )}

                {item.adjustOpen && item.preview && item.status === "ready" && (
                  <div className="photo-engine-adjust-box">
                    <textarea
                      value={item.adjustText}
                      onChange={(event) =>
                        patchPreview(item.key, { adjustText: event.target.value })
                      }
                      placeholder="Keep everything, but make his expression softer…"
                      rows={3}
                    />
                    <div>
                      <button
                        type="button"
                        onClick={() =>
                          patchPreview(item.key, {
                            adjustOpen: false,
                            adjustText: "",
                          })
                        }
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="apply"
                        disabled={!item.adjustText.trim() || creating}
                        onClick={() => void adjustPreview(item)}
                      >
                        Apply change
                      </button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>

          <div className="photo-engine-preview-footer">
            <p>
              A preview only becomes a real Gallery photo after <strong>Keep</strong>.
              Chat photos reuse that same saved object instead of creating a duplicate.
            </p>
            <Button type="button" variant="outline" onClick={resetComposer} disabled={creating}>
              <Sparkles /> Create another
            </Button>
          </div>
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
                    onClick={() => {
                      setMode(option.id);
                      setSourceContextOverride(null);
                    }}
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
                  {[1, 2, 3, 4, 5].map((count) => (
                    <button
                      key={count}
                      type="button"
                      className={dailyCount === count ? "active" : ""}
                      onClick={() => setDailyCount(count as 1 | 2 | 3 | 4 | 5)}
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

          <Button type="button" variant="outline" onClick={() => void checkPhotoConnection()} disabled={checkingConnection || creating}>
            {checkingConnection ? "Checking connection…" : "Check photo connection (free)"}
          </Button>
          {connectionResult && <p className="photo-engine-error" role="status">{connectionResult}</p>}

          <Button
            type="button"
            className="photo-engine-create-button"
            onClick={() => void createPhotos()}
            disabled={creating}
          >
            {creating ? <RefreshCw className="photo-engine-spin" /> : <Sparkles />}
            {creating
              ? "Generating…"
              : isDailyLife
                ? "Create photo"
                : "Create photo"}
          </Button>

          <p className="photo-engine-footer-note">
            Photos are saved automatically to Gallery after generation.
          </p>
        </>
      )}
    </section>
  );
}
