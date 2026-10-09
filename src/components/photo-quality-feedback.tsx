import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PhotoGenerationRequest } from "@/lib/photo-engine";

const ISSUES = [
  { key: "face_alloah", label: "Alloah's face" },
  { key: "face_dominic", label: "Dominic's face" },
  { key: "tattoos", label: "Tattoos / placement" },
  { key: "wardrobe", label: "Clothes / shoes" },
  { key: "anatomy", label: "Hands / anatomy" },
  { key: "connection", label: "Expressions / interaction" },
  { key: "room", label: "Room / furniture" },
  { key: "lighting", label: "Natural lighting" },
  { key: "skin_tone", label: "Wrong skin color / undertone" },
  { key: "realism", label: "Looks AI-generated" },
  { key: "pose", label: "Pose / requested action" },
  { key: "body_placement", label: "Wrong person on top / lap" },
  { key: "prop_handling", label: "Wrong hand / duplicated object" },
  { key: "chemistry", label: "Unnatural couple chemistry" },
  { key: "hair", label: "Wrong hair / hairstyle" },
] as const;

type Review = { issues?: string[]; note?: string };

export function PhotoQualityFeedback({
  userId,
  request,
}: {
  userId: string;
  request: PhotoGenerationRequest;
}) {
  const initial = (request.context_snapshot?.photo_quality_review ?? {}) as Review;
  const options = ISSUES.filter((item) =>
    item.key !== "face_alloah" || request.subject_type !== "dominic"
  ).filter((item) =>
    item.key !== "face_dominic" || request.subject_type !== "me"
  ).filter((item) =>
    item.key !== "tattoos" || request.subject_type !== "me"
  );
  const [issues, setIssues] = useState<string[]>(
    Array.isArray(initial.issues) ? initial.issues : []
  );
  const [note, setNote] = useState(initial.note ?? "");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const toggle = (key: string) => {
    setNotice(null);
    setIssues((prev) => prev.includes(key)
      ? prev.filter((item) => item !== key)
      : [...prev, key]);
  };

  async function saveReview() {
    if (saving) return;
    setSaving(true);
    setNotice(null);
    try {
      const { data, error: fetchError } = await (supabase as any)
        .from("photo_generation_requests")
        .select("status,context_snapshot")
        .eq("id", request.id)
        .eq("user_id", userId)
        .single();
      if (fetchError) throw fetchError;
      if (data?.status !== "completed") throw new Error("Only saved photos can be reviewed.");
      const current = (data.context_snapshot ?? {}) as Record<string, unknown>;
      const { error } = await (supabase as any)
        .from("photo_generation_requests")
        .update({
          context_snapshot: {
            ...current,
            photo_quality_review: {
              version: 1,
              issues,
              note: note.trim().slice(0, 800),
              reviewed_at: new Date().toISOString(),
            },
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", request.id)
        .eq("user_id", userId)
        .eq("status", "completed");
      if (error) throw error;
      setNotice("Review saved. No photo generated or credits used.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save review.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="photo-engine-block" aria-label="Photo quality review">
      <div className="photo-engine-block-heading">
        <small>PHOTO QUALITY REVIEW · FREE</small>
        <strong>What looked wrong?</strong>
      </div>
      <p style={{ fontSize: 12, margin: 0 }}>
        Mark only what failed. This saves your review without re-generating anything.
      </p>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        {options.map((option) => (
          <button
            type="button"
            key={option.key}
            aria-pressed={issues.includes(option.key)}
            onClick={() => toggle(option.key)}
            style={{
              padding: "7px 10px",
              fontSize: 11,
              borderRadius: 6,
              border: issues.includes(option.key)
                ? "1px solid #762b3c"
                : "1px solid #bc9aa0",
              background: issues.includes(option.key) ? "#ead4d1" : "#fff8f1",
              color: "#51212b",
            }}
          >
            {issues.includes(option.key) ? "✓ " : ""}{option.label}
          </button>
        ))}
      </div>
      <textarea
        value={note}
        onChange={(event) => { setNotice(null); setNote(event.target.value); }}
        rows={2}
        maxLength={800}
        aria-label="Optional photo review note"
        placeholder="Optional: which face, garment, room or gesture looked wrong?"
        style={{ width: "100%", resize: "vertical", fontSize: 13, padding: 9, background: "#fff8f1", color: "#51212b", border: "1px solid #bc9aa0" }}
      />
      <button
        type="button"
        disabled={saving}
        onClick={() => void saveReview()}
        style={{ padding: 9, border: "1px solid #762b3c", background: "#762b3c", color: "white", borderRadius: 5 }}
      >
        {saving ? "Saving…" : "Save review (free)"}
      </button>
      {notice && <small role="status" style={{ color: "#51212b" }}>{notice}</small>}
    </section>
  );
}
