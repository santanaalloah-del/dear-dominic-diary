import { useEffect, useMemo, useState } from "react";
import { Image as ImageIcon, Plus, X } from "lucide-react";

import { usePrivateDiario } from "@/components/private-diario";
import { ConnectedDiaryObject } from "@/components/connected-diary-object";
import { ConnectedObjectDetailScreen } from "@/components/connected-object-detail-screen";
import {
  addItemToMemory,
  createMemory,
  getMemories,
  removeItemFromMemory,
  type DiarioItem,
} from "@/lib/diario-world";
import {
  connectedKindLabel,
  getConnectableDiaryItems,
  getMemoryConnectedItems,
  getMemoryConnectionMap,
  type ConnectedDiaryView,
  type MemoryConnectionMap,
} from "@/lib/connected-diary";

import "./connected-diary.css";

type MemoryFilter = "all" | "photos" | "letters" | "music" | "dates";

const filters: Array<{ id: MemoryFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "photos", label: "Photos" },
  { id: "letters", label: "Letters" },
  { id: "music", label: "Music" },
  { id: "dates", label: "Dates" },
];

function wantedKind(filter: MemoryFilter) {
  if (filter === "photos") return "photo";
  if (filter === "letters") return "letter";
  if (filter === "music") return "song";
  if (filter === "dates") return "date";
  return null;
}

function memoryDate(memory: DiarioItem) {
  return memory.event_at ?? memory.created_at;
}

