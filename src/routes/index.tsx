// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  ArrowLeft,
  BookOpen,
  Box as BoxIcon,
  Calendar as CalendarIcon,
  ChevronRight,
  Clock,
  Disc3,
  Heart,
  Home,
  Image as ImageIcon,
  LampDesk,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Music2,
  Play,
  Send,
  Settings,
  Shirt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DiarioChat } from "@/components/diario-chat";
import { PrivateDiario, usePrivateDiario } from "@/components/private-diario";
import {
  connectSpotify,
  disconnectSpotify,
  finishSpotifyConnection,
  isSpotifyConnected,
  searchSpotifyTracks,
  type SpotifyTrack,
} from "@/lib/spotify";
import {
  useTimeMood,
  type TimeMoodState,
} from "@/lib/time-mood";
import {
  addItemToMemory,
  addClothingToLook,
  addPhotoToGalleryAlbum,
  createClothing,
  createDate,
  createGalleryAlbum,
  createKeepsake,
  createLetter,
  openLetter,
  createLook,
   createMemory,
  createPlace,
  createSong,
  getCalendarItems,
  getDates,
  markDateAsLived,
  getDiaryPages,
  getDiarioSettings,
  getPlaces,
  markPlaceAsVisited,
  getSongs,
  getKeepsakes,
  updateKeepsakeLocation,
  getLooks,
  getLookClothingIds,
  getWardrobeItems,
  getGalleryAlbumPhotoIds,
  getGalleryAlbums,
  getGalleryPhotos,
  getLetters,
  getLocalDateKey,
    getMemories,
  getMemoryItemIds,
  getTimelineItems,
  removeItemFromMemory,
  removePhotoFromGalleryAlbum,
saveDiaryPage,
  saveDiarioSettings,
  setGalleryPhotoFavorite,
  uploadGalleryPhoto,
  getHomeObjects,
createHomeObject,
updateHomeObjectPlacement,
storeHomeObject,
  deleteHomeObject,
  type DiarioItem,
  type GalleryPhoto,
restoreHomeObject,
  uploadHomeObjectImage,
  createVisualReference,
  getVisualReferences,
  setVisualReferenceFavorite,
  type VisualReferenceSubject,
  type VisualReferenceWithUrl,
} from "@/lib/diario-world";
import room from "@/assets/dominic-room.jpg";
import livingRoomEmpty from "@/assets/living-room-empty.jpeg";
import bedroomEmpty from "@/assets/bedroom-empty.jpeg";
import kitchenEmpty from "@/assets/kitchen-empty.jpeg";
import bathroomEmpty from "@/assets/bathroom-empty.jpeg";
import hallEmpty from "@/assets/hall-empty.jpeg";
import floorPlan from "@/assets/apartment-floor-plan.png";
type Screen =
  | "home"
  | "chat"
  | "diary"
  | "more"
  | "room"
  | "letters"
  | "gallery"
  | "memories"
  | "calendar"
  | "timeline"
  | "music"
  | "dates"
  | "places"
  | "keepsakes"
  | "wardrobe"
  | "references"
  | "night"
  | "settings";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Diário — a life that feels real" },
      {
        name: "description",
        content: "A private, living diary for a shared fictional world.",
      },
      { property: "og:title", content: "Diário — a life that feels real" },
      {
        property: "og:description",
        content: "A private, living diary for a shared fictional world.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Index,
});

const navItems: { id: Screen; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "chat", label: "Chat", icon: Send },
  { id: "diary", label: "Diary", icon: BookOpen },
  { id: "more", label: "More", icon: Menu },
];

const primaryScreens: Screen[] = ["home", "chat", "diary", "more"];

function Index() {
  return (
    <PrivateDiario>
      <DiarioApp />
    </PrivateDiario>
  );
}

function DiarioApp() {
  const [screen, setScreen] =
    useState<Screen>("home");
  const [previousScreen, setPreviousScreen] =
  useState<Screen>("home");
  
  const [activeRoom, setActiveRoom] =
    useState("living");
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollPositions = useRef<Partial<Record<Screen, number>>>({});
  const time = useTimeMood();
  const clockHour = time.dayProgress * 24;

const daylightStart = 5.5;
const daylightEnd = 19.25;

const daylightProgress =
  Math.max(
    0,
    Math.min(
      1,
      (clockHour - daylightStart) /
        (daylightEnd - daylightStart)
    )
  );

const daylight =
  Math.sin(Math.PI * daylightProgress);

const nightDepth =
  clockHour >= 18
    ? Math.min(1, (clockHour - 18) / 4)
    : clockHour < 4
      ? 1
      : clockHour < 7
        ? 1 - (clockHour - 4) / 3
        : 0;

const sunOpacity =
  daylight * 0.8;

const shadowOpacity =
  daylight * 0.48;

const roomBrightness =
  0.55 + daylight * 0.5 - nightDepth * 0.18;

const roomSaturation =
  0.72 + daylight * 0.28 - nightDepth * 0.08;

const roomSepia =
  daylight *
  Math.abs(daylightProgress - 0.5) *
  0.8;

const nightOpacity =
  nightDepth * 0.38;
  
  const lampOpacity =
  nightDepth * 0.55;

const homePlanBrightness =
  1 - nightDepth * 0.32;
  const detail = !primaryScreens.includes(screen);
  useEffect(() => {
  void finishSpotifyConnection().catch(
    (error) => {
      console.error(
        "Could not finish Spotify connection:",
        error
      );
    }
  );
}, []);
  
const openScreen = (nextScreen: Screen) => {
  if (scrollRef.current) {
    scrollPositions.current[screen] = scrollRef.current.scrollTop;
  }

  setPreviousScreen(screen);
  setScreen(nextScreen);
};
  const shareToChat = (text: string) => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      "diario-pending-chat-message",
      text
    );
  }


  openScreen("chat");
};
  
  const openRoom = (roomId: string) => {
    setActiveRoom(roomId);
    openScreen("room");
  };

  useLayoutEffect(() => {
    const scrollElement = scrollRef.current;

    if (!scrollElement) return;

    scrollElement.scrollTop = scrollPositions.current[screen] ?? 0;
  }, [screen]);

  return (
    <main
      className={`prototype-stage time-${time.mood}`}
      data-time-theme={time.mood}
    >

  <div
  className="phone-shell"
 style={
  {
    "--day-progress": time.dayProgress,
   "--day-x": `${daylightProgress * 100}%`,
    "--sun-opacity": sunOpacity,
    "--shadow-opacity": shadowOpacity,
    "--room-brightness": roomBrightness,
"--room-saturation": roomSaturation,
"--room-sepia": roomSepia,
    "--night-opacity": nightOpacity,
    "--lamp-opacity": lampOpacity,
"--home-plan-brightness": homePlanBrightness,
  } as React.CSSProperties
}
>
        <div className="statusbar" aria-hidden="true">
          <span>{time.timeLabel}</span>
          <span className="brand-mark">Diário</span>
          <span>•••</span>
        </div>

        {detail && (
          <button
            className="back-button"
     onClick={() => openScreen(screen === "room" ? "home" : previousScreen)}
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
        )}

        <div
          ref={scrollRef}
          className={`screen-scroll screen-${screen}`}
          key={screen}
        >
          {screen === "home" && (
            <HomeScreen
              time={time}
              onOpenRoom={openRoom}
            />
          )}

{screen === "chat" && (
  <DiarioChat onOpen={openScreen} />
)}
          {screen === "diary" && <DiaryScreen />}

          {screen === "more" && (
            <MoreScreen onOpen={openScreen} />
          )}

          {screen === "room" && (
            <RoomScreen
              time={time}
              roomId={activeRoom}
              onOpen={openScreen}
              onOpenRoom={openRoom}
            />
          )}

         {screen === "letters" && <LettersScreen />}
{screen === "gallery" && <GalleryScreen />}

{screen === "night" && (
  <MorningNightScreen
    time={time}
    onOpen={openScreen}
  />
)}

{screen === "memories" && <MemoriesScreen />}

{screen === "calendar" && (
  <CalendarScreen onOpen={openScreen} />
)}

{screen === "timeline" && (
  <TimelineScreen onOpen={openScreen} />
)}

{screen === "music" && (
  <MusicScreen onShareToChat={shareToChat} />
)}
{screen === "dates" && <DatesScreen />}
{screen === "places" && <PlacesScreen />}
{screen === "keepsakes" && <KeepsakesScreen />}
{screen === "wardrobe" && <WardrobeScreen />}
{screen === "references" && <ReferencesScreen />}
{screen === "settings" && <SettingsScreen />}
        </div>

        {!detail && (
          <BottomNav
            active={screen}
            onOpen={openScreen}
          />
        )}
      </div>
    </main>
  );
}
function ScreenIntro({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="screen-intro">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {children}
    </header>
  );
}

function HomeScreen({
  time,
  onOpenRoom,
}: {
  time: TimeMoodState;
  onOpenRoom: (roomId: string) => void;
}) {
  return (
<section
  className="home-screen home-live home-house"
  data-home-time={time.mood}
>
      <header className="house-header">
        <div className="house-heading">
          <span className="house-kicker">
            our apartment · new york
          </span>

          <strong>
            Our Apartment
          </strong>

          <small>
            empty now · built slowly over time
          </small>
        </div>

        <div className="house-time">
          <span>
            {time.timeLabel}
          </span>

          <small>
            {time.dateLabel}
          </small>
        </div>
      </header>

      <section className="home-plan-stage">
        <div className="floor-plan-heading">
          <small>
            official architecture
          </small>

          <strong>
            Floor Plan
          </strong>
        </div>

        <div className="official-floor-plan floor-plan-modal-map">
          <img
            src={floorPlan}
            alt="Official floor plan of our apartment"
            width={1536}
            height={1024}
          />

          <button
            type="button"
            className="plan-hotspot plan-hotspot-living"
            onClick={() =>
              onOpenRoom("living")
            }
            aria-label="Enter Living Room"
          />

          <button
            type="button"
            className="plan-hotspot plan-hotspot-bedroom"
            onClick={() =>
              onOpenRoom("bedroom")
            }
            aria-label="Enter Bedroom"
          />

          <button
            type="button"
            className="plan-hotspot plan-hotspot-kitchen"
            onClick={() =>
              onOpenRoom("kitchen")
            }
            aria-label="Enter Kitchen"
          />

          <button
            type="button"
            className="plan-hotspot plan-hotspot-bathroom"
            onClick={() =>
              onOpenRoom("bathroom")
            }
            aria-label="Enter Bathroom"
          />

          <button
            type="button"
            className="plan-hotspot plan-hotspot-hall"
            onClick={() =>
              onOpenRoom("hall")
            }
            aria-label="Enter Hall"
          />
        </div>
      </section>

      <section className="home-empty-state">
        <small>
          day one
        </small>

        <h2>
          The apartment starts empty.
        </h2>

        <p>
          The architecture already exists.
          Everything else will enter this
          home only after you choose it.
        </p>
      </section>

      <nav
        className="house-space-strip"
        aria-label="Apartment rooms"
      >
        {[
          {
            id: "living",
            label: "Living Room",
          },
          {
            id: "bedroom",
            label: "Bedroom",
          },
          {
            id: "kitchen",
            label: "Kitchen",
          },
          {
            id: "bathroom",
            label: "Bathroom",
          },
          {
            id: "hall",
            label: "Hall",
          },
        ].map((room) => (
          <button
            key={room.id}
            type="button"
            onClick={() =>
              onOpenRoom(room.id)
            }
          >
            <span
              aria-hidden="true"
            >
              □
            </span>

            <small>
              {room.label}
            </small>
          </button>
        ))}
      </nav>

      <section className="room-canon-note">
        <span>
          apartment rule
        </span>

        <p>
          The floor plan controls the
          architecture. Furniture, decor,
          photos and keepsakes will exist
          separately and only after being
          deliberately added.
        </p>
      </section>
    </section>
  );
}
function RoomScreen({
  time,
  roomId,
  onOpenRoom,
}: {
  time: TimeMoodState;
  roomId: string;
  onOpen: (screen: Screen) => void;
  onOpenRoom: (roomId: string) => void;
}) {
  const { session } = usePrivateDiario();

  const [homeObjects, setHomeObjects] = useState<DiarioItem[]>([]);
  const [loadingObjects, setLoadingObjects] = useState(true);
  const [arranging, setArranging] = useState(false);
  const [showThings, setShowThings] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newObjectType, setNewObjectType] =
  useState("furniture");
const [newImageFile, setNewImageFile] =
  useState<File | null>(null);

const [newImagePreview, setNewImagePreview] =
  useState("");

const [addingFurniture, setAddingFurniture] =
  useState(false);

  const [draggingObjectId, setDraggingObjectId] =
  useState<string | null>(null);

const [dragPositions, setDragPositions] =
  useState<
    Record<string, { x: number; y: number }>
  >({});

  const rooms = {
    living: {
      label: "Living Room",
      image: livingRoomEmpty,
    },
    bedroom: {
      label: "Bedroom",
      image: bedroomEmpty,
    },
    kitchen: {
      label: "Kitchen",
      image: kitchenEmpty,
    },
    bathroom: {
      label: "Bathroom",
      image: bathroomEmpty,
    },
    hall: {
      label: "Hall",
      image: hallEmpty,
    },
  };

  const room =
    rooms[roomId as keyof typeof rooms] ?? rooms.living;

  const loadObjects = async () => {
    if (!session?.user?.id) return;

    try {
      setLoadingObjects(true);
      const objects = await getHomeObjects(session.user.id);
      setHomeObjects(objects);
    } finally {
      setLoadingObjects(false);
    }
  };

  useEffect(() => {
    loadObjects();
  }, [session?.user?.id]);

  const displayedObjects = homeObjects.filter(
    (item) =>
      item.data?.room === roomId &&
      item.data?.location === "displayed"
  );

  const activeLight =
  displayedObjects.find(
    (item) =>
      item.data?.objectType === "lighting"
  );

