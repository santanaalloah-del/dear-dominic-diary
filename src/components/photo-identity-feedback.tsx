import { useMemo, useState } from "react";
import { Check, ThumbsDown, ThumbsUp } from "lucide-react";

import {
  identityReferenceUsageFromFeatureData,
  recordPhotoIdentityFeedback,
  type IdentityFeedbackSubject,
  type IdentityFeedbackValue,
} from "@/lib/photo-identity-feedback";
import type { PhotoGenerationRequest } from "@/lib/photo-engine";
import type { PhotoProviderPreview } from "@/lib/photo-provider";

import "./photo-identity-feedback.css";

type FeedbackState = Partial<
  Record<IdentityFeedbackSubject, IdentityFeedbackValue>
>;

function subjectsForRequest(
  subjectType: PhotoGenerationRequest["subject_type"]
): IdentityFeedbackSubject[] {
  if (subjectType === "me") return ["alloah"];
  if (subjectType === "dominic") return ["dominic"];
  return ["alloah", "dominic"];
}

function subjectTitle(
  subject: IdentityFeedbackSubject,
  subjectType: PhotoGenerationRequest["subject_type"]
) {
  if (subjectType === "both") {
    return subject === "alloah" ? "Alloah" : "Dominic";
  }

  return "Identity";
}

function positiveLabel(
  subject: IdentityFeedbackSubject,
  subjectType: PhotoGenerationRequest["subject_type"]
) {
  if (subjectType === "both") return "Looks right";
  return subject === "alloah" ? "Looks like me" : "Looks like him";
}

function negativeLabel(
  subject: IdentityFeedbackSubject,
  subjectType: PhotoGenerationRequest["subject_type"]
) {
  if (subjectType === "both") return "Looks off";
  return subject === "alloah"
    ? "Doesn't look like me"
    : "Doesn't look like him";
}

export function PhotoIdentityFeedback({
  userId,
  request,
  preview,
  featureData,
}: {
  userId: string;
  request: PhotoGenerationRequest;
  preview?: PhotoProviderPreview | null;
  featureData?: unknown;
}) {
  const references = useMemo(
    () => identityReferenceUsageFromFeatureData(
      featureData ?? preview?.feature?.featureData
    ),
    [featureData, preview]
  );

  const subjects = useMemo(
    () =>
      subjectsForRequest(request.subject_type).filter((subject) =>
        references.some(
          (reference) =>
            reference.subject === subject &&
            reference.referenceKind === "identity" &&
            !reference.isCurrent
        )
      ),
    [references, request.subject_type]
  );

  const [feedback, setFeedback] = useState<FeedbackState>({});
  const [savingSubject, setSavingSubject] =
    useState<IdentityFeedbackSubject | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!subjects.length) return null;

  async function submit(
    subject: IdentityFeedbackSubject,
    value: IdentityFeedbackValue
  ) {
    if (savingSubject) return;

    setSavingSubject(subject);
    setError(null);

    try {
      await recordPhotoIdentityFeedback({
        userId,
        requestId: request.id,
        subject,
        value,
        references,
      });

      setFeedback((current) => ({
        ...current,
        [subject]: value,
      }));
    } catch (nextError) {
      console.error("Could not save identity feedback:", nextError);
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Could not save identity feedback."
      );
    } finally {
      setSavingSubject(null);
    }
  }

  return (
    <section className="photo-identity-feedback">
      <header>
        <div>
          <small>IDENTITY FEEDBACK</small>
          <strong>Did the face feel right?</strong>
        </div>

        <span>real refs only</span>
      </header>

      <p>
        This only changes which real reference photos are preferred later.
        The generated image never becomes part of the visual canon.
      </p>

      <div className="photo-identity-feedback-groups">
        {subjects.map((subject) => {
          const selected = feedback[subject] ?? null;
          const saving = savingSubject === subject;

          return (
            <div
              className="photo-identity-feedback-group"
              key={subject}
            >
              <small>
                {subjectTitle(subject, request.subject_type)}
              </small>

              <div>
                <button
                  type="button"
                  className={
                    selected === "positive" ? "active positive" : ""
                  }
                  aria-pressed={selected === "positive"}
                  disabled={Boolean(savingSubject)}
                  onClick={() => void submit(subject, "positive")}
                >
                  {selected === "positive" ? (
                    <Check size={13} />
                  ) : (
                    <ThumbsUp size={13} />
                  )}
                  {positiveLabel(subject, request.subject_type)}
                </button>

                <button
                  type="button"
                  className={
                    selected === "negative" ? "active negative" : ""
                  }
                  aria-pressed={selected === "negative"}
                  disabled={Boolean(savingSubject)}
                  onClick={() => void submit(subject, "negative")}
                >
                  {selected === "negative" ? (
                    <Check size={13} />
                  ) : (
                    <ThumbsDown size={13} />
                  )}
                  {negativeLabel(subject, request.subject_type)}
                </button>
              </div>

              {saving && <em>Saving…</em>}
            </div>
          );
        })}
      </div>

      {error && <p className="photo-identity-feedback-error">{error}</p>}
    </section>
  );
}