function monthKey(memory: DiarioItem) {
  const date = new Date(memoryDate(memory));

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function ConnectedMemoriesScreen() {
  const { session } = usePrivateDiario();
  const [selectedObjectId, setSelectedObjectId] =
    useState<string | null>(null);

  const [memories, setMemories] = useState<DiarioItem[]>([]);
  const [connectionMap, setConnectionMap] =
    useState<MemoryConnectionMap>({});
  const [selectedMemory, setSelectedMemory] =
    useState<DiarioItem | null>(null);
  const [selectedObjects, setSelectedObjects] =
    useState<ConnectedDiaryView[]>([]);
  const [choices, setChoices] =
    useState<ConnectedDiaryView[]>([]);
  const [filter, setFilter] = useState<MemoryFilter>("all");
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [editingObjects, setEditingObjects] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function loadMemories() {
    const loaded = await getMemories(session.user.id);
    setMemories(loaded);

    const map = await getMemoryConnectionMap({
      userId: session.user.id,
      memoryIds: loaded.map((memory) => memory.id),
    });

    setConnectionMap(map);
  }

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError(null);

    void getMemories(session.user.id)
      .then(async (loaded) => {
        if (!active) return;

        const map = await getMemoryConnectionMap({
          userId: session.user.id,
          memoryIds: loaded.map((memory) => memory.id),
        });

        if (!active) return;

        setMemories(loaded);
        setConnectionMap(map);
      })
      .catch((nextError) => {
        console.error("Could not open connected Memories:", nextError);
        if (active) {
          setError("Memories could not be opened right now.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [session.user.id]);

  const visibleMemories = useMemo(() => {
    const kind = wantedKind(filter);

    if (!kind) return memories;

    return memories.filter((memory) =>
      (connectionMap[memory.id] ?? []).some(
        (view) => view.item.kind === kind
      )
    );
  }, [memories, connectionMap, filter]);

  const groupedMemories = useMemo(() => {
    const groups: Array<{
      label: string;
      memories: DiarioItem[];
    }> = [];

    for (const memory of visibleMemories) {
      const label = monthKey(memory);
      const existing = groups.find((group) => group.label === label);

      if (existing) {
        existing.memories.push(memory);
      } else {
        groups.push({
          label,
          memories: [memory],
        });
      }
    }

    return groups;
  }, [visibleMemories]);

  async function openMemory(memory: DiarioItem) {
    setSelectedMemory(memory);
    setOpening(true);
    setEditingObjects(false);
    setError(null);

    try {
      const objects = await getMemoryConnectedItems({
        userId: session.user.id,
        memoryId: memory.id,
      });

      setSelectedObjects(objects);
    } catch (nextError) {
      console.error("Could not open connected memory:", nextError);
      setError("The memory could not be opened.");
    } finally {
      setOpening(false);
    }
  }

  async function startEditingObjects() {
    if (!selectedMemory) return;

    setError(null);

    try {
      const loaded = await getConnectableDiaryItems(session.user.id);
      setChoices(loaded);
      setEditingObjects(true);
    } catch (nextError) {
      console.error("Could not load connectable diary objects:", nextError);
      setError("The diary objects could not be opened.");
    }
  }

  async function toggleObject(view: ConnectedDiaryView) {
    if (!selectedMemory) return;

    const connected = selectedObjects.some(
      (current) => current.item.id === view.item.id
    );

    setError(null);

    try {
      if (connected) {
        await removeItemFromMemory({
          userId: session.user.id,
          memoryId: selectedMemory.id,
          itemId: view.item.id,
        });

        setSelectedObjects((current) =>
          current.filter((item) => item.item.id !== view.item.id)
        );
      } else {
        await addItemToMemory({
          userId: session.user.id,
          memoryId: selectedMemory.id,
          itemId: view.item.id,
        });

        setSelectedObjects((current) => [...current, view]);
      }

      setConnectionMap((current) => ({
        ...current,
        [selectedMemory.id]: connected
          ? (current[selectedMemory.id] ?? []).filter(
              (item) => item.item.id !== view.item.id
            )
          : [...(current[selectedMemory.id] ?? []), view],
      }));
    } catch (nextError) {
      console.error("Could not change Memory connection:", nextError);
      setError("That object could not be changed.");
    }
  }

  async function saveMemory() {
    if (!title.trim() || saving) return;

    setSaving(true);
    setError(null);

    try {
      const memory = await createMemory({
        userId: session.user.id,
        title,
        body,
      });

      setTitle("");
      setBody("");
      setCreating(false);
      setMemories((current) => [memory, ...current]);
      setConnectionMap((current) => ({
        ...current,
        [memory.id]: [],
      }));
    } catch (nextError) {
      console.error("Could not create Memory:", nextError);
      setError("The memory could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  if (selectedObjectId) {
    return (
      <ConnectedObjectDetailScreen
        itemId={selectedObjectId}
        onOpenRelated={setSelectedObjectId}
        onBack={() => {
          setSelectedObjectId(
            null
          );

          if (
            selectedMemory
          ) {
            void openMemory(
              selectedMemory
            );
          }

          void loadMemories();
        }}
      />
    );
  }

  if (selectedMemory) {
    return (
      <section className="connected-memories-screen">
        <header className="connected-detail-header">
          <button
            type="button"
            onClick={() => {
              setSelectedMemory(null);
              setSelectedObjects([]);
              setEditingObjects(false);
            }}
          >
            ← Memories
          </button>

          <small>MEMORY</small>

          <h1>{selectedMemory.title ?? "Untitled memory"}</h1>

          <time>
            {new Intl.DateTimeFormat("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            }).format(new Date(memoryDate(selectedMemory)))}
          </time>

          {selectedMemory.body && <p>{selectedMemory.body}</p>}
        </header>

        {opening ? (
          <div className="connected-empty">Opening memory…</div>
        ) : editingObjects ? (
          <section className="connected-object-picker">
            <header>
              <div>
                <small>REAL OBJECTS</small>
                <strong>What belongs to this memory?</strong>
              </div>

              <button
                type="button"
                onClick={() => setEditingObjects(false)}
              >
                Done
              </button>
            </header>

            {choices.length === 0 ? (
              <p>There are no diary objects available yet.</p>
            ) : (
              <div className="connected-picker-list">
                {choices.map((view) => {
                  const connected = selectedObjects.some(
                    (item) => item.item.id === view.item.id
                  );

                  return (
                    <button
                      key={view.item.id}
                      type="button"
                      className={connected ? "connected" : ""}
                      onClick={() => void toggleObject(view)}
                    >
                      <span>
                        {connected ? "✓" : "+"}
                      </span>

                      <div>
                        <small>{connectedKindLabel(view.item.kind)}</small>
                        <strong>
                          {view.item.title ??
                            connectedKindLabel(view.item.kind)}
                        </strong>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          <section className="connected-memory-objects">
            {selectedObjects.length === 0 ? (
              <div className="connected-empty">
                <ImageIcon size={23} strokeWidth={1.3} />
                <strong>No objects connected yet.</strong>
                <p>
                  Add photos, letters, music, dates, diary pages,
                  places, keepsakes or outfits. They stay the same
                  original objects everywhere.
                </p>
              </div>
            ) : (
              selectedObjects.map((view) => (
                <ConnectedDiaryObject
                  key={view.item.id}
                  view={view}
                  onOpen={() =>
                    setSelectedObjectId(view.item.id)
                  }
                />
              ))
            )}

            <button
              type="button"
              className="connected-add-objects"
              onClick={() => void startEditingObjects()}
            >
              <Plus size={15} />
              Add or remove real objects
            </button>
          </section>
        )}

        {error && <p className="connected-error">{error}</p>}
      </section>
    );
  }

  return (
    <section className="connected-memories-screen">
      <header className="connected-screen-intro">
        <small>MOMENTS THAT ACTUALLY HAPPENED</small>
        <h1>Memories</h1>
        <p>
          A scrapbook timeline made from the real objects already
          living in your diary.
        </p>
      </header>

      <div className="connected-memory-toolbar">
        <div role="tablist" aria-label="Memory type">
          {filters.map((option) => (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={filter === option.id}
              className={filter === option.id ? "active" : ""}
              onClick={() => setFilter(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="connected-new-memory"
          onClick={() => setCreating(true)}
        >
          <Plus size={14} />
          Memory
        </button>
      </div>

      {creating && (
        <section className="connected-memory-create">
          <header>
            <div>
              <small>NEW MEMORY</small>
              <strong>What happened?</strong>
            </div>

            <button type="button" onClick={() => setCreating(false)}>
              <X size={15} />
            </button>
          </header>

          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Memory title"
          />

          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="A small note about the moment…"
            rows={4}
          />

          <button
            type="button"
            onClick={() => void saveMemory()}
            disabled={!title.trim() || saving}
          >
            {saving ? "Saving…" : "Create memory"}
          </button>
        </section>
      )}

      {loading ? (
        <div className="connected-empty">Opening Memories…</div>
      ) : groupedMemories.length === 0 ? (
        <div className="connected-empty">
          <ImageIcon size={26} strokeWidth={1.3} />
          <strong>No memories here yet.</strong>
        </div>
      ) : (
        <div className="connected-memory-timeline">
          {groupedMemories.map((group) => (
            <section className="connected-memory-month" key={group.label}>
              <header>
                <span />
                <strong>{group.label}</strong>
              </header>

              {group.memories.map((memory, index) => {
                const objects = connectionMap[memory.id] ?? [];

                return (
                  <button
                    key={memory.id}
                    type="button"
                    className={[
                      "connected-memory-node",
                      index % 3 === 1 ? "memory-node-right" : "",
                      objects.length >= 3 ? "memory-node-important" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => void openMemory(memory)}
                  >
                    <time>
                      {new Intl.DateTimeFormat("en-US", {
                        month: "short",
                        day: "numeric",
                      }).format(new Date(memoryDate(memory)))}
                    </time>

                    <strong>{memory.title ?? "Untitled memory"}</strong>

                    {memory.body && <p>{memory.body}</p>}

                    {objects.length > 0 && (
                      <div className="connected-memory-previews">
                        {objects.slice(0, 4).map((view) =>
                          view.item.kind === "photo" && view.mediaUrl ? (
                            <img
                              key={view.item.id}
                              src={view.mediaUrl}
                              alt=""
                              loading="lazy"
                            />
                          ) : (
                            <span key={view.item.id}>
                              {connectedKindLabel(view.item.kind)}
                            </span>
                          )
                        )}
                      </div>
                    )}

                    <small>
                      {objects.length === 0
                        ? "empty memory"
                        : `${objects.length} connected ${
                            objects.length === 1 ? "object" : "objects"
                          }`}
                    </small>
                  </button>
                );
              })}
            </section>
          ))}
        </div>
      )}

      {error && <p className="connected-error">{error}</p>}
    </section>
  );
}
