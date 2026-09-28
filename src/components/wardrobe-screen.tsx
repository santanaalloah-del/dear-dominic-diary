// @ts-nocheck
import { useEffect, useState } from "react";
import {
  Calendar as CalendarIcon,
  Check,
  Image as ImageIcon,
  Shirt,
  Sparkles,
  X,
} from "lucide-react";

import { usePrivateDiario } from "@/components/private-diario";
import {
  addClothingToLook,
  createClothing,
  createLook,
  getLookClothingIds,
  getLooks,
  getWardrobeItems,
  type DiarioItem,
} from "@/lib/diario-world";
import {
  clearWearing,
  getWearingSelection,
  setWearingClothing,
  setWearingLook,
  type WearingSelection,
  type WardrobeOwner,
} from "@/lib/wardrobe-context";

import "./wardrobe-wearing.css";

type WardrobeOwnerView = "mine" | "dominic";
type WardrobeView = "closet" | "looks" | "wearing";

function ownerToDb(owner: WardrobeOwnerView): WardrobeOwner {
  return owner === "mine" ? "alloah" : "dominic";
}

function ownerLabel(owner: WardrobeOwnerView) {
  return owner === "mine" ? "My" : "Dominic's";
}

export function WardrobeExperienceScreen() {
  const { session } = usePrivateDiario();

  const [wardrobeOwner, setWardrobeOwner] =
    useState<WardrobeOwnerView>("mine");

  const [wardrobeView, setWardrobeView] =
    useState<WardrobeView>("closet");

  const [wardrobeItems, setWardrobeItems] =
    useState<DiarioItem[]>([]);

  const [savedLooks, setSavedLooks] =
    useState<DiarioItem[]>([]);

  const [loadingWardrobe, setLoadingWardrobe] =
    useState(true);

  const [wardrobeError, setWardrobeError] =
    useState<string | null>(null);

  const [addingClothing, setAddingClothing] =
    useState(false);

  const [addingLook, setAddingLook] =
    useState(false);

  const [clothingName, setClothingName] =
    useState("");

  const [clothingCategory, setClothingCategory] =
    useState("top");

  const [clothingNote, setClothingNote] =
    useState("");

  const [lookName, setLookName] =
    useState("");

  const [lookNote, setLookNote] =
    useState("");

  const [
    selectedLookClothingIds,
    setSelectedLookClothingIds,
  ] = useState<string[]>([]);

  const [
    lookClothingByLookId,
    setLookClothingByLookId,
  ] = useState<Record<string, string[]>>({});

  const [wearingByOwner, setWearingByOwner] =
    useState<
      Record<
        WardrobeOwner,
        WearingSelection | null
      >
    >({
      alloah: null,
      dominic: null,
    });

  const [updatingWearing, setUpdatingWearing] =
    useState(false);

  const dbOwner = ownerToDb(wardrobeOwner);

  useEffect(() => {
    let active = true;

    setLoadingWardrobe(true);
    setWardrobeError(null);

    Promise.all([
      getWardrobeItems(session.user.id),
      getLooks(session.user.id),
      getWearingSelection({
        userId: session.user.id,
        owner: "alloah",
      }),
      getWearingSelection({
        userId: session.user.id,
        owner: "dominic",
      }),
    ])
      .then(
        ([
          loadedClothing,
          loadedLooks,
          alloahWearing,
          dominicWearing,
        ]) => {
          if (!active) return;

          setWardrobeItems(loadedClothing);
          setSavedLooks(loadedLooks);
          setWearingByOwner({
            alloah: alloahWearing,
            dominic: dominicWearing,
          });
          setLoadingWardrobe(false);
        }
      )
      .catch((loadError) => {
        if (!active) return;

        console.error(
          "Could not load Wardrobe:",
          loadError
        );

        setWardrobeError(
          "The wardrobe could not be opened."
        );

        setLoadingWardrobe(false);
      });

    return () => {
      active = false;
    };
  }, [session.user.id]);

  useEffect(() => {
    let active = true;

    const loadLookClothing = async () => {
      if (savedLooks.length === 0) {
        setLookClothingByLookId({});
        return;
      }

      try {
        const entries = await Promise.all(
          savedLooks.map(async (look) => {
            const ids =
              await getLookClothingIds({
                userId: session.user.id,
                lookId: look.id,
              });

            return [look.id, ids] as const;
          })
        );

        if (!active) return;

        setLookClothingByLookId(
          Object.fromEntries(entries)
        );
      } catch (loadError) {
        console.error(
          "Could not load look clothing:",
          loadError
        );
      }
    };

    void loadLookClothing();

    return () => {
      active = false;
    };
  }, [savedLooks, session.user.id]);

  const visibleItems =
    wardrobeItems.filter(
      (item) => item.owner === dbOwner
    );

  const visibleLooks =
    savedLooks.filter(
      (look) => look.owner === dbOwner
    );

  const wearing =
    wearingByOwner[dbOwner];

  const wearingItems =
    visibleItems.filter((item) =>
      wearing?.clothingIds.includes(item.id)
    );

  const wearingLook =
    wearing?.lookId
      ? visibleLooks.find(
          (look) =>
            look.id === wearing.lookId
        ) ?? null
      : null;

  const refreshOwnerWearing =
    async (owner: WardrobeOwner) => {
      const selection =
        await getWearingSelection({
          userId: session.user.id,
          owner,
        });

      setWearingByOwner((current) => ({
        ...current,
        [owner]: selection,
      }));

      return selection;
    };

  const saveClothing = async () => {
    if (!clothingName.trim()) return;

    setWardrobeError(null);

    try {
      const savedItem =
        await createClothing({
          userId: session.user.id,
          owner: dbOwner,
          title: clothingName,
          category: clothingCategory,
          note: clothingNote,
        });

      setWardrobeItems(
        (currentItems) => [
          savedItem,
          ...currentItems,
        ]
      );

      setClothingName("");
      setClothingCategory("top");
      setClothingNote("");
      setAddingClothing(false);
    } catch (saveError) {
      console.error(
        "Could not save clothing:",
        saveError
      );

      setWardrobeError(
        "The clothing item could not be saved."
      );
    }
  };

  const saveLook = async () => {
    if (!lookName.trim()) return;

    setWardrobeError(null);

    try {
      const savedLook =
        await createLook({
          userId: session.user.id,
          owner: dbOwner,
          title: lookName,
          note: lookNote,
        });

      await Promise.all(
        selectedLookClothingIds.map(
          (clothingId) =>
            addClothingToLook({
              userId: session.user.id,
              lookId: savedLook.id,
              clothingId,
            })
        )
      );

      setLookClothingByLookId(
        (current) => ({
          ...current,
          [savedLook.id]:
            selectedLookClothingIds,
        })
      );

      setSavedLooks(
        (currentLooks) => [
          savedLook,
          ...currentLooks,
        ]
      );

      setLookName("");
      setLookNote("");
      setSelectedLookClothingIds([]);
      setAddingLook(false);
    } catch (saveError) {
      console.error(
        "Could not save look:",
        saveError
      );

      setWardrobeError(
        "The look could not be saved."
      );
    }
  };

  const wearLook = async (
    look: DiarioItem
  ) => {
    setUpdatingWearing(true);
    setWardrobeError(null);

    try {
      const selection =
        await setWearingLook({
          userId: session.user.id,
          owner: dbOwner,
          lookId: look.id,
        });

      setWearingByOwner((current) => ({
        ...current,
        [dbOwner]: selection,
      }));
    } catch (error) {
      console.error(
        "Could not wear look:",
        error
      );

      setWardrobeError(
        "This look could not be set as Wearing."
      );
    } finally {
      setUpdatingWearing(false);
    }
  };

  const toggleWearingItem = async (
    item: DiarioItem
  ) => {
    setUpdatingWearing(true);
    setWardrobeError(null);

    try {
      const currentIds =
        wearing?.clothingIds ?? [];

      const nextIds =
        currentIds.includes(item.id)
          ? currentIds.filter(
              (id) => id !== item.id
            )
          : [...currentIds, item.id];

      const selection =
        await setWearingClothing({
          userId: session.user.id,
          owner: dbOwner,
          clothingIds: nextIds,
        });

      setWearingByOwner((current) => ({
        ...current,
        [dbOwner]: selection,
      }));
    } catch (error) {
      console.error(
        "Could not update Wearing:",
        error
      );

      setWardrobeError(
        "The current outfit could not be updated."
      );
    } finally {
      setUpdatingWearing(false);
    }
  };

  const stopWearing = async () => {
    setUpdatingWearing(true);
    setWardrobeError(null);

    try {
      await clearWearing({
        userId: session.user.id,
        owner: dbOwner,
      });

      await refreshOwnerWearing(
        dbOwner
      );
    } catch (error) {
      console.error(
        "Could not clear Wearing:",
        error
      );

      setWardrobeError(
        "The current outfit could not be cleared."
      );
    } finally {
      setUpdatingWearing(false);
    }
  };

  return (
    <section className="wardrobe-screen wardrobe-live">
      <header className="screen-intro">
        <p className="eyebrow">
          Clothes · looks · getting ready
        </p>

        <h1>Wardrobe</h1>

        <p className="intro-copy">
          clothes belong to the person who owns them.
          Wearing tells the rest of Diário what is on
          right now.
        </p>
      </header>

      <div
        className="wardrobe-owner-tabs"
        role="tablist"
        aria-label="Wardrobe owner"
      >
        <button
          type="button"
          role="tab"
          aria-selected={
            wardrobeOwner === "mine"
          }
          className={
            wardrobeOwner === "mine"
              ? "active"
              : ""
          }
          onClick={() =>
            setWardrobeOwner("mine")
          }
        >
          Mine
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={
            wardrobeOwner === "dominic"
          }
          className={
            wardrobeOwner === "dominic"
              ? "active"
              : ""
          }
          onClick={() =>
            setWardrobeOwner("dominic")
          }
        >
          Dominic
        </button>
      </div>

      <section
        className={
          wearing
            ? "wardrobe-current-summary active"
            : "wardrobe-current-summary"
        }
      >
        <div>
          <small>WEARING NOW</small>

          <strong>
            {wearingLook?.title ??
              (wearingItems.length
                ? `${wearingItems.length} ${
                    wearingItems.length === 1
                      ? "piece"
                      : "pieces"
                  }`
                : "Nothing selected")}
          </strong>
        </div>

        {wearing && (
          <span>
            <Check size={14} />
            Photo Engine ready
          </span>
        )}
      </section>

      <div
        className="wardrobe-view-tabs wardrobe-three-tabs"
        role="tablist"
        aria-label="Wardrobe view"
      >
        <button
          type="button"
          role="tab"
          aria-selected={
            wardrobeView === "closet"
          }
          className={
            wardrobeView === "closet"
              ? "active"
              : ""
          }
          onClick={() =>
            setWardrobeView("closet")
          }
        >
          Closet
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={
            wardrobeView === "looks"
          }
          className={
            wardrobeView === "looks"
              ? "active"
              : ""
          }
          onClick={() =>
            setWardrobeView("looks")
          }
        >
          Looks
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={
            wardrobeView === "wearing"
          }
          className={
            wardrobeView === "wearing"
              ? "active"
              : ""
          }
          onClick={() =>
            setWardrobeView("wearing")
          }
        >
          Wearing
        </button>
      </div>

      {loadingWardrobe ? (
        <section className="wardrobe-empty">
          <p>
            Opening the wardrobe…
          </p>
        </section>
      ) : wardrobeView === "wearing" ? (
        <section className="wardrobe-wearing-panel">
          <header>
            <div>
              <span>right now</span>
              <strong>
                {ownerLabel(
                  wardrobeOwner
                )} outfit
              </strong>
            </div>

            {wearing && (
              <button
                type="button"
                className="wardrobe-clear-wearing"
                onClick={() =>
                  void stopWearing()
                }
                disabled={
                  updatingWearing
                }
              >
                <X size={14} />
                Clear
              </button>
            )}
          </header>

          {!wearing ? (
            <div className="wardrobe-look-empty">
              <Sparkles
                size={24}
                strokeWidth={1.3}
              />

              <p>
                Nothing is marked as
                Wearing yet.
              </p>

              <small>
                Pick a saved look or tap
                Wear on individual pieces.
              </small>
            </div>
          ) : (
            <>
              {wearingLook && (
                <article className="wardrobe-wearing-look">
                  <small>
                    SAVED LOOK
                  </small>

                  <strong>
                    {wearingLook.title ??
                      "Untitled look"}
                  </strong>

                  {wearingLook.body && (
                    <p>
                      {wearingLook.body}
                    </p>
                  )}
                </article>
              )}

              <div className="wardrobe-wearing-list">
                {wearingItems.length ===
                0 ? (
                  <p>
                    This look currently has
                    no attached clothing.
                  </p>
                ) : (
                  wearingItems.map(
                    (item) => {
                      const category =
                        typeof item.data
                          ?.category ===
                        "string"
                          ? item.data
                              .category
                          : "other";

                      return (
                        <article
                          key={
                            item.id
                          }
                          className="wardrobe-wearing-piece"
                        >
                          <Shirt
                            size={19}
                            strokeWidth={
                              1.3
                            }
                          />

                          <span>
                            <strong>
                              {item.title ??
                                "Untitled"}
                            </strong>

                            <small>
                              {
                                category
                              }
                            </small>
                          </span>
                        </article>
                      );
                    }
                  )
                )}
              </div>

              <p className="wardrobe-photo-engine-note">
                This active outfit is now
                available to the Photo Engine
                whenever Current Look is enabled.
              </p>
            </>
          )}
        </section>
      ) : wardrobeView === "closet" ? (
        <section className="wardrobe-closet">
          <header>
            <div>
              <span>closet</span>

              <strong>
                {wardrobeOwner ===
                "mine"
                  ? "My clothes"
                  : "Dominic's clothes"}
              </strong>
            </div>

            <small>
              {visibleItems.length}{" "}
              {visibleItems.length === 1
                ? "item"
                : "items"}
            </small>
          </header>

          {addingClothing ? (
            <div className="wardrobe-empty">
              <small>
                new clothing
              </small>

              <h2>
                Add clothing
              </h2>

              <input
                type="text"
                value={clothingName}
                onChange={(event) =>
                  setClothingName(
                    event.target.value
                  )
                }
                placeholder="Name"
                autoFocus
              />

              <select
                value={
                  clothingCategory
                }
                onChange={(event) =>
                  setClothingCategory(
                    event.target.value
                  )
                }
              >
                <option value="top">
                  Top
                </option>
                <option value="bottom">
                  Bottom
                </option>
                <option value="dress">
                  Dress
                </option>
                <option value="outerwear">
                  Outerwear
                </option>
                <option value="shoes">
                  Shoes
                </option>
                <option value="accessory">
                  Accessory
                </option>
                <option value="other">
                  Other
                </option>
              </select>

              <textarea
                value={clothingNote}
                onChange={(event) =>
                  setClothingNote(
                    event.target.value
                  )
                }
                placeholder="A note about it…"
                rows={4}
              />

              <div className="diary-editor-actions">
                <button
                  type="button"
                  onClick={() => {
                    setAddingClothing(
                      false
                    );
                    setClothingName("");
                    setClothingCategory(
                      "top"
                    );
                    setClothingNote("");
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="wardrobe-add-button"
                  disabled={
                    !clothingName.trim()
                  }
                  onClick={saveClothing}
                >
                  Save clothing
                </button>
              </div>
            </div>
          ) : visibleItems.length ===
            0 ? (
            <div className="wardrobe-empty">
              <div
                className="wardrobe-empty-icon"
                aria-hidden="true"
              >
                <Shirt
                  size={27}
                  strokeWidth={1.3}
                />
              </div>

              <small>
                empty wardrobe
              </small>

              <h2>
                No clothes added yet.
              </h2>

              <p>
                Real clothes can be added
                here over time.
              </p>

              <button
                type="button"
                className="wardrobe-add-button"
                onClick={() =>
                  setAddingClothing(true)
                }
              >
                <span aria-hidden="true">
                  ＋
                </span>
                Add clothing
              </button>
            </div>
          ) : (
            <>
              <div className="wardrobe-item-grid">
                {visibleItems.map(
                  (item) => {
                    const category =
                      typeof item.data
                        ?.category ===
                      "string"
                        ? item.data
                            .category
                        : "other";

                    const isWearing =
                      Boolean(
                        wearing?.clothingIds.includes(
                          item.id
                        )
                      );

                    return (
                      <article
                        key={item.id}
                        className={
                          isWearing
                            ? "wardrobe-item wardrobe-item-with-action wearing"
                            : "wardrobe-item wardrobe-item-with-action"
                        }
                      >
                        <div
                          className="wardrobe-item-image"
                          aria-hidden="true"
                        >
                          <Shirt
                            size={23}
                            strokeWidth={
                              1.25
                            }
                          />
                        </div>

                        <span>
                          <strong>
                            {item.title ??
                              "Untitled"}
                          </strong>

                          <small>
                            {category}
                          </small>

                          {item.body && (
                            <small>
                              {item.body}
                            </small>
                          )}
                        </span>

                        <button
                          type="button"
                          className={
                            isWearing
                              ? "wardrobe-wear-button active"
                              : "wardrobe-wear-button"
                          }
                          onClick={() =>
                            void toggleWearingItem(
                              item
                            )
                          }
                          disabled={
                            updatingWearing
                          }
                        >
                          {isWearing ? (
                            <>
                              <Check
                                size={
                                  13
                                }
                              />
                              Wearing
                            </>
                          ) : (
                            "Wear"
                          )}
                        </button>
                      </article>
                    );
                  }
                )}
              </div>

              <button
                type="button"
                className="wardrobe-add-button"
                onClick={() =>
                  setAddingClothing(true)
                }
              >
                <span aria-hidden="true">
                  ＋
                </span>
                Add clothing
              </button>
            </>
          )}
        </section>
      ) : (
        <section className="wardrobe-looks">
          <header>
            <div>
              <span>saved looks</span>

              <strong>
                {wardrobeOwner ===
                "mine"
                  ? "My looks"
                  : "Dominic's looks"}
              </strong>
            </div>

            <small>
              {visibleLooks.length}{" "}
              {visibleLooks.length === 1
                ? "look"
                : "looks"}
            </small>
          </header>

          {addingLook ? (
            <div className="wardrobe-look-empty">
              <small>
                new look
              </small>

              <h2>
                Keep a look
              </h2>

              <input
                type="text"
                value={lookName}
                onChange={(event) =>
                  setLookName(
                    event.target.value
                  )
                }
                placeholder="Look name"
                autoFocus
              />

              <textarea
                value={lookNote}
                onChange={(event) =>
                  setLookNote(
                    event.target.value
                  )
                }
                placeholder="What is this look for?"
                rows={4}
              />

              <div className="wardrobe-item-grid">
                {visibleItems.map(
                  (item) => {
                    const selected =
                      selectedLookClothingIds.includes(
                        item.id
                      );

                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={
                          selected
                            ? "wardrobe-item active"
                            : "wardrobe-item"
                        }
                        onClick={() =>
                          setSelectedLookClothingIds(
                            (current) =>
                              current.includes(
                                item.id
                              )
                                ? current.filter(
                                    (
                                      id
                                    ) =>
                                      id !==
                                      item.id
                                  )
                                : [
                                    ...current,
                                    item.id,
                                  ]
                          )
                        }
                      >
                        <Shirt
                          size={20}
                          strokeWidth={
                            1.3
                          }
                        />

                        <span>
                          <strong>
                            {item.title ??
                              "Untitled"}
                          </strong>

                          <small>
                            {selected
                              ? "Selected"
                              : "Add to look"}
                          </small>
                        </span>
                      </button>
                    );
                  }
                )}
              </div>

              <div className="diary-editor-actions">
                <button
                  type="button"
                  onClick={() => {
                    setAddingLook(false);
                    setLookName("");
                    setLookNote("");
                    setSelectedLookClothingIds(
                      []
                    );
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="wardrobe-create-look"
                  disabled={
                    !lookName.trim()
                  }
                  onClick={saveLook}
                >
                  Keep look
                </button>
              </div>
            </div>
          ) : visibleLooks.length ===
            0 ? (
            <div className="wardrobe-look-empty">
              <ImageIcon
                size={24}
                strokeWidth={1.3}
              />

              <p>
                No looks kept yet.
              </p>

              <small>
                A look only becomes part
                of the world after you
                choose to keep it.
              </small>

              <button
                type="button"
                className="wardrobe-create-look"
                onClick={() =>
                  setAddingLook(true)
                }
              >
                <span aria-hidden="true">
                  ＋
                </span>
                Create a look
              </button>
            </div>
          ) : (
            <>
              <div className="wardrobe-look-list">
                {visibleLooks.map(
                  (look) => {
                    const clothingIds =
                      lookClothingByLookId[
                        look.id
                      ] ?? [];

                    const clothing =
                      wardrobeItems.filter(
                        (item) =>
                          clothingIds.includes(
                            item.id
                          )
                      );

                    const isWearing =
                      wearing?.lookId ===
                      look.id;

                    return (
                      <article
                        key={look.id}
                        className={
                          isWearing
                            ? "wardrobe-look wearing"
                            : "wardrobe-look"
                        }
                      >
                        <div>
                          <span>
                            {isWearing
                              ? "wearing now"
                              : "saved look"}
                          </span>

                          <strong>
                            {look.title ??
                              "Untitled look"}
                          </strong>

                          {look.body && (
                            <small>
                              {look.body}
                            </small>
                          )}

                          <small>
                            {clothing.length ===
                            0
                              ? "No clothing attached"
                              : clothing
                                  .map(
                                    (
                                      item
                                    ) =>
                                      item.title ??
                                      "Untitled"
                                  )
                                  .join(
                                    " · "
                                  )}
                          </small>
                        </div>

                        <button
                          type="button"
                          className={
                            isWearing
                              ? "wardrobe-wear-button active"
                              : "wardrobe-wear-button"
                          }
                          onClick={() =>
                            void wearLook(
                              look
                            )
                          }
                          disabled={
                            updatingWearing ||
                            isWearing
                          }
                        >
                          {isWearing ? (
                            <>
                              <Check
                                size={
                                  13
                                }
                              />
                              Wearing
                            </>
                          ) : (
                            "Wear look"
                          )}
                        </button>
                      </article>
                    );
                  }
                )}
              </div>

              <button
                type="button"
                className="wardrobe-create-look"
                onClick={() =>
                  setAddingLook(true)
                }
              >
                <span aria-hidden="true">
                  ＋
                </span>
                Create a look
              </button>
            </>
          )}
        </section>
      )}

      {wardrobeError && (
        <p role="alert">
          {wardrobeError}
        </p>
      )}

      <section className="wardrobe-date-link">
        <CalendarIcon
          size={19}
          strokeWidth={1.35}
        />

        <div>
          <strong>
            Getting ready for a Date
          </strong>

          <p>
            A saved look can later be
            attached to a planned Date
            without duplicating the clothing
            it refers to.
          </p>
        </div>
      </section>

      <section className="wardrobe-rule">
        <p>
          Clothes are owned items. Looks are
          combinations. Wearing is only the
          current state — it does not create
          duplicate clothing.
        </p>
      </section>
    </section>
  );
}
