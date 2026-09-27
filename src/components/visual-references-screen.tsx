import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  Heart,
  Image as ImageIcon,
  Sparkles,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePrivateDiario } from "@/components/private-diario";
import { supabase } from "@/integrations/supabase/client";
import {
  createVisualReference,
  getVisualReferences,
  setVisualReferenceFavorite,
  type CurrentLookType,
  type VisualReferencePurpose,
  type VisualReferenceStrength,
  type VisualReferenceSubject,
  type VisualReferenceWithUrl,
} from "@/lib/diario-world";
import {
  getCurrentLook,
  setCurrentLook,
  updatePhotoReference,
} from "@/lib/photo-engine";
import "../photo-references.css";

type ReferenceMode = "identity" | "current-look";
type IdentitySubject = "alloah" | "dominic" | "couple";
type CurrentLookSubject = "alloah" | "dominic";

type VisualCanonRow = {
  id: string;
  user_id: string;
  subject: IdentitySubject;
  status: "pending" | "analyzing" | "ready" | "error";
  profile: Record<string, unknown>;
  reference_ids: string[];
  provider: string | null;
  model: string | null;
  analysis_version: number;
  last_error: string | null;
  last_analyzed_at: string | null;
};

const referenceSubjects: {
  id: IdentitySubject;
  label: string;
  note: string;
}[] = [
  { id: "alloah", label: "Alloah", note: "your face and identity" },
  { id: "dominic", label: "Dominic", note: "his face, body and tattoos" },
  { id: "couple", label: "Us", note: "how you look together" },
];

const currentLookTypes: {
  id: CurrentLookType;
  label: string;
  note: string;
}[] = [
  { id: "hair", label: "Hair", note: "current cut, color and styling" },
  { id: "nails", label: "Nails", note: "the nails you have right now" },
  { id: "makeup", label: "Makeup", note: "current makeup details" },
  { id: "jewelry", label: "Jewelry", note: "rings, necklace and earrings" },
  { id: "phone_case", label: "Phone", note: "your current phone case" },
  { id: "clothing", label: "Clothes", note: "a temporary outfit or piece" },
  { id: "style", label: "Style", note: "temporary styling direction" },
  { id: "accessories", label: "Accessories", note: "temporary visual details" },
];

function humanize(value: string) {
  return value.replace(/_/g, " ");
}

function canonReferencePayload(item: VisualReferenceWithUrl) {
  return {
    id: item.reference.id,
    url: item.url,
    subject: item.reference.subject,
    title: item.reference.title,
    description: item.reference.description,
    purposes: item.reference.reference_purposes ?? [],
    strength: item.reference.reference_strength ?? "supporting",
    referenceKind: item.reference.reference_kind ?? "identity",
    lookType: item.reference.look_type ?? null,
    isCurrent: Boolean(item.reference.is_current),
    createdAt: item.reference.created_at ?? null,
  };
}

function canonSummary(canon: VisualCanonRow | null) {
  const value = canon?.profile?.identity_summary;
  return typeof value === "string" ? value : null;
}

function autoReferenceSettings(subject: IdentitySubject): {
  purposes: VisualReferencePurpose[];
  strength: VisualReferenceStrength;
  description: string;
} {
  if (subject === "alloah") {
    return {
      purposes: ["face", "body", "hair"],
      strength: "primary",
      description:
        "Use this as an identity reference for Alloah. Preserve her face, proportions and hair when visible.",
    };
  }

  if (subject === "dominic") {
    return {
      purposes: ["face", "body", "hair", "tattoos"],
      strength: "primary",
      description:
        "Use this as an identity reference for Dominic. Preserve his face, proportions, hair and tattoos when visible.",
    };
  }

  return {
    purposes: ["pose", "expression", "body"],
    strength: "supporting",
    description:
      "Use this as a couple reference for how Alloah and Dominic naturally look together.",
  };
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;

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

    if (parts.length) return parts.join(" · ");
  }

  return fallback;
}

