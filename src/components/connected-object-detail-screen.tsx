import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ArrowLeft,
  Link2,
  X,
  ZoomIn,
  ZoomOut,
  Trash2,
} from "lucide-react";

import {
  usePrivateDiario,
} from "@/components/private-diario";

import {
  ConnectedDiaryObject,
} from "@/components/connected-diary-object";

import {
  supabase,
} from "@/integrations/supabase/client";

import {
  connectedKindLabel,
  getConnectableDiaryItems,
  hydrateDiaryItems,
  type ConnectedDiaryView,
} from "@/lib/connected-diary";

import type {
  DiarioItem,
} from "@/lib/diario-world";

import "./connected-diary.css";

type ConnectedRelation = {
  relation: string;
  direction:
    | "outgoing"
    | "incoming";
  view: ConnectedDiaryView;
};

type ConnectionTargetKind =
  | "story_memory"
  | "date";

const db =
  supabase as any;

function relationLabel(
  relation: ConnectedRelation
) {
  const relatedKind =
    relation.view.item.kind;

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
    (
      relatedKind === "look" ||
      relatedKind === "clothing"
    )
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
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase()
    );
}

function targetKindLabel(
  kind: ConnectionTargetKind
) {
  return kind === "story_memory"
    ? "Memory"
    : "Date";
}

function targetMomentLabel(
  item: DiarioItem
) {
  const moment =
    item.kind === "date"
      ? (
          item.planned_for ??
          item.event_at ??
          item.created_at
        )
      : (
          item.event_at ??
          item.created_at
        );

  if (!moment) {
    return "";
  }

  try {
    return new Intl.DateTimeFormat(
      "en",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone:
          "America/Sao_Paulo",
      }
    ).format(
      new Date(moment)
    );
  } catch {
    return "";
  }
}

async function loadObject({
  userId,
  itemId,
}: {
  userId: string;
  itemId: string;
}): Promise<
  ConnectedDiaryView | null
