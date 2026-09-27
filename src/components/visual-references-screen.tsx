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
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePrivateDiario } from "@/components/private-diario";
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
type CurrentLookSubject = "alloah" | "dominic";

const referenceSubjects: {
  id: VisualReferenceSubject;
  label: string;
  note: string;
}[] = [
  { id: "alloah", label: "Alloah", note: "face, body and identity" },
  { id: "dominic", label: "Dominic", note: "face, tattoos and identity" },
  { id: "couple", label: "Couple", note: "chemistry and body language" },
  { id: "pose", label: "Pose", note: "specific body language" },
  { id: "style", label: "Style", note: "camera and visual language" },
  { id: "place", label: "Place", note: "rooms, cafés and streets" },
  { id: "wardrobe", label: "Wardrobe", note: "clothes and looks" },
  { id: "mood", label: "Mood", note: "atmosphere and emotion" },
];

const referencePurposeOptions: {
  id: VisualReferencePurpose;
  label: string;
}[] = [
  { id: "face", label: "Face" },
  { id: "body", label: "Body" },
  { id: "hair", label: "Hair" },
  { id: "tattoos", label: "Tattoos" },
  { id: "hands", label: "Hands" },
  { id: "nails", label: "Nails" },
  { id: "makeup", label: "Makeup" },
  { id: "jewelry", label: "Jewelry" },
  { id: "phone_case", label: "Phone case" },
  { id: "clothing", label: "Clothing" },
  { id: "pose", label: "Pose" },
  { id: "expression", label: "Expression" },
  { id: "place", label: "Place" },
  { id: "mood", label: "Mood" },
  { id: "detail", label: "Detail" },
];

const currentLookTypes: {
  id: CurrentLookType;
  label: string;
  note: string;
}[] = [
  { id: "hair", label: "Hair", note: "current cut, color and styling" },
  { id: "nails", label: "Nails", note: "small detail, kept accurate in generated photos" },
  { id: "makeup", label: "Makeup", note: "current makeup details" },
  { id: "jewelry", label: "Jewelry", note: "rings, necklace and earrings" },
  { id: "phone_case", label: "Phone case", note: "the phone currently appearing in photos" },
  { id: "clothing", label: "Clothing", note: "a temporary outfit or piece" },
  { id: "style", label: "Style", note: "temporary styling direction" },
  { id: "accessories", label: "Accessories", note: "temporary visual details" },
];

function defaultPurposesForSubject(
  subject: VisualReferenceSubject
): VisualReferencePurpose[] {
  if (subject === "alloah" || subject === "dominic") return ["face"];
  if (subject === "couple" || subject === "pose") return ["pose"];
  if (subject === "place") return ["place"];
  if (subject === "wardrobe") return ["clothing"];
  if (subject === "mood") return ["mood"];
  return ["detail"];
}

function kindForSubject(subject: VisualReferenceSubject) {
  if (subject === "pose") return "pose" as const;
  if (subject === "place") return "scene" as const;
  if (subject === "style" || subject === "mood") return "style" as const;
  return "identity" as const;
}

function humanize(value: string) {
  return value.replace(/_/g, " ");
}

