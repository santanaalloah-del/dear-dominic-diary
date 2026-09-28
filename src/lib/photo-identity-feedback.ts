import { supabase } from "@/integrations/supabase/client";

export type IdentityFeedbackSubject = "alloah" | "dominic";
export type IdentityFeedbackValue = "positive" | "negative";

export type IdentityReferenceUsage = {
  id: string;
  subject: string;
  purposes: string[];
  strength: string;
  referenceKind: string;
  isCurrent: boolean;
};

type StoredReferenceFeedback = {
  positive: number;
  negative: number;
  score: number;
  last_feedback_at: string | null;
  last_request_id: string | null;
};

type StoredRequestFeedback = {
  value: IdentityFeedbackValue;
  reference_ids: string[];
  at: string;
};

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function safeObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function parseReferenceFeedback(metadata: unknown): StoredReferenceFeedback {
  const root = safeObject(metadata);
  const raw = safeObject(root.identity_feedback);

  const positive = Math.max(0, numberValue(raw.positive));
  const negative = Math.max(0, numberValue(raw.negative));

  return {
    positive,
    negative,
    score:
      typeof raw.score === "number"
        ? raw.score
        : positive - negative * 1.25,
    last_feedback_at:
      typeof raw.last_feedback_at === "string"
        ? raw.last_feedback_at
        : null,
    last_request_id:
      typeof raw.last_request_id === "string"
        ? raw.last_request_id
        : null,
  };
}

export function identityFeedbackBoost(metadata: unknown) {
  const feedback = parseReferenceFeedback(metadata);

  // Feedback is intentionally a nudge, not a replacement for the canon.
  // A real anchor still needs to be a useful face/body/tattoo reference.
  const raw = feedback.positive - feedback.negative * 1.35;

  return Math.max(-60, Math.min(60, raw * 15));
}

export function identityReferenceUsageFromFeatureData(
  featureData: unknown
): IdentityReferenceUsage[] {
  const data = safeObject(featureData);
  const raw = data.identityReferenceUsage;

  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const value = item as Record<string, unknown>;
      if (typeof value.id !== "string" || typeof value.subject !== "string") {
        return null;
      }

      return {
        id: value.id,
        subject: value.subject,
        purposes: stringArray(value.purposes),
        strength:
          typeof value.strength === "string"
            ? value.strength
            : "supporting",
        referenceKind:
          typeof value.referenceKind === "string"
            ? value.referenceKind
            : "identity",
        isCurrent: value.isCurrent === true,
      } satisfies IdentityReferenceUsage;
    })
    .filter((item): item is IdentityReferenceUsage => item !== null);
}

function requestFeedbackMap(contextSnapshot: unknown) {
  const context = safeObject(contextSnapshot);
  return safeObject(context.identity_feedback);
}

function sameIds(first: string[], second: string[]) {
  if (first.length !== second.length) return false;

  const a = [...first].sort();
  const b = [...second].sort();

  return a.every((value, index) => value === b[index]);
}

export async function recordPhotoIdentityFeedback({
  userId,
  requestId,
  subject,
  value,
  references,
}: {
  userId: string;
  requestId: string;
  subject: IdentityFeedbackSubject;
  value: IdentityFeedbackValue;
  references: IdentityReferenceUsage[];
}) {
  const eligibleIds = Array.from(
    new Set(
      references
        .filter(
          (reference) =>
            reference.subject === subject &&
            reference.referenceKind === "identity" &&
            !reference.isCurrent
        )
        .map((reference) => reference.id)
    )
  );

  if (!eligibleIds.length) {
    throw new Error(
      "No permanent identity references were used for this subject."
    );
  }

  const { data: requestRow, error: requestError } = await (supabase as any)
    .from("photo_generation_requests")
    .select("context_snapshot")
    .eq("id", requestId)
    .eq("user_id", userId)
    .single();

  if (requestError) throw requestError;

  const currentContext = safeObject(requestRow?.context_snapshot);
  const currentFeedbackMap = requestFeedbackMap(currentContext);
  const previousRaw = safeObject(currentFeedbackMap[subject]);

  const previousValue =
    previousRaw.value === "positive" || previousRaw.value === "negative"
      ? (previousRaw.value as IdentityFeedbackValue)
      : null;

  const previousIds = stringArray(previousRaw.reference_ids);

  if (
    previousValue === value &&
    sameIds(previousIds, eligibleIds)
  ) {
    return {
      changed: false,
      referenceCount: eligibleIds.length,
    };
  }

  const affectedIds = Array.from(
    new Set([...previousIds, ...eligibleIds])
  );

  const { data: rows, error: rowsError } = await (supabase as any)
    .from("visual_references")
    .select("id,metadata")
    .eq("user_id", userId)
    .in("id", affectedIds);

  if (rowsError) throw rowsError;

  const now = new Date().toISOString();
  const previousSet = new Set(previousIds);
  const nextSet = new Set(eligibleIds);

  await Promise.all(
    (rows ?? []).map(
      async (row: {
        id: string;
        metadata: Record<string, unknown> | null;
      }) => {
        const metadata = safeObject(row.metadata);
        const existing = parseReferenceFeedback(metadata);

        let positive = existing.positive;
        let negative = existing.negative;

        if (previousValue && previousSet.has(row.id)) {
          if (previousValue === "positive") {
            positive = Math.max(0, positive - 1);
          } else {
            negative = Math.max(0, negative - 1);
          }
        }

        if (nextSet.has(row.id)) {
          if (value === "positive") {
            positive += 1;
          } else {
            negative += 1;
          }
        }

        const nextFeedback: StoredReferenceFeedback = {
          positive,
          negative,
          score: positive - negative * 1.25,
          last_feedback_at: now,
          last_request_id: requestId,
        };

        const { error } = await (supabase as any)
          .from("visual_references")
          .update({
            metadata: {
              ...metadata,
              identity_feedback: nextFeedback,
            },
            updated_at: now,
          })
          .eq("id", row.id)
          .eq("user_id", userId);

        if (error) throw error;
      }
    )
  );

  const nextRequestFeedback: StoredRequestFeedback = {
    value,
    reference_ids: eligibleIds,
    at: now,
  };

  const { error: requestUpdateError } = await (supabase as any)
    .from("photo_generation_requests")
    .update({
      context_snapshot: {
        ...currentContext,
        identity_feedback: {
          ...currentFeedbackMap,
          [subject]: nextRequestFeedback,
        },
      },
      updated_at: now,
    })
    .eq("id", requestId)
    .eq("user_id", userId);

  if (requestUpdateError) throw requestUpdateError;

  return {
    changed: true,
    referenceCount: eligibleIds.length,
  };
}