> {
  const {
    data,
    error,
  } = await db
    .from("diario_items")
    .select("*")
    .eq("user_id", userId)
    .eq("id", itemId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const hydrated =
    await hydrateDiaryItems(
      [data]
    );

  return hydrated[0] ?? null;
}

async function loadRelations({
  userId,
  itemId,
}: {
  userId: string;
  itemId: string;
}): Promise<
  ConnectedRelation[]
> {
  const {
    data,
    error,
  } = await db
    .from("diario_links")
    .select(
      "source_item_id,target_item_id,relation"
    )
    .eq("user_id", userId)
    .or(
      `source_item_id.eq.${itemId},target_item_id.eq.${itemId}`
    );

  if (error) {
    throw error;
  }

  const rows =
    (data ?? []) as Array<{
      source_item_id: string;
      target_item_id: string;
      relation: string;
    }>;

  const relatedIds =
    Array.from(
      new Set(
        rows
          .map((row) =>
            row.source_item_id ===
            itemId
              ? row.target_item_id
              : row.source_item_id
          )
          .filter(Boolean)
      )
    );

  if (
    relatedIds.length === 0
  ) {
    return [];
  }

  const {
    data: relatedItems,
    error: itemError,
  } = await db
    .from("diario_items")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .in("id", relatedIds);

  if (itemError) {
    throw itemError;
  }

  const hydrated =
    await hydrateDiaryItems(
      relatedItems ?? []
    );

  const viewById =
    new Map(
      hydrated.map(
        (view) => [
          view.item.id,
          view,
        ]
      )
    );

  return rows
    .map(
      (
        row
      ): ConnectedRelation | null => {
        const outgoing =
          row.source_item_id ===
          itemId;

        const relatedId =
          outgoing
            ? row.target_item_id
            : row.source_item_id;

        const view =
          viewById.get(
            relatedId
          );

        if (!view) {
          return null;
        }

        return {
          relation:
            row.relation,

          direction:
            outgoing
              ? "outgoing"
              : "incoming",

          view,
        };
      }
    )
    .filter(
      (
        relation
      ): relation is ConnectedRelation =>
        relation !== null
    );
}

async function loadConnectionTargets({
  userId,
  itemId,
  kind,
}: {
  userId: string;
  itemId: string;
  kind: ConnectionTargetKind;
}): Promise<
  DiarioItem[]
> {
  let query =
    db
      .from(
        "diario_items"
      )
      .select("*")
      .eq(
        "user_id",
        userId
      )
      .eq(
        "status",
        "active"
      )
      .eq(
        "kind",
        kind
      )
      .neq(
        "id",
        itemId
      );

  if (
    kind === "date"
  ) {
    query =
      query
        .order(
          "planned_for",
          {
            ascending:
              false,
            nullsFirst:
              false,
          }
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        );
  } else {
    query =
      query
        .order(
          "event_at",
          {
            ascending:
              false,
            nullsFirst:
              false,
          }
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        );
  }

  const {
    data,
    error,
  } = await query;

  if (error) {
    throw error;
  }

  return (
    data ?? []
  ) as DiarioItem[];
}

export function ConnectedObjectDetailScreen({
  itemId,
  onOpenRelated,
  onBack,
}: {
  itemId: string;
  onOpenRelated:
    (
      itemId: string
    ) => void;
  onBack: () => void;
}) {
  const {
    session,
  } =
    usePrivateDiario();

  const [
    view,
    setView,
  ] =
    useState<
      ConnectedDiaryView | null
    >(null);

  const [
    relations,
    setRelations,
  ] =
    useState<
      ConnectedRelation[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const [
    pickerKind,
    setPickerKind,
  ] =
    useState<
      ConnectionTargetKind | null
    >(null);

  const [
    targets,
    setTargets,
  ] =
    useState<
      DiarioItem[]
    >([]);

  const [
    loadingTargets,
    setLoadingTargets,
  ] =
    useState(false);

  const [
    savingTargetId,
    setSavingTargetId,
  ] =
    useState<
      string | null
    >(null);

  const [
    contentPickerOpen,
    setContentPickerOpen,
  ] =
    useState(false);

  const [
    contentTargets,
    setContentTargets,
  ] =
    useState<
      DiarioItem[]
    >([]);

  const [
    photoViewerOpen,
    setPhotoViewerOpen,
  ] = useState(false);

  const [
    photoZoom,
    setPhotoZoom,
  ] = useState(1);

  const [deletingPhoto, setDeletingPhoto] = useState(false);
  const photoStageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError(null);

    setPickerKind(null);
    setTargets([]);

    setContentPickerOpen(
      false
    );

    setContentTargets([]);

    void Promise.all([
      loadObject({
        userId:
          session.user.id,
        itemId,
      }),

      loadRelations({
        userId:
          session.user.id,
        itemId,
      }),
    ])
      .then(
        ([
          loadedView,
          loadedRelations,
        ]) => {
          if (!active) {
            return;
          }

          setView(
            loadedView
          );

          setRelations(
            loadedRelations
          );

          if (
            !loadedView
          ) {
            setError(
              "This diary object no longer exists."
            );
          }
        }
      )
      .catch(
        (nextError) => {
          console.error(
            "Could not open connected diary object:",
            nextError
          );

          if (active) {
            setError(
              "This diary object could not be opened."
            );
          }
        }
      )
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [
    itemId,
    session.user.id,
  ]);

  const openPicker =
    async (
      kind:
        ConnectionTargetKind
    ) => {
      if (
        pickerKind ===
        kind
      ) {
        setPickerKind(null);
        setTargets([]);
        return;
      }

      setContentPickerOpen(
        false
      );

      setContentTargets([]);

      setPickerKind(kind);

      setLoadingTargets(
        true
      );

      setTargets([]);
      setError(null);

      try {
        const nextTargets =
          await loadConnectionTargets({
            userId:
              session.user.id,
            itemId,
            kind,
          });

        setTargets(
          nextTargets
        );
      } catch (
        nextError
      ) {
        console.error(
          "Could not load connection targets:",
          nextError
        );

        setError(
          "Connections could not be loaded."
        );
      } finally {
        setLoadingTargets(
          false
        );
      }
    };

  const openContentPicker =
    async () => {
      if (!view) {
        return;
      }

      if (
        contentPickerOpen
      ) {
        setContentPickerOpen(
          false
        );

        setContentTargets(
          []
        );

        return;
      }

      setPickerKind(null);
      setTargets([]);

      setContentPickerOpen(
        true
      );

      setLoadingTargets(
        true
      );

      setContentTargets([]);
      setError(null);

      try {
        const connectable =
          await getConnectableDiaryItems(
            session.user.id
          );

        const nextTargets =
          connectable
            .map(
              (candidate) =>
                candidate.item
            )
            .filter(
              (candidate) =>
                candidate.id !==
                itemId
            )
            .filter(
              (candidate) =>
                view.item.kind !==
                  "date" ||
                candidate.kind !==
                  "date"
            );

        setContentTargets(
          nextTargets
        );
      } catch (
        nextError
      ) {
        console.error(
          "Could not load diary contents:",
          nextError
        );

        setError(
          "Diary objects could not be loaded."
        );
      } finally {
        setLoadingTargets(
          false
        );
      }
    };

  const isConnectedTo =
    (
      targetId:
        string
    ) =>
      relations.some(
        (relation) =>
          relation.direction ===
            "incoming" &&
          relation.relation ===
            "contains" &&
          relation.view.item.id ===
            targetId
      );

  const toggleConnection =
    async (
      target:
        DiarioItem
    ) => {
      const connected =
        isConnectedTo(
          target.id
        );

      setSavingTargetId(
        target.id
      );

      setError(null);

      try {
        if (connected) {
          const {
            error:
              deleteError,
          } = await db
            .from(
              "diario_links"
            )
            .delete()
            .eq(
              "user_id",
              session.user.id
            )
            .eq(
              "source_item_id",
              target.id
            )
            .eq(
              "target_item_id",
              itemId
            )
            .eq(
              "relation",
              "contains"
            );

          if (
            deleteError
          ) {
            throw deleteError;
          }
        } else {
          const {
            error:
              linkError,
          } = await db
            .from(
              "diario_links"
            )
            .upsert(
              {
                user_id:
                  session.user.id,

                source_item_id:
                  target.id,

                target_item_id:
                  itemId,

                relation:
                  "contains",

                data: {},
              },
              {
                onConflict:
                  "user_id,source_item_id,target_item_id,relation",
              }
            );

          if (
            linkError
          ) {
            throw linkError;
          }
        }

        const nextRelations =
          await loadRelations({
            userId:
              session.user.id,
            itemId,
          });

        setRelations(
          nextRelations
        );
      } catch (
        nextError
      ) {
        console.error(
          "Could not update diary connection:",
          nextError
        );

        setError(
          "The connection could not be updated."
        );
      } finally {
        setSavingTargetId(
          null
        );
      }
    };

  const isContainedObject =
    (
      targetId:
        string
    ) =>
      relations.some(
        (relation) =>
          relation.direction ===
            "outgoing" &&
          relation.relation ===
            "contains" &&
          relation.view.item.id ===
            targetId
      );

  const toggleContainedObject =
    async (
      target:
        DiarioItem
    ) => {
      const connected =
        isContainedObject(
          target.id
        );

      setSavingTargetId(
        target.id
      );

      setError(null);

      try {
        if (connected) {
          const {
            error:
              deleteError,
          } = await db
            .from(
              "diario_links"
            )
            .delete()
            .eq(
              "user_id",
              session.user.id
            )
            .eq(
              "source_item_id",
              itemId
            )
            .eq(
              "target_item_id",
              target.id
            )
            .eq(
              "relation",
              "contains"
            );

          if (
            deleteError
          ) {
            throw deleteError;
          }
        } else {
          const {
            error:
              linkError,
          } = await db
            .from(
              "diario_links"
            )
            .upsert(
              {
                user_id:
                  session.user.id,

                source_item_id:
                  itemId,

                target_item_id:
                  target.id,

                relation:
                  "contains",

                data: {},
              },
              {
                onConflict:
                  "user_id,source_item_id,target_item_id,relation",
              }
            );

          if (
            linkError
          ) {
            throw linkError;
          }
        }

        const nextRelations =
          await loadRelations({
            userId:
              session.user.id,
            itemId,
          });

        setRelations(
          nextRelations
        );
      } catch (
        nextError
      ) {
        console.error(
          "Could not update diary contents:",
          nextError
        );

        setError(
          "The diary contents could not be updated."
        );
      } finally {
        setSavingTargetId(
          null
        );
      }
    };


  const deletePhoto = async () => {
    if (!view || view.item.kind !== "photo" || deletingPhoto) return;
    if (!window.confirm("Delete this photo? This cannot be undone.")) return;

    setDeletingPhoto(true);
    setError(null);

    try {
      const { error: linkError } = await db
        .from("diario_links")
        .delete()
        .eq("user_id", session.user.id)
        .or(`source_item_id.eq.${itemId},target_item_id.eq.${itemId}`);
      if (linkError) throw linkError;

      const { error: deleteError } = await db
        .from("diario_items")
        .delete()
        .eq("user_id", session.user.id)
        .eq("id", itemId)
        .eq("kind", "photo");
      if (deleteError) throw deleteError;

      setPhotoViewerOpen(false);
      onBack();
    } catch (nextError) {
      console.error("Could not delete photo:", nextError);
      setError("The photo could not be deleted.");
    } finally {
      setDeletingPhoto(false);
    }
  };

  if (loading) {
    return (
      <section className="connected-object-detail-screen">
        <button
          type="button"
          className="connected-object-back"
          onClick={onBack}
        >
          <ArrowLeft
            size={14}
          />

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
          <ArrowLeft
            size={14}
          />

          Back
        </button>

        <div className="connected-empty">
          {error ??
            "Object not found."}
        </div>
      </section>
    );
  }

 const isStructuralOnly =
    view.item.kind ===
      "story_memory" ||
    view.item.kind ===
      "album" ||
    view.item.kind ===
      "home_object";

  const canConnectToMemory =
    !isStructuralOnly;

  const canConnectToDate =
    !isStructuralOnly &&
    view.item.kind !==
      "date";

  const canManageContents =
    view.item.kind ===
      "date" ||
    view.item.kind ===
      "story_memory";

  const containerLabel =
    view.item.kind ===
    "date"
      ? "Date"
      : "Memory";

  const containedObjectCount =
    relations.filter(
      (relation) =>
        relation.direction ===
          "outgoing" &&
        relation.relation ===
          "contains"
    ).length;

  const memoryConnections =
    relations.filter(
      (relation) =>
        relation.direction ===
          "incoming" &&
        relation.view.item.kind ===
          "story_memory"
    ).length;

  const dateConnections =
    relations.filter(
      (relation) =>
        relation.direction ===
          "incoming" &&
        relation.view.item.kind ===
          "date"
    ).length;

  return (
    <section className={`connected-object-detail-screen connected-object-detail-${view.item.kind}`}>
      <button
        type="button"
        className="connected-object-back"
        onClick={onBack}
      >
        <ArrowLeft
          size={14}
        />

        Back
      </button>

      <header className="connected-screen-intro connected-object-detail-heading">
        <small>
          {connectedKindLabel(
            view.item.kind
          ).toUpperCase()}
        </small>

        <h1>
          {view.item.title ??
            connectedKindLabel(
              view.item.kind
            )}
        </h1>

        <p>
          The original piece. Memories, Dates,
          Calendar and Timeline only point back here —
          nothing gets duplicated.
        </p>
      </header>

      <section className="connected-object-detail-main">
        {view.item.kind === "photo" &&
          view.mediaUrl && (
            <button
              type="button"
              className="connected-photo-hero"
              onClick={() => {
                setPhotoZoom(1);
                setPhotoViewerOpen(true);
              }}
            >
              <img
                src={view.mediaUrl}
                alt={
                  view.item.title ??
                  "Diary photo"
                }
              />

              <span>
                tap to view full size
              </span>
            </button>
          )}

        <ConnectedDiaryObject
          view={view}
        />
      </section>

      {photoViewerOpen &&
        view.item.kind === "photo" &&
        view.mediaUrl && (
          <div
            className="connected-photo-viewer"
            role="dialog"
            aria-modal="true"
            aria-label="Photo viewer"
          >
            <div className="connected-photo-viewer-toolbar">
              <button
                type="button"
                aria-label="Zoom out"
                disabled={photoZoom <= 1}
                onClick={() =>
                  setPhotoZoom((current) =>
                    Math.max(
                      1,
                      Number(
                        (
                          current -
                          0.5
                        ).toFixed(1)
                      )
                    )
                  )
                }
              >
                <ZoomOut size={18} />
              </button>

              <span>
                {Math.round(
                  photoZoom * 100
                )}%
              </span>

              <button
                type="button"
                aria-label="Zoom in"
                disabled={photoZoom >= 3}
                onClick={() =>
                  setPhotoZoom((current) =>
                    Math.min(
                      3,
                      Number(
                        (
                          current +
                          0.5
                        ).toFixed(1)
                      )
                    )
                  )
                }
              >
                <ZoomIn size={18} />
              </button>

              <button
                type="button"
                className="connected-photo-viewer-delete"
                aria-label="Delete photo"
                disabled={deletingPhoto}
                onClick={() => void deletePhoto()}
              >
                <Trash2 size={18} />
              </button>

              <button
                type="button"
                className="connected-photo-viewer-close"
                aria-label="Close photo"
                onClick={() => {
                  setPhotoViewerOpen(false);
                  setPhotoZoom(1);
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div
              ref={photoStageRef}
              className="connected-photo-viewer-stage"
              onClick={(event) => {
                if (event.currentTarget.scrollLeft !== 0 || event.currentTarget.scrollTop !== 0) return;
                setPhotoZoom((current) => current === 1 ? 2 : 1);
              }}
            >
              <img
                src={view.mediaUrl}
                alt={
                  view.item.title ??
                  "Diary photo"
                }
                style={{
                  transform: `scale(${photoZoom})`,
                }}
              />
            </div>

            <p>
              tap the photo to zoom · drag to look around
            </p>
          </div>
        )}

      <section className="connected-object-relations">
        <header>
          <span>
            <Link2
              size={14}
            />
          </span>

          <div>
            <small>
              CONNECTED TO
            </small>

            <strong>
              {relations.length ===
              0
                ? "No thread attached yet"
                : `${
                    relations.length
                  } ${
                    relations.length ===
                    1
                      ? "connection"
                      : "connections"
                  }`}
            </strong>
          </div>
        </header>

        {relations.length ===
        0 ? (
          <p className="connected-object-no-relations">
            When this piece belongs to a Memory, Date,
            Place, outfit, Chat or another moment, its thread
            will appear here.
          </p>
        ) : (
          <div className="connected-relation-list">
            {relations.map(
              (
                relation,
                index
              ) => (
                <button
                  key={`${relation.direction}-${relation.relation}-${relation.view.item.id}-${index}`}
                  type="button"
                  onClick={() =>
                    onOpenRelated(
                      relation
                        .view
                        .item
                        .id
                    )
                  }
                >
                  <span>
                    {relationLabel(
                      relation
                    )}
                  </span>

                  <strong>
                    {relation
                      .view
                      .item
                      .title ??
                      connectedKindLabel(
                        relation
                          .view
                          .item
                          .kind
                      )}
                  </strong>

                  <small>
                    {connectedKindLabel(
                      relation
                        .view
                        .item
                        .kind
                    )}
                  </small>
                </button>
              )
            )}
          </div>
        )}
      </section>

      {canManageContents && (
        <section className="connected-object-relations">
          <header>
            <span>
              <Link2
                size={14}
              />
            </span>

            <div>
              <small>
                CONTENTS
              </small>

              <strong>
                {containedObjectCount ===
                0
                  ? `Nothing in this ${containerLabel} yet`
                  : `${
                      containedObjectCount
                    } ${
                      containedObjectCount ===
                      1
                        ? "object"
                        : "objects"
                    } in this ${containerLabel}`}
              </strong>
            </div>
          </header>

          <div className="connected-picker-list">
            <button
              type="button"
              className={
                contentPickerOpen
                  ? "connected"
                  : undefined
              }
              onClick={() =>
                void openContentPicker()
              }
            >
              <span>
                +
              </span>

              <div>
                <small>
                  {containerLabel.toUpperCase()}
                </small>

                <strong>
                  Manage {containerLabel} contents
                </strong>

                <small>
                  Add or remove original diary objects
                </small>
              </div>
            </button>
          </div>
        </section>
      )}

      {contentPickerOpen && (
        <section className="connected-object-picker">
          <header>
            <div>
              <small>
                {containerLabel.toUpperCase()} CONTENTS
              </small>

              <strong>
                Choose diary objects
              </strong>
            </div>

            <button
              type="button"
              onClick={() => {
                setContentPickerOpen(
                  false
                );

                setContentTargets(
                  []
                );
              }}
            >
              Close
            </button>
          </header>

          {loadingTargets ? (
            <div className="connected-empty">
              Finding diary objects…
            </div>
          ) : contentTargets.length ===
            0 ? (
            <div className="connected-empty">
              <strong>
                Nothing to add yet.
              </strong>

              <p>
                Photos, songs,
                letters, places,
                outfits, diary pages
                and other real
                objects will appear
                here.
              </p>
            </div>
          ) : (
            <div className="connected-picker-list">
              {contentTargets.map(
                (
                  target
                ) => {
                  const connected =
                    isContainedObject(
                      target.id
                    );

                  const saving =
                    savingTargetId ===
                    target.id;

                  return (
                    <button
                      key={
                        target.id
                      }
                      type="button"
                      className={
                        connected
                          ? "connected"
                          : undefined
                      }
                      aria-pressed={
                        connected
                      }
                      disabled={
                        savingTargetId !==
                        null
                      }
                      onClick={() =>
                        void toggleContainedObject(
                          target
                        )
                      }
                    >
                      <span>
                        {saving
                          ? "…"
                          : connected
                            ? "✓"
                            : "+"}
                      </span>

                      <div>
                        <small>
                          {connectedKindLabel(
                            target.kind
                          )}
                        </small>

                        <strong>
                          {target.title ??
                            connectedKindLabel(
                              target.kind
                            )}
                        </strong>

                        <small>
                          {targetMomentLabel(
                            target
                          )}
                        </small>
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          )}
        </section>
      )}

      {(canConnectToMemory ||
        canConnectToDate) && (
        <section className="connected-object-relations">
          <header>
            <span>
              <Link2
                size={14}
              />
            </span>

            <div>
              <small>
                ADD CONNECTION
              </small>

              <strong>
                Tie it to a moment
              </strong>
            </div>
          </header>

          <div className="connected-picker-list">
            {canConnectToMemory && (
              <button
                type="button"
                className={
                  pickerKind ===
                  "story_memory"
                    ? "connected"
                    : undefined
                }
                onClick={() =>
                  void openPicker(
                    "story_memory"
                  )
                }
              >
                <span>
                  +
                </span>

                <div>
                  <small>
                    MEMORY
                  </small>

                  <strong>
                    Add to a Memory
                  </strong>

                  <small>
                    {memoryConnections ===
                    0
                      ? "Not linked yet"
                      : `${
                          memoryConnections
                        } ${
                          memoryConnections ===
                          1
                            ? "Memory"
                            : "Memories"
                        } linked`}
                  </small>
                </div>
              </button>
            )}

            {canConnectToDate && (
              <button
                type="button"
                className={
                  pickerKind ===
                  "date"
                    ? "connected"
                    : undefined
                }
                onClick={() =>
                  void openPicker(
                    "date"
                  )
                }
              >
                <span>
                  +
                </span>

                <div>
                  <small>
                    DATE
                  </small>

                  <strong>
                    Add to a Date
                  </strong>

                  <small>
                    {dateConnections ===
                    0
                      ? "Not linked yet"
                      : `${
                          dateConnections
                        } ${
                          dateConnections ===
                          1
                            ? "Date"
                            : "Dates"
                        } linked`}
                  </small>
                </div>
              </button>
            )}
          </div>
        </section>
      )}

      {pickerKind && (
        <section className="connected-object-picker">
          <header>
            <div>
              <small>
                CONNECT TO
              </small>

              <strong>
                Choose a{" "}
                {targetKindLabel(
                  pickerKind
                )}
              </strong>
            </div>

            <button
              type="button"
              onClick={() => {
                setPickerKind(
                  null
                );

                setTargets(
                  []
                );
              }}
            >
              Close
            </button>
          </header>

          {loadingTargets ? (
            <div className="connected-empty">
              Finding{" "}
              {pickerKind ===
              "story_memory"
                ? "Memories"
                : "Dates"}
              …
            </div>
          ) : targets.length ===
            0 ? (
            <div className="connected-empty">
              <strong>
                No{" "}
                {pickerKind ===
                "story_memory"
                  ? "Memories"
                  : "Dates"}{" "}
                yet.
              </strong>

              <p>
                Create one first,
                then come back here
                to connect this
                object.
              </p>
            </div>
          ) : (
            <div className="connected-picker-list">
              {targets.map(
                (
                  target
                ) => {
                  const connected =
                    isConnectedTo(
                      target.id
                    );

                  const saving =
                    savingTargetId ===
                    target.id;

                  return (
                    <button
                      key={
                        target.id
                      }
                      type="button"
                      className={
                        connected
                          ? "connected"
                          : undefined
                      }
                      aria-pressed={
                        connected
                      }
                      disabled={
                        savingTargetId !==
                        null
                      }
                      onClick={() =>
                        void toggleConnection(
                          target
                        )
                      }
                    >
                      <span>
                        {saving
                          ? "…"
                          : connected
                            ? "✓"
                            : "+"}
                      </span>

                      <div>
                        <small>
                          {targetKindLabel(
                            pickerKind
                          )}
                        </small>

                        <strong>
                          {target.title ??
                            targetKindLabel(
                              pickerKind
                            )}
                        </strong>

                        <small>
                          {targetMomentLabel(
                            target
                          )}
                        </small>
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          )}
        </section>
      )}

      {error && (
        <p className="connected-error">
          {error}
        </p>
      )}
    </section>
  );
}