export function VisualReferencesScreen() {
  const { session } = usePrivateDiario();

  const [mode, setMode] = useState<ReferenceMode>("identity");
  const [subject, setSubject] = useState<VisualReferenceSubject>("alloah");
  const [currentLookSubject, setCurrentLookSubject] =
    useState<CurrentLookSubject>("alloah");
  const [currentLookType, setCurrentLookType] =
    useState<CurrentLookType>("nails");

  const [references, setReferences] = useState<VisualReferenceWithUrl[]>([]);
  const [currentLookReferences, setCurrentLookReferences] =
    useState<VisualReferenceWithUrl[]>([]);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [savingReferenceId, setSavingReferenceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [purposes, setPurposes] =
    useState<VisualReferencePurpose[]>(["face"]);
  const [strength, setStrength] =
    useState<VisualReferenceStrength>("supporting");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentLookInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPurposes(defaultPurposesForSubject(subject));
  }, [subject]);

  useEffect(() => {
    if (mode !== "identity") return;

    let active = true;
    setLoading(true);
    setError(null);

    getVisualReferences({ userId: session.user.id, subject })
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
        setError("The references could not be opened right now.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

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
        setError("The current look could not be opened.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [session.user.id, mode, currentLookSubject, currentLookType]);

  function togglePurpose(purpose: VisualReferencePurpose) {
    setPurposes((current) =>
      current.includes(purpose)
        ? current.filter((item) => item !== purpose)
        : [...current, purpose]
    );
  }

  async function handleReferenceUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const created = await createVisualReference({
        userId: session.user.id,
        file,
        subject,
        title,
        description,
      });

      const updated = await updatePhotoReference({
        userId: session.user.id,
        referenceId: created.reference.id,
        purposes,
        strength,
        referenceKind: kindForSubject(subject),
      });

      setReferences((current) => [
        { ...created, reference: updated },
        ...current,
      ]);
      setTitle("");
      setDescription("");
    } catch (uploadError) {
      console.error("Could not upload reference:", uploadError);
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "The reference could not be uploaded."
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
    } catch (uploadError) {
      console.error("Could not update current look:", uploadError);
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "The current look could not be updated."
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
      setError("This reference could not be updated.");
    }
  }

  async function saveExistingReference(
    item: VisualReferenceWithUrl,
    nextPurposes: VisualReferencePurpose[],
    nextStrength: VisualReferenceStrength
  ) {
    setSavingReferenceId(item.reference.id);
    setError(null);

    try {
      const updated = await updatePhotoReference({
        userId: session.user.id,
        referenceId: item.reference.id,
        purposes: nextPurposes,
        strength: nextStrength,
        referenceKind: kindForSubject(item.reference.subject),
      });

      setReferences((current) =>
        current.map((currentItem) =>
          currentItem.reference.id === item.reference.id
            ? { ...currentItem, reference: updated }
            : currentItem
        )
      );
    } catch (updateError) {
      console.error("Could not update reference:", updateError);
      setError("This reference could not be updated.");
    } finally {
      setSavingReferenceId(null);
    }
  }

  function toggleExistingPurpose(
    item: VisualReferenceWithUrl,
    purpose: VisualReferencePurpose
  ) {
    const currentPurposes = item.reference.reference_purposes ?? [];
    const nextPurposes = currentPurposes.includes(purpose)
      ? currentPurposes.filter((value) => value !== purpose)
      : [...currentPurposes, purpose];

    void saveExistingReference(
      item,
      nextPurposes,
      item.reference.reference_strength ?? "supporting"
    );
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
          Identity stays consistent. Temporary details can change without
          rewriting who either of you are.
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
              <small>identity board</small>
              <h2>{activeSubject?.label ?? "References"}</h2>
              <p>{activeSubject?.note}</p>
            </div>

            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Reference title"
            />
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What should the Photo Engine learn from this image?"
            />

            <label className="reference-field-label">Use this image for</label>
            <div className="reference-purpose-grid">
              {referencePurposeOptions.map((purpose) => (
                <button
                  key={purpose.id}
                  type="button"
                  className={
                    purposes.includes(purpose.id)
                      ? "reference-purpose-chip active"
                      : "reference-purpose-chip"
                  }
                  onClick={() => togglePurpose(purpose.id)}
                >
                  {purpose.label}
                </button>
              ))}
            </div>

            <label className="reference-field-label">Reference strength</label>
            <select
              className="reference-strength-select"
              value={strength}
              onChange={(event) =>
                setStrength(event.target.value as VisualReferenceStrength)
              }
            >
              <option value="primary">Primary</option>
              <option value="supporting">Supporting</option>
              <option value="detail_only">Detail only</option>
            </select>

            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || purposes.length === 0}
            >
              <ImageIcon />
              {uploading ? "Uploading..." : "Upload reference"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
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
              <p>Add the images that define the visual canon.</p>
            </section>
          ) : (
            <div className="reference-grid">
              {references.map((item) => (
                <article key={item.reference.id} className="reference-card">
                  <img
                    src={item.url}
                    alt={item.reference.title ?? "Visual reference"}
                  />
                  <div>
                    <strong>{item.reference.title ?? "Untitled reference"}</strong>
                    <div className="reference-card-tags">
                      <span className="reference-tag">
                        {humanize(item.reference.reference_strength ?? "supporting")}
                      </span>
                      {(item.reference.reference_purposes ?? []).map((purpose) => (
                        <span key={purpose} className="reference-tag">
                          {humanize(purpose)}
                        </span>
                      ))}
                    </div>

                    {item.reference.description && (
                      <p>{item.reference.description}</p>
                    )}

                    <div className="reference-card-actions">
                      <button
                        type="button"
                        className={item.reference.is_favorite ? "active" : ""}
                        onClick={() => void toggleReferenceFavorite(item)}
                      >
                        <Heart
                          size={16}
                          fill={item.reference.is_favorite ? "currentColor" : "none"}
                        />
                        Favorite
                      </button>
                    </div>

                    <details className="reference-edit-details">
                      <summary>Edit how this reference is used</summary>

                      <label className="reference-field-label">Purpose</label>
                      <div className="reference-purpose-grid compact">
                        {referencePurposeOptions.map((purpose) => (
                          <button
                            key={purpose.id}
                            type="button"
                            disabled={savingReferenceId === item.reference.id}
                            className={
                              (item.reference.reference_purposes ?? []).includes(
                                purpose.id
                              )
                                ? "reference-purpose-chip active"
                                : "reference-purpose-chip"
                            }
                            onClick={() => toggleExistingPurpose(item, purpose.id)}
                          >
                            {purpose.label}
                          </button>
                        ))}
                      </div>

                      <label className="reference-field-label">Strength</label>
                      <select
                        className="reference-strength-select"
                        value={item.reference.reference_strength ?? "supporting"}
                        disabled={savingReferenceId === item.reference.id}
                        onChange={(event) =>
                          void saveExistingReference(
                            item,
                            item.reference.reference_purposes ?? [],
                            event.target.value as VisualReferenceStrength
                          )
                        }
                      >
                        <option value="primary">Primary</option>
                        <option value="supporting">Supporting</option>
                        <option value="detail_only">Detail only</option>
                      </select>
                    </details>
                  </div>
                </article>
              ))}
            </div>
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

            {currentLookType === "nails" && (
              <p className="current-look-status">
                Add several close reference photos if needed. The newest set
                automatically becomes the current nails; the old set stays in
                history.
              </p>
            )}

            {currentLookReferences.length > 0 && (
              <div className="current-look-preview-grid">
                {currentLookReferences.map((item) => (
                  <img
                    key={item.reference.id}
                    src={item.url}
                    alt={item.reference.title ?? "Current look"}
                  />
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
                  : "Add current look"}
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
              <p>
                Put temporary details here. Identity references stay untouched.
              </p>
            </section>
          ) : (
            <section className="current-look-summary">
              <small>active now</small>
              <strong>{activeLookType?.label}</strong>
              <span>
                {currentLookReferences.length}{" "}
                {currentLookReferences.length === 1 ? "reference" : "references"}
              </span>
            </section>
          )}
        </>
      )}
    </section>
  );
}