export function VisualReferencesScreen() {
  const { session } = usePrivateDiario();

  const [mode, setMode] = useState<ReferenceMode>("identity");
  const [subject, setSubject] = useState<IdentitySubject>("alloah");
  const [currentLookSubject, setCurrentLookSubject] =
    useState<CurrentLookSubject>("alloah");
  const [currentLookType, setCurrentLookType] =
    useState<CurrentLookType>("nails");

  const [references, setReferences] = useState<VisualReferenceWithUrl[]>([]);
  const [currentLookReferences, setCurrentLookReferences] =
    useState<VisualReferenceWithUrl[]>([]);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [analyzingCanon, setAnalyzingCanon] = useState(false);
  const [removingReferenceId, setRemovingReferenceId] =
    useState<string | null>(null);
  const [canon, setCanon] = useState<VisualCanonRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentLookInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode !== "identity") return;

    let active = true;
    setLoading(true);
    setError(null);

    getVisualReferences({
      userId: session.user.id,
      subject: subject as VisualReferenceSubject,
    })
      .then((loaded) => {
        if (!active) return;
        setReferences(
          loaded.filter(
            (item) => item.reference.reference_kind !== "current_look"
          )
        );
      })
      .catch((loadError) => {
        if (!active) return;
        console.error("Could not load references:", loadError);
        setError(
          errorMessage(
            loadError,
            "The references could not be opened right now."
          )
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [session.user.id, subject, mode]);

  useEffect(() => {
    if (mode !== "identity") return;

    let active = true;

    setCanon(null);

    (supabase as any)
      .from("visual_canons")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("subject", subject)
      .maybeSingle()
      .then(
        ({
          data,
          error: canonLoadError,
        }: {
          data: VisualCanonRow | null;
          error: unknown;
        }) => {
          if (!active) return;

          if (canonLoadError) {
            console.error("Could not load visual canon:", canonLoadError);
            return;
          }

          setCanon(data ?? null);
        }
      );

    return () => {
      active = false;
    };
  }, [session.user.id, subject, mode]);

  useEffect(() => {
    if (mode !== "current-look") return;

    let active = true;
    setLoading(true);
    setError(null);

    getCurrentLook({
      userId: session.user.id,
      subject: currentLookSubject,
      lookType: currentLookType,
    })
      .then((loaded) => {
        if (!active) return;
        setCurrentLookReferences(loaded);
      })
      .catch((loadError) => {
        if (!active) return;
        console.error("Could not load current look:", loadError);
        setError(
          errorMessage(loadError, "The current look could not be opened.")
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [session.user.id, mode, currentLookSubject, currentLookType]);

  async function loadCurrentLookForCanon(
    analysisSubject: IdentitySubject
  ): Promise<VisualReferenceWithUrl[]> {
    if (analysisSubject === "couple") {
      const [alloahCurrent, dominicCurrent] = await Promise.all([
        getCurrentLook({
          userId: session.user.id,
          subject: "alloah",
        }),
        getCurrentLook({
          userId: session.user.id,
          subject: "dominic",
        }),
      ]);

      return [...alloahCurrent, ...dominicCurrent];
    }

    return getCurrentLook({
      userId: session.user.id,
      subject: analysisSubject,
    });
  }

  function mergeCanonReferences(
    identityItems: VisualReferenceWithUrl[],
    currentItems: VisualReferenceWithUrl[]
  ) {
    const byId = new Map<string, VisualReferenceWithUrl>();

    // Current Look goes first so explicit "current" evidence survives the
    // analyzer limit even when the permanent library is very large.
    for (const item of [...currentItems, ...identityItems]) {
      byId.set(item.reference.id, item);
    }

    return Array.from(byId.values());
  }

  async function clearCanon(analysisSubject: IdentitySubject) {
    const now = new Date().toISOString();

    const { error: clearError } = await (supabase as any)
      .from("visual_canons")
      .upsert(
        {
          user_id: session.user.id,
          subject: analysisSubject,
          status: "pending",
          profile: {},
          reference_ids: [],
          last_error: null,
          last_analyzed_at: null,
          updated_at: now,
        },
        {
          onConflict: "user_id,subject",
        }
      );

    if (clearError) {
      throw clearError;
    }

    if (analysisSubject === subject) {
      setCanon(null);
    }
  }

  async function runCanonAnalysis(
    items: VisualReferenceWithUrl[],
    force = false,
    analysisSubject: IdentitySubject = subject,
    currentLookOverride?: VisualReferenceWithUrl[]
  ) {
    if (items.length === 0 || analyzingCanon) return;

    setAnalyzingCanon(true);
    setError(null);

    try {
      const currentLookItems =
        currentLookOverride ??
        (await loadCurrentLookForCanon(analysisSubject));

      const canonItems = mergeCanonReferences(items, currentLookItems);

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error("Your session expired. Please sign in again.");
      }

      const response = await fetch("/api/visual-canon", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          userId: session.user.id,
          subject: analysisSubject,
          references: canonItems.map(canonReferencePayload),
          force,
        }),
      });

      const body = (await response.json().catch(() => null)) as
        | {
            canon?: VisualCanonRow | null;
            error?: string;
          }
        | null;

      if (!response.ok) {
        throw new Error(
          body?.error || `Canon Analyzer failed with status ${response.status}.`
        );
      }

      if (body?.canon && analysisSubject === subject) {
        setCanon(body.canon);
      }
    } catch (analysisError) {
      console.error("Could not analyze visual canon:", analysisError);
      setError(
        errorMessage(
          analysisError,
          "The visual canon could not be analyzed right now."
        )
      );
    } finally {
      setAnalyzingCanon(false);
    }
  }

  async function handleReferenceUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      const settings = autoReferenceSettings(subject);
      const subjectLabel =
        referenceSubjects.find((item) => item.id === subject)?.label ?? "Reference";

      const createdItems: VisualReferenceWithUrl[] = [];

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];

        const created = await createVisualReference({
          userId: session.user.id,
          file,
          subject: subject as VisualReferenceSubject,
          title: `${subjectLabel} reference ${references.length + index + 1}`,
          description: settings.description,
        });

        const updated = await updatePhotoReference({
          userId: session.user.id,
          referenceId: created.reference.id,
          purposes: settings.purposes,
          strength: settings.strength,
          referenceKind: "identity",
        });

        createdItems.push({
          ...created,
          reference: updated,
        });
      }

      const mergedReferences = [...createdItems, ...references];
      setReferences(mergedReferences);

      void runCanonAnalysis(mergedReferences);
    } catch (uploadError) {
      console.error("Could not upload references:", uploadError);
      setError(
        errorMessage(uploadError, "The references could not be uploaded.")
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function handleCurrentLookUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      const created = await setCurrentLook({
        userId: session.user.id,
        subject: currentLookSubject,
        lookType: currentLookType,
        files,
        title: `Current ${humanize(currentLookType)}`,
      });

      setCurrentLookReferences(created);

      const allSubjectReferences = await getVisualReferences({
        userId: session.user.id,
        subject: currentLookSubject as VisualReferenceSubject,
      });

      const identityReferences = allSubjectReferences.filter(
        (item) => item.reference.reference_kind !== "current_look"
      );

      if (identityReferences.length > 0) {
        void runCanonAnalysis(
          identityReferences,
          true,
          currentLookSubject
        );
      }
    } catch (uploadError) {
      console.error("Could not update current look:", uploadError);
      setError(
        errorMessage(uploadError, "The current look could not be updated.")
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function toggleReferenceFavorite(item: VisualReferenceWithUrl) {
    const nextFavorite = item.reference.is_favorite !== true;
    setError(null);

    try {
      const updated = await setVisualReferenceFavorite({
        userId: session.user.id,
        referenceId: item.reference.id,
        favorite: nextFavorite,
      });

      setReferences((current) =>
        current.map((currentItem) =>
          currentItem.reference.id === item.reference.id
            ? { ...currentItem, reference: updated }
            : currentItem
        )
      );
    } catch (favoriteError) {
      console.error("Could not favorite reference:", favoriteError);
      setError(
        errorMessage(favoriteError, "This reference could not be updated.")
      );
    }
  }

  async function deactivateReference(item: VisualReferenceWithUrl) {
    const now = new Date().toISOString();

    const { error: removeError } = await (supabase as any)
      .from("visual_references")
      .update({
        is_active: false,
        is_current: false,
        active_until: item.reference.is_current
          ? now
          : item.reference.active_until,
        updated_at: now,
      })
      .eq("id", item.reference.id)
      .eq("user_id", session.user.id);

    if (removeError) {
      throw removeError;
    }
  }

  async function removeIdentityReference(item: VisualReferenceWithUrl) {
    const confirmed = window.confirm(
      "Remove this reference from the visual canon?"
    );

    if (!confirmed || removingReferenceId) return;

    setRemovingReferenceId(item.reference.id);
    setError(null);

    try {
      await deactivateReference(item);

      const remaining = references.filter(
        (current) => current.reference.id !== item.reference.id
      );

      setReferences(remaining);

      if (remaining.length > 0) {
        await runCanonAnalysis(remaining, true, subject);
      } else {
        await clearCanon(subject);
      }
    } catch (removeError) {
      console.error("Could not remove reference:", removeError);
      setError(
        errorMessage(
          removeError,
          "This reference could not be removed right now."
        )
      );
    } finally {
      setRemovingReferenceId(null);
    }
  }

  async function removeCurrentLookReference(item: VisualReferenceWithUrl) {
    const confirmed = window.confirm(
      "Remove this photo from the current look?"
    );

    if (!confirmed || removingReferenceId) return;

    setRemovingReferenceId(item.reference.id);
    setError(null);

    try {
      await deactivateReference(item);

      setCurrentLookReferences((current) =>
        current.filter(
          (currentItem) =>
            currentItem.reference.id !== item.reference.id
        )
      );

      const allSubjectReferences = await getVisualReferences({
        userId: session.user.id,
        subject: currentLookSubject as VisualReferenceSubject,
      });

      const identityReferences = allSubjectReferences.filter(
        (current) =>
          current.reference.reference_kind !== "current_look"
      );

      if (identityReferences.length > 0) {
        await runCanonAnalysis(
          identityReferences,
          true,
          currentLookSubject
        );
      } else {
        await clearCanon(currentLookSubject);
      }
    } catch (removeError) {
      console.error("Could not remove current look reference:", removeError);
      setError(
        errorMessage(
          removeError,
          "This current look photo could not be removed right now."
        )
      );
    } finally {
      setRemovingReferenceId(null);
    }
  }

  const activeSubject = referenceSubjects.find((item) => item.id === subject);
  const activeLookType = currentLookTypes.find(
    (item) => item.id === currentLookType
  );

  return (
    <section className="references-screen photo-reference-screen">
      <header className="photo-reference-intro">
        <small>visual canon</small>
        <h1>References</h1>
        <p>
          Add the photos that define how you and Dominic look. The Photo Engine
          handles the technical tags automatically.
        </p>
      </header>

      <div className="reference-mode-switch">
        <button
          type="button"
          className={mode === "identity" ? "active" : ""}
          onClick={() => setMode("identity")}
        >
          Identity
        </button>
        <button
          type="button"
          className={mode === "current-look" ? "active" : ""}
          onClick={() => setMode("current-look")}
        >
          Current Look
        </button>
      </div>

      {mode === "identity" ? (
        <>
          <div className="reference-subject-strip">
            {referenceSubjects.map((item) => (
              <button
                key={item.id}
                type="button"
                className={subject === item.id ? "active" : ""}
                onClick={() => setSubject(item.id)}
              >
                <strong>{item.label}</strong>
                <small>{item.note}</small>
              </button>
            ))}
          </div>

          <section className="reference-upload-card photo-canon-card">
            <div>
              <small>identity</small>
              <h2>{activeSubject?.label}</h2>
              <p>
                Choose several photos at once. We&apos;ll use them automatically
                as canon references.
              </p>
            </div>

            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <ImageIcon />
              {uploading ? "Adding photos..." : "Add photos"}
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={handleReferenceUpload}
            />
          </section>

          {error && <p className="form-error">{error}</p>}

          {loading ? (
            <p className="empty-copy">loading references...</p>
          ) : references.length === 0 ? (
            <section className="empty-state-card">
              <ImageIcon />
              <h2>No references yet.</h2>
              <p>Pick a few photos. You can select several in one go.</p>
            </section>
          ) : (
            <>
              <section className="current-look-summary">
                <small>
                  {analyzingCanon
                    ? "learning canon"
                    : canon?.status === "ready"
                      ? "canon learned"
                      : canon?.status === "error"
                        ? "canon needs attention"
                        : "references ready"}
                </small>

                <strong>
                  {analyzingCanon
                    ? "Analyzing photos..."
                    : `${references.length} ${
                        references.length === 1 ? "photo" : "photos"
                      }`}
                </strong>

                <span>
                  {analyzingCanon
                    ? "Comparing the whole set and learning which images are best for face, hair, body, tattoos and other details."
                    : canon?.status === "ready"
                      ? canonSummary(canon) ??
                        "The identity canon has been learned from these references."
                      : "The photos are saved. Run the Canon Analyzer once so the app can learn the identity from the whole set."}
                </span>

                <Button
                  type="button"
                  disabled={analyzingCanon || references.length === 0}
                  onClick={() => void runCanonAnalysis(references, true)}
                >
                  <Sparkles />
                  {analyzingCanon
                    ? "Analyzing..."
                    : canon?.status === "ready"
                      ? "Refresh canon"
                      : "Learn canon"}
                </Button>
              </section>

              <div className="reference-grid">
                {references.map((item) => (
                  <article key={item.reference.id} className="reference-card">
                    <img
                      src={item.url}
                      alt={item.reference.title ?? "Visual reference"}
                    />
                    <div>
                      <strong>{activeSubject?.label}</strong>
                      <div className="reference-card-actions">
                        <button
                          type="button"
                          className={item.reference.is_favorite ? "active" : ""}
                          onClick={() => void toggleReferenceFavorite(item)}
                          disabled={removingReferenceId === item.reference.id}
                        >
                          <Heart
                            size={16}
                            fill={
                              item.reference.is_favorite
                                ? "currentColor"
                                : "none"
                            }
                          />
                          Favorite
                        </button>

                        <button
                          type="button"
                          className="danger"
                          onClick={() => void removeIdentityReference(item)}
                          disabled={removingReferenceId === item.reference.id}
                        >
                          <Trash2 size={15} />
                          {removingReferenceId === item.reference.id
                            ? "Removing..."
                            : "Remove"}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <>
          <div className="current-look-toolbar">
            <div className="reference-mode-switch compact">
              <button
                type="button"
                className={currentLookSubject === "alloah" ? "active" : ""}
                onClick={() => setCurrentLookSubject("alloah")}
              >
                Alloah
              </button>
              <button
                type="button"
                className={currentLookSubject === "dominic" ? "active" : ""}
                onClick={() => setCurrentLookSubject("dominic")}
              >
                Dominic
              </button>
            </div>

            <div className="current-look-type-strip">
              {currentLookTypes.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={currentLookType === item.id ? "active" : ""}
                  onClick={() => setCurrentLookType(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <section className="current-look-upload-card">
            <div>
              <small>current look</small>
              <h2>
                {currentLookSubject === "alloah" ? "Alloah" : "Dominic"} ·{" "}
                {activeLookType?.label}
              </h2>
              <p>{activeLookType?.note}</p>
            </div>

            {currentLookReferences.length > 0 && (
              <div className="current-look-preview-grid">
                {currentLookReferences.map((item) => (
                  <div
                    key={item.reference.id}
                    className="current-look-reference"
                  >
                    <img
                      src={item.url}
                      alt={item.reference.title ?? "Current look"}
                    />
                    <button
                      type="button"
                      className="current-look-remove"
                      aria-label="Remove current look reference"
                      title="Remove"
                      disabled={removingReferenceId === item.reference.id}
                      onClick={() => void removeCurrentLookReference(item)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <Button
              type="button"
              onClick={() => currentLookInputRef.current?.click()}
              disabled={uploading}
            >
              <Sparkles />
              {uploading
                ? "Updating..."
                : currentLookReferences.length > 0
                  ? "Update"
                  : "Add photos"}
            </Button>

            <input
              ref={currentLookInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={handleCurrentLookUpload}
            />
          </section>

          {error && <p className="form-error">{error}</p>}

          {loading ? (
            <p className="empty-copy">loading current look...</p>
          ) : currentLookReferences.length === 0 ? (
            <section className="empty-state-card">
              <ImageIcon />
              <h2>Nothing current yet.</h2>
              <p>Add temporary details only when you want them.</p>
            </section>
          ) : (
            <section className="current-look-summary">
              <small>active now</small>
              <strong>{activeLookType?.label}</strong>
              <span>
                {currentLookReferences.length}{" "}
                {currentLookReferences.length === 1
                  ? "reference"
                  : "references"}
              </span>
            </section>
          )}
        </>
      )}
    </section>
  );
}