const activeLights =
  displayedObjects.filter(
    (item) =>
      item.data?.objectType === "lighting"
  );

  const storedObjects = homeObjects.filter(
    (item) => item.data?.location === "stored"
  );
  
  const handleFurnitureImage = (
  event: React.ChangeEvent<HTMLInputElement>
) => {
  const file = event.target.files?.[0];

  if (!file) return;

  setNewImageFile(file);

  if (newImagePreview) {
    URL.revokeObjectURL(newImagePreview);
  }

  setNewImagePreview(
    URL.createObjectURL(file)
  );
};
const addFurniture = async () => {
  if (
    !session?.user?.id ||
    !newName.trim() ||
    !newImageFile
  ) {
    return;
  }

  try {
    setAddingFurniture(true);

    const imagePath =
      await uploadHomeObjectImage({
        userId: session.user.id,
        file: newImageFile,
      });

    await createHomeObject({
      userId: session.user.id,
      title: newName.trim(),
      room: roomId,
     objectType: newObjectType,
      x: 50,
      y: 68,
      scale: 1,
      imagePath,
    });

    if (newImagePreview) {
      URL.revokeObjectURL(
        newImagePreview
      );
    }

    setNewName("");
    setNewObjectType("furniture");
    setNewImageFile(null);
    setNewImagePreview("");
    setShowAdd(false);
    setArranging(true);

    await loadObjects();
  } finally {
    setAddingFurniture(false);
  }
};

  const updateObject = async (
    item: DiarioItem,
    changes: {
      x?: number;
      y?: number;
      scale?: number;
    }
  ) => {
    if (!session?.user?.id) return;

    const x = Number(item.data?.x ?? 50);
    const y = Number(item.data?.y ?? 70);
    const scale = Number(item.data?.scale ?? 1);

    await updateHomeObjectPlacement({
      userId: session.user.id,
      objectId: item.id,
      room: roomId,
      x: changes.x ?? x,
      y: changes.y ?? y,
      scale: changes.scale ?? scale,
    });

    await loadObjects();
  };

  const storeObject = async (item: DiarioItem) => {
    if (!session?.user?.id) return;

    await storeHomeObject({
      userId: session.user.id,
      objectId: item.id,
    });

    await loadObjects();
  };

  const restoreObject = async (item: DiarioItem) => {
    if (!session?.user?.id) return;

    await restoreHomeObject({
      userId: session.user.id,
      objectId: item.id,
      room: roomId,
    });

    setShowThings(false);
    setArranging(true);

    await loadObjects();
  };

  const moveObjectHere = async (item: DiarioItem) => {
  if (!session?.user?.id) return;

  await updateHomeObjectPlacement({
    userId: session.user.id,
    objectId: item.id,
    room: roomId,
    x: Number(item.data?.x ?? 50),
    y: Number(item.data?.y ?? 70),
    scale: Number(item.data?.scale ?? 1),
  });

  setShowThings(false);
  setArranging(true);

  await loadObjects();
};
  

  const removeObject = async (item: DiarioItem) => {
  if (!session?.user?.id) return;

  await deleteHomeObject({
    userId: session.user.id,
    objectId: item.id,
  });

  await loadObjects();
};
  
  const getDragPosition = (
  event: React.PointerEvent<HTMLDivElement>
) => {
  const stage =
    event.currentTarget.parentElement;

  if (!stage) return null;

  const rect =
    stage.getBoundingClientRect();

  return {
    x: Math.max(
      0,
      Math.min(
        100,
        ((event.clientX - rect.left) /
          rect.width) *
          100
      )
    ),
    y: Math.max(
      0,
      Math.min(
        100,
        ((event.clientY - rect.top) /
          rect.height) *
          100
      )
    ),
  };
};
  
  return (

    <section className="room-screen apartment-screen">
      <ScreenIntro
        eyebrow={`${time.dateLabel} · ${time.timeLabel}`}
        title={room.label}
      />

      <div className="room-toolbar">
        <button
          type="button"
          onClick={() => setArranging((value) => !value)}
          className={arranging ? "active" : ""}
        >
          {arranging ? "Done" : "Arrange"}
        </button>

        <button
          type="button"
          onClick={() => setShowAdd((value) => !value)}
        >
  + Add Object
        </button>

        <button
          type="button"
          onClick={() => setShowThings((value) => !value)}
        >
          Our Things
        </button>
      </div>

{showAdd && (
  <section className="home-add-panel">
    <input
      value={newName}
      onChange={(event) =>
        setNewName(event.target.value)
      }
placeholder="Object name"
    />
    
    <select
  value={newObjectType}
  onChange={(event) =>
    setNewObjectType(event.target.value)
  }
>
  <option value="furniture">Furniture</option>
  <option value="decor">Decor</option>
  <option value="plant">Plant</option>
  <option value="lighting">Lighting</option>
  <option value="other">Other</option>
</select>

    <label className="furniture-photo-picker">
      <span>
        {newImageFile
          ? "Change photo"
          : "Choose from Photos"}
      </span>

      <input
        type="file"
        accept="image/*"
        onChange={handleFurnitureImage}
      />
    </label>

    {newImagePreview && (
      <div className="furniture-image-preview">
        <img
          src={newImagePreview}
          alt="Furniture preview"
        />
      </div>
    )}

    <button
      type="button"
      disabled={
        !newName.trim() ||
        !newImageFile ||
        addingFurniture
      }
      onClick={addFurniture}
    >
      {addingFurniture
        ? "Adding..."
        : `Add to ${room.label}`}
    </button>
  </section>
)}

      {showThings && (
        <section className="our-things-panel">
          <div className="our-things-heading">
            <strong>Our Things</strong>
            <small>
              {homeObjects.length} saved object
              {homeObjects.length === 1 ? "" : "s"}
            </small>
          </div>

          {homeObjects.length === 0 ? (
            <p>Nothing here yet.</p>
          ) : (
            <div className="our-things-list">
              {homeObjects.map((item) => {
                const stored =
                  item.data?.location === "stored";

              const currentRoom =
  item.data?.room === roomId;

                return (
                  <div
                    className="our-things-item"
                    key={item.id}
                  >
                    {item.data?.imageUrl && (
                      <img
                        src={String(item.data.imageUrl)}
                        alt=""
                      />
                    )}

                    <button
  type="button"
  className="our-things-delete"
  onClick={() => {
    if (
      window.confirm(
        `Delete "${item.title ?? "this object"}"?`
      )
    ) {
      void removeObject(item);
    }
  }}
>
  Delete
</button>
                    

                    <div>
                      <strong>
                        {item.title ?? "Untitled object"}
                      </strong>

                     <small>
  {String(
    item.data?.objectType ?? "object"
  )}{" · "}
  {stored
    ? "Stored"
    : String(
        item.data?.room ?? "Apartment"
      )}
</small>
                    </div>
{stored ? (
  <button
    type="button"
    onClick={() => restoreObject(item)}
  >
    Place here
  </button>
) : currentRoom ? (
  <button
    type="button"
    onClick={() => storeObject(item)}
  >
    Store
  </button>
) : (
  <button
    type="button"
    onClick={() => moveObjectHere(item)}
  >
    Move here
  </button>
)}
                    
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      <section
        className={`room-view-stage ${
          arranging ? "is-arranging" : ""
        }`}
      >
        <img
          className="room-view-image"
          src={room.image}
          alt={`Empty ${room.label}`}
        />

        <div
  className="room-night-wash"
  aria-hidden="true"
/>
        
{activeLights.map((light) => {
  const liveLightPosition =
    dragPositions[light.id];

  const lightX =
    liveLightPosition?.x ??
    Number(light.data?.x ?? 72);

  const lightY =
    liveLightPosition?.y ??
    Number(light.data?.y ?? 48);

  return (
    <div
      key={`light-${light.id}`}
      className="room-lamp-glow"
      aria-hidden="true"
      style={
        {
          "--lamp-x": `${lightX}%`,
          "--lamp-y": `${lightY}%`,
        } as React.CSSProperties
      }
    />
  );
})}
        {displayedObjects.map((item) => {
          const x = Number(item.data?.x ?? 50);
          const y = Number(item.data?.y ?? 70);
        const dragPosition =
  dragPositions[item.id];

const displayX =
  dragPosition?.x ?? x;

const displayY =
  dragPosition?.y ?? y;
          const scale = Number(item.data?.scale ?? 1);
          const imageUrl = String(
            item.data?.imageUrl ?? ""
          );

          return (
<div
  key={item.id}
  className={`home-object-layer ${
    draggingObjectId === item.id
      ? "is-dragging"
      : ""
  }`}
  data-object-type={String(
    item.data?.objectType ?? "object"
  )}
  
  style={{
    left: `${displayX}%`,
    top: `${displayY}%`,
    width: `${34 * scale}%`,
  }}
  onPointerDown={(event) => {
    if (!arranging) return;

    if (
      (event.target as HTMLElement).closest(
        ".home-object-controls"
      )
    ) {
      return;
    }

    const position =
      getDragPosition(event);

    if (!position) return;

    event.currentTarget.setPointerCapture(
      event.pointerId
    );

    setDraggingObjectId(item.id);

    setDragPositions((current) => ({
      ...current,
      [item.id]: position,
    }));
  }}
  onPointerMove={(event) => {
    if (
      !arranging ||
      draggingObjectId !== item.id
    ) {
      return;
    }

    const position =
      getDragPosition(event);

    if (!position) return;

    setDragPositions((current) => ({
      ...current,
      [item.id]: position,
    }));
  }}
  onPointerUp={async (event) => {
    if (
      draggingObjectId !== item.id
    ) {
      return;
    }

    const position =
      getDragPosition(event);

    setDraggingObjectId(null);

    if (!position) return;

    setDragPositions((current) => {
      const next = { ...current };
      delete next[item.id];
      return next;
    });

    await updateObject(item, {
      x: position.x,
      y: position.y,
    });
  }}
>
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={item.title ?? "Furniture"}
                  className="home-object-image"
                />
              ) : (
                <div className="home-object-placeholder">
                  {item.title ?? "Furniture"}
                </div>
              )}

              {arranging && (
                <div className="home-object-controls">
                  <strong>
                    {item.title ?? "Furniture"}
                  </strong>

                  <div className="home-object-move-controls">
                    <button
                      type="button"
                      onClick={() =>
                        updateObject(item, {
                          x: Math.max(0, x - 4),
                        })
                      }
                    >
                      ←
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        updateObject(item, {
                          y: Math.max(0, y - 4),
                        })
                      }
                    >
                      ↑
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        updateObject(item, {
                          y: Math.min(100, y + 4),
                        })
                      }
                    >
                      ↓
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        updateObject(item, {
                          x: Math.min(100, x + 4),
                        })
                      }
                    >
                      →
                    </button>
                  </div>

<div className="home-object-size-controls">
  <button
                      type="button"
                      onClick={() =>
                        updateObject(item, {
                          scale: Math.max(
                            0.25,
                            scale - 0.1
                          ),
                        })
                      }
                    >
                      −
                    </button>

                    <span>Size</span>

                    <button
                      type="button"
                      onClick={() =>
                        updateObject(item, {
                          scale: Math.min(
                            2.5,
                            scale + 0.1
                          ),
                        })
                      }
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    className="home-object-store"
                    onClick={() => storeObject(item)}
                  >
                    Store
                    <button
  type="button"
  className="home-object-delete"
  onClick={() => removeObject(item)}
>
  Delete
</button>
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {!loadingObjects &&
          displayedObjects.length === 0 && (
            <div className="room-no-objects">
              <span>empty room</span>
            </div>
          )}
      </section>

      <nav
        className="room-navigation"
        aria-label="Move through the apartment"
      >
        {[
          ["living", "Living"],
          ["bedroom", "Bedroom"],
          ["kitchen", "Kitchen"],
          ["bathroom", "Bathroom"],
          ["hall", "Hall"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={roomId === id ? "active" : ""}
            onClick={() => onOpenRoom(id ?? "")}
          >
            {label}
          </button>
        ))}
      </nav>
    </section>
  );
}
function MoreScreen({ onOpen }: { onOpen: (screen: Screen) => void }) {
  const { preferredName, signOut } = usePrivateDiario();
  const entries: { name: string; note: string; target: Screen; icon: ReactNode }[] = [
    { name: "Memories", note: "the moments that stay", target: "memories", icon: <Heart /> },
    { name: "Gallery", note: "photos, videos & context", target: "gallery", icon: <ImageIcon /> },
    { name: "References", note: "faces, poses, places & visual canon", target: "references", icon: <ImageIcon /> },
    { name: "Letters", note: "letters, notes & envelopes", target: "letters", icon: <Mail /> },
    { name: "Calendar", note: "days, plans & what happened", target: "calendar", icon: <CalendarIcon /> },
    { name: "Timeline", note: "our story in order", target: "timeline", icon: <Clock /> },
    { name: "Music", note: "Mine · Dominic · Ours", target: "music", icon: <Music2 /> },
    { name: "Dates", note: "places, plans & memories", target: "dates", icon: <CalendarIcon /> },
    { name: "Places", note: "saved places & places we've been", target: "places", icon: <MapPin /> },
    { name: "Keepsakes", note: "little things with a history", target: "keepsakes", icon: <BoxIcon /> },
    { name: "Wardrobe", note: "looks for our days", target: "wardrobe", icon: <Shirt /> },
    { name: "Morning / Night", note: "the day changes with you", target: "night", icon: <Disc3 /> },
    { name: "Settings", note: "make this place yours", target: "settings", icon: <Settings /> },
  ];

  return (
    <section className="more-screen">
      <ScreenIntro eyebrow={`Private space · ${preferredName}`} title="more of us">
        <p className="intro-copy">everything belongs to the same world.</p>
      </ScreenIntro>
      <div className="index-list richer-index">
        {entries.map((entry, index) => (
          <button key={entry.name} onClick={() => onOpen(entry.target)} className="available">
            <span className="index-number">{String(index + 1).padStart(2, "0")}</span>
            <span className="index-icon">{entry.icon}</span>
            <div>
              <strong>{entry.name}</strong>
              <small>{entry.note}</small>
            </div>
            <ChevronRight size={17} />
          </button>
        ))}
      </div>
      <div className="more-signoff">
        <p className="index-signoff">same time. different light. always you.</p>
        <Button variant="ghost" size="sm" onClick={signOut}>
          <LogOut /> Leave for now
        </Button>
      </div>
    </section>
  );
}

function DiaryScreen() {
  const { session } = usePrivateDiario();

  const [owner, setOwner] =
    useState<"alloah" | "dominic">("alloah");

  const [pages, setPages] =
    useState<DiarioItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [editing, setEditing] =
    useState(false);

  const [draft, setDraft] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const todayKey = getLocalDateKey();

  const todayPage =
    pages.find(
      (page) =>
        page.data?.local_date === todayKey
    ) ?? null;

  const pastPages =
    pages.filter(
      (page) =>
        page.data?.local_date !== todayKey
    );

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError(null);
    setEditing(false);
    setDraft("");

    getDiaryPages(
      session.user.id,
      owner
    )
      .then((loadedPages) => {
        if (!active) return;

        setPages(loadedPages);
        setLoading(false);
      })
      .catch((loadError) => {
        if (!active) return;

        console.error(
          "Could not load diary pages:",
          loadError
        );

        setError(
          "The diary could not be opened right now."
        );

        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [owner, session.user.id]);

  const startWriting = () => {
    setDraft(todayPage?.body ?? "");
    setEditing(true);
    setError(null);
  };

  const savePage = async () => {
    if (!draft.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const savedPage =
        await saveDiaryPage({
          id: todayPage?.id,
          userId: session.user.id,
          owner: "alloah",
          body: draft,
          localDate: todayKey,
          eventAt:
            todayPage?.event_at ??
            new Date().toISOString(),
        });

      setPages((currentPages) => [
        savedPage,
        ...currentPages.filter(
          (page) =>
            page.id !== savedPage.id
        ),
      ]);

      setDraft(savedPage.body ?? "");
      setEditing(false);
    } catch (saveError) {
      console.error(
        "Could not save diary page:",
        saveError
      );

      setError(
        "Your page could not be saved. Try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="diary-screen diary-live">
      <ScreenIntro
        eyebrow="Private pages · written when they happen"
        title="Diary"
      >
        <p className="intro-copy">
          real days only. nothing becomes part of our history before it is lived.
        </p>
      </ScreenIntro>

      <div
        className="diary-owner-tabs"
        role="tablist"
        aria-label="Diary owner"
      >
        <button
          type="button"
          role="tab"
          aria-selected={
            owner === "alloah"
          }
          className={
            owner === "alloah"
              ? "active"
              : ""
          }
          onClick={() =>
            setOwner("alloah")
          }
        >
          Alloah
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={
            owner === "dominic"
          }
          className={
            owner === "dominic"
              ? "active"
              : ""
          }
          onClick={() =>
            setOwner("dominic")
          }
        >
          Dominic
        </button>
      </div>

      <article className="diary-today-card">
        <header className="diary-today-header">
          <div>
            <span>today</span>

            <strong>
              {owner === "alloah"
                ? "Your page"
                : "Dominic's page"}
            </strong>
          </div>

          <small>
            {owner === "alloah"
              ? "private"
              : "his space"}
          </small>
        </header>

        {loading ? (
          <div className="diary-empty-page">
            <p>
              Opening today's page…
            </p>
          </div>
        ) : editing &&
          owner === "alloah" ? (
          <div className="diary-empty-page diary-editor">
            <textarea
              value={draft}
              onChange={(event) =>
                setDraft(
                  event.target.value
                )
              }
              placeholder="Write what happened today…"
              rows={12}
              autoFocus
            />

            <div className="diary-editor-actions">
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setDraft(
                    todayPage?.body ?? ""
                  );
                }}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="button"
                className="diary-write-button"
                onClick={savePage}
                disabled={
                  saving ||
                  !draft.trim()
                }
              >
                {saving
                  ? "Saving…"
                  : "Save today's page"}
              </button>
            </div>
          </div>
        ) : todayPage ? (
          <div className="diary-empty-page diary-written-page">
            <p className="diary-page-body">
              {todayPage.body}
            </p>

            {owner === "alloah" && (
              <button
                type="button"
                className="diary-write-button"
                onClick={startWriting}
              >
                Edit today's page
              </button>
            )}
          </div>
        ) : (
          <div className="diary-empty-page">
            <div
              className="diary-page-mark"
              aria-hidden="true"
            >
              ✦
            </div>

            <h2>
              Nothing written here yet.
            </h2>

            <p>
              {owner === "alloah"
                ? "When you write about a real day, this page can later connect to its photos, music, places, letters and memories."
                : "His pages belong to him. They only appear here when something is actually written or shared in the world."}
            </p>

            {owner === "alloah" && (
              <button
                type="button"
                className="diary-write-button"
                onClick={startWriting}
              >
                Write today's page
              </button>
            )}
          </div>
        )}

        {error && (
          <p role="alert">
            {error}
          </p>
        )}

        <footer className="diary-page-footer">
          <span>
            {owner === "alloah"
              ? "Alloah's diary"
              : "Dominic's diary"}
          </span>

          <span>
            no invented history
          </span>
        </footer>
      </article>

      <section className="diary-archive-preview">
        <header>
          <span>archive</span>
          <strong>Past pages</strong>
        </header>

        {pastPages.length === 0 ? (
          <div className="diary-archive-empty">
            <p>
              Days will appear here after they are lived and written.
            </p>
          </div>
        ) : (
          <div className="diary-archive-list">
            {pastPages.map((page) => (
              <article
                key={page.id}
                className="diary-archive-item"
              >
                <small>
                  {page.event_at
                    ? new Intl.DateTimeFormat(
                        "en",
                        {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          timeZone:
                            "America/Sao_Paulo",
                        }
                      ).format(
                        new Date(
                          page.event_at
                        )
                      )
                    : "Past page"}
                </small>

                <p>
                  {page.body}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
function LettersScreen() {
  const { session } = usePrivateDiario();

  const [letterView, setLetterView] =
    useState<"all" | "mine" | "dominic">("all");

  const [letters, setLetters] =
    useState<DiarioItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [writing, setWriting] =
    useState(false);

  const [title, setTitle] =
    useState("");

  const [body, setBody] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);
  
const [activeLetterId, setActiveLetterId] =
  useState<string | null>(null);
  
  useEffect(() => {
    let active = true;

    setLoading(true);
    setError(null);

    getLetters(session.user.id)
      .then((loadedLetters) => {
        if (!active) return;

        setLetters(loadedLetters);
        setLoading(false);
      })
      .catch((loadError) => {
        if (!active) return;

        console.error(
          "Could not load letters:",
          loadError
        );

        setError(
          "The letter drawer could not be opened right now."
        );

        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [session.user.id]);

  const visibleLetters =
    letters.filter((letter) => {
      if (letterView === "all") {
        return true;
      }

      if (letterView === "mine") {
        return letter.owner === "alloah";
      }

      return letter.owner === "dominic";
    });

  const saveLetter = async () => {
    if (!body.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const savedLetter =
        await createLetter({
          userId: session.user.id,
          owner: "alloah",
          title,
          body,
        });

      setLetters((currentLetters) => [
        savedLetter,
        ...currentLetters,
      ]);

      setTitle("");
      setBody("");
      setWriting(false);
      setLetterView("all");
    } catch (saveError) {
      console.error(
        "Could not save letter:",
        saveError
      );

      setError(
        "Your letter could not be saved. Try again."
      );
    } finally {
      setSaving(false);
    }
  };
const handleOpenLetter = async (
  letter: DiarioItem
) => {
  const alreadyOpen =
    letter.data?.opened === true;

  if (alreadyOpen) {
    setActiveLetterId(
      activeLetterId === letter.id
        ? null
        : letter.id
    );
    return;
  }

  try {
    const updated =
      await openLetter({
        userId: session.user.id,
        letterId: letter.id,
      });

    setLetters((current) =>
      current.map((item) =>
        item.id === updated.id
          ? updated
          : item
      )
    );

    setActiveLetterId(
      updated.id
    );
  } catch (openError) {
    console.error(
      "Could not open letter:",
      openError
    );

    setError(
      "The letter could not be opened."
    );
  }
};
  
  return (
    <section className="letters-screen letters-live">
      <ScreenIntro
        eyebrow="Letters · notes · things easier written"
        title="Letters"
      >
        <p className="intro-copy">
          letters only appear here after someone actually writes or sends one.
        </p>
      </ScreenIntro>

      <div
        className="letters-filter"
        role="tablist"
        aria-label="Letter filter"
      >
        <button
          type="button"
          role="tab"
          aria-selected={
            letterView === "all"
          }
          className={
            letterView === "all"
              ? "active"
              : ""
          }
          onClick={() =>
            setLetterView("all")
          }
        >
          All
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={
            letterView === "mine"
          }
          className={
            letterView === "mine"
              ? "active"
              : ""
          }
          onClick={() =>
            setLetterView("mine")
          }
        >
          From me
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={
            letterView === "dominic"
          }
          className={
            letterView === "dominic"
              ? "active"
              : ""
          }
          onClick={() =>
            setLetterView("dominic")
          }
        >
          From Dominic
        </button>
      </div>

      {writing ? (
        <section className="letters-empty-stage letters-editor">
          <div className="letters-empty-copy">
            <small>
              new letter
            </small>

            <h2>
              Write a letter
            </h2>
          </div>

          <input
            type="text"
            value={title}
            onChange={(event) =>
              setTitle(
                event.target.value
              )
            }
            placeholder="Title"
          />

          <textarea
            value={body}
            onChange={(event) =>
              setBody(
                event.target.value
              )
            }
            placeholder="Write your letter…"
            rows={12}
            autoFocus
          />

          <div className="diary-editor-actions">
            <button
              type="button"
              onClick={() => {
                setWriting(false);
                setTitle("");
                setBody("");
                setError(null);
              }}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="button"
              className="letters-write-button"
              onClick={saveLetter}
              disabled={
                saving ||
                !body.trim()
              }
            >
              {saving
                ? "Saving…"
                : "Keep letter"}
            </button>
          </div>
        </section>
      ) : loading ? (
        <section className="letters-empty-stage">
          <p>
            Opening the letter drawer…
          </p>
        </section>
      ) : visibleLetters.length === 0 ? (
        <div className="letters-empty-stage">
          <div
            className="letters-empty-envelope"
            aria-hidden="true"
          >
            <span className="letters-envelope-flap" />

            <div className="letters-envelope-mark">
              <Mail
                size={23}
                strokeWidth={1.35}
              />
            </div>
          </div>

          <div className="letters-empty-copy">
            <small>
              letter box
            </small>

            <h2>
              No letters here yet.
            </h2>

            <p>
              {letterView === "dominic"
                ? "Letters from Dominic will only appear here when he actually writes or sends one in the world."
                : "Write something you want to keep. It becomes part of the letter drawer only after you save it."}
            </p>
          </div>

          {letterView !== "dominic" && (
            <button
              type="button"
              className="letters-write-button"
              onClick={() =>
                setWriting(true)
              }
            >
              <span aria-hidden="true">
                ＋
              </span>
              Write a letter
            </button>
          )}
        </div>
      ) : (
        <section className="letters-drawer letters-drawer-filled">
          <header>
            <div>
              <span>
                saved
              </span>

              <strong>
                Letter drawer
              </strong>
            </div>

            <small>
              {visibleLetters.length}{" "}
              {visibleLetters.length === 1
                ? "letter"
                : "letters"}
            </small>
          </header>

      <div className="letters-saved-list">
  {visibleLetters.map(
    (letter) => {
      const opened =
        letter.data?.opened === true;

      const expanded =
        activeLetterId ===
        letter.id;

      return (
        <article
          key={letter.id}
          className={`letters-saved-item ${
            opened
              ? "is-opened"
              : "is-sealed"
          }`}
        >
          <button
            type="button"
            className="letter-envelope-button"
            onClick={() =>
              handleOpenLetter(
                letter
              )
            }
          >
            <div
              className="letter-envelope-visual"
              aria-hidden="true"
            >
              <span className="letter-envelope-flap" />
              <Mail
                size={22}
                strokeWidth={1.35}
              />
            </div>

            <div className="letter-envelope-copy">
              <small>
                {letter.owner ===
                "alloah"
                  ? "From Alloah"
                  : "From Dominic"}
              </small>

              <strong>
                {letter.title ??
                  "Untitled letter"}
              </strong>

              <span>
                {opened
                  ? expanded
                    ? "Close letter"
                    : "Open again"
                  : "Tap to open"}
              </span>
            </div>
          </button>

          {opened &&
            expanded && (
              <div className="letter-open-content">
                <p>
                  {letter.body}
                </p>

                {letter.event_at && (
                  <time
                    dateTime={
                      letter.event_at
                    }
                  >
                    {new Intl.DateTimeFormat(
                      "en",
                      {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        timeZone:
                          "America/Sao_Paulo",
                      }
                    ).format(
                      new Date(
                        letter.event_at
                      )
                    )}
                  </time>
                )}
              </div>
            )}
        </article>
      );
    }
  )}
</div>

          {letterView !== "dominic" && (
            <button
              type="button"
              className="letters-write-button"
              onClick={() =>
                setWriting(true)
              }
            >
              <span aria-hidden="true">
                ＋
              </span>
              Write another letter
            </button>
          )}
        </section>
      )}

      {error && (
        <p role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
function GalleryScreen() {
  const { session } = usePrivateDiario();

  const [galleryView, setGalleryView] =
    useState<
      "photos" | "albums" | "favorites"
    >("photos");

  const [photos, setPhotos] =
    useState<GalleryPhoto[]>([]);

    const [albums, setAlbums] =
    useState<DiarioItem[]>([]);

  const [creatingAlbum, setCreatingAlbum] =
    useState(false);

  const [albumTitle, setAlbumTitle] =
    useState("");

  const [selectedAlbum, setSelectedAlbum] =
    useState<DiarioItem | null>(null);

  const [albumPhotoIds, setAlbumPhotoIds] =
    useState<string[]>([]);

  const [editingAlbumPhotos, setEditingAlbumPhotos] =
    useState(false);

  const [loadingAlbum, setLoadingAlbum] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [uploading, setUploading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);
  
const [selectedPhoto, setSelectedPhoto] =
  useState<GalleryPhoto | null>(null);
  
  const fileInputRef =
    useRef<HTMLInputElement>(null);

    const toggleFavorite = async (
    photo: GalleryPhoto
  ) => {
    const nextFavorite =
      photo.item.data?.favorite !== true;

    try {
      const updatedItem =
        await setGalleryPhotoFavorite({
          userId: session.user.id,
          photo: photo.item,
          favorite: nextFavorite,
        });

      setPhotos((currentPhotos) =>
        currentPhotos.map(
          (currentPhoto) =>
            currentPhoto.item.id ===
            updatedItem.id
              ? {
                  ...currentPhoto,
                  item: updatedItem,
                }
              : currentPhoto
        )
      );
    } catch (favoriteError) {
      console.error(
        "Could not update favorite:",
        favoriteError
      );

      setError(
        "The photo could not be updated. Try again."
      );
    }
  };
  useEffect(() => {
    let active = true;

    setLoading(true);
    setError(null);

    getGalleryPhotos(
      session.user.id
    )
      .then((loadedPhotos) => {
        if (!active) return;

        setPhotos(loadedPhotos);
        setLoading(false);
      })
      .catch((loadError) => {
        if (!active) return;

        console.error(
          "Could not load Gallery:",
          loadError
        );

        setError(
          "The Gallery could not be opened right now."
        );

        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [session.user.id]);

    useEffect(() => {
    let active = true;

    getGalleryAlbums(
      session.user.id
    )
      .then((loadedAlbums) => {
        if (!active) return;

        setAlbums(loadedAlbums);
      })
      .catch((loadError) => {
        if (!active) return;

        console.error(
          "Could not load albums:",
          loadError
        );

        setError(
          "The albums could not be opened right now."
        );
      });

    return () => {
      active = false;
    };
  }, [session.user.id]);

  const saveAlbum = async () => {
    if (!albumTitle.trim()) {
      return;
    }

    setError(null);

    try {
      const savedAlbum =
        await createGalleryAlbum({
          userId: session.user.id,
          title: albumTitle,
        });

      setAlbums((currentAlbums) => [
        savedAlbum,
        ...currentAlbums,
      ]);

      setAlbumTitle("");
      setCreatingAlbum(false);
    } catch (albumError) {
      console.error(
        "Could not create album:",
        albumError
      );

      setError(
        "The album could not be created. Try again."
      );
    }
  };

  const openAlbum = async (
    album: DiarioItem
  ) => {
    setSelectedAlbum(album);
    setLoadingAlbum(true);
    setEditingAlbumPhotos(false);
    setError(null);

    try {
      const photoIds =
        await getGalleryAlbumPhotoIds({
          userId: session.user.id,
          albumId: album.id,
        });

      setAlbumPhotoIds(photoIds);
    } catch (albumError) {
      console.error(
        "Could not open album:",
        albumError
      );

      setError(
        "The album could not be opened. Try again."
      );
    } finally {
      setLoadingAlbum(false);
    }
  };

  const favoritePhotos =
    photos.filter(
      (photo) =>
        photo.item.data?.favorite === true
    );

  const visiblePhotos =
    galleryView === "favorites"
      ? favoritePhotos
      : photos;

  const handleFiles =
    async (
      event: React.ChangeEvent<HTMLInputElement>
    ) => {
      const files =
        Array.from(
          event.target.files ?? []
        );

      if (files.length === 0) {
        return;
      }

      setUploading(true);
      setError(null);

      try {
        const uploadedPhotos =
          await Promise.all(
            files.map((file) =>
              uploadGalleryPhoto({
                userId:
                  session.user.id,
                file,
              })
            )
          );

        setPhotos(
          (currentPhotos) => [
            ...uploadedPhotos,
            ...currentPhotos,
          ]
        );
      } catch (uploadError) {
        console.error(
          "Could not upload Gallery photo:",
          uploadError
        );

        setError(
          "One of the photos could not be added. Try again."
        );
      } finally {
        setUploading(false);

        if (
          fileInputRef.current
        ) {
          fileInputRef.current.value =
            "";
        }
      }
    };

  return (
    <section className="gallery-screen gallery-live">
      <ScreenIntro
        eyebrow="Camera roll · albums · favorites"
        title="Gallery"
      >
        <p className="intro-copy">
          only photos that are actually taken, added or kept become part of
          this world.
        </p>
      </ScreenIntro>

      <div
        className="gallery-tabs gallery-live-tabs"
        role="tablist"
        aria-label="Gallery view"
      >
        <button
          type="button"
          role="tab"
          aria-selected={
            galleryView === "photos"
          }
          className={
            galleryView === "photos"
              ? "active"
              : ""
          }
          onClick={() =>
            setGalleryView("photos")
          }
        >
          Photos
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={
            galleryView === "albums"
          }
          className={
            galleryView === "albums"
              ? "active"
              : ""
          }
          onClick={() =>
            setGalleryView("albums")
          }
        >
          Albums
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={
            galleryView === "favorites"
          }
          className={
            galleryView ===
            "favorites"
              ? "active"
              : ""
          }
          onClick={() =>
            setGalleryView(
              "favorites"
            )
          }
        >
          Favorites
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={handleFiles}
      />

         {galleryView === "albums" ? (
        selectedAlbum ? (
          <section className="gallery-library">
            <header>
              <div>
                <span>
                  album
                </span>

                <strong>
                  {selectedAlbum.title}
                </strong>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedAlbum(null);
                  setAlbumPhotoIds([]);
                  setEditingAlbumPhotos(false);
                }}
              >
                Back to albums
              </button>
            </header>

            {loadingAlbum ? (
              <div className="gallery-empty-stage">
                <p>
                  Opening album…
                </p>
              </div>
            ) : (
              <>
                <div className="gallery-photo-grid">
                  {photos
                    .filter((photo) =>
                      albumPhotoIds.includes(
                        photo.item.id
                      )
                    )
                    .map((photo) => (
                     <figure
  key={
    photo.item.id
  }
  className="gallery-photo-item"
  onClick={() =>
    setSelectedPhoto(photo)
  }
>
                        <img
                          src={photo.url}
                          alt={
                            photo.item.title ??
                            "Album photo"
                          }
                          loading="lazy"
                        />
                      </figure>
                    ))}
                </div>

                {editingAlbumPhotos ? (
                  <section className="gallery-library">
                    <header>
                      <div>
                        <span>
                          choose photos
                        </span>

                        <strong>
                          Add or remove
                        </strong>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setEditingAlbumPhotos(
                            false
                          )
                        }
                      >
                        Done
                      </button>
                    </header>

                    <div className="gallery-photo-grid">
                      {photos.map((photo) => {
                        const isInAlbum =
                          albumPhotoIds.includes(
                            photo.item.id
                          );

                        return (
                          <button
                            key={photo.item.id}
                            type="button"
                            className={
                              isInAlbum
                                ? "gallery-photo-item active"
                                : "gallery-photo-item"
                            }
                            onClick={async () => {
                              if (!selectedAlbum) {
                                return;
                              }

                              setError(null);

                              try {
                                if (isInAlbum) {
                                  await removePhotoFromGalleryAlbum({
                                    userId:
                                      session.user.id,
                                    albumId:
                                      selectedAlbum.id,
                                    photoId:
                                      photo.item.id,
                                  });

                                  setAlbumPhotoIds(
                                    (
                                      currentIds
                                    ) =>
                                      currentIds.filter(
                                        (id) =>
                                          id !==
                                          photo.item.id
                                      )
                                  );
                                } else {
                                  await addPhotoToGalleryAlbum({
                                    userId:
                                      session.user.id,
                                    albumId:
                                      selectedAlbum.id,
                                    photoId:
                                      photo.item.id,
                                  });

                                  setAlbumPhotoIds(
                                    (
                                      currentIds
                                    ) => [
                                      ...currentIds,
                                      photo.item.id,
                                    ]
                                  );
                                }
                              } catch (
                                albumPhotoError
                              ) {
                                console.error(
                                  "Could not update album photo:",
                                  albumPhotoError
                                );

                                setError(
                                  "The album could not be updated. Try again."
                                );
                              }
                            }}
                          >
                            <img
                              src={photo.url}
                              alt={
                                photo.item.title ??
                                "Gallery photo"
                              }
                              loading="lazy"
                            />

                            <span>
                              {isInAlbum
                                ? "Remove"
                                : "Add"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ) : (
                  <button
                    type="button"
                    className="gallery-add-button"
                    onClick={() =>
                      setEditingAlbumPhotos(
                        true
                      )
                    }
                  >
                    ＋ Add or remove photos
                  </button>
                )}
              </>
            )}
          </section>
        ) : (
        <section className="gallery-library">
          <header>
            <div>
              <span>
                albums
              </span>

              <strong>
                Your albums
              </strong>
            </div>

            <small>
              {albums.length}{" "}
              {albums.length === 1
                ? "album"
                : "albums"}
            </small>
          </header>

          {creatingAlbum ? (
            <div className="gallery-empty-stage">
              <div className="gallery-empty-copy">
                <small>
                  new album
                </small>

                <h2>
                  Name this album
                </h2>
              </div>

              <input
                type="text"
                value={albumTitle}
                onChange={(event) =>
                  setAlbumTitle(
                    event.target.value
                  )
                }
                placeholder="Album name"
                autoFocus
              />

              <div className="diary-editor-actions">
                <button
                  type="button"
                  onClick={() => {
                    setCreatingAlbum(false);
                    setAlbumTitle("");
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="gallery-add-button"
                  onClick={saveAlbum}
                  disabled={
                    !albumTitle.trim()
                  }
                >
                  Create album
                </button>
              </div>
            </div>
          ) : albums.length === 0 ? (
            <div className="gallery-empty-stage">
              <div className="gallery-empty-copy">
                <small>
                  albums
                </small>

                <h2>
                  No albums yet.
                </h2>

                <p>
                  Albums organize real photos without duplicating them.
                </p>
              </div>

              <button
                type="button"
                className="gallery-add-button"
                onClick={() =>
                  setCreatingAlbum(true)
                }
              >
                <span aria-hidden="true">
                  ＋
                </span>
                Create album
              </button>
            </div>
          ) : (
            <>
              <div className="gallery-album-list">
                {albums.map((album) => (
                  <button
                    key={album.id}
                    type="button"
                    className="gallery-album-item"
                    onClick={() =>
                      openAlbum(album)
                    }
                  >
                    <small>
                      album
                    </small>

                    <strong>
                      {album.title}
                    </strong>
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="gallery-add-button"
                onClick={() =>
                  setCreatingAlbum(true)
                }
              >
                <span aria-hidden="true">
                  ＋
                </span>
                Create another album
              </button>
            </>
          )}
        </section>
        )
      ) : loading ? (
        <section className="gallery-empty-stage">
          <p>
            Opening the camera roll…
          </p>
        </section>
      ) : visiblePhotos.length ===
        0 ? (
        <section className="gallery-empty-stage">
          <div
            className="gallery-empty-icon"
            aria-hidden="true"
          >
            <ImageIcon
              size={28}
              strokeWidth={1.25}
            />
          </div>

          <div className="gallery-empty-copy">
            <small>
              {galleryView ===
              "favorites"
                ? "favorites"
                : "camera roll"}
            </small>

            <h2>
              {galleryView ===
              "favorites"
                ? "Nothing favorited yet."
                : "No photos here yet."}
            </h2>

            <p>
              {galleryView ===
              "favorites"
                ? "Photos you choose to favorite will collect here."
                : "Add a real photo from your library. It will be stored privately and become part of this world."}
            </p>
          </div>

          {galleryView ===
            "photos" && (
            <button
              type="button"
              className="gallery-add-button"
              onClick={() =>
                fileInputRef.current?.click()
              }
              disabled={
                uploading
              }
            >
              <span aria-hidden="true">
                ＋
              </span>

              {uploading
                ? "Adding…"
                : "Add photos"}
            </button>
          )}
        </section>
      ) : (
        <>
          <section className="gallery-library">
            <header>
              <div>
                <span>
                  library
                </span>

                <strong>
                  {galleryView ===
                  "favorites"
                    ? "Favorites"
                    : "Your photos"}
                </strong>
              </div>

              <small>
                {visiblePhotos.length}{" "}
                {visiblePhotos.length ===
                1
                  ? "photo"
                  : "photos"}
              </small>
            </header>

            <div className="gallery-photo-grid">
              {visiblePhotos.map(
                (photo) => (
                <figure
  key={photo.item.id}
  className="gallery-photo-item"
  onClick={() =>
    setSelectedPhoto(photo)
  }
>
  <div className="gallery-photo-media">
                      <img
                        src={
                          photo.url
                        }
                        alt={
                          photo.item
                            .title ??
                          "Gallery photo"
                        }
                        loading="lazy"
                      />

                      <button
                        type="button"
                        className={
                          photo.item.data
                            ?.favorite === true
                            ? "gallery-favorite-button active"
                            : "gallery-favorite-button"
                        }
                        aria-label={
                          photo.item.data
                            ?.favorite === true
                            ? "Remove from favorites"
                            : "Add to favorites"
                        }
                        aria-pressed={
                          photo.item.data
                            ?.favorite === true
                        }
                    onClick={(event) => {
  event.stopPropagation();

  void toggleFavorite(
    photo
  );
}}
                      >
                        <Heart
                          size={18}
                          fill={
                            photo.item.data
                              ?.favorite === true
                              ? "currentColor"
                              : "none"
                          }
                        />
                      </button>
                    </div>

                    <figcaption>
                      <small>
                        {photo.item
                          .event_at
                          ? new Intl.DateTimeFormat(
                              "en",
                              {
                                day: "numeric",
                                month:
                                  "short",
                                year:
                                  "numeric",
                                timeZone:
                                  "America/Sao_Paulo",
                              }
                            ).format(
                              new Date(
                                photo.item
                                  .event_at
                              )
                            )
                          : "Photo"}
                      </small>
                    </figcaption>
                  </figure>
                )
              )}
            </div>
          </section>

          {galleryView ===
            "photos" && (
            <button
              type="button"
              className="gallery-add-button"
              onClick={() =>
                fileInputRef.current?.click()
              }
              disabled={
                uploading
              }
            >
              <span aria-hidden="true">
                ＋
              </span>

              {uploading
                ? "Adding…"
                : "Add more photos"}
            </button>
          )}
        </>
      )}

      {error && (
        <p role="alert">
          {error}
        </p>
      )}
      {selectedPhoto && (
  <div
    className="gallery-photo-modal"
    role="dialog"
    aria-modal="true"
    aria-label="Photo preview"
    onClick={() =>
      setSelectedPhoto(null)
    }
  >
    <div
      className="gallery-photo-modal-card"
      onClick={(event) =>
        event.stopPropagation()
      }
    >
      <button
        type="button"
        className="gallery-photo-modal-close"
        onClick={() =>
          setSelectedPhoto(null)
        }
        aria-label="Close photo"
      >
        ×
      </button>

      <img
        src={selectedPhoto.url}
        alt={
          selectedPhoto.item.title ??
          "Gallery photo"
        }
      />

      <div className="gallery-photo-modal-info">
        <div>
          <strong>
            {selectedPhoto.item.title ??
              "Photo"}
          </strong>

          <small>
            {selectedPhoto.item.event_at
              ? new Intl.DateTimeFormat(
                  "en",
                  {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    timeZone:
                      "America/Sao_Paulo",
                  }
                ).format(
                  new Date(
                    selectedPhoto.item
                      .event_at
                  )
                )
              : "No date"}
          </small>
        </div>

        <button
          type="button"
          className={
            selectedPhoto.item.data
              ?.favorite === true
              ? "gallery-modal-favorite active"
              : "gallery-modal-favorite"
          }
          onClick={async () => {
            await toggleFavorite(
              selectedPhoto
            );

            setSelectedPhoto(
              (current) =>
                current
                  ? {
                      ...current,
                      item: {
                        ...current.item,
                        data: {
                          ...(current.item
                            .data ?? {}),
                          favorite:
                            current.item.data
                              ?.favorite !==
                            true,
                        },
                      },
                    }
                  : null
            );
          }}
        >
          <Heart
            size={19}
            fill={
              selectedPhoto.item.data
                ?.favorite === true
                ? "currentColor"
                : "none"
            }
          />

          {selectedPhoto.item.data
            ?.favorite === true
            ? "Favorited"
            : "Favorite"}
        </button>
      </div>
    </div>
  </div>
)}
    </section>
  );
}

const referenceSubjects: {
  id: VisualReferenceSubject;
  label: string;
  note: string;
}[] = [
  {
    id: "alloah",
    label: "Alloah",
    note: "your face, body, mood, details",
  },
  {
    id: "dominic",
    label: "Dominic",
    note: "his face, style, expressions",
  },
  {
    id: "couple",
    label: "Couple",
    note: "poses and chemistry together",
  },
  {
    id: "pose",
    label: "Pose",
    note: "specific body language",
  },
  {
    id: "style",
    label: "Style",
    note: "vintage, camera, lighting",
  },
  {
    id: "place",
    label: "Place",
    note: "NY, apartment, cafés, streets",
  },
  {
    id: "wardrobe",
    label: "Wardrobe",
    note: "clothes and looks",
  },
  {
    id: "mood",
    label: "Mood",
    note: "atmosphere and emotion",
  },
];

function ReferencesScreen() {
  const { session } = usePrivateDiario();

  const [subject, setSubject] =
    useState<VisualReferenceSubject>("alloah");

  const [references, setReferences] =
    useState<VisualReferenceWithUrl[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [uploading, setUploading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [title, setTitle] =
    useState("");

  const [description, setDescription] =
    useState("");

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError(null);

    getVisualReferences({
      userId: session.user.id,
      subject,
    })
      .then((loadedReferences) => {
        if (!active) return;

        setReferences(loadedReferences);
        setLoading(false);
      })
      .catch((loadError) => {
        if (!active) return;

        console.error(
          "Could not load references:",
          loadError
        );

        setError(
          "The references could not be opened right now."
        );

        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [session.user.id, subject]);

  async function handleReferenceUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const createdReference =
        await createVisualReference({
          userId: session.user.id,
          file,
          subject,
          title,
          description,
        });

      setReferences((current) => [
        createdReference,
        ...current,
      ]);

      setTitle("");
      setDescription("");
      
} catch (uploadError) {
  console.error(
    "Could not upload reference:",
    uploadError
  );

  const message =
    uploadError instanceof Error
      ? uploadError.message
      : typeof uploadError === "object" &&
          uploadError !== null &&
          "message" in uploadError
        ? String(
            (uploadError as { message?: unknown })
              .message
          )
        : JSON.stringify(uploadError);

  setError(
    `Upload failed: ${message}`
  );
}
    finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function toggleReferenceFavorite(
    item: VisualReferenceWithUrl
  ) {
    const nextFavorite =
      item.reference.is_favorite !== true;

    try {
      const updatedReference =
        await setVisualReferenceFavorite({
          userId: session.user.id,
          referenceId: item.reference.id,
          favorite: nextFavorite,
        });

      setReferences((current) =>
        current.map((currentItem) =>
          currentItem.reference.id ===
          item.reference.id
            ? {
                ...currentItem,
                reference: updatedReference,
              }
            : currentItem
        )
      );
    } catch (favoriteError) {
      console.error(
        "Could not favorite reference:",
        favoriteError
      );

      setError(
        "This reference could not be updated."
      );
    }
  }

  const activeSubject =
    referenceSubjects.find(
      (item) => item.id === subject
    );

  return (
    <section className="references-screen">
      <ScreenIntro
        eyebrow="visual canon"
        title="References"
      >
        <p>
          Save the images that define how
          Alloah, Dominic, places, poses,
          outfits and the world should look.
        </p>
      </ScreenIntro>

      <div className="reference-subject-strip">
        {referenceSubjects.map((item) => (
          <button
            key={item.id}
            type="button"
            className={
              subject === item.id
                ? "active"
                : ""
            }
            onClick={() =>
              setSubject(item.id)
            }
          >
            <strong>
              {item.label}
            </strong>

            <small>
              {item.note}
            </small>
          </button>
        ))}
      </div>

      <section className="reference-upload-card">
        <div>
          <small>
            current board
          </small>

          <h2>
            {activeSubject?.label ??
              "References"}
          </h2>

          <p>
            {activeSubject?.note}
          </p>
        </div>

        <input
          value={title}
          onChange={(event) =>
            setTitle(event.target.value)
          }
          placeholder="Reference title"
        />

        <textarea
          value={description}
          onChange={(event) =>
            setDescription(
              event.target.value
            )
          }
          placeholder="Notes: lighting, pose, mood, details..."
        />

        <Button
          type="button"
          onClick={() =>
            fileInputRef.current?.click()
          }
          disabled={uploading}
        >
          <ImageIcon />
          {uploading
            ? "Uploading..."
            : "Upload reference"}
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={handleReferenceUpload}
        />
      </section>

      {error && (
        <p className="form-error">
          {error}
        </p>
      )}

      {loading ? (
        <p className="empty-copy">
          loading references...
        </p>
      ) : references.length === 0 ? (
        <section className="empty-state-card">
          <ImageIcon />

          <h2>
            No references yet.
          </h2>

          <p>
            Upload the first image for this
            board. This is what future
            realistic photos will learn from.
          </p>
        </section>
      ) : (
        <div className="reference-grid">
          {references.map((item) => (
            <article
              key={item.reference.id}
              className="reference-card"
            >
              <img
                src={item.url}
                alt={
                  item.reference.title ??
                  "Visual reference"
                }
              />

              <div>
                <strong>
                  {item.reference.title ??
                    "Untitled reference"}
                </strong>

                {item.reference.description && (
                  <p>
                    {
                      item.reference
                        .description
                    }
                  </p>
                )}

                <button
                  type="button"
                  className={
                    item.reference.is_favorite
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    void toggleReferenceFavorite(
                      item
                    )
                  }
                >
                  <Heart
                    size={16}
                    fill={
                      item.reference
                        .is_favorite
                        ? "currentColor"
                        : "none"
                    }
                  />

                  {item.reference.is_favorite
                    ? "Favorite"
                    : "Mark favorite"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function WardrobeScreen() {
  const { session } = usePrivateDiario();

  const [wardrobeOwner, setWardrobeOwner] =
    useState<
      "mine" | "dominic"
    >("mine");

  const [wardrobeView, setWardrobeView] =
    useState<
      "closet" | "looks"
    >("closet");

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
] = useState<
  Record<string, string[]>
>({});
  
  useEffect(() => {
    let active = true;

    setLoadingWardrobe(true);
    setWardrobeError(null);

    Promise.all([
      getWardrobeItems(
        session.user.id
      ),
      getLooks(
        session.user.id
      ),
    ])
      .then(
        ([
          loadedClothing,
          loadedLooks,
        ]) => {
          if (!active) return;

          setWardrobeItems(
            loadedClothing
          );

          setSavedLooks(
            loadedLooks
          );

          setLoadingWardrobe(
            false
          );
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

        setLoadingWardrobe(
          false
        );
      });

    return () => {
      active = false;
    };
  }, [session.user.id]);
useEffect(() => {
  let active = true;

  const loadLookClothing =
    async () => {
      if (
        savedLooks.length === 0
      ) {
        setLookClothingByLookId({});
        return;
      }

      try {
        const entries =
          await Promise.all(
            savedLooks.map(
              async (look) => {
                const ids =
                  await getLookClothingIds({
                    userId:
                      session.user.id,
                    lookId: look.id,
                  });

                return [
                  look.id,
                  ids,
                ] as const;
              }
            )
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
}, [
  savedLooks,
  session.user.id,
]);
  const dbOwner =
    wardrobeOwner === "mine"
      ? "alloah"
      : "dominic";

  const visibleItems =
    wardrobeItems.filter(
      (item) =>
        item.owner === dbOwner
    );

  const visibleLooks =
    savedLooks.filter(
      (look) =>
        look.owner === dbOwner
    );

  const saveClothing = async () => {
    if (!clothingName.trim()) {
      return;
    }

    setWardrobeError(null);

    try {
      const savedItem =
        await createClothing({
          userId: session.user.id,
          owner: dbOwner,
          title: clothingName,
          category:
            clothingCategory,
          note:
            clothingNote,
        });

      setWardrobeItems(
        (currentItems) => [
          savedItem,
          ...currentItems,
        ]
      );

      setClothingName("");
      setClothingCategory(
        "top"
      );
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
    if (!lookName.trim()) {
      return;
    }

    setWardrobeError(null);

    try {
      const savedLook =
        await createLook({
          userId: session.user.id,
          owner: dbOwner,
          title: lookName,
          note:
            lookNote,
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

  return (
    <section className="wardrobe-screen wardrobe-live">
      <ScreenIntro
        eyebrow="Clothes · looks · getting ready"
        title="Wardrobe"
      >
        <p className="intro-copy">
          clothes belong to the person who owns them.
          Looks only become part of the world after
          they are actually kept.
        </p>
      </ScreenIntro>

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
            setWardrobeOwner(
              "dominic"
            )
          }
        >
          Dominic
        </button>
      </div>

      <div
        className="wardrobe-view-tabs"
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
            setWardrobeView(
              "closet"
            )
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
            setWardrobeView(
              "looks"
            )
          }
        >
          Looks
        </button>
      </div>

      {loadingWardrobe ? (
        <section className="wardrobe-empty">
          <p>
            Opening the wardrobe…
          </p>
        </section>
      ) : wardrobeView ===
        "closet" ? (
        <section className="wardrobe-closet">
          <header>
            <div>
              <span>
                closet
              </span>

              <strong>
                {wardrobeOwner ===
                "mine"
                  ? "My clothes"
                  : "Dominic's clothes"}
              </strong>
            </div>

            <small>
              {visibleItems.length}{" "}
              {visibleItems.length ===
              1
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
                  onClick={
                    saveClothing
                  }
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
                  setAddingClothing(
                    true
                  )
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

                    return (
                      <button
                        key={item.id}
                        type="button"
                        className="wardrobe-item"
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
                      </button>
                    );
                  }
                )}
              </div>

              <button
                type="button"
                className="wardrobe-add-button"
                onClick={() =>
                  setAddingClothing(
                    true
                  )
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
              <span>
                saved looks
              </span>

              <strong>
                {wardrobeOwner ===
                "mine"
                  ? "My looks"
                  : "Dominic's looks"}
              </strong>
            </div>

            <small>
              {visibleLooks.length}{" "}
              {visibleLooks.length ===
              1
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
  {visibleItems.map((item) => {
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
                    (id) =>
                      id !== item.id
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
          strokeWidth={1.3}
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
  })}
</div>
              <div className="diary-editor-actions">
                <button
                  type="button"
onClick={() => {
  setAddingLook(false);
  setLookName("");
  setLookNote("");
  setSelectedLookClothingIds([]);
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
                  onClick={
                    saveLook
                  }
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
                  setAddingLook(
                    true
                  )
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

    return (
      <div
        key={look.id}
        className="wardrobe-look"
      >
        <div>
          <span>
            saved look
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
            {clothing.length === 0
              ? "No clothing attached"
              : clothing
                  .map(
                    (item) =>
                      item.title ??
                      "Untitled"
                  )
                  .join(" · ")}
          </small>
        </div>
      </div>
    );
  }
)}
              </div>

              <button
                type="button"
                className="wardrobe-create-look"
                onClick={() =>
                  setAddingLook(
                    true
                  )
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
            A saved look can later be attached
            to a planned Date without duplicating
            the clothing it refers to.
          </p>
        </div>
      </section>

      <section className="wardrobe-rule">
        <p>
          Clothes are owned items. Looks are
          combinations or references. Keeping a
          look never creates duplicate clothing.
        </p>
      </section>
    </section>
  );
}
function PlacesScreen() {
  const { session } = usePrivateDiario();

  const [placeView, setPlaceView] =
    useState<
      "all" | "saved" | "visited"
    >("all");

  const [places, setPlaces] =
    useState<DiarioItem[]>([]);

  const [loadingPlaces, setLoadingPlaces] =
    useState(true);

  const [placeError, setPlaceError] =
    useState<string | null>(null);

  const [addingPlace, setAddingPlace] =
    useState(false);

  const [placeName, setPlaceName] =
    useState("");

  const [placeNeighborhood, setPlaceNeighborhood] =
    useState("");

  const [placeType, setPlaceType] =
    useState("place");

  const [placeStatus, setPlaceStatus] =
    useState<
      "saved" | "visited"
    >("saved");

  const [placeNote, setPlaceNote] =
    useState("");

  useEffect(() => {
    let active = true;

    setLoadingPlaces(true);
    setPlaceError(null);

    getPlaces(
      session.user.id
    )
      .then((loadedPlaces) => {
        if (!active) return;

        setPlaces(
          loadedPlaces
        );

        setLoadingPlaces(false);
      })
      .catch((loadError) => {
        if (!active) return;

        console.error(
          "Could not load Places:",
          loadError
        );

        setPlaceError(
          "Places could not be opened."
        );

        setLoadingPlaces(false);
      });

    return () => {
      active = false;
    };
  }, [session.user.id]);

  const statusOf = (
    place: DiarioItem
  ): "saved" | "visited" => {
    return place.data?.placeStatus ===
      "visited"
      ? "visited"
      : "saved";
  };

  const visiblePlaces =
    placeView === "all"
      ? places
      : places.filter(
          (place) =>
            statusOf(place) ===
            placeView
        );

  const savePlace = async () => {
    if (!placeName.trim()) {
      return;
    }

    setPlaceError(null);

    try {
      const savedPlace =
        await createPlace({
          userId: session.user.id,
          title: placeName,
          neighborhood:
            placeNeighborhood,
          placeType,
          placeStatus,
          note:
            placeNote,
        });

      setPlaces(
        (currentPlaces) => [
          savedPlace,
          ...currentPlaces,
        ]
      );

      setPlaceName("");
      setPlaceNeighborhood("");
      setPlaceType("place");
      setPlaceStatus("saved");
      setPlaceNote("");
      setAddingPlace(false);
    } catch (saveError) {
      console.error(
        "Could not save place:",
        saveError
      );

      setPlaceError(
        "The place could not be saved."
      );
    }
  };

  const markAsVisited = async (
  place: DiarioItem
) => {
  setPlaceError(null);

  try {
    const updatedPlace =
      await markPlaceAsVisited({
        userId: session.user.id,
        place,
      });

    setPlaces((currentPlaces) =>
      currentPlaces.map(
        (currentPlace) =>
          currentPlace.id ===
          updatedPlace.id
            ? updatedPlace
            : currentPlace
      )
    );
  } catch (updateError) {
    console.error(
      "Could not mark place as visited:",
      updateError
    );

    setPlaceError(
      "The place could not be marked as visited."
    );
  }
};
  
  return (
    <section className="places-screen places-live">
      <ScreenIntro
        eyebrow="Saved · visited · part of the city"
        title="Places"
      >
        <p className="intro-copy">
          saving a place does not mean
          we have been there. Visited places
          become part of the lived world.
        </p>
      </ScreenIntro>

      <div
        className="dates-tabs"
        role="tablist"
        aria-label="Places view"
      >
        <button
          type="button"
          role="tab"
          aria-selected={
            placeView === "all"
          }
          className={
            placeView === "all"
              ? "active"
              : ""
          }
          onClick={() =>
            setPlaceView("all")
          }
        >
          All
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={
            placeView === "saved"
          }
          className={
            placeView === "saved"
              ? "active"
              : ""
          }
          onClick={() =>
            setPlaceView("saved")
          }
        >
          Saved
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={
            placeView === "visited"
          }
          className={
            placeView === "visited"
              ? "active"
              : ""
          }
          onClick={() =>
            setPlaceView("visited")
          }
        >
          Visited
        </button>
      </div>

      {addingPlace ? (
        <section className="dates-empty">
          <small>
            new place
          </small>

          <h2>
            Add a place
          </h2>

          <input
            type="text"
            value={placeName}
            onChange={(event) =>
              setPlaceName(
                event.target.value
              )
            }
            placeholder="Place name"
            autoFocus
          />

          <input
            type="text"
            value={placeNeighborhood}
            onChange={(event) =>
              setPlaceNeighborhood(
                event.target.value
              )
            }
            placeholder="Neighborhood"
          />

          <select
            value={placeType}
            onChange={(event) =>
              setPlaceType(
                event.target.value
              )
            }
          >
            <option value="place">
              Place
            </option>

            <option value="restaurant">
              Restaurant
            </option>

            <option value="cafe">
              Café
            </option>

            <option value="bar">
              Bar
            </option>

            <option value="park">
              Park
            </option>

            <option value="museum">
              Museum
            </option>

            <option value="store">
              Store
            </option>

            <option value="venue">
              Venue
            </option>

            <option value="other">
              Other
            </option>
          </select>

          <select
            value={placeStatus}
            onChange={(event) =>
              setPlaceStatus(
                event.target.value as
                  | "saved"
                  | "visited"
              )
            }
          >
            <option value="saved">
              Saved for later
            </option>

            <option value="visited">
              Already visited
            </option>
          </select>

          <textarea
            value={placeNote}
            onChange={(event) =>
              setPlaceNote(
                event.target.value
              )
            }
            placeholder="A note about this place…"
            rows={4}
          />

          <div className="diary-editor-actions">
            <button
              type="button"
              onClick={() => {
                setAddingPlace(false);
                setPlaceName("");
                setPlaceNeighborhood("");
                setPlaceType("place");
                setPlaceStatus("saved");
                setPlaceNote("");
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              className="gallery-add-button"
              disabled={
                !placeName.trim()
              }
              onClick={
                savePlace
              }
            >
              Save place
            </button>
          </div>
        </section>
      ) : loadingPlaces ? (
        <section className="dates-empty">
          <p>
            Opening places…
          </p>
        </section>
      ) : visiblePlaces.length ===
        0 ? (
        <section className="dates-empty">
          <MapPin
            size={27}
            strokeWidth={1.3}
          />

          <small>
            {placeView === "visited"
              ? "visited places"
              : "saved places"}
          </small>

          <h2>
            No places here yet.
          </h2>

          <p>
            Save somewhere for later,
            or record a place that has
            actually been visited.
          </p>

          <button
            type="button"
            className="gallery-add-button"
            onClick={() =>
              setAddingPlace(true)
            }
          >
            ＋ Add place
          </button>
        </section>
      ) : (
        <>
          <div className="dates-list">
            {visiblePlaces.map(
              (place) => {
                const status =
                  statusOf(place);

                const neighborhood =
                  typeof place.data
                    ?.neighborhood ===
                  "string"
                    ? place.data
                        .neighborhood
                    : null;

                const type =
                  typeof place.data
                    ?.placeType ===
                  "string"
                    ? place.data
                        .placeType
                    : "place";

                return (
                  <article
                    key={place.id}
                    className="date-card"
                  >
                    <header>
                      <div>
                        <span>
                          {status}
                        </span>

                        <strong>
                          {place.title ??
                            "Untitled place"}
                        </strong>
                      </div>

                      <MapPin
                        size={17}
                      />
                    </header>

                    <div className="date-place">
                      <span>
                        {type}
                        {neighborhood
                          ? ` · ${neighborhood}`
                          : ""}
                      </span>
                    </div>

                    {place.body && (
                      <p>
                        {place.body}
                      </p>
                    )}

                    {status ===
                      "visited" &&
                      place.event_at && (
                        <time>
                          Visited{" "}
                          {new Intl.DateTimeFormat(
                            "en-US",
                            {
                              month:
                                "long",
                              day:
                                "numeric",
                              year:
                                "numeric",
                            }
                          ).format(
                            new Date(
                              place.event_at
                            )
                          )}
                        </time>
                      )}
                    {status === "saved" && (
  <button
    type="button"
    className="gallery-add-button"
    onClick={() =>
      void markAsVisited(place)
    }
  >
    Mark as visited
  </button>
)}
                    
                  </article>
                );
              }
            )}
          </div>

          <button
            type="button"
            className="gallery-add-button"
            onClick={() =>
              setAddingPlace(true)
            }
          >
            ＋ Add another place
          </button>
        </>
      )}

      {placeError && (
        <p role="alert">
          {placeError}
        </p>
      )}

      <section className="date-life-cycle">
        <header>
          <span>
            place history
          </span>

          <strong>
            Saved is not the same as lived
          </strong>
        </header>

        <div>
          <article>
            <MapPin
              size={18}
              strokeWidth={1.35}
            />

            <span>
              <strong>
                Save
              </strong>

              <small>
                somewhere for later
              </small>
            </span>
          </article>

          <article>
            <CalendarIcon
              size={18}
              strokeWidth={1.35}
            />

            <span>
              <strong>
                Plan
              </strong>

              <small>
                connect it to a Date later
              </small>
            </span>
          </article>

          <article>
            <Heart
              size={18}
              strokeWidth={1.35}
            />

            <span>
              <strong>
                Visit
              </strong>

              <small>
                becomes lived history
              </small>
            </span>
          </article>
        </div>
      </section>
    </section>
  );
}
function KeepsakesScreen() {
  const { session } = usePrivateDiario();

  const [keepsakeView, setKeepsakeView] =
    useState<
      "all" | "home" | "stored"
    >("all");

  const [keepsakes, setKeepsakes] =
    useState<DiarioItem[]>([]);

  const [loadingKeepsakes, setLoadingKeepsakes] =
    useState(true);

  const [keepsakeError, setKeepsakeError] =
    useState<string | null>(null);

  const [addingKeepsake, setAddingKeepsake] =
    useState(false);

  const [keepsakeTitle, setKeepsakeTitle] =
    useState("");

  const [keepsakeType, setKeepsakeType] =
    useState("object");

  const [keepsakeLocation, setKeepsakeLocation] =
    useState<"home" | "stored">("home");

  const [keepsakeRoom, setKeepsakeRoom] =
    useState("");

  const [keepsakeOrigin, setKeepsakeOrigin] =
    useState("");

  const [keepsakeNote, setKeepsakeNote] =
    useState("");

  useEffect(() => {
    let active = true;

    setLoadingKeepsakes(true);
    setKeepsakeError(null);

    getKeepsakes(
      session.user.id
    )
      .then((loadedKeepsakes) => {
        if (!active) return;

        setKeepsakes(
          loadedKeepsakes
        );

        setLoadingKeepsakes(false);
      })
      .catch((loadError) => {
        if (!active) return;

        console.error(
          "Could not load Keepsakes:",
          loadError
        );

        setKeepsakeError(
          "Keepsakes could not be opened."
        );

        setLoadingKeepsakes(false);
      });

    return () => {
      active = false;
    };
  }, [session.user.id]);

  const locationOf = (
    item: DiarioItem
  ): "home" | "stored" => {
    return item.data?.location ===
      "stored"
      ? "stored"
      : "home";
  };

  const visibleKeepsakes =
    keepsakeView === "all"
      ? keepsakes
      : keepsakes.filter(
          (item) =>
            locationOf(item) ===
            keepsakeView
        );

  const homeKeepsakes =
    keepsakes.filter(
      (item) =>
        locationOf(item) ===
        "home"
    );

  const storedKeepsakes =
    keepsakes.filter(
      (item) =>
        locationOf(item) ===
        "stored"
    );

  const saveKeepsake = async () => {
    if (!keepsakeTitle.trim()) {
      return;
    }

    setKeepsakeError(null);

    try {
      const savedKeepsake =
        await createKeepsake({
          userId: session.user.id,
          title: keepsakeTitle,
          keepsakeType,
          location:
            keepsakeLocation,
          room:
            keepsakeLocation ===
            "home"
              ? keepsakeRoom
              : undefined,
          origin:
            keepsakeOrigin,
          note:
            keepsakeNote,
        });

      setKeepsakes(
        (currentKeepsakes) => [
          savedKeepsake,
          ...currentKeepsakes,
        ]
      );

      setKeepsakeTitle("");
      setKeepsakeType("object");
      setKeepsakeLocation("home");
      setKeepsakeRoom("");
      setKeepsakeOrigin("");
      setKeepsakeNote("");
      setAddingKeepsake(false);
    } catch (saveError) {
      console.error(
        "Could not create Keepsake:",
        saveError
      );

      setKeepsakeError(
        "The keepsake could not be saved."
      );
    }
  };

  const moveKeepsake = async (
  item: DiarioItem,
  location: "home" | "stored"
) => {
  setKeepsakeError(null);

  try {
    const updatedKeepsake =
      await updateKeepsakeLocation({
        userId: session.user.id,
        keepsake: item,
        location,
      });

    setKeepsakes((currentKeepsakes) =>
      currentKeepsakes.map(
        (currentKeepsake) =>
          currentKeepsake.id ===
          updatedKeepsake.id
            ? updatedKeepsake
            : currentKeepsake
      )
    );
  } catch (updateError) {
    console.error(
      "Could not move keepsake:",
      updateError
    );

    setKeepsakeError(
      "The keepsake could not be moved."
    );
  }
};
  
  return (
    <section className="keepsakes-screen keepsakes-live">
      <ScreenIntro
        eyebrow="Objects that stayed"
        title="Keepsakes"
      >
        <p className="intro-copy">
          little physical things can keep their
          place, origin and history without becoming
          separate copies of the memory they belong to.
        </p>
      </ScreenIntro>

      <div
        className="keepsakes-tabs"
        role="tablist"
        aria-label="Keepsake location"
      >
        <button
          type="button"
          role="tab"
          aria-selected={
            keepsakeView === "all"
          }
          className={
            keepsakeView === "all"
              ? "active"
              : ""
          }
          onClick={() =>
            setKeepsakeView("all")
          }
        >
          All
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={
            keepsakeView === "home"
          }
          className={
            keepsakeView === "home"
              ? "active"
              : ""
          }
          onClick={() =>
            setKeepsakeView("home")
          }
        >
          At home
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={
            keepsakeView === "stored"
          }
          className={
            keepsakeView ===
            "stored"
              ? "active"
              : ""
          }
          onClick={() =>
            setKeepsakeView(
              "stored"
            )
          }
        >
          Stored
        </button>
      </div>

      <section className="keepsakes-summary">
        <div>
          <span>
            at home
          </span>

          <strong>
            {homeKeepsakes.length}
          </strong>
        </div>

        <div>
          <span>
            stored
          </span>

          <strong>
            {storedKeepsakes.length}
          </strong>
        </div>
      </section>

      {addingKeepsake ? (
        <section className="keepsakes-empty">
          <small>
            new keepsake
          </small>

          <h2>
            Keep an object
          </h2>

          <input
            type="text"
            value={keepsakeTitle}
            onChange={(event) =>
              setKeepsakeTitle(
                event.target.value
              )
            }
            placeholder="Name"
            autoFocus
          />

          <select
            value={keepsakeType}
            onChange={(event) =>
              setKeepsakeType(
                event.target.value
              )
            }
          >
            <option value="object">
              Object
            </option>
            <option value="ticket">
              Ticket
            </option>
            <option value="flower">
              Flower
            </option>
            <option value="photo">
              Photo
            </option>
            <option value="gift">
              Gift
            </option>
            <option value="note">
              Note
            </option>
          </select>

          <select
            value={keepsakeLocation}
            onChange={(event) =>
              setKeepsakeLocation(
                event.target.value as
                  | "home"
                  | "stored"
              )
            }
          >
            <option value="home">
              At home
            </option>
            <option value="stored">
              Stored away
            </option>
          </select>

          {keepsakeLocation ===
            "home" && (
            <input
              type="text"
              value={keepsakeRoom}
              onChange={(event) =>
                setKeepsakeRoom(
                  event.target.value
                )
              }
              placeholder="Room"
            />
          )}

          <input
            type="text"
            value={keepsakeOrigin}
            onChange={(event) =>
              setKeepsakeOrigin(
                event.target.value
              )
            }
            placeholder="Where did it come from?"
          />

          <textarea
            value={keepsakeNote}
            onChange={(event) =>
              setKeepsakeNote(
                event.target.value
              )
            }
            placeholder="Why keep it?"
            rows={4}
          />

          <div className="diary-editor-actions">
            <button
              type="button"
              onClick={() => {
                setAddingKeepsake(
                  false
                );
                setKeepsakeTitle("");
                setKeepsakeType(
                  "object"
                );
                setKeepsakeLocation(
                  "home"
                );
                setKeepsakeRoom("");
                setKeepsakeOrigin("");
                setKeepsakeNote("");
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              className="gallery-add-button"
              disabled={
                !keepsakeTitle.trim()
              }
              onClick={
                saveKeepsake
              }
            >
              Keep object
            </button>
          </div>
        </section>
      ) : loadingKeepsakes ? (
        <section className="keepsakes-empty">
          <p>
            Opening the drawer…
          </p>
        </section>
      ) : visibleKeepsakes.length ===
        0 ? (
        <section className="keepsakes-empty">
          <div
            className="keepsakes-empty-icon"
            aria-hidden="true"
          >
            <BoxIcon
              size={27}
              strokeWidth={1.3}
            />
          </div>

          <small>
            empty drawer
          </small>

          <h2>
            Nothing kept yet.
          </h2>

          <p>
            Tickets, flowers, notes,
            photos, gifts and small
            objects only appear here
            after they actually enter
            your world.
          </p>

          <button
            type="button"
            className="gallery-add-button"
            onClick={() =>
              setAddingKeepsake(
                true
              )
            }
          >
            ＋ Add keepsake
          </button>
        </section>
      ) : (
        <>
          <div className="keepsakes-list">
            {visibleKeepsakes.map(
              (item) => {
                const location =
                  locationOf(item);

                const kind =
                  typeof item.data
                    ?.keepsakeType ===
                  "string"
                    ? item.data
                        .keepsakeType
                    : "object";

                const room =
                  typeof item.data
                    ?.room === "string"
                    ? item.data.room
                    : null;

                const origin =
                  typeof item.data
                    ?.origin ===
                  "string"
                    ? item.data.origin
                    : null;

                return (
                  <article
                    key={item.id}
                    className={`keepsake-card keepsake-${kind}`}
                  >
                    <header>
                      <div>
                        <span>
                          {kind}
                        </span>

                        <strong>
                          {item.title ??
                            "Untitled keepsake"}
                        </strong>
                      </div>

                      <ChevronRight
                        size={17}
                      />
                    </header>

                    <div className="keepsake-location">
                      <Home
                        size={15}
                        strokeWidth={
                          1.4
                        }
                      />

                      <span>
                        {location ===
                        "home"
                          ? room ||
                            "Somewhere at home"
                          : "Stored away"}
                      </span>
                    </div>

                    {item.event_at && (
                      <time>
                        {new Intl.DateTimeFormat(
                          "en-US",
                          {
                            month:
                              "long",
                            day:
                              "numeric",
                            year:
                              "numeric",
                          }
                        ).format(
                          new Date(
                            item.event_at
                          )
                        )}
                      </time>
                    )}

                    {origin && (
                      <p>
                        {origin}
                      </p>
                    )}

                    {item.body && (
                      <small>
                        {item.body}
                      </small>
                    )}
                    <button
  type="button"
  className="gallery-add-button"
  onClick={() =>
    void moveKeepsake(
      item,
      location === "home"
        ? "stored"
        : "home"
    )
  }
>
  {location === "home"
    ? "Store away"
    : "Bring home"}
</button>
                  
                  </article>
                );
              }
            )}
          </div>

          <button
            type="button"
            className="gallery-add-button"
            onClick={() =>
              setAddingKeepsake(
                true
              )
            }
          >
            ＋ Add another keepsake
          </button>
        </>
      )}

      {keepsakeError && (
        <p role="alert">
          {keepsakeError}
        </p>
      )}

      <section className="keepsake-life">
        <header>
          <span>
            one real object
          </span>

          <strong>
            It can move without losing its history
          </strong>
        </header>

        <div>
          <article>
            <MapPin
              size={18}
              strokeWidth={1.35}
            />

            <span>
              <strong>
                Origin
              </strong>
              <small>
                where it came from
              </small>
            </span>
          </article>

          <article>
            <Home
              size={18}
              strokeWidth={1.35}
            />

            <span>
              <strong>
                Place
              </strong>
              <small>
                where it is now
              </small>
            </span>
          </article>

          <article>
            <Heart
              size={18}
              strokeWidth={1.35}
            />

            <span>
              <strong>
                Meaning
              </strong>
              <small>
                memory or date attached
              </small>
            </span>
          </article>

          <article>
            <BoxIcon
              size={18}
              strokeWidth={1.35}
            />

            <span>
              <strong>
                Storage
              </strong>
              <small>
                kept even when not displayed
              </small>
            </span>
          </article>
        </div>
      </section>

      <section className="keepsakes-rule">
        <p>
          A keepsake is one object with one history.
          Moving it from the bedroom to a drawer,
          attaching it to a Date or showing it in a
          Memory never creates another copy.
        </p>
      </section>
    </section>
  );
}
function DatesScreen() {
  const { session } = usePrivateDiario();

  const [dateView, setDateView] =
    useState<
      "all" | "planned" | "lived"
    >("all");

  const [dates, setDates] =
    useState<DiarioItem[]>([]);

  const [loadingDates, setLoadingDates] =
    useState(true);

  const [dateError, setDateError] =
    useState<string | null>(null);

  const [planningDate, setPlanningDate] =
    useState(false);

  const [dateTitle, setDateTitle] =
    useState("");

  const [datePlace, setDatePlace] =
    useState("");

  const [dateDay, setDateDay] =
    useState("");

  const [dateNote, setDateNote] =
    useState("");

  useEffect(() => {
    let active = true;

    setLoadingDates(true);
    setDateError(null);

    getDates(session.user.id)
      .then((loadedDates) => {
        if (!active) return;

        setDates(loadedDates);
        setLoadingDates(false);
      })
      .catch((loadError) => {
        if (!active) return;

        console.error(
          "Could not load Dates:",
          loadError
        );

        setDateError(
          "Dates could not be opened right now."
        );

        setLoadingDates(false);
      });

    return () => {
      active = false;
    };
  }, [session.user.id]);

  const visibleDates =
    dates.filter((date) => {
      const isLived =
        Boolean(date.event_at);

      if (dateView === "planned") {
        return !isLived;
      }

      if (dateView === "lived") {
        return isLived;
      }

      return true;
    });

  const saveDate = async () => {
    if (
      !dateTitle.trim() ||
      !datePlace.trim() ||
      !dateDay
    ) {
      return;
    }

    setDateError(null);

    try {
      const savedDate =
        await createDate({
          userId: session.user.id,
          title: dateTitle,
          place: datePlace,
          plannedFor:
            `${dateDay}T19:00:00-03:00`,
          note: dateNote,
        });

      setDates((currentDates) =>
        [...currentDates, savedDate].sort(
          (first, second) => {
            const firstDate =
              first.planned_for ??
              first.event_at ??
              first.created_at;

            const secondDate =
              second.planned_for ??
              second.event_at ??
              second.created_at;

            return (
              new Date(
                firstDate
              ).getTime() -
              new Date(
                secondDate
              ).getTime()
            );
          }
        )
      );

      setDateTitle("");
      setDatePlace("");
      setDateDay("");
      setDateNote("");
      setPlanningDate(false);
    } catch (saveError) {
      console.error(
        "Could not create Date:",
        saveError
      );

      setDateError(
        "The date could not be planned."
      );
    }
  };
const markAsLived = async (
  date: DiarioItem
) => {
  setDateError(null);

  try {
    const updatedDate =
      await markDateAsLived({
        userId: session.user.id,
        dateId: date.id,
      });

    setDates((currentDates) =>
      currentDates.map(
        (currentDate) =>
          currentDate.id ===
          updatedDate.id
            ? updatedDate
            : currentDate
      )
    );
  } catch (updateError) {
    console.error(
      "Could not mark Date as lived:",
      updateError
    );

    setDateError(
      "The date could not be marked as lived."
    );
  }
};
  return (
    <section className="dates-screen dates-live">
      <ScreenIntro
        eyebrow="Plans · places · days together"
        title="Dates"
      >
        <p className="intro-copy">
          a date begins as a plan and can
          later become a real lived moment.
        </p>
      </ScreenIntro>

      <div
        className="dates-tabs"
        role="tablist"
        aria-label="Dates view"
      >
        <button
          type="button"
          role="tab"
          aria-selected={
            dateView === "all"
          }
          className={
            dateView === "all"
              ? "active"
              : ""
          }
          onClick={() =>
            setDateView("all")
          }
        >
          All
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={
            dateView === "planned"
          }
          className={
            dateView === "planned"
              ? "active"
              : ""
          }
          onClick={() =>
            setDateView("planned")
          }
        >
          Planned
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={
            dateView === "lived"
          }
          className={
            dateView === "lived"
              ? "active"
              : ""
          }
          onClick={() =>
            setDateView("lived")
          }
        >
          Lived
        </button>
      </div>

      {planningDate ? (
        <section className="dates-empty">
          <small>
            new date
          </small>

          <h2>
            Plan a date
          </h2>

          <input
            type="text"
            value={dateTitle}
            onChange={(event) =>
              setDateTitle(
                event.target.value
              )
            }
            placeholder="What are we doing?"
            autoFocus
          />

          <input
            type="text"
            value={datePlace}
            onChange={(event) =>
              setDatePlace(
                event.target.value
              )
            }
            placeholder="Place"
          />

          <input
            type="date"
            value={dateDay}
            onChange={(event) =>
              setDateDay(
                event.target.value
              )
            }
          />

          <textarea
            value={dateNote}
            onChange={(event) =>
              setDateNote(
                event.target.value
              )
            }
            placeholder="A note, idea or little plan…"
            rows={4}
          />

          <div className="diary-editor-actions">
            <button
              type="button"
              onClick={() => {
                setPlanningDate(false);
                setDateTitle("");
                setDatePlace("");
                setDateDay("");
                setDateNote("");
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              className="gallery-add-button"
              onClick={saveDate}
              disabled={
                !dateTitle.trim() ||
                !datePlace.trim() ||
                !dateDay
              }
            >
              Save date
            </button>
          </div>
        </section>
      ) : loadingDates ? (
        <section className="dates-empty">
          <p>
            Opening dates…
          </p>
        </section>
      ) : visibleDates.length === 0 ? (
        <section className="dates-empty">
          <CalendarIcon
            size={27}
            strokeWidth={1.3}
          />

          <small>
            {dateView === "lived"
              ? "lived dates"
              : "plans"}
          </small>

          <h2>
            {dateView === "lived"
              ? "No lived dates yet."
              : "Nothing planned yet."}
          </h2>

          <p>
            Plans only become shared history
            after they actually happen.
          </p>

          {dateView !== "lived" && (
            <button
              type="button"
              className="gallery-add-button"
              onClick={() =>
                setPlanningDate(true)
              }
            >
              ＋ Plan a date
            </button>
          )}
        </section>
      ) : (
        <>
          <div className="dates-list">
            {visibleDates.map(
              (date) => {
                const isLived =
                  Boolean(
                    date.event_at
                  );

                const dateTime =
                  date.event_at ??
                  date.planned_for ??
                  date.created_at;

                const place =
                  typeof date.data
                    ?.place ===
                  "string"
                    ? date.data.place
                    : "Place not set";

                return (
                  <article
                    key={date.id}
                    className={`date-card ${
                      isLived
                        ? "date-lived"
                        : "date-planned"
                    }`}
                  >
                    <header>
                      <div>
                        <span>
                          {isLived
                            ? "lived"
                            : "planned"}
                        </span>

                        <strong>
                          {date.title ??
                            "Untitled date"}
                        </strong>
                      </div>

                      <ChevronRight
                        size={17}
                      />
                    </header>

                    <div className="date-place">
                      <MapPin
                        size={16}
                      />

                      <span>
                        {place}
                      </span>
                    </div>

                    <time>
                      {new Intl.DateTimeFormat(
                        "en-US",
                        {
                          weekday:
                            "short",
                          month:
                            "long",
                          day:
                            "numeric",
                          year:
                            "numeric",
                        }
                      ).format(
                        new Date(
                          dateTime
                        )
                      )}
                    </time>

                    {date.body && (
                      <p>
                        {date.body}
                      </p>
                    )}
                    {!isLived && (
  <button
    type="button"
    className="gallery-add-button"
    onClick={() =>
      void markAsLived(date)
    }
  >
    Mark as lived
  </button>
)}
                    
                  </article>
                );
              }
            )}
          </div>

          <button
            type="button"
            className="gallery-add-button"
            onClick={() =>
              setPlanningDate(true)
            }
          >
            ＋ Plan another date
          </button>
        </>
      )}

      {dateError && (
        <p role="alert">
          {dateError}
        </p>
      )}

      <section className="date-life-cycle">
        <header>
          <span>
            how a date lives
          </span>

          <strong>
            One moment, connected everywhere
          </strong>
        </header>

        <div>
          <article>
            <CalendarIcon
              size={18}
              strokeWidth={1.35}
            />

            <span>
              <strong>
                Plan
              </strong>

              <small>
                place, day and idea
              </small>
            </span>
          </article>

          <article>
            <Shirt
              size={18}
              strokeWidth={1.35}
            />

            <span>
              <strong>
                Get ready
              </strong>

              <small>
                outfit and preparation
              </small>
            </span>
          </article>

          <article>
            <MapPin
              size={18}
              strokeWidth={1.35}
            />

            <span>
              <strong>
                Live
              </strong>

              <small>
                what actually happened
              </small>
            </span>
          </article>

          <article>
            <ImageIcon
              size={18}
              strokeWidth={1.35}
            />

            <span>
              <strong>
                Keep
              </strong>

              <small>
                photos, songs and objects
              </small>
            </span>
          </article>
        </div>
      </section>
    </section>
  );
}
function MusicScreen({
  onShareToChat,
}: {
  onShareToChat?: (text: string) => void;
}) {
  const { session } = usePrivateDiario();

  const [musicView, setMusicView] =
    useState<
      "mine" | "dominic" | "ours"
    >("ours");

  const [songs, setSongs] =
    useState<DiarioItem[]>([]);

  const [loadingSongs, setLoadingSongs] =
    useState(true);

  const [musicError, setMusicError] =
    useState<string | null>(null);

  const [addingSong, setAddingSong] =
    useState(false);

  const [songTitle, setSongTitle] =
    useState("");

  const [songArtist, setSongArtist] =
    useState("");

  const [songAlbum, setSongAlbum] =
    useState("");

  const [songNote, setSongNote] =
    useState("");
const [spotifyQuery, setSpotifyQuery] =
  useState("");

const [spotifyResults, setSpotifyResults] =
  useState<SpotifyTrack[]>([]);

const [searchingSpotify, setSearchingSpotify] =
  useState(false);

  const [
  selectedSpotifyTrack,
  setSelectedSpotifyTrack,
] = useState<SpotifyTrack | null>(null);
  
const searchSpotify = async () => {
  if (!spotifyQuery.trim()) return;

  setSearchingSpotify(true);
  setMusicError(null);

  try {
    const results =
      await searchSpotifyTracks(
        spotifyQuery
      );

    setSpotifyResults(results);
 } catch (error) {
  console.error(error);

  setMusicError(
    error instanceof Error
      ? error.message
      : "Could not search Spotify."
  );
} finally {
    setSearchingSpotify(false);
  }
};

  const chooseSpotifyTrack = (
  track: SpotifyTrack
) => {
  setSelectedSpotifyTrack(track);
  setSongTitle(track.name);
  setSongArtist(
    track.artists.join(", ")
  );
  setSongAlbum(track.album);
  setSpotifyResults([]);
  setSpotifyQuery(track.name);
};
  
  useEffect(() => {
    let active = true;

    setLoadingSongs(true);
    setMusicError(null);

    getSongs(
      session.user.id
    )
      .then((loadedSongs) => {
        if (!active) return;

        setSongs(
          loadedSongs
        );

        setLoadingSongs(false);
      })
      .catch((loadError) => {
        if (!active) return;

        console.error(
          "Could not load Music:",
          loadError
        );

        setMusicError(
          "Music could not be opened."
        );

        setLoadingSongs(false);
      });

    return () => {
      active = false;
    };
  }, [session.user.id]);

  const ownerForView =
    musicView === "mine"
      ? "alloah"
      : musicView === "dominic"
        ? "dominic"
        : "shared";

  const visibleSongs =
    songs.filter(
      (song) =>
        song.owner ===
        ownerForView
    );

  const saveSong = async () => {
    if (
      !songTitle.trim() ||
      !songArtist.trim()
    ) {
      return;
    }

    setMusicError(null);

    try {
      const savedSong =
     await createSong({
  userId: session.user.id,
  owner: ownerForView,
  title: songTitle,
  artist: songArtist,
  album: songAlbum,
  note: songNote,
  spotifyId:
    selectedSpotifyTrack?.id,
  spotifyUri:
    selectedSpotifyTrack?.uri,
  spotifyUrl:
    selectedSpotifyTrack
      ?.externalUrl,
  coverUrl:
    selectedSpotifyTrack
      ?.coverUrl,
  durationMs:
    selectedSpotifyTrack
      ?.durationMs,
});

      setSongs(
        (currentSongs) => [
          savedSong,
          ...currentSongs,
        ]
      );

setSongTitle("");
setSongArtist("");
setSongAlbum("");
setSongNote("");
setSpotifyQuery("");
setSpotifyResults([]);
setSelectedSpotifyTrack(null);
setAddingSong(false);
    } catch (saveError) {
      console.error(
        "Could not save song:",
        saveError
      );

      setMusicError(
        "The song could not be saved."
      );
    }
  };

  return (
    <section className="music-screen music-live">
      <ScreenIntro
        eyebrow="Mine · Dominic · Ours"
        title="Music"
      >
        <p className="intro-copy">
          songs can belong to either of you,
          or become part of the shared soundtrack.
        </p>
      </ScreenIntro>

      <div
        className="music-tabs"
        role="tablist"
        aria-label="Music owner"
      >
        {onShareToChat && (
  <button
    type="button"
    onClick={() =>
      onShareToChat(
        `I sent you a song: "${song.title ?? "Untitled song"}" by ${artist}.`
      )
    }
  >
    Send to chat
  </button>
)}
        <button
          type="button"
          role="tab"
          aria-selected={
            musicView === "mine"
          }
          className={
            musicView === "mine"
              ? "active"
              : ""
          }
          onClick={() =>
            setMusicView("mine")
          }
        >
          Mine
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={
            musicView === "dominic"
          }
          className={
            musicView === "dominic"
              ? "active"
              : ""
          }
          onClick={() =>
            setMusicView(
              "dominic"
            )
          }
        >
          Dominic
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={
            musicView === "ours"
          }
          className={
            musicView === "ours"
              ? "active"
              : ""
          }
          onClick={() =>
            setMusicView("ours")
          }
        >
          Ours
        </button>
      </div>

      {addingSong ? (
        <section className="music-empty">
          <small>
            new song
          </small>

          <h2>
            Add a song
          </h2>

          <div className="music-spotify-search">
  <input
    type="text"
    value={spotifyQuery}
    onChange={(event) =>
      setSpotifyQuery(
        event.target.value
      )
    }
    placeholder="Search Spotify"
  />

  <button
    type="button"
    onClick={() =>
      void searchSpotify()
    }
    disabled={
      searchingSpotify ||
      !spotifyQuery.trim()
    }
  >
    {searchingSpotify
      ? "Searching…"
      : "Search"}
  </button>
</div>

{spotifyResults.length > 0 && (
  <div className="music-spotify-results">
    {spotifyResults.map(
      (track) => (
        <button
          key={track.id}
          type="button"
          onClick={() =>
            chooseSpotifyTrack(
              track
            )
          }
        >
          {track.coverUrl && (
            <img
              src={track.coverUrl}
              alt=""
            />
          )}

          <span>
            <strong>
              {track.name}
            </strong>

            <small>
              {track.artists.join(
                ", "
              )}
            </small>
          </span>
        </button>
      )
    )}
  </div>
)}
          
          <input
            type="text"
            value={songTitle}
            onChange={(event) =>
              setSongTitle(
                event.target.value
              )
            }
            placeholder="Song title"
            autoFocus
          />

          <input
            type="text"
            value={songArtist}
            onChange={(event) =>
              setSongArtist(
                event.target.value
              )
            }
            placeholder="Artist"
          />

          <input
            type="text"
            value={songAlbum}
            onChange={(event) =>
              setSongAlbum(
                event.target.value
              )
            }
            placeholder="Album (optional)"
          />

          <textarea
            value={songNote}
            onChange={(event) =>
              setSongNote(
                event.target.value
              )
            }
            placeholder="Why does this song matter?"
            rows={4}
          />

          <div className="diary-editor-actions">
            <button
              type="button"
              onClick={() => {
                setAddingSong(false);
                setSongTitle("");
                setSongArtist("");
                setSongAlbum("");
                setSongNote("");
                setSpotifyQuery("");
                setSelectedSpotifyTrack(null);
setSpotifyResults([]);
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              className="gallery-add-button"
              disabled={
                !songTitle.trim() ||
                !songArtist.trim()
              }
              onClick={
                saveSong
              }
            >
              Save song
            </button>
          </div>
        </section>
      ) : loadingSongs ? (
        <section className="music-empty">
          <p>
            Opening the record shelf…
          </p>
        </section>
      ) : visibleSongs.length ===
        0 ? (
        <section className="music-empty">
          <div
            className="music-empty-icon"
            aria-hidden="true"
          >
            <Disc3
              size={28}
              strokeWidth={1.25}
            />
          </div>

          <small>
            {musicView === "mine"
              ? "my music"
              : musicView ===
                  "dominic"
                ? "Dominic's music"
                : "our soundtrack"}
          </small>

          <h2>
            No songs here yet.
          </h2>

          <p>
            A song only enters this part
            of the world after it is actually
            kept here.
          </p>

          <button
            type="button"
            className="gallery-add-button"
            onClick={() =>
              setAddingSong(true)
            }
          >
            ＋ Add song
          </button>
        </section>
      ) : (
        <>
          <div className="music-library">
            {visibleSongs.map(
              (song) => {
                const artist =
                  typeof song.data
                    ?.artist ===
                  "string"
                    ? song.data.artist
                    : "Unknown artist";

                const album =
                  typeof song.data
                    ?.album ===
                  "string"
                    ? song.data.album
                    : null;

                const coverUrl =
  typeof song.data?.coverUrl ===
  "string"
    ? song.data.coverUrl
    : null;

const spotifyUrl =
  typeof song.data?.spotifyUrl ===
  "string"
    ? song.data.spotifyUrl
    : null;
                
                return (
                  <article
                    key={song.id}
                    className="music-track"
                  >
                <div
  className="music-record"
  aria-hidden="true"
>
  {coverUrl ? (
    <img
      src={coverUrl}
      alt=""
    />
  ) : (
    <Disc3
      size={24}
      strokeWidth={1.2}
    />
  )}
</div>

                    <div>
                      <small>
                        {musicView ===
                        "ours"
                          ? "ours"
                          : musicView}
                      </small>

                      <strong>
                        {song.title ??
                          "Untitled song"}
                      </strong>

                      <span>
                        {artist}
                      </span>

                      {album && (
                        <em>
                          {album}
                        </em>
                      )}

                      {song.body && (
                        <p>
                          {song.body}
                        </p>
                      )}
                    </div>

{onShareToChat && (
  <button
    type="button"
    onClick={() =>
      onShareToChat(
        `I sent you a song: "${song.title ?? "Untitled song"}" by ${artist}.`
      )
    }
  >
    Send to chat
  </button>
)}

<button
  type="button"
  aria-label="Play on Spotify"
  disabled={!spotifyUrl}
  onClick={() => {
    if (!spotifyUrl) return;

    window.open(
      spotifyUrl,
      "_blank",
      "noopener,noreferrer"
    );
  }}
>
                      <Play
                        size={16}
                        fill="currentColor"
                      />
                    </button>
                  </article>
                );
              }
            )}
          </div>

          <button
            type="button"
            className="gallery-add-button"
            onClick={() =>
              setAddingSong(true)
            }
          >
            ＋ Add another song
          </button>
        </>
      )}

      {musicError && (
        <p role="alert">
          {musicError}
        </p>
      )}

      <section className="music-rule">
        <p>
          Music can be yours, Dominic's or shared.
          A shared song does not imply a memory or
          relationship milestone until it is actually
          connected to one.
        </p>
      </section>
    </section>
  );
}
function TimelineScreen({
  onOpen,
}: {
  onOpen: (screen: Screen) => void;
}) {
  const { session } = usePrivateDiario();

  const [timelineView, setTimelineView] =
    useState<
      "all" | "lived" | "planned"
    >("all");

  const [timelineItems, setTimelineItems] =
    useState<DiarioItem[]>([]);

  const [loadingTimeline, setLoadingTimeline] =
    useState(true);

  const [timelineError, setTimelineError] =
    useState<string | null>(null);

  useEffect(() => {
    let active = true;

    setLoadingTimeline(true);
    setTimelineError(null);

    getTimelineItems(
      session.user.id
    )
      .then((loadedItems) => {
        if (!active) return;

        setTimelineItems(
          loadedItems
        );

        setLoadingTimeline(false);
      })
      .catch((loadError) => {
        if (!active) return;

        console.error(
          "Could not load Timeline:",
          loadError
        );

        setTimelineError(
          "The timeline could not be opened right now."
        );

        setLoadingTimeline(false);
      });

    return () => {
      active = false;
    };
  }, [session.user.id]);

  const visibleEntries =
    timelineItems.filter((item) => {
      const isPlanned =
        !item.event_at &&
        Boolean(item.planned_for);

      if (timelineView === "planned") {
        return isPlanned;
      }

      if (timelineView === "lived") {
        return !isPlanned;
      }

      return true;
    });

  const sortedEntries = [
    ...visibleEntries,
  ].sort((first, second) => {
    const firstDate =
      first.event_at ??
      first.planned_for ??
      first.created_at;

    const secondDate =
      second.event_at ??
      second.planned_for ??
      second.created_at;

    return (
      new Date(firstDate).getTime() -
      new Date(secondDate).getTime()
    );
  });

  const todayLabel =
    new Intl.DateTimeFormat(
      "en-US",
      {
        month: "long",
        day: "numeric",
        year: "numeric",
      }
    ).format(new Date());

  const itemLabel = (
    item: DiarioItem
  ) => {
    if (
      item.kind ===
      "story_memory"
    ) {
      return "memory";
    }

    if (
      item.kind ===
      "home_change"
    ) {
      return "home";
    }

    return item.kind;
  };
const openTimelineItem = (
  item: DiarioItem
) => {
  switch (item.kind) {
    case "story_memory":
      onOpen("memories");
      break;

    case "photo":
      onOpen("gallery");
      break;

    case "letter":
      onOpen("letters");
      break;

    case "song":
      onOpen("music");
      break;

    case "date":
      onOpen("dates");
      break;

 case "diary":
  onOpen("diary");
  break;

case "place":
  onOpen("places");
  break;

case "keepsake":
  onOpen("keepsakes");
  break;

case "clothing":
case "look":
  onOpen("wardrobe");
  break;

case "home_change":
  onOpen("home");
  break;

default:
  break;
  }
};
  return (
    <section className="timeline-screen timeline-live">
      <ScreenIntro
        eyebrow="The continuous story"
        title="Timeline"
      >
        <p className="intro-copy">
          everything that changes the world
          can appear here in chronological order.
        </p>
      </ScreenIntro>

      <div
        className="timeline-filter"
        role="tablist"
        aria-label="Timeline view"
      >
        <button
          type="button"
          role="tab"
          aria-selected={
            timelineView === "all"
          }
          className={
            timelineView === "all"
              ? "active"
              : ""
          }
          onClick={() =>
            setTimelineView("all")
          }
        >
          All
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={
            timelineView === "lived"
          }
          className={
            timelineView === "lived"
              ? "active"
              : ""
          }
          onClick={() =>
            setTimelineView("lived")
          }
        >
          Lived
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={
            timelineView === "planned"
          }
          className={
            timelineView === "planned"
              ? "active"
              : ""
          }
          onClick={() =>
            setTimelineView("planned")
          }
        >
          Planned
        </button>
      </div>

      {loadingTimeline ? (
        <section className="timeline-empty">
          <p>
            Opening the timeline…
          </p>
        </section>
      ) : sortedEntries.length === 0 ? (
        <section className="timeline-empty">
          <div
            className="timeline-empty-icon"
            aria-hidden="true"
          >
            <Clock
              size={27}
              strokeWidth={1.3}
            />
          </div>

          <small>
            {todayLabel}
          </small>

          <h2>
            The timeline begins now.
          </h2>

          <p>
            There is no invented history before
            this point. As real days, plans and
            changes happen, they can join the
            timeline automatically.
          </p>
        </section>
      ) : (
        <div
          className="timeline-stream"
          aria-label="Life timeline"
        >
          {sortedEntries.map(
            (entry) => {
              const entryDate =
                entry.event_at ??
                entry.planned_for ??
                entry.created_at;

              const isPlanned =
                !entry.event_at &&
                Boolean(
                  entry.planned_for
                );

             return (
  <button
    key={entry.id}
    type="button"
    className={`timeline-entry timeline-entry-${itemLabel(
      entry
    )}`}
    onClick={() =>
      openTimelineItem(entry)
    }
  >
                  <span
                    className="timeline-entry-dot"
                    aria-hidden="true"
                  />

                  <time>
                    {new Intl.DateTimeFormat(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }
                    ).format(
                      new Date(
                        entryDate
                      )
                    )}
                  </time>

                  <div>
                    <small>
                      {isPlanned
                        ? "planned"
                        : itemLabel(
                            entry
                          )}
                    </small>

                    <strong>
                      {entry.title ??
                        (entry.kind ===
                        "diary"
                          ? "Diary entry"
                          : "Untitled")}
                    </strong>

                    {entry.body && (
                      <p>
                        {entry.body}
                      </p>
                    )}
                  </div>
                </button>
              );
            }
          )}
        </div>
      )}

      {timelineError && (
        <p role="alert">
          {timelineError}
        </p>
      )}

      <section className="timeline-explainer">
        <p>
          Memories tells the story of a moment.
          Calendar tells when it happened.
          Timeline shows how everything continues
          from one moment into the next.
        </p>
      </section>
    </section>
  );
}
function CalendarScreen({
  onOpen,
}: {
  onOpen: (screen: Screen) => void;
}) {
  const today = new Date();

  const [viewDate, setViewDate] = useState(
    () =>
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      )
  );

  const [selectedDate, setSelectedDate] =
    useState(
      () =>
        new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate()
        )
    );

  const { session } = usePrivateDiario();

  const [calendarItems, setCalendarItems] =
    useState<DiarioItem[]>([]);

  const [loadingCalendar, setLoadingCalendar] =
    useState(true);

  const [calendarError, setCalendarError] =
    useState<string | null>(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  useEffect(() => {
    let active = true;

    const monthStart =
      new Date(
        year,
        month,
        1
      );

    const nextMonthStart =
      new Date(
        year,
        month + 1,
        1
      );

    setLoadingCalendar(true);
    setCalendarError(null);

    getCalendarItems({
      userId: session.user.id,
      start:
        monthStart.toISOString(),
      end:
        nextMonthStart.toISOString(),
    })
      .then((loadedItems) => {
        if (!active) return;

        setCalendarItems(
          loadedItems
        );

        setLoadingCalendar(false);
      })
      .catch((loadError) => {
        if (!active) return;

        console.error(
          "Could not load Calendar:",
          loadError
        );

        setCalendarError(
          "The calendar could not be opened right now."
        );

        setLoadingCalendar(false);
      });

    return () => {
      active = false;
    };
  }, [
    session.user.id,
    year,
    month,
  ]);

  const firstWeekday = new Date(
    year,
    month,
    1
  ).getDay();

  const daysInMonth = new Date(
    year,
    month + 1,
    0
  ).getDate();

  const monthCells = Array.from(
    { length: 42 },
    (_, index) => {
      const day =
        index - firstWeekday + 1;

      if (
        day < 1 ||
        day > daysInMonth
      ) {
        return null;
      }

      return new Date(
        year,
        month,
        day
      );
    }
  );

  const weekdayLabels = [
    "S",
    "M",
    "T",
    "W",
    "T",
    "F",
    "S",
  ];

  const dateKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(
      date.getMonth() + 1
    ).padStart(2, "0");
    const d = String(
      date.getDate()
    ).padStart(2, "0");

    return `${y}-${m}-${d}`;
  };

    const itemDateKey = (
    item: DiarioItem
  ) => {
    const dateValue =
      item.event_at ??
      item.planned_for;

    if (!dateValue) {
      return null;
    }

    return dateKey(
      new Date(dateValue)
    );
  };

  const selectedKey =
    dateKey(selectedDate);

  const selectedItems =
    calendarItems.filter(
      (item) =>
        itemDateKey(item) ===
        selectedKey
    );

  const isSameDay = (
    first: Date,
    second: Date
  ) =>
    first.getFullYear() ===
      second.getFullYear() &&
    first.getMonth() ===
      second.getMonth() &&
    first.getDate() ===
      second.getDate();

  const changeMonth = (
    offset: number
  ) => {
    const nextMonth = new Date(
      year,
      month + offset,
      1
    );

    setViewDate(nextMonth);
    setSelectedDate(nextMonth);
  };

  const monthLabel =
    new Intl.DateTimeFormat(
      "en-US",
      {
        month: "long",
        year: "numeric",
      }
    ).format(viewDate);

  const selectedLabel =
    new Intl.DateTimeFormat(
      "en-US",
      {
        weekday: "long",
        month: "long",
        day: "numeric",
      }
    ).format(selectedDate);
const openCalendarItem = (
  item: DiarioItem
) => {
  switch (item.kind) {
    case "story_memory":
      onOpen("memories");
      break;

    case "photo":
      onOpen("gallery");
      break;

    case "letter":
      onOpen("letters");
      break;

    case "song":
      onOpen("music");
      break;

    case "date":
      onOpen("dates");
      break;

case "diary":
  onOpen("diary");
  break;

case "place":
  onOpen("places");
  break;

case "keepsake":
  onOpen("keepsakes");
  break;

case "clothing":
case "look":
  onOpen("wardrobe");
  break;

case "home_change":
  onOpen("home");
  break;

default:
  break;
  }
};
  return (
    <section className="calendar-screen calendar-live">
      <ScreenIntro
        eyebrow="What happened · what is planned"
        title="Calendar"
      >
        <p className="intro-copy">
          every real day can hold its
          photos, letters, memories,
          dates and plans.
        </p>
      </ScreenIntro>

      <section className="calendar-month">
        <header className="calendar-month-header">
          <button
            type="button"
            onClick={() =>
              changeMonth(-1)
            }
            aria-label="Previous month"
          >
            ‹
          </button>

          <strong>
            {monthLabel}
          </strong>

          <button
            type="button"
            onClick={() =>
              changeMonth(1)
            }
            aria-label="Next month"
          >
            ›
          </button>
        </header>

        <div
          className="calendar-weekdays"
          aria-hidden="true"
        >
          {weekdayLabels.map(
            (label, index) => (
              <span
                key={`${label}-${index}`}
              >
                {label}
              </span>
            )
          )}
        </div>

        <div className="calendar-grid">
          {monthCells.map(
            (date, index) => {
              if (!date) {
                return (
                  <span
                    key={`empty-${index}`}
                    className="calendar-day-empty"
                    aria-hidden="true"
                  />
                );
              }

              const key =
                dateKey(date);

                     const hasItems =
                calendarItems.some(
                  (item) =>
                    itemDateKey(item) ===
                    key
                );
              const selected =
                isSameDay(
                  date,
                  selectedDate
                );

              const current =
                isSameDay(
                  date,
                  today
                );

              return (
                <button
                  key={key}
                  type="button"
                  className={[
                    "calendar-day",
                    selected
                      ? "selected"
                      : "",
                    current
                      ? "today"
                      : "",
                    hasItems
                      ? "has-items"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() =>
                    setSelectedDate(date)
                  }
                  aria-label={
                    new Intl.DateTimeFormat(
                      "en-US",
                      {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      }
                    ).format(date)
                  }
                  aria-pressed={
                    selected
                  }
                >
                  <span>
                    {date.getDate()}
                  </span>

                  {hasItems && (
                    <i
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            }
          )}
        </div>
      </section>

      <section className="calendar-day-detail">
        <header>
          <span>
            selected day
          </span>

          <strong>
            {selectedLabel}
          </strong>
        </header>

        {selectedItems.length === 0 ? (
          <div className="calendar-day-empty-state">
            <CalendarIcon
              size={22}
              strokeWidth={1.35}
            />

            <p>
              Nothing is attached to
              this day yet.
            </p>

            <small>
              Real plans and lived
              moments will appear here
              without duplicating their
              original objects.
            </small>
          </div>
        ) : (
          <div className="calendar-day-items">
                    {selectedItems.map(
  (item) => (
    <button
      key={item.id}
      type="button"
      className={`calendar-item calendar-item-${item.kind}`}
      onClick={() =>
        openCalendarItem(item)
      }
    >
               <span>
  {item.kind === "story_memory"
    ? "memory"
    : item.kind === "photo"
      ? "photo"
      : item.kind === "letter"
        ? "letter"
        : item.kind === "song"
          ? "music"
          : item.kind === "date"
            ? "date"
            : item.kind === "diary"
              ? "diary"
              : item.kind}
</span>

                    <strong>
                      {item.title ??
                        (item.kind === "diary"
                          ? "Diary entry"
                          : "Untitled")}
                    </strong>

                    <ChevronRight
                      size={16}
                    />
                  </button>
                )
              )}
          </div>
        )}
      </section>

      <section className="calendar-legend">
        <p>
          Past days show what really
          happened. Future days can hold
          plans. The same object can also
          appear in Memories or Timeline
          without being copied.
        </p>
      </section>
    </section>
  );
}

function MemoriesScreen() {
  const { session } = usePrivateDiario();

  const [memoryFilter, setMemoryFilter] = useState<
    "all" | "photos" | "letters" | "music" | "dates"
  >("all");

  const [memories, setMemories] =
    useState<DiarioItem[]>([]);

  const [loadingMemories, setLoadingMemories] =
    useState(true);

  const [creatingMemory, setCreatingMemory] =
    useState(false);

  const [memoryTitle, setMemoryTitle] =
    useState("");

  const [memoryBody, setMemoryBody] =
    useState("");

  const [memoryError, setMemoryError] =
    useState<string | null>(null);

  const [selectedMemory, setSelectedMemory] =
    useState<DiarioItem | null>(null);

  const [memoryItemIds, setMemoryItemIds] =
    useState<string[]>([]);

  const [loadingMemoryItems, setLoadingMemoryItems] =
    useState(false);

   const [editingMemoryItems, setEditingMemoryItems] =
    useState(false);

  const [memoryChoices, setMemoryChoices] =
    useState<DiarioItem[]>([]);

  const [connectedMemoryItems, setConnectedMemoryItems] =
  useState<DiarioItem[]>([]);
  const [
  memoryItemsByMemoryId,
  setMemoryItemsByMemoryId,
] = useState<
  Record<string, DiarioItem[]>
>({});
const startEditingMemoryItems = async () => {
  if (!selectedMemory) {
    return;
  }

  setMemoryError(null);

  try {
    const [
      loadedPhotos,
      loadedLetters,
      loadedSongs,
      loadedDates,
    ] = await Promise.all([
      getGalleryPhotos(
        session.user.id
      ),
      getLetters(
        session.user.id
      ),
      getSongs(
        session.user.id
      ),
      getDates(
        session.user.id
      ),
    ]);

    setMemoryChoices([
      ...loadedPhotos.map(
        (photo) => photo.item
      ),
      ...loadedLetters,
      ...loadedSongs,
      ...loadedDates,
    ]);

    setEditingMemoryItems(true);
  } catch (loadError) {
    console.error(
      "Could not load Memory items:",
      loadError
    );

    setMemoryError(
      "Photos, letters, music and dates could not be opened."
    );
  }
};
  useEffect(() => {
    let active = true;

    setLoadingMemories(true);
    setMemoryError(null);

    getMemories(session.user.id)
      .then((loadedMemories) => {
        if (!active) return;

        setMemories(loadedMemories);
        setLoadingMemories(false);
      })
      .catch((loadError) => {
        if (!active) return;

        console.error(
          "Could not load Memories:",
          loadError
        );

        setMemoryError(
          "Memories could not be opened right now."
        );

        setLoadingMemories(false);
      });

    return () => {
      active = false;
    };
  }, [session.user.id]);

  useEffect(() => {
  let active = true;

  if (memories.length === 0) {
    setMemoryItemsByMemoryId({});
    return () => {
      active = false;
    };
  }

  const loadMemoryConnections =
    async () => {
      try {
        const [
          loadedPhotos,
          loadedLetters,
          loadedSongs,
          loadedDates,
          memoryLinks,
        ] = await Promise.all([
          getGalleryPhotos(
            session.user.id
          ),
          getLetters(
            session.user.id
          ),
          getSongs(
            session.user.id
          ),
          getDates(
            session.user.id
          ),
          Promise.all(
            memories.map(
              async (memory) => {
                const itemIds =
                  await getMemoryItemIds({
                    userId:
                      session.user.id,
                    memoryId:
                      memory.id,
                  });

                return [
                  memory.id,
                  itemIds,
                ] as const;
              }
            )
          ),
        ]);

        if (!active) return;

        const allItems = [
          ...loadedPhotos.map(
            (photo) => photo.item
          ),
          ...loadedLetters,
          ...loadedSongs,
          ...loadedDates,
        ];

        const nextMap: Record<
          string,
          DiarioItem[]
        > = {};

        memoryLinks.forEach(
          ([memoryId, itemIds]) => {
            nextMap[memoryId] =
              allItems.filter(
                (item) =>
                  itemIds.includes(
                    item.id
                  )
              );
          }
        );

        setMemoryItemsByMemoryId(
          nextMap
        );
      } catch (loadError) {
        console.error(
          "Could not load Memory connections:",
          loadError
        );
      }
    };

  void loadMemoryConnections();

  return () => {
    active = false;
  };
}, [memories, session.user.id]);
  
  const saveMemory = async () => {
    if (!memoryTitle.trim()) {
      return;
    }

    setMemoryError(null);

    try {
      const savedMemory =
        await createMemory({
          userId: session.user.id,
          title: memoryTitle,
          body: memoryBody,
        });

      setMemories((currentMemories) => [
        savedMemory,
        ...currentMemories,
      ]);

      setMemoryTitle("");
      setMemoryBody("");
      setCreatingMemory(false);
    } catch (saveError) {
      console.error(
        "Could not create Memory:",
        saveError
      );

      setMemoryError(
        "The memory could not be saved. Try again."
      );
    }
  };

const openMemory = async (
  memory: DiarioItem
) => {
  setSelectedMemory(memory);
  setLoadingMemoryItems(true);
  setEditingMemoryItems(false);
  setMemoryError(null);
  setConnectedMemoryItems([]);

  try {
    const [
      itemIds,
      loadedPhotos,
      loadedLetters,
      loadedSongs,
      loadedDates,
    ] = await Promise.all([
      getMemoryItemIds({
        userId: session.user.id,
        memoryId: memory.id,
      }),

      getGalleryPhotos(
        session.user.id
      ),

      getLetters(
        session.user.id
      ),

      getSongs(
        session.user.id
      ),

      getDates(
        session.user.id
      ),
    ]);

    setMemoryItemIds(itemIds);

    const allItems = [
      ...loadedPhotos.map(
        (photo) => photo.item
      ),
      ...loadedLetters,
      ...loadedSongs,
      ...loadedDates,
    ];

    setConnectedMemoryItems(
      allItems.filter((item) =>
        itemIds.includes(item.id)
      )
    );
  } catch (openError) {
    console.error(
      "Could not open Memory:",
      openError
    );

    setMemoryError(
      "The memory could not be opened."
    );
  } finally {
    setLoadingMemoryItems(false);
  }
};

  const filters = [
    { id: "all", label: "All" },
    { id: "photos", label: "Photos" },
    { id: "letters", label: "Letters" },
    { id: "music", label: "Music" },
    { id: "dates", label: "Dates" },
  ] as const;

const visibleMemories =
  memoryFilter === "all"
    ? memories
    : memories.filter(
        (memory) => {
          const connectedItems =
            memoryItemsByMemoryId[
              memory.id
            ] ?? [];

          const wantedKind =
            memoryFilter ===
            "photos"
              ? "photo"
              : memoryFilter ===
                  "letters"
                ? "letter"
                : memoryFilter ===
                    "music"
                  ? "song"
                  : memoryFilter ===
                      "dates"
                    ? "date"
                    : null;

          if (!wantedKind) {
            return true;
          }

          return connectedItems.some(
            (item) =>
              item.kind ===
              wantedKind
          );
        }
      );
  return (
    <section className="memories-screen memories-live">
      <ScreenIntro
        eyebrow="Moments that actually happened"
        title="Memories"
      >
        <p className="intro-copy">
          one timeline connecting the real pieces of your life together.
        </p>
      </ScreenIntro>

      <div
        className="memories-filter"
        role="tablist"
        aria-label="Memory type"
      >
        {filters.map((filter) => (
          <button
            key={filter.id}
            type="button"
            role="tab"
            aria-selected={memoryFilter === filter.id}
            className={
              memoryFilter === filter.id
                ? "active"
                : ""
            }
            onClick={() =>
              setMemoryFilter(filter.id)
            }
          >
            {filter.label}
          </button>
        ))}
      </div>

      {selectedMemory ? (
        <section className="memories-empty">
          <button
            type="button"
           onClick={() => {
  setSelectedMemory(null);
  setMemoryItemIds([]);
  setConnectedMemoryItems([]);
  setEditingMemoryItems(false);
}}
          >
            ← Back to memories
          </button>

          <small>
            memory
          </small>

          <h2>
            {selectedMemory.title ??
              "Untitled memory"}
          </h2>

          {selectedMemory.event_at && (
            <time>
              {new Intl.DateTimeFormat(
                "en-US",
                {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                }
              ).format(
                new Date(
                  selectedMemory.event_at
                )
              )}
            </time>
          )}

          {selectedMemory.body && (
            <p>
              {selectedMemory.body}
            </p>
          )}

             {loadingMemoryItems ? (
            <p>
              Opening memory…
            </p>
          ) : editingMemoryItems ? (
            <section className="memory-source-list">
              <button
                type="button"
                onClick={() =>
                  setEditingMemoryItems(
                    false
                  )
                }
              >
                Done
              </button>

              {memoryChoices.length === 0 ? (
                <p>
                  No photos or letters available yet.
                </p>
              ) : (
                memoryChoices.map(
                  (item) => {
                    const isConnected =
                      memoryItemIds.includes(
                        item.id
                      );

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={async () => {
                          if (!selectedMemory) {
                            return;
                          }

                          setMemoryError(null);

                          try {
                            if (isConnected) {
                              await removeItemFromMemory({
                                userId:
                                  session.user.id,
                                memoryId:
                                  selectedMemory.id,
                                itemId:
                                  item.id,
                              });

                              setMemoryItemIds(
                                (currentIds) =>
                                  currentIds.filter(
                                    (id) =>
                                      id !==
                                      item.id
                                  )
                              );
                              setConnectedMemoryItems(
  (currentItems) =>
    currentItems.filter(
      (currentItem) =>
        currentItem.id !==
        item.id
    )
);
                            } else {
                              await addItemToMemory({
                                userId:
                                  session.user.id,
                                memoryId:
                                  selectedMemory.id,
                                itemId:
                                  item.id,
                              });

                              setMemoryItemIds(
                                (currentIds) => [
                                  ...currentIds,
                                  item.id,
                                ]
                              );
                              setConnectedMemoryItems(
  (currentItems) => [
    ...currentItems,
    item,
  ]
);
                            }
                          } catch (
                            updateError
                          ) {
                            console.error(
                              "Could not update Memory:",
                              updateError
                            );

                            setMemoryError(
                              "The memory could not be updated."
                            );
                          }
                        }}
                      >
                    <span>
  {item.kind === "photo"
    ? "Photo"
    : item.kind === "letter"
      ? "Letter"
      : item.kind === "song"
        ? "Music"
        : item.kind === "date"
          ? "Date"
          : "Item"}
</span>

                        <strong>
  {item.title ??
    (item.kind === "photo"
      ? "Photo"
      : item.kind === "letter"
        ? "Untitled letter"
        : item.kind === "song"
          ? "Untitled song"
          : item.kind === "date"
            ? "Untitled date"
            : "Untitled item")}
</strong>

                        <small>
                          {isConnected
                            ? "Remove"
                            : "Add"}
                        </small>
                      </button>
                    );
                  }
                )
              )}
            </section>
        ) : (
  <>
    {connectedMemoryItems.length === 0 ? (
      <p>
        Nothing is connected to this memory yet.
      </p>
    ) : (
      <div className="memory-connected-items">
        {connectedMemoryItems.map(
          (item) => (
            <article
              key={item.id}
              className={`memory-connected-item memory-kind-${item.kind}`}
            >
              <small>
                {item.kind === "photo"
                  ? "Photo"
                  : item.kind === "letter"
                    ? "Letter"
                    : item.kind === "song"
                      ? "Music"
                      : item.kind === "date"
                        ? "Date"
                        : "Memory item"}
              </small>

              <strong>
                {item.title ??
                  (item.kind === "photo"
                    ? "Photo"
                    : item.kind === "letter"
                      ? "Untitled letter"
                      : item.kind === "song"
                        ? "Untitled song"
                        : item.kind === "date"
                          ? "Untitled date"
                          : "Untitled item")}
              </strong>

              {item.body && (
                <p>
                  {item.body}
                </p>
              )}

              {item.event_at && (
                <time
                  dateTime={
                    item.event_at
                  }
                >
                  {new Intl.DateTimeFormat(
                    "en-US",
                    {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }
                  ).format(
                    new Date(
                      item.event_at
                    )
                  )}
                </time>
              )}
            </article>
          )
        )}
      </div>
    )}

    <button
      type="button"
      className="gallery-add-button"
      onClick={
        startEditingMemoryItems
      }
    >
      ＋ Add or remove items
    </button>
  </>
)}
        </section>
      ) : creatingMemory ? (
        <section className="memories-empty">
          <small>
            new memory
          </small>

          <h2>
            Keep this moment
          </h2>

          <input
            type="text"
            value={memoryTitle}
            onChange={(event) =>
              setMemoryTitle(
                event.target.value
              )
            }
            placeholder="Memory title"
            autoFocus
          />

          <textarea
            value={memoryBody}
            onChange={(event) =>
              setMemoryBody(
                event.target.value
              )
            }
            placeholder="What happened?"
            rows={8}
          />

          <div className="diary-editor-actions">
            <button
              type="button"
              onClick={() => {
                setCreatingMemory(false);
                setMemoryTitle("");
                setMemoryBody("");
                setMemoryError(null);
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              className="gallery-add-button"
              onClick={saveMemory}
              disabled={
                !memoryTitle.trim()
              }
            >
              Keep memory
            </button>
          </div>
        </section>
      ) : visibleMemories.length === 0 ? (
        <section className="memories-empty">
          <div
            className="memories-empty-mark"
            aria-hidden="true"
          >
            <Heart
              size={27}
              strokeWidth={1.3}
            />
          </div>

          <small>
            beginning
          </small>

          <h2>
            Your story starts here.
          </h2>

          <p>
            Nothing has been turned into a memory yet.
            Real photos, conversations, songs,
            letters and dates can connect here after
            they actually happen.
          </p>

          <button
            type="button"
            className="gallery-add-button"
            onClick={() =>
              setCreatingMemory(true)
            }
          >
            ＋ Create memory
          </button>

          <div className="memory-source-list">
            <div>
              <ImageIcon
                size={18}
                strokeWidth={1.4}
              />

              <span>
                <strong>Gallery</strong>
                <small>real photos</small>
              </span>
            </div>

            <div>
              <Mail
                size={18}
                strokeWidth={1.4}
              />

              <span>
                <strong>Letters</strong>
                <small>written and received</small>
              </span>
            </div>

            <div>
              <Music2
                size={18}
                strokeWidth={1.4}
              />

              <span>
                <strong>Music</strong>
                <small>songs tied to moments</small>
              </span>
            </div>

            <div>
              <MapPin
                size={18}
                strokeWidth={1.4}
              />

              <span>
                <strong>Dates</strong>
                <small>places you actually went</small>
              </span>
            </div>
          </div>
        </section>
      ) : (
        <div
          className="memories-timeline"
          aria-label="Memory timeline"
        >
          {visibleMemories.map(
            (memory) => (
              <button
                key={memory.id}
                type="button"
                className="memory-entry memory-story"
                onClick={() =>
                  openMemory(memory)
                }
              >
                <span className="memory-timeline-dot" />

                <time>
                  {memory.event_at
                    ? new Intl.DateTimeFormat(
                        "en-US",
                        {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        }
                      ).format(
                        new Date(
                          memory.event_at
                        )
                      )
                    : "Memory"}
                </time>

                <div>
                  <strong>
                    {memory.title ??
                      "Untitled memory"}
                  </strong>

                  {memory.body && (
                    <p>
                      {memory.body}
                    </p>
                  )}
                </div>
              </button>
            )
          )}
        </div>
      )}

      <section className="memories-rule">
        <CalendarIcon
          size={17}
          strokeWidth={1.35}
        />

        <p>
          Gallery keeps the media. Memories connects it
          to what happened. Calendar keeps the date.
          Timeline keeps the continuity.
        </p>
      </section>
    </section>
  );
}
function MorningNightScreen({
  time,
  onOpen,
}: {
  time: TimeMoodState;
  onOpen: (screen: Screen) => void;
}) {
  const { session } = usePrivateDiario();

  const currentHour =
    new Date().getHours();

  const defaultView:
    | "morning"
    | "night" =
    currentHour >= 6 &&
    currentHour < 18
      ? "morning"
      : "night";

  const [
    dayView,
    setDayView,
  ] = useState<
    "morning" | "night"
  >(defaultView);

  const [
    dayItems,
    setDayItems,
  ] = useState<DiarioItem[]>([]);

  const [
    loadingDay,
    setLoadingDay,
  ] = useState(true);

  const [
    dayError,
    setDayError,
  ] = useState<string | null>(
    null
  );

  useEffect(() => {
    let active = true;

    setLoadingDay(true);
    setDayError(null);

    getTimelineItems(
      session.user.id
    )
      .then((items) => {
        if (!active) return;

        const today =
          getLocalDateKey();

        const todaysItems =
          items.filter(
            (item) => {
              const dateValue =
                item.event_at ??
                item.planned_for;

              if (!dateValue) {
                return false;
              }

              return (
                getLocalDateKey(
                  new Date(
                    dateValue
                  )
                ) === today
              );
            }
          );

        setDayItems(
          todaysItems
        );

        setLoadingDay(false);
      })
      .catch((loadError) => {
        if (!active) return;

        console.error(
          "Could not load Morning / Night:",
          loadError
        );

        setDayError(
          "Today's moments could not be opened."
        );

        setLoadingDay(false);
      });

    return () => {
      active = false;
    };
  }, [session.user.id]);

  const itemHour = (
    item: DiarioItem
  ) => {
    const dateValue =
      item.event_at ??
      item.planned_for;

    if (!dateValue) {
      return 12;
    }

    return new Date(
      dateValue
    ).getHours();
  };

  const morningMoments =
    dayItems.filter(
      (item) => {
        const hour =
          itemHour(item);

        return (
          hour >= 5 &&
          hour < 18
        );
      }
    );

  const nightMoments =
    dayItems.filter(
      (item) => {
        const hour =
          itemHour(item);

        return (
          hour >= 18 ||
          hour < 5
        );
      }
    );

  const activeMoments =
    dayView === "morning"
      ? morningMoments
      : nightMoments;

  const isCurrentPhase =
    dayView === defaultView;

  const momentLabel = (
    item: DiarioItem
  ) => {
    if (
      item.kind ===
      "story_memory"
    ) {
      return "Memory";
    }

    if (
      item.kind ===
      "home_change"
    ) {
      return "Home";
    }

    return (
      item.kind
        .charAt(0)
        .toUpperCase() +
      item.kind.slice(1)
    );
  };

  const momentTime = (
    item: DiarioItem
  ) => {
    const dateValue =
      item.event_at ??
      item.planned_for;

    if (!dateValue) {
      return null;
    }

    return new Intl.DateTimeFormat(
      "en-US",
      {
        hour: "numeric",
        minute: "2-digit",
      }
    ).format(
      new Date(dateValue)
    );
  };

  const openDayMoment = (
  item: DiarioItem
) => {
  switch (item.kind) {
    case "story_memory":
      onOpen("memories");
      break;

    case "photo":
      onOpen("gallery");
      break;

    case "letter":
      onOpen("letters");
      break;

    case "song":
      onOpen("music");
      break;

    case "date":
      onOpen("dates");
      break;

    case "diary":
      onOpen("diary");
      break;

    case "place":
      onOpen("places");
      break;

    case "keepsake":
      onOpen("keepsakes");
      break;

    case "clothing":
    case "look":
      onOpen("wardrobe");
      break;

    case "home_change":
      onOpen("home");
      break;

    default:
      break;
  }
};
  
  return (
    <section className="day-cycle-screen">
      <ScreenIntro
        eyebrow={`${time.dateLabel} · ${time.timeLabel}`}
        title="Morning / Night"
      >
        <p className="intro-copy">
          the same apartment changes with
          the real time around you.
        </p>
      </ScreenIntro>

      <div
        className="day-cycle-tabs"
        role="tablist"
        aria-label="Time of day"
      >
        <button
          type="button"
          role="tab"
          aria-selected={
            dayView === "morning"
          }
          className={
            dayView === "morning"
              ? "active"
              : ""
          }
          onClick={() =>
            setDayView(
              "morning"
            )
          }
        >
          Morning
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={
            dayView === "night"
          }
          className={
            dayView === "night"
              ? "active"
              : ""
          }
          onClick={() =>
            setDayView(
              "night"
            )
          }
        >
          Night
        </button>
      </div>

      <section
        className={`day-cycle-current day-cycle-${dayView}`}
      >
        <div className="day-cycle-image">
          <img
            src={
              dayView ===
              "morning"
                ? bedroomEmpty
                : room
            }
            alt={
              dayView ===
              "morning"
                ? "The apartment bedroom in the morning"
                : "The apartment at night"
            }
          />
        </div>

        <div className="day-cycle-copy">
          <small>
            {isCurrentPhase
              ? "right now"
              : "other side of the day"}
          </small>

          <h2>
            {dayView ===
            "morning"
              ? "A new day starts here."
              : "The apartment gets quieter."}
          </h2>

          <p>
            {dayView ===
            "morning"
              ? "What actually belongs to the first part of today appears here."
              : "What actually belongs to the later part of today appears here."}
          </p>
        </div>
      </section>

      <section className="day-cycle-context">
        <header>
          <span>
            real time
          </span>

          <strong>
            {time.greeting}
          </strong>
        </header>

        <p>
          {time.homeLine}
        </p>

        <small>
          mood: {time.mood}
        </small>
      </section>

      <section className="day-cycle-moments">
        <header>
          <div>
            <span>
              {dayView}
            </span>

            <strong>
              Today's moments
            </strong>
          </div>

          <small>
            {activeMoments.length}
          </small>
        </header>

        {loadingDay ? (
          <div className="day-cycle-empty">
            <p>
              Opening today…
            </p>
          </div>
        ) : activeMoments.length ===
          0 ? (
          <div className="day-cycle-empty">
            {dayView ===
            "morning" ? (
              <LampDesk
                size={23}
                strokeWidth={1.3}
              />
            ) : (
              <Disc3
                size={23}
                strokeWidth={1.3}
              />
            )}

            <p>
              Nothing recorded here yet.
            </p>

            <small>
              This fills from things
              that actually happen during
              this part of the day.
            </small>
          </div>
        ) : (
          <div className="day-cycle-moment-list">
        {activeMoments.map(
  (moment) => (
    <button
      key={moment.id}
      type="button"
      className="day-cycle-moment"
      onClick={() =>
        openDayMoment(moment)
      }
    >
                  <header>
                    <span>
                      {momentLabel(
                        moment
                      )}
                    </span>

                    {momentTime(
                      moment
                    ) && (
                      <time>
                        {momentTime(
                          moment
                        )}
                      </time>
                    )}
                  </header>

                  <strong>
                    {moment.title ??
                      (moment.kind ===
                      "diary"
                        ? "Diary entry"
                        : "Untitled")}
                  </strong>

                  {moment.body && (
                    <p>
                      {moment.body}
                    </p>
                  )}

                  {!moment.event_at &&
                    moment.planned_for && (
                      <small>
                        planned
                      </small>
                    )}
               </button>
              )
            )}
          </div>
        )}
      </section>

      {dayError && (
        <p role="alert">
          {dayError}
        </p>
      )}

    <section className="day-cycle-links">
  <button
    type="button"
    onClick={() => onOpen("music")}
  >
    <Music2
      size={18}
      strokeWidth={1.35}
    />

    <span>
      <strong>Music</strong>

      <small>
        what was really kept today
      </small>
    </span>
  </button>

  <button
    type="button"
    onClick={() => onOpen("diary")}
  >
    <BookOpen
      size={18}
      strokeWidth={1.35}
    />

    <span>
      <strong>Diary</strong>

      <small>
        writing from this day
      </small>
    </span>
  </button>

  <button
    type="button"
    onClick={() => onOpen("calendar")}
  >
    <CalendarIcon
      size={18}
      strokeWidth={1.35}
    />

    <span>
      <strong>Calendar</strong>

      <small>
        today's plans and events
      </small>
    </span>
  </button>

  <button
    type="button"
    onClick={() => onOpen("memories")}
  >
    <Heart
      size={18}
      strokeWidth={1.35}
    />

    <span>
      <strong>Memories</strong>

      <small>
        only if something stays
      </small>
    </span>
  </button>
</section>
      
      <section className="day-cycle-rule">
        <p>
          Morning and Night never create
          history by themselves. They only
          show real objects already belonging
          to this day.
        </p>
      </section>
    </section>
  );
}
function SettingsScreen() {
  const {
    session,
    preferredName,
    signOut,
  } = usePrivateDiario();

  const [appearance, setAppearance] =
    useState<
      "system" | "light" | "dark"
    >("system");

  const [timeAware, setTimeAware] =
    useState(true);

  const [
    privacyCoverEnabled,
    setPrivacyCoverEnabled,
  ] = useState(true);

  const [
    musicIntegration,
    setMusicIntegration,
  ] = useState(false);

  const [
  spotifyConnected,
  setSpotifyConnected,
] = useState(
  isSpotifyConnected()
);

const [
  spotifyConnecting,
  setSpotifyConnecting,
] = useState(false);

const [
  spotifyError,
  setSpotifyError,
] = useState<string | null>(
  null
);
  
  const [
    voiceEnabled,
    setVoiceEnabled,
  ] = useState(false);

  const [
    loadingSettings,
    setLoadingSettings,
  ] = useState(true);

  const [
    savingSettings,
    setSavingSettings,
  ] = useState(false);

  const [
    settingsError,
    setSettingsError,
  ] = useState<string | null>(
    null
  );

  const [
    settingsSaved,
    setSettingsSaved,
  ] = useState(false);

  useEffect(() => {
    let active = true;

    setLoadingSettings(true);
    setSettingsError(null);

    getDiarioSettings(
      session.user.id
    )
      .then((settings) => {
        if (!active) return;

        setAppearance(
          settings.appearance
        );

        setTimeAware(
          settings.time_aware
        );

        setPrivacyCoverEnabled(
          settings.privacy_cover
        );

        setMusicIntegration(
          settings.music_enabled
        );

        setVoiceEnabled(
          settings.voice_enabled
        );

        setLoadingSettings(false);
      })
      .catch((loadError) => {
        if (!active) return;

        console.error(
          "Could not load settings:",
          loadError
        );

        setSettingsError(
          "Settings could not be opened."
        );

        setLoadingSettings(false);
      });

    return () => {
      active = false;
    };
   }, [session.user.id]);

useEffect(() => {
  let active = true;

  finishSpotifyConnection()
    .then((connected) => {
      if (!active) return;

      if (connected) {
        setSpotifyConnected(true);
        setMusicIntegration(true);
        setSpotifyError(null);
      }
    })
    .catch((error) => {
      if (!active) return;

      console.error(
        "Could not finish Spotify connection:",
        error
      );

      setSpotifyError(
        "Spotify could not be connected."
      );
    });

  return () => {
    active = false;
  };
}, []);

useEffect(() => {
  document.documentElement.dataset.diarioAppearance =
    appearance;

    if (appearance === "dark") {
      document.documentElement.style.colorScheme =
        "dark";
    } else if (appearance === "light") {
      document.documentElement.style.colorScheme =
        "light";
    } else {
      document.documentElement.style.colorScheme =
        "";
    }
  }, [appearance]);

  const handleSpotifyConnect =
  async () => {
    setSpotifyConnecting(true);
    setSpotifyError(null);

    try {
      await connectSpotify();
    } catch (error) {
      console.error(
        "Could not start Spotify connection:",
        error
      );

      setSpotifyError(
        "Spotify login could not be started."
      );

      setSpotifyConnecting(false);
    }
  };

const handleSpotifyDisconnect =
  () => {
    disconnectSpotify();

    setSpotifyConnected(false);
    setMusicIntegration(false);
    setSettingsSaved(false);
    setSpotifyError(null);
  };
  
  const saveSettings = async () => {
    setSavingSettings(true);
    setSettingsError(null);
    setSettingsSaved(false);

    try {
      const saved =
        await saveDiarioSettings({
          userId: session.user.id,
          appearance,
          timeAware,
          privacyCover:
            privacyCoverEnabled,
          musicEnabled:
            musicIntegration,
          voiceEnabled,
        });

      setAppearance(
        saved.appearance
      );

      setTimeAware(
        saved.time_aware
      );

      setPrivacyCoverEnabled(
        saved.privacy_cover
      );

      setMusicIntegration(
        saved.music_enabled
      );

      setVoiceEnabled(
        saved.voice_enabled
      );

      setSettingsSaved(true);
    } catch (saveError) {
      console.error(
        "Could not save settings:",
        saveError
      );

      setSettingsError(
        "Settings could not be saved."
      );
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <section className="settings-screen settings-live">
      <ScreenIntro
        eyebrow={`Private space · ${preferredName}`}
        title="Settings"
      >
        <p className="intro-copy">
          the rules, appearance and connections
          that shape this private world.
        </p>
      </ScreenIntro>

      {loadingSettings ? (
        <section className="settings-group">
          <p>
            Opening settings…
          </p>
        </section>
      ) : (
        <>
          <section className="settings-group">
            <header>
              <span>
                appearance
              </span>

              <strong>
                How Diário looks
              </strong>
            </header>

            <div
              className="settings-segment"
              role="radiogroup"
              aria-label="Appearance"
            >
              <button
                type="button"
                role="radio"
                aria-checked={
                  appearance ===
                  "system"
                }
                className={
                  appearance ===
                  "system"
                    ? "active"
                    : ""
                }
                onClick={() => {
                  setAppearance(
                    "system"
                  );
                  setSettingsSaved(
                    false
                  );
                }}
              >
                System
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={
                  appearance ===
                  "light"
                }
                className={
                  appearance ===
                  "light"
                    ? "active"
                    : ""
                }
                onClick={() => {
                  setAppearance(
                    "light"
                  );
                  setSettingsSaved(
                    false
                  );
                }}
              >
                Light
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={
                  appearance ===
                  "dark"
                }
                className={
                  appearance ===
                  "dark"
                    ? "active"
                    : ""
                }
                onClick={() => {
                  setAppearance(
                    "dark"
                  );
                  setSettingsSaved(
                    false
                  );
                }}
              >
                Dark
              </button>
            </div>

            <p className="settings-note">
              This preference is now
              saved. The final visual pass
              will make every screen follow
              it fully.
            </p>
          </section>

          <section className="settings-group">
            <header>
              <span>
                world
              </span>

              <strong>
                Home & time
              </strong>
            </header>

            <button
              type="button"
              className="settings-row"
              onClick={() => {
                setTimeAware(
                  (value) =>
                    !value
                );
                setSettingsSaved(
                  false
                );
              }}
              aria-pressed={
                timeAware
              }
            >
              <div>
                <Clock
                  size={19}
                  strokeWidth={1.4}
                />

                <span>
                  <strong>
                    Time-aware apartment
                  </strong>

                  <small>
                    light and atmosphere
                    follow real time
                  </small>
                </span>
              </div>

              <i
                className={
                  timeAware
                    ? "settings-toggle on"
                    : "settings-toggle"
                }
                aria-hidden="true"
              />
            </button>

            <div className="settings-static-row">
              <div>
                <Home
                  size={19}
                  strokeWidth={1.4}
                />

                <span>
                  <strong>
                    Apartment architecture
                  </strong>

                  <small>
                    walls, doors, windows
                    and circulation stay
                    fixed
                  </small>
                </span>
              </div>

              <small>
                locked
              </small>
            </div>
          </section>

          <section className="settings-group">
            <header>
              <span>
                privacy
              </span>

              <strong>
                Keep it private
              </strong>
            </header>

            <button
              type="button"
              className="settings-row"
              onClick={() => {
                setPrivacyCoverEnabled(
                  (value) =>
                    !value
                );
                setSettingsSaved(
                  false
                );
              }}
              aria-pressed={
                privacyCoverEnabled
              }
            >
              <div>
                <Heart
                  size={19}
                  strokeWidth={1.4}
                />

                <span>
                  <strong>
                    Hide app preview
                  </strong>

                  <small>
                    cover private content
                    when Diário goes into
                    the background
                  </small>
                </span>
              </div>

              <i
                className={
                  privacyCoverEnabled
                    ? "settings-toggle on"
                    : "settings-toggle"
                }
                aria-hidden="true"
              />
            </button>

            <div className="settings-static-row">
              <div>
                <Settings
                  size={19}
                  strokeWidth={1.4}
                />

                <span>
                  <strong>
                    Account session
                  </strong>

                  <small>
                    Supabase keeps the
                    signed-in session on
                    this device
                  </small>
                </span>
              </div>

              <small>
                private
              </small>
            </div>
          </section>

          <section className="settings-group">
            <header>
              <span>
                connections
              </span>

              <strong>
                Music & voice
              </strong>
            </header>

     <button
  type="button"
  className="settings-row"
  onClick={() => {
    if (spotifyConnected) {
      handleSpotifyDisconnect();
    } else {
      void handleSpotifyConnect();
    }
  }}
  aria-pressed={
    spotifyConnected
  }
  disabled={
    spotifyConnecting
  }
>
  <div>
    <Music2
      size={19}
      strokeWidth={1.4}
    />

    <span>
      <strong>
        Spotify
      </strong>

      <small>
        {spotifyConnecting
          ? "connecting…"
          : spotifyConnected
            ? "connected to Spotify"
            : "connect your Spotify account"}
      </small>
    </span>
  </div>

  <i
    className={
      spotifyConnected
        ? "settings-toggle on"
        : "settings-toggle"
    }
    aria-hidden="true"
  />
</button>

{spotifyError && (
  <p role="alert">
    {spotifyError}
  </p>
)}
           <button
  type="button"
  className="settings-row"
  onClick={() => {
    setVoiceEnabled(
      (value) => !value
    );

    setSettingsSaved(false);
  }}
  aria-pressed={voiceEnabled}
>
  <div>
    <Send
      size={19}
      strokeWidth={1.4}
    />

    <span>
      <strong>
        Voice
      </strong>

      <small>
        allow voice features
        inside Diário
      </small>
    </span>
  </div>

  <i
    className={
      voiceEnabled
        ? "settings-toggle on"
        : "settings-toggle"
    }
    aria-hidden="true"
  />
</button>
            
          </section>

          <section className="settings-group">
            <header>
              <span>
                data
              </span>

              <strong>
                Your world
              </strong>
            </header>

            <div className="settings-static-row">
              <div>
                <ImageIcon
                  size={19}
                  strokeWidth={1.4}
                />

                <span>
                  <strong>
                    Media
                  </strong>

                  <small>
                    Gallery remains the
                    source of truth for
                    photos
                  </small>
                </span>
              </div>

              <small>
                Gallery
              </small>
            </div>

            <div className="settings-static-row">
              <div>
                <Heart
                  size={19}
                  strokeWidth={1.4}
                />

                <span>
                  <strong>
                    Relationship history
                  </strong>

                  <small>
                    only lived events
                    become canon
                  </small>
                </span>
              </div>

              <small>
                protected
              </small>
            </div>
          </section>

          <section className="settings-account">
            <header>
              <span>
                save
              </span>

              <strong>
                Keep these settings
              </strong>
            </header>

            <p>
              Your choices are stored in
              your private Diário account
              and return after refresh.
            </p>

            <Button
              type="button"
              onClick={
                saveSettings
              }
              disabled={
                savingSettings
              }
            >
              {savingSettings
                ? "Saving…"
                : "Save settings"}
            </Button>

            {settingsSaved && (
              <p>
                Settings saved.
              </p>
            )}

            {settingsError && (
              <p role="alert">
                {settingsError}
              </p>
            )}
          </section>

          <section className="settings-account">
            <header>
              <span>
                account
              </span>

              <strong>
                Leave Diário
              </strong>
            </header>

            <p>
              Signing out removes the
              active session from this
              device. It does not erase
              the world or its saved data.
            </p>

            <Button
              variant="ghost"
              onClick={
                signOut
              }
            >
              <LogOut
                size={17}
              />

              Sign out
            </Button>
          </section>
        </>
      )}
    </section>
  );
}

function BottomNav({ active, onOpen }: { active: Screen; onOpen: (screen: Screen) => void }) {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {navItems.map(({ id, label, icon: Icon }) => (
        <button key={id} className={active === id ? "active" : ""} onClick={() => onOpen(id)}>
          <Icon size={20} strokeWidth={1.6} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
