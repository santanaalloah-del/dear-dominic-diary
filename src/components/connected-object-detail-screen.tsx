import { useEffect, useState } from "react";
import { ArrowLeft, Link2 } from "lucide-react";

import { usePrivateDiario } from "@/components/private-diario";
import { ConnectedDiaryObject } from "@/components/connected-diary-object";
import { supabase } from "@/integrations/supabase/client";
import {
  connectedKindLabel,
  hydrateDiaryItems,
  type ConnectedDiaryView,
} from "@/lib/connected-diary";

import "./connected-diary.css";

type ConnectedRelation = {
  relation: string;
  direction: "outgoing" | "incoming";
  view: ConnectedDiaryView;
};

const db = supabase as any;

function relationLabel(relation: ConnectedRelation) {
  const relatedKind = relation.view.item.kind;

  if (
    relation.direction === "incoming" &&
    relatedKind === "story_memory"
  ) {
    return "In Memory";
  }

  if (
    relation.direction === "incoming" &&
    relatedKind === "date"
  ) {
    return "From Date";
  }

  if (
    relation.direction === "incoming" &&
    relatedKind === "place"
  ) {
    return "At";
  }

  if (
    relation.direction === "incoming" &&
    relatedKind === "chat_media"
  ) {
    return "From Chat";
  }

  if (
    relation.direction === "incoming" &&
    (relatedKind === "look" ||
      relatedKind === "clothing")
  ) {
    return "Wearing";
  }

  if (
    relation.direction === "outgoing" &&
    relation.relation === "contains"
  ) {
    return "Contains";
  }

  return relation.relation
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
}

async function loadObject({
  userId,
  itemId,
}: {
  userId: string;
  itemId: string;
}): Promise<ConnectedDiaryView | null> {
  const { data, error } = await db
    .from("diario_items")
    .select("*")
    .eq("user_id", userId)
    .eq("id", itemId)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const hydrated = await hydrateDiaryItems([data]);

  return hydrated[0] ?? null;
}

async function loadRelations({
  userId,
  itemId,
}: {
  userId: string;
  itemId: string;
}): Promise<ConnectedRelation[]> {
  const { data, error } = await db
    .from("diario_links")
    .select("source_item_id,target_item_id,relation")
    .eq("user_id", userId)
    .or(`source_item_id.eq.${itemId},target_item_id.eq.${itemId}`);

  if (error) throw error;

  const rows = (data ?? []) as Array<{
    source_item_id: string;
    target_item_id: string;
    relation: string;
  }>;

  const relatedIds = Array.from(
    new Set(
      rows
        .map((row) =>
          row.source_item_id === itemId
            ? row.target_item_id
            : row.source_item_id
        )
        .filter(Boolean)
    )
  );

  if (!relatedIds.length) return [];

  const { data: relatedItems, error: itemError } =
    await db
      .from("diario_items")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .in("id", relatedIds);

  if (itemError) throw itemError;

  const hydrated = await hydrateDiaryItems(
    relatedItems ?? []
  );
  const viewById = new Map(
    hydrated.map((view) => [view.item.id, view])
  );

  return rows
    .map((row): ConnectedRelation | null => {
      const outgoing = row.source_item_id === itemId;
      const relatedId = outgoing
        ? row.target_item_id
        : row.source_item_id;
      const view = viewById.get(relatedId);

      if (!view) return null;

      return {
        relation: row.relation,
        direction: outgoing ? "outgoing" : "incoming",
        view,
      };
    })
    .filter(
      (relation): relation is ConnectedRelation =>
        relation !== null
    );
}

export function ConnectedObjectDetailScreen({
  itemId,
  onOpenRelated,
  onBack,
}: {
  itemId: string;
  onOpenRelated: (itemId: string) => void;
  onBack: () => void;
}) {
  const { session } = usePrivateDiario();

  const [view, setView] =
    useState<ConnectedDiaryView | null>(null);
  const [relations, setRelations] =
    useState<ConnectedRelation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError(null);

    void Promise.all([
      loadObject({
        userId: session.user.id,
        itemId,
      }),
      loadRelations({
        userId: session.user.id,
        itemId,
      }),
    ])
      .then(([loadedView, loadedRelations]) => {
        if (!active) return;

        setView(loadedView);
        setRelations(loadedRelations);

        if (!loadedView) {
          setError("This diary object no longer exists.");
        }
      })
      .catch((nextError) => {
        console.error(
          "Could not open connected diary object:",
          nextError
        );

        if (active) {
          setError(
            "This diary object could not be opened."
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [itemId, session.user.id]);

  if (loading) {
    return (
      <section className="connected-object-detail-screen">
        <button
          type="button"
          className="connected-object-back"
          onClick={onBack}
        >
          <ArrowLeft size={14} />
          Back
        </button>

        <div className="connected-empty">
          Opening object…
        </div>
      </section>
    );
  }

  if (!view) {
    return (
      <section className="connected-object-detail-screen">
        <button
          type="button"
          className="connected-object-back"
          onClick={onBack}
        >
          <ArrowLeft size={14} />
          Back
        </button>

        <div className="connected-empty">
          {error ?? "Object not found."}
        </div>
      </section>
    );
  }

  return (
    <section className="connected-object-detail-screen">
      <button
        type="button"
        className="connected-object-back"
        onClick={onBack}
      >
        <ArrowLeft size={14} />
        Back
      </button>

      <header className="connected-screen-intro connected-object-detail-heading">
        <small>
          {connectedKindLabel(view.item.kind).toUpperCase()}
        </small>

        <h1>
          {view.item.title ??
            connectedKindLabel(view.item.kind)}
        </h1>

        <p>
          One original diary object. Every Memory,
          Calendar day and Timeline appearance points
          back to this same object.
        </p>
      </header>

      <section className="connected-object-detail-main">
        <ConnectedDiaryObject view={view} />
      </section>

      <section className="connected-object-relations">
        <header>
          <span>
            <Link2 size={14} />
          </span>

          <div>
            <small>CONNECTED TO</small>
            <strong>
              {relations.length === 0
                ? "Nothing yet"
                : `${relations.length} ${
                    relations.length === 1
                      ? "connection"
                      : "connections"
                  }`}
            </strong>
          </div>
        </header>

        {relations.length === 0 ? (
          <p className="connected-object-no-relations">
            When this object becomes part of a Memory,
            Date, Place, outfit or another diary moment,
            the relationship will appear here.
          </p>
        ) : (
          <div className="connected-relation-list">
            {relations.map((relation, index) => (
              <button
                key={`${relation.direction}-${relation.relation}-${relation.view.item.id}-${index}`}
                type="button"
                onClick={() =>
                  onOpenRelated(
                    relation.view.item.id
                  )
                }
              >
                <span>
                  {relationLabel(relation)}
                </span>

                <strong>
                  {relation.view.item.title ??
                    connectedKindLabel(
                      relation.view.item.kind
                    )}
                </strong>

                <small>
                  {connectedKindLabel(
                    relation.view.item.kind
                  )}
                </small>
              </button>
            ))}
          </div>
        )}
      </section>

      {error && (
        <p className="connected-error">{error}</p>
      )}
    </section>
  );
}
