// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import {
  Calendar as CalendarIcon,
  Check,
  Image as ImageIcon,
  Layers,
  RotateCcw,
  RotateCw,
  Scissors,
  Shirt,
  Sparkles,
  X,
} from "lucide-react";

import { usePrivateDiario } from "@/components/private-diario";
import { ConnectedObjectDetailScreen } from "@/components/connected-object-detail-screen";

import {
  addClothingToLook,
  createClothing,
  updateClothing,
  createLook,
  deleteClothing,
  getLookClothingIds,
  getLooks,
  getWardrobeItems,
  uploadDiarioItemImage,
  type DiarioItem,
  type LookLayoutItem,
} from "@/lib/diario-world";

import {
  hydrateDiaryItems,
} from "@/lib/connected-diary";
import {
  clearWearing,
  getWearingSelection,
  setWearingClothing,
  setWearingLook,
  WARDROBE_WEARING_CHANGED_EVENT,
  type WearingSelection,
  type WardrobeOwner,
} from "@/lib/wardrobe-context";

import { WARDROBE_CATEGORIES, normalizeWearingIds, toggleWearingPiece, removeWearingPiece } from "@/lib/wardrobe-selection";

import "./wardrobe-wearing.css";

type WardrobeOwnerView = "mine" | "dominic";
type WardrobeView = "closet" | "looks" | "builder" | "wearing";

function ownerToDb(owner: WardrobeOwnerView): WardrobeOwner {
  return owner === "mine" ? "alloah" : "dominic";
}

function ownerLabel(owner: WardrobeOwnerView) {
  return owner === "mine" ? "My" : "Dominic's";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function readLookLayout(look: DiarioItem): LookLayoutItem[] {
  const raw = look.data?.layout;

  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((value): LookLayoutItem | null => {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        return null;
      }

      const item = value as Record<string, unknown>;

      if (typeof item.clothingId !== "string") {
        return null;
      }

      return {
        clothingId: item.clothingId,
        x: typeof item.x === "number" ? item.x : 50,
        y: typeof item.y === "number" ? item.y : 50,
        scale: typeof item.scale === "number" ? item.scale : 1,
        rotation: typeof item.rotation === "number" ? item.rotation : 0,
        z: typeof item.z === "number" ? item.z : 1,
      };
    })
    .filter((item): item is LookLayoutItem => Boolean(item));
}

function defaultPieceLayout(item: DiarioItem, z: number): LookLayoutItem {
  const category =
    typeof item.data?.category === "string"
      ? item.data.category
      : "other";

  const yByCategory: Record<string, number> = {
    outerwear: 19,
    top: 23,
    dress: 37,
    bottom: 52,
    bag: 52,
    shoes: 78,
    accessory: 16,
    other: 46,
  };

  return {
    clothingId: item.id,
    x: 50,
    y: yByCategory[category] ?? 46,
    scale:
      category === "shoes" || category === "accessory"
        ? 0.78
        : category === "dress"
          ? 1.08
          : 0.92,
    rotation: 0,
    z,
  };
}

async function imageElementFromFile(file: File): Promise<{
  image: HTMLImageElement;
  release: () => void;
}> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("The clothing image could not be opened."));
      image.src = url;
    });
    if (!image.naturalWidth || !image.naturalHeight) throw new Error("Empty clothing image");
    // Keep blob URL alive until Safari has actually drawn it to canvas.
    return { image, release: () => URL.revokeObjectURL(url) };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

async function autoCutoutClothing(file: File): Promise<File> {
  const loaded = await imageElementFromFile(file);
  const image = loaded.image;
  const maxSide = 1400;
  const scale = Math.min(
    1,
    maxSide / Math.max(image.naturalWidth, image.naturalHeight)
  );
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", {
    willReadFrequently: true,
  });

  if (!context) {
    loaded.release();
    throw new Error("The cutout tool is not available in this browser.");
  }

  try {
    context.drawImage(image, 0, 0, width, height);
  } finally {
    loaded.release();
  }

  const pixels = context.getImageData(0, 0, width, height);
  const data = pixels.data;

  const samples: Array<[number, number, number]> = [];
  const steps = 24;

  const sample = (x: number, y: number) => {
    const pixel =
      (clamp(y, 0, height - 1) * width +
        clamp(x, 0, width - 1)) *
      4;

    if (data[pixel + 3] < 180) {
      return;
    }

    samples.push([
      data[pixel],
      data[pixel + 1],
      data[pixel + 2],
    ]);
  };

  for (let step = 0; step <= steps; step += 1) {
    const x = Math.round(((width - 1) * step) / steps);
    const y = Math.round(((height - 1) * step) / steps);

    sample(x, 1);
    sample(x, height - 2);
    sample(1, y);
    sample(width - 2, y);
  }

  if (samples.length < 24) {
    throw new Error("The photo may already have transparent edges. Keep the original or use Refine cutout.");
  }

  const median = (channel: 0 | 1 | 2) => {
    const values = samples
      .map((entry) => entry[channel])
      .sort((a, b) => a - b);

    return values[Math.floor(values.length / 2)];
  };

  const background = [median(0), median(1), median(2)];

  // This is a SIMPLE background-colour remover, NOT subject segmentation.
  // Cluttered backdrops and light clothes against white are dangerous.
  // Reject those cases instead of secretly cutting holes in real garments.
  const rgbDistance = (red: number, green: number, blue: number) =>
    Math.hypot(red - background[0], green - background[1], blue - background[2]);
  const edgeUniformity = samples.filter(([r, g, b]) =>
    rgbDistance(r, g, b) <= 43
  ).length / samples.length;
  if (edgeUniformity < 0.87) {
    throw new Error("Background is not uniform enough for safe automatic cleanup. The original photo was kept; try Crop photo or Refine cutout.");
  }

  let foregroundEvidence = 0;
  let centerSamples = 0;
  for (let row = 0; row <= 6; row += 1) {
    for (let column = 0; column <= 6; column += 1) {
      const x = Math.min(width - 1, Math.floor(width * (0.2 + column * 0.1)));
      const y = Math.min(height - 1, Math.floor(height * (0.18 + row * 0.1)));
      const offset = (y * width + x) * 4;
      if (data[offset + 3] < 100) continue;
      centerSamples += 1;
      if (rgbDistance(data[offset], data[offset + 1], data[offset + 2]) > 72) {
        foregroundEvidence += 1;
      }
    }
  }
  if (!centerSamples || foregroundEvidence < Math.ceil(centerSamples * 0.18)) {
    throw new Error("The clothing is too close to the background color for a safe automatic cutout. Original photo preserved.");
  }

  const distanceAt = (point: number) => {
    const offset = point * 4;

    return Math.sqrt(
      (data[offset] - background[0]) ** 2 +
        (data[offset + 1] - background[1]) ** 2 +
        (data[offset + 2] - background[2]) ** 2
    );
  };

  /*
   * Only remove background pixels that are actually connected to an edge.
   * The old cutout removed every similar colour in the whole image, which
   * could eat cream shirts, pale shoes and other parts of the garment.
   */
  // Prefer imperfect leftover background over missing actual fabric.
  const threshold = 36;
  const feather = 20;
  const maxDistance = threshold + feather;
  const total = width * height;
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  const pushIfBackground = (point: number) => {
    if (
      point < 0 ||
      point >= total ||
      visited[point] ||
      data[point * 4 + 3] < 10 ||
      distanceAt(point) > maxDistance
    ) {
      return;
    }

    visited[point] = 1;
    queue[tail++] = point;
  };

  for (let x = 0; x < width; x += 1) {
    pushIfBackground(x);
    pushIfBackground((height - 1) * width + x);
  }

  for (let y = 0; y < height; y += 1) {
    pushIfBackground(y * width);
    pushIfBackground(y * width + width - 1);
  }

  while (head < tail) {
    const point = queue[head++];
    const x = point % width;
    const y = Math.floor(point / width);

    if (x > 0) pushIfBackground(point - 1);
    if (x < width - 1) pushIfBackground(point + 1);
    if (y > 0) pushIfBackground(point - width);
    if (y < height - 1) pushIfBackground(point + width);
  }

  let erased = 0;
  for (let point = 0; point < total; point += 1) {
    if (!visited[point]) continue;
    const offset = point * 4;
    const distance = distanceAt(point);
    if (distance <= threshold) {
      data[offset + 3] = 0;
      erased += 1;
    } else {
      data[offset + 3] = Math.min(
        data[offset + 3],
        Math.round(255 * ((distance - threshold) / feather))
      );
    }
  }
  if (erased < total * 0.035 || erased > total * 0.78) {
    throw new Error("Automatic cleanup could not separate this background safely. Keep the original and refine manually.");
  }
  context.putImageData(pixels, 0, 0);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) =>
        result
          ? resolve(result)
          : reject(new Error("The cutout could not be created.")),
      "image/png"
    );
  });

  return new File(
    [blob],
    file.name.replace(/\.[^.]+$/, "") + "-cutout.png",
    { type: "image/png" }
  );
}



function WardrobeCropEditor({
  file,
  onApply,
  onCancel,
}: {
  file: File;
  onApply: (file: File) => void;
  onCancel: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const gestureRef = useRef<{ distance: number; scale: number; x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const scaleRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });

  const draw = (nextScale = scaleRef.current, nextOffset = offsetRef.current) => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const cover = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
    const s = cover * nextScale;
    const w = image.naturalWidth * s;
    const h = image.naturalHeight * s;
    const x = (canvas.width - w) / 2 + nextOffset.x;
    const y = (canvas.height - h) / 2 + nextOffset.y;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, x, y, w, h);
  };

  const commitView = (nextScale: number, nextOffset: { x: number; y: number }) => {
    const z = clamp(nextScale, 1, 6);
    scaleRef.current = z;
    offsetRef.current = nextOffset;
    setScale(z);
    setOffset(nextOffset);
    draw(z, nextOffset);
  };

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      imageRef.current = image;
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = 900;
        canvas.height = 900;
        draw(1, { x: 0, y: 0 });
        setReady(true);
      }
    };
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const apply = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Could not crop clothing photo.")), "image/png")
    );
    onApply(new File([blob], file.name.replace(/\.[^.]+$/, "") + "-crop.png", { type: "image/png" }));
  };

  return (
    <section className="wardrobe-crop-editor">
      <header>
        <div><small>crop photo</small><strong>Focus on one piece</strong></div>
        <button type="button" onClick={onCancel} aria-label="Close crop editor"><X size={16} /></button>
      </header>
      <p>Drag to move · pinch to zoom. Keep only the clothing you want inside the square.</p>
      <div className="wardrobe-crop-viewport">
        <canvas
          ref={canvasRef}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
            const points = [...pointersRef.current.values()];
            if (points.length === 1) {
              gestureRef.current = { distance: 0, scale: scaleRef.current, x: points[0].x, y: points[0].y, offsetX: offsetRef.current.x, offsetY: offsetRef.current.y };
            } else if (points.length === 2) {
              const d = Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
              gestureRef.current = { distance: d, scale: scaleRef.current, x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2, offsetX: offsetRef.current.x, offsetY: offsetRef.current.y };
            }
          }}
          onPointerMove={(event) => {
            if (!pointersRef.current.has(event.pointerId)) return;
            pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
            const points = [...pointersRef.current.values()];
            const start = gestureRef.current;
            if (!start) return;
            if (points.length === 1) {
              commitView(start.scale, { x: start.offsetX + points[0].x - start.x, y: start.offsetY + points[0].y - start.y });
            } else if (points.length === 2) {
              const distance = Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
              const centerX = (points[0].x + points[1].x) / 2;
              const centerY = (points[0].y + points[1].y) / 2;
              const nextScale = start.distance ? start.scale * (distance / start.distance) : start.scale;
              commitView(nextScale, { x: start.offsetX + centerX - start.x, y: start.offsetY + centerY - start.y });
            }
          }}
          onPointerUp={(event) => {
            pointersRef.current.delete(event.pointerId);
            if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
            const points = [...pointersRef.current.values()];
            gestureRef.current = points.length === 1
              ? { distance: 0, scale: scaleRef.current, x: points[0].x, y: points[0].y, offsetX: offsetRef.current.x, offsetY: offsetRef.current.y }
              : null;
          }}
          onPointerCancel={(event) => {
            pointersRef.current.delete(event.pointerId);
            gestureRef.current = null;
          }}
        />
      </div>
      <div className="wardrobe-crop-zoom">
        <button type="button" onClick={() => commitView(scaleRef.current - .25, offsetRef.current)}>−</button>
        <span>{Math.round(scale * 100)}%</span>
        <button type="button" onClick={() => commitView(scaleRef.current + .25, offsetRef.current)}>＋</button>
        <button type="button" onClick={() => commitView(1, { x: 0, y: 0 })}>Reset</button>
      </div>
      <div className="wardrobe-manual-cutout-actions">
        <button type="button" onClick={onCancel}>Cancel</button>
        <button type="button" className="primary" disabled={!ready} onClick={() => void apply()}><Scissors size={14} /> Use crop</button>
      </div>
    </section>
  );
}

function WardrobeManualCutout({
  file,
  restoreFile,
  onApply,
  onCancel,
}: {
  file: File;
  restoreFile?: File | null;
  onApply: (file: File) => void;
  onCancel: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const restoreImageRef = useRef<HTMLImageElement | null>(null);
  const drawingRef = useRef(false);
  const panPointerRef = useRef<{ id: number; x: number; y: number; startX: number; startY: number } | null>(null);
  const pinchRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchStartRef = useRef<{ distance: number; zoom: number } | null>(null);
  const historyRef = useRef<ImageData[]>([]);
  const [historySize, setHistorySize] = useState(0);
  const [brushSize, setBrushSize] = useState(26);
  const [tool, setTool] = useState<"move" | "erase" | "restore">("erase");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  const redraw = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;

    if (!canvas || !image) return;

    const context = canvas.getContext("2d");

    if (!context) return;

    context.globalCompositeOperation = "source-over";
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
  };

  useEffect(() => {
    let cancelled = false;
    const baseUrl = URL.createObjectURL(file);
    const sourceUrl = restoreFile
      ? URL.createObjectURL(restoreFile)
      : baseUrl;

    const image = new Image();
    const restoreImage = new Image();

    const maybeReady = () => {
      if (
        cancelled ||
        !image.complete ||
        !image.naturalWidth ||
        !restoreImage.complete ||
        !restoreImage.naturalWidth
      ) {
        return;
      }

      const maxSide = 1100;
      const scale = Math.min(
        1,
        maxSide /
          Math.max(image.naturalWidth, image.naturalHeight)
      );

      const canvas = canvasRef.current;

      if (!canvas) return;

      canvas.width = Math.max(
        1,
        Math.round(image.naturalWidth * scale)
      );
      canvas.height = Math.max(
        1,
        Math.round(image.naturalHeight * scale)
      );

      imageRef.current = image;
      restoreImageRef.current = restoreImage;
      redraw();
      setReady(true);
    };

    image.onload = maybeReady;
    restoreImage.onload = maybeReady;

    image.onerror = () => {
      if (!cancelled) setReady(false);
    };

    restoreImage.onerror = () => {
      if (!cancelled) setReady(false);
    };

    image.src = baseUrl;
    restoreImage.src = sourceUrl;

    return () => {
      cancelled = true;
      URL.revokeObjectURL(baseUrl);

      if (sourceUrl !== baseUrl) {
        URL.revokeObjectURL(sourceUrl);
      }
    };
  }, [file, restoreFile]);

  const rememberCanvas = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    historyRef.current.push(context.getImageData(0, 0, canvas.width, canvas.height));
    if (historyRef.current.length > 30) historyRef.current.shift();
    setHistorySize(historyRef.current.length);
  };

  const undo = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    const previous = historyRef.current.pop();
    if (!canvas || !context || !previous) return;
    context.putImageData(previous, 0, 0);
    setHistorySize(historyRef.current.length);
  };

  const paintAt = (
    clientX: number,
    clientY: number
  ) => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const viewport = canvas.parentElement;
    const viewportRect = viewport?.getBoundingClientRect();

    if (!viewportRect) return;

    /*
     * The canvas is visually transformed for pan/zoom, but its bitmap stays
     * fixed. Convert the finger from viewport space back through that visual
     * transform so the brush always lands on the exact source pixel.
     */
    const baseWidth = viewportRect.width;
    const baseHeight = viewportRect.height;
    const centerX = viewportRect.left + baseWidth / 2;
    const centerY = viewportRect.top + baseHeight / 2;
    const localX =
      (clientX - centerX - pan.x) / zoom + baseWidth / 2;
    const localY =
      (clientY - centerY - pan.y) / zoom + baseHeight / 2;
    const x = (localX / Math.max(1, baseWidth)) * canvas.width;
    const y = (localY / Math.max(1, baseHeight)) * canvas.height;
    const pixelPerCssX = canvas.width / Math.max(1, baseWidth);
    const radius = brushSize * pixelPerCssX / zoom;
    const context = canvas.getContext("2d");

    if (!context) return;

    context.save();
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.clip();

    if (tool === "erase") {
      context.globalCompositeOperation = "destination-out";
      context.fillRect(
        x - radius,
        y - radius,
        radius * 2,
        radius * 2
      );
    } else {
      const source = restoreImageRef.current;

      if (source) {
        context.globalCompositeOperation = "source-over";
        context.drawImage(
          source,
          0,
          0,
          canvas.width,
          canvas.height
        );
      }
    }

    context.restore();
  };

  const apply = async () => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    setSaving(true);

    try {
      const blob =
        await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (result) =>
              result
                ? resolve(result)
                : reject(
                    new Error("Could not save the cutout.")
                  ),
            "image/png"
          );
        });

      onApply(
        new File(
          [blob],
          file.name.replace(/\.[^.]+$/, "") +
            "-refined-cutout.png",
          {
            type: "image/png",
          }
        )
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="wardrobe-manual-cutout">
      <header>
        <div>
          <small>refine cutout</small>
          <strong>
            Fix only what the auto cutout missed
          </strong>
        </div>

        <button
          type="button"
          onClick={onCancel}
          aria-label="Close cutout editor"
        >
          <X size={16} />
        </button>
      </header>

      <p>
        Auto cutout already did the first pass. Erase leftover
        background or restore a part of the clothing it removed.
      </p>

      <div className="wardrobe-cutout-editor-tools">
        <button
          type="button"
          className={tool === "move" ? "active" : ""}
          onClick={() => setTool("move")}
        >
          Move
        </button>

        <button
          type="button"
          className={tool === "erase" ? "active" : ""}
          onClick={() => setTool("erase")}
        >
          Erase
        </button>

        <button
          type="button"
          className={tool === "restore" ? "active" : ""}
          onClick={() => setTool("restore")}
        >
          Restore
        </button>

        <button
          type="button"
          disabled={zoom <= 1}
          onClick={() =>
            setZoom((current) =>
              Math.max(1, Number((current - 0.5).toFixed(1)))
            )
          }
        >
          −
        </button>

        <span>{Math.round(zoom * 100)}%</span>

        <button
          type="button"
          disabled={zoom >= 3}
          onClick={() =>
            setZoom((current) =>
              Math.min(3, Number((current + 0.5).toFixed(1)))
            )
          }
        >
          ＋
        </button>
      </div>

      <div className="wardrobe-manual-cutout-canvas">
        <canvas
          ref={canvasRef}
          style={{
            width: "100%",
            height: "100%",
            maxWidth: "none",
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
            touchAction: "none",
          }}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            pinchRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
            const points = [...pinchRef.current.values()];
            if (points.length === 2) {
              pinchStartRef.current = {
                distance: Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y),
                zoom,
              };
              drawingRef.current = false;
              return;
            }
            if (tool === "move") {
              panPointerRef.current = { id: event.pointerId, x: pan.x, y: pan.y, startX: event.clientX, startY: event.clientY };
              return;
            }
            rememberCanvas();
            drawingRef.current = true;
            paintAt(event.clientX, event.clientY);
          }}
          onPointerMove={(event) => {
            if (!pinchRef.current.has(event.pointerId)) return;
            pinchRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
            const points = [...pinchRef.current.values()];
            if (points.length === 2 && pinchStartRef.current) {
              const distance = Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
              setZoom(clamp(pinchStartRef.current.zoom * distance / Math.max(1, pinchStartRef.current.distance), 1, 5));
              drawingRef.current = false;
              return;
            }
            if (tool === "move" && panPointerRef.current?.id === event.pointerId) {
              setPan({
                x: panPointerRef.current.x + event.clientX - panPointerRef.current.startX,
                y: panPointerRef.current.y + event.clientY - panPointerRef.current.startY,
              });
              return;
            }
            if (drawingRef.current) paintAt(event.clientX, event.clientY);
          }}
          onPointerUp={(event) => {
            drawingRef.current = false;
            pinchRef.current.delete(event.pointerId);
            pinchStartRef.current = null;
            if (panPointerRef.current?.id === event.pointerId) panPointerRef.current = null;
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
          }}
          onPointerCancel={(event) => {
            drawingRef.current = false;
            pinchRef.current.delete(event.pointerId);
            pinchStartRef.current = null;
            panPointerRef.current = null;
          }}
        />
      </div>

      <label className="wardrobe-cutout-brush">
        <span>brush size</span>

        <input
          type="range"
          min="5"
          max="70"
          step="1"
          value={brushSize}
          onChange={(event) =>
            setBrushSize(Number(event.target.value))
          }
        />

        <small>{brushSize}px</small>
      </label>

      <div className="wardrobe-manual-cutout-actions">
        <button
          type="button"
          onClick={undo}
          disabled={!historySize}
        >
          Undo
        </button>

        <button
          type="button"
          onClick={() => {
            redraw();
            historyRef.current = [];
            setHistorySize(0);
          }}
          disabled={!ready}
        >
          Reset refine
        </button>

        <button
          type="button"
          className="primary"
          disabled={!ready || saving}
          onClick={() => void apply()}
        >
          <Scissors size={14} />
          {saving ? "Saving…" : "Use refined cutout"}
        </button>
      </div>
    </section>
  );
}


export function WardrobeExperienceScreen() {
  const { session } = usePrivateDiario();

  const [wardrobeOwner, setWardrobeOwner] =
    useState<WardrobeOwnerView>("mine");

  const [wardrobeView, setWardrobeView] =
    useState<WardrobeView>("closet");
  const [closetCategory, setClosetCategory] = useState("all");

  const [wardrobeItems, setWardrobeItems] =
    useState<DiarioItem[]>([]);

  const [savedLooks, setSavedLooks] =
    useState<DiarioItem[]>([]);

  const [
  selectedWardrobeObjectId,
  setSelectedWardrobeObjectId,
] = useState<string | null>(null);

  const [loadingWardrobe, setLoadingWardrobe] =
    useState(true);

  const [wardrobeError, setWardrobeError] =
    useState<string | null>(null);

  const [addingClothing, setAddingClothing] =
    useState(false);
  const [editingClothingId, setEditingClothingId] = useState<string | null>(null);
  const [savingClothing, setSavingClothing] = useState(false);
  const [deletingClothingId, setDeletingClothingId] = useState<string | null>(null);
  const wardrobeClosetRef = useRef<HTMLElement | null>(null);
  const cutoutRunId = useRef(0);
  const [cutoutCandidateFile, setCutoutCandidateFile] = useState<File | null>(null);
  const [cutoutCandidateUrl, setCutoutCandidateUrl] = useState<string | null>(null);

  const [addingLook, setAddingLook] =
    useState(false);

  const [clothingName, setClothingName] =
    useState("");

  const [clothingCategory, setClothingCategory] =
    useState("top");

  const [clothingNote, setClothingNote] =
    useState("");

  const [clothingOriginalFile, setClothingOriginalFile] =
    useState<File | null>(null);

  const [clothingImageFile, setClothingImageFile] =
    useState<File | null>(null);

  const [clothingPreviewUrl, setClothingPreviewUrl] =
    useState<string | null>(null);

  const [clothingCutoutMode, setClothingCutoutMode] =
    useState<"original" | "auto" | "manual">("original");

  const [manualCutoutOpen, setManualCutoutOpen] =
    useState(false);

  const [cropEditorOpen, setCropEditorOpen] = useState(false);

  const [cutoutBusy, setCutoutBusy] =
    useState(false);

  const [mediaByItemId, setMediaByItemId] =
    useState<Record<string, string>>({});

  const [builderLayout, setBuilderLayout] =
    useState<LookLayoutItem[]>([]);

  const [builderSelectedId, setBuilderSelectedId] =
    useState<string | null>(null);

  const [builderTitle, setBuilderTitle] =
    useState("");

  const [builderNote, setBuilderNote] =
    useState("");

  const [savingBuilder, setSavingBuilder] =
    useState(false);

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
    if (!cutoutCandidateFile) {
      setCutoutCandidateUrl(null);
      return;
    }
    const url = URL.createObjectURL(cutoutCandidateFile);
    setCutoutCandidateUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [cutoutCandidateFile]);

  useEffect(() => {
    if (!clothingImageFile) {
      setClothingPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(clothingImageFile);
    setClothingPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [clothingImageFile]);

  useEffect(() => {
    let active = true;

    if (!wardrobeItems.length) {
      setMediaByItemId({});
      return;
    }

    hydrateDiaryItems(wardrobeItems)
      .then((views) => {
        if (!active) return;

        setMediaByItemId(
          Object.fromEntries(
            views
              .filter((view) => Boolean(view.mediaUrl))
              .map((view) => [
                view.item.id,
                view.mediaUrl as string,
              ])
          )
        );
      })
      .catch((mediaError) => {
        console.error(
          "Could not hydrate wardrobe images:",
          mediaError
        );
      });

    return () => {
      active = false;
    };
  }, [wardrobeItems]);

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
    wardrobeItems.filter((item) => item.owner === dbOwner);
  const slotCatalog = visibleItems.map(item => ({
    id: item.id,
    category: typeof item.data?.category === "string" ? item.data.category : "other",
  }));
  const selectedWearingIds = normalizeWearingIds(wearingByOwner[dbOwner]?.clothingIds ?? [], slotCatalog);
  const closetItems = closetCategory === "all"
    ? visibleItems
    : visibleItems.filter(item =>
        (typeof item.data?.category === "string" ? item.data.category : "other") === closetCategory
      );

  const visibleLooks =
    savedLooks.filter(
      (look) => look.owner === dbOwner
    );

  const wearing =
    wearingByOwner[dbOwner];

  const wearingItems =
    visibleItems.filter(item => selectedWearingIds.includes(item.id));

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

  useEffect(() => {
    const onWearingChanged = (
      event: Event
    ) => {
      const owner =
        (
          event as CustomEvent<{
            owner?: WardrobeOwner;
          }>
        ).detail?.owner;

      if (
        owner === "alloah" ||
        owner === "dominic"
      ) {
        void refreshOwnerWearing(
          owner
        );
        return;
      }

      void Promise.all([
        refreshOwnerWearing(
          "alloah"
        ),
        refreshOwnerWearing(
          "dominic"
        ),
      ]);
    };

    window.addEventListener(
      WARDROBE_WEARING_CHANGED_EVENT,
      onWearingChanged
    );

    return () => {
      window.removeEventListener(
        WARDROBE_WEARING_CHANGED_EVENT,
        onWearingChanged
      );
    };
  }, [session.user.id]);


  const resetClothingEditor = () => {
    // Called after a successful awaited save while savingClothing is true;
    // buttons themselves are disabled during saving.
    cutoutRunId.current += 1; // Ignore stale asynchronous browser cutout jobs.
    setAddingClothing(false);
    setEditingClothingId(null);
    setClothingName("");
    setClothingCategory("top");
    setClothingNote("");
    setClothingOriginalFile(null);
    setClothingImageFile(null);
    setClothingCutoutMode("original");
    setCutoutCandidateFile(null);
    setManualCutoutOpen(false);
    setCropEditorOpen(false);
    setCutoutBusy(false);
  };

  const revealClothingEditor = () => {
    // On iOS, simply rendering a form at the top is not enough if the user
    // pressed Edit on a card far below a crowded closet.
    window.requestAnimationFrame(() =>
      wardrobeClosetRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    );
  };

  const beginAddClothing = () => {
    if (savingClothing || deletingClothingId) return;
    resetClothingEditor();
    setWardrobeError(null);
    setAddingClothing(true);
    setWardrobeView("closet");
    revealClothingEditor();
  };

  const beginEditClothing = (item: DiarioItem) => {
    if (savingClothing || deletingClothingId) return;
    resetClothingEditor();
    setWardrobeError(null);
    setSelectedWardrobeObjectId(null);
    setWardrobeOwner(item.owner === "dominic" ? "dominic" : "mine");
    setEditingClothingId(item.id);
    setClothingName(item.title ?? "");
    setClothingCategory(typeof item.data?.category === "string" ? item.data.category : "other");
    setClothingNote(item.body ?? "");
    setAddingClothing(true);
    setWardrobeView("closet");
    revealClothingEditor();
  };

  const removeClothingItem = async (item: DiarioItem) => {
    if (savingClothing || deletingClothingId) return;
    if (!window.confirm(`Delete "${item.title ?? "this clothing"}" permanently? It will also be removed from saved looks and Currently Wearing.`)) return;
    setDeletingClothingId(item.id);
    setWardrobeError(null);
    const owner: WardrobeOwner = item.owner === "dominic" ? "dominic" : "alloah";
    try {
      const currentWearing = await getWearingSelection({ userId: session.user.id, owner });
      // Always read the actual saved outfit; local state can be stale.
      if (currentWearing?.clothingIds.includes(item.id)) {
        await setWearingClothing({
          userId: session.user.id,
          owner,
          clothingIds: currentWearing.clothingIds.filter((id) => id !== item.id),
        });
      }
      await deleteClothing({ userId: session.user.id, clothingId: item.id });
      setWardrobeItems((items) => items.filter((saved) => saved.id !== item.id));
      setLookClothingByLookId((current) =>
        Object.fromEntries(Object.entries(current).map(([lookId, ids]) => [
          lookId, ids.filter((id) => id !== item.id)
        ]))
      );
      setBuilderLayout((layout) => layout.filter((piece) => piece.clothingId !== item.id));
      if (editingClothingId === item.id) resetClothingEditor();
      setSelectedWardrobeObjectId(null);
      await refreshOwnerWearing(owner);
    } catch (error) {
      console.error("Could not delete clothing:", error);
      setWardrobeError("The clothing item could not be deleted. Check the saved outfit and try again.");
      try { await refreshOwnerWearing(owner); } catch {}
    } finally {
      setDeletingClothingId(null);
    }
  };

  const saveClothing = async () => {
    if (!clothingName.trim() || savingClothing || cutoutBusy) return;
    setSavingClothing(true);
    setWardrobeError(null);
    try {
      const storagePath = clothingImageFile
        ? await uploadDiarioItemImage({
            userId: session.user.id,
            file: clothingImageFile,
            folder: "wardrobe",
          })
        : null;
      const existing = editingClothingId
        ? wardrobeItems.find((item) => item.id === editingClothingId)
        : null;
      const itemOwner: WardrobeOwner = existing
        ? (existing.owner === "dominic" ? "dominic" : "alloah")
        : dbOwner;
      const savedItem = editingClothingId
        ? await updateClothing({
            userId: session.user.id,
            clothingId: editingClothingId,
            owner: itemOwner,
            title: clothingName,
            category: clothingCategory,
            note: clothingNote,
            // No replacement upload means no modifications to image metadata.
            storagePath: storagePath ?? undefined,
            cutoutMode: clothingCutoutMode,
          })
        : await createClothing({
            userId: session.user.id,
            owner: itemOwner,
            title: clothingName,
            category: clothingCategory,
            note: clothingNote,
            storagePath,
            cutoutMode: clothingCutoutMode,
          });
      setWardrobeItems((items) =>
        editingClothingId
          ? items.map((item) => item.id === savedItem.id ? savedItem : item)
          : [savedItem, ...items]
      );
      resetClothingEditor();
    } catch (error) {
      console.error("Could not save clothing:", error);
      setWardrobeError("The clothing item could not be saved. Your editing fields are still here; try again.");
    } finally {
      setSavingClothing(false);
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

  const resetBuilder = () => {
    setBuilderLayout([]);
    setBuilderSelectedId(null);
    setBuilderTitle("");
    setBuilderNote("");
  };

  const addPieceToBuilder = (item: DiarioItem) => {
    setBuilderLayout((current) => {
      if (
        current.some(
          (piece) =>
            piece.clothingId === item.id
        )
      ) {
        setBuilderSelectedId(item.id);
        return current;
      }

      const next =
        defaultPieceLayout(
          item,
          current.length + 1
        );

      setBuilderSelectedId(item.id);
      return [...current, next];
    });
  };

  const updateBuilderPiece = (
    clothingId: string,
    update:
      | Partial<LookLayoutItem>
      | ((piece: LookLayoutItem) => LookLayoutItem)
  ) => {
    setBuilderLayout((current) =>
      current.map((piece) => {
        if (piece.clothingId !== clothingId) {
          return piece;
        }

        return typeof update === "function"
          ? update(piece)
          : { ...piece, ...update };
      })
    );
  };

  const removeBuilderPiece = (clothingId: string) => {
    setBuilderLayout((current) =>
      current.filter(
        (piece) =>
          piece.clothingId !== clothingId
      )
    );

    setBuilderSelectedId((current) =>
      current === clothingId ? null : current
    );
  };

  const saveBuiltLook = async () => {
    if (!builderTitle.trim() || !builderLayout.length) {
      return;
    }

    setSavingBuilder(true);
    setWardrobeError(null);

    try {
      const savedLook =
        await createLook({
          userId: session.user.id,
          owner: dbOwner,
          title: builderTitle,
          note: builderNote,
          layout: builderLayout,
        });

      await Promise.all(
        builderLayout.map((piece) =>
          addClothingToLook({
            userId: session.user.id,
            lookId: savedLook.id,
            clothingId: piece.clothingId,
          })
        )
      );

      setLookClothingByLookId((current) => ({
        ...current,
        [savedLook.id]:
          builderLayout.map(
            (piece) => piece.clothingId
          ),
      }));

      setSavedLooks((current) => [
        savedLook,
        ...current,
      ]);

      resetBuilder();
      setWardrobeView("looks");
    } catch (builderError) {
      console.error(
        "Could not save built look:",
        builderError
      );

      setWardrobeError(
        "The look could not be saved."
      );
    } finally {
      setSavingBuilder(false);
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
      // Use the most recent database selection, not a stale local array.
      // Selecting another top / bottom / pair of shoes REPLACES that slot.
      const persisted = await getWearingSelection({ userId: session.user.id, owner: dbOwner });
      const nextIds = toggleWearingPiece(persisted?.clothingIds ?? [], item.id, slotCatalog);

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

  const removeWearingItem = async (itemId: string) => {
    if (updatingWearing) return;
    setUpdatingWearing(true);
    setWardrobeError(null);
    try {
      const persisted = await getWearingSelection({ userId: session.user.id, owner: dbOwner });
      const nextIds = removeWearingPiece(persisted?.clothingIds ?? [], itemId, slotCatalog);
      const selection = await setWearingClothing({
        userId: session.user.id, owner: dbOwner, clothingIds: nextIds,
      });
      setWearingByOwner(current => ({ ...current, [dbOwner]: selection }));
    } catch (error) {
      console.error("Could not remove one Wearing item:", error);
      setWardrobeError("That piece could not be removed from Wearing.");
      await refreshOwnerWearing(dbOwner).catch(() => undefined);
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

  if (selectedWardrobeObjectId) {
    const selectedClothing = wardrobeItems.find(
      (item) => item.id === selectedWardrobeObjectId && item.kind === "clothing"
    );

    return (
      <div className="wardrobe-object-detail-wrap">
        <ConnectedObjectDetailScreen
          itemId={selectedWardrobeObjectId}
          onOpenRelated={setSelectedWardrobeObjectId}
          onBack={() => setSelectedWardrobeObjectId(null)}
        />
        {wardrobeError && (
          <p className="wardrobe-management-error" role="alert">{wardrobeError}</p>
        )}
        {selectedClothing && (
          <div className="wardrobe-detail-actions">
            <button type="button" onClick={() => beginEditClothing(selectedClothing)}>
              Edit clothing
            </button>
            <button
              type="button"
              className="wardrobe-delete-clothing"
              disabled={Boolean(deletingClothingId)}
              onClick={() => void removeClothingItem(selectedClothing)}
            >
              {deletingClothingId === selectedClothing.id ? "Deleting…" : "Delete clothing"}
            </button>
          </div>
        )}
      </div>
    );
  }
  
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
          onClick={() => {
            resetClothingEditor();
            setWardrobeOwner("mine");
          }}
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
          onClick={() => {
            resetClothingEditor();
            setWardrobeOwner("dominic");
          }}
        >
          Dominic
        </button>
      </div>

      {wardrobeOwner ===
        "dominic" && (
        <aside className="wardrobe-autonomy-note">
          <Sparkles
            size={15}
            strokeWidth={1.3}
          />

          <div>
            <small>
              HIS CLOSET
            </small>

            <p>
              Dominic chooses from his own
              saved Looks when his day says
              he is getting dressed or
              getting ready. His current
              outfit can change without you
              selecting it.
            </p>
          </div>
        </aside>
      )}

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
        className="wardrobe-view-tabs wardrobe-four-tabs"
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
            wardrobeView === "builder"
          }
          className={
            wardrobeView === "builder"
              ? "active"
              : ""
          }
          onClick={() =>
            setWardrobeView("builder")
          }
        >
          Builder
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
      ) : wardrobeView === "builder" ? (
        <section className="wardrobe-builder">
          <header>
            <div>
              <span>style board</span>
              <strong>Build a look</strong>
            </div>

            <small>
              {builderLayout.length} pieces
            </small>
          </header>

          <div className="wardrobe-builder-stage">
            {builderLayout.length === 0 && (
              <div className="wardrobe-builder-placeholder">
                <Layers size={28} strokeWidth={1.2} />
                <strong>Start with a piece</strong>
                <small>
                  Scroll your closet below and tap anything to place it here.
                </small>
              </div>
            )}

            {builderLayout
              .slice()
              .sort((a, b) => a.z - b.z)
              .map((piece) => {
                const item =
                  visibleItems.find(
                    (candidate) =>
                      candidate.id === piece.clothingId
                  );

                if (!item) return null;

                const mediaUrl =
                  mediaByItemId[item.id];

                const selected =
                  builderSelectedId === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={
                      selected
                        ? "wardrobe-builder-piece selected"
                        : "wardrobe-builder-piece"
                    }
                    style={{
                      left: piece.x + "%",
                      top: piece.y + "%",
                      zIndex: piece.z,
                      transform:
                        "translate(-50%, -50%) rotate(" +
                        piece.rotation +
                        "deg) scale(" +
                        piece.scale +
                        ")",
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      setBuilderSelectedId(item.id);
                    }}
                    onPointerDown={(event) => {
                      event.currentTarget.setPointerCapture(
                        event.pointerId
                      );

                      const stage =
                        event.currentTarget
                          .parentElement
                          ?.getBoundingClientRect();

                      if (!stage) return;

                      const startX = event.clientX;
                      const startY = event.clientY;
                      const originalX = piece.x;
                      const originalY = piece.y;

                      const move = (
                        moveEvent: PointerEvent
                      ) => {
                        const dx =
                          ((moveEvent.clientX - startX) /
                            stage.width) *
                          100;
                        const dy =
                          ((moveEvent.clientY - startY) /
                            stage.height) *
                          100;

                        updateBuilderPiece(
                          item.id,
                          {
                            x: clamp(
                              originalX + dx,
                              7,
                              93
                            ),
                            y: clamp(
                              originalY + dy,
                              7,
                              93
                            ),
                          }
                        );
                      };

                      const stop = () => {
                        window.removeEventListener(
                          "pointermove",
                          move
                        );
                        window.removeEventListener(
                          "pointerup",
                          stop
                        );
                      };

                      window.addEventListener(
                        "pointermove",
                        move
                      );
                      window.addEventListener(
                        "pointerup",
                        stop
                      );
                    }}
                  >
                    {mediaUrl ? (
                      <img
                        src={mediaUrl}
                        alt={item.title ?? "Clothing"}
                        draggable={false}
                      />
                    ) : (
                      <Shirt
                        size={46}
                        strokeWidth={1.1}
                      />
                    )}
                  </button>
                );
              })}
          </div>

          {builderSelectedId && (
            <div className="wardrobe-builder-tools">
              <button
                type="button"
                aria-label="Smaller"
                onClick={() =>
                  updateBuilderPiece(
                    builderSelectedId,
                    (piece) => ({
                      ...piece,
                      scale: clamp(
                        piece.scale - 0.08,
                        0.45,
                        1.8
                      ),
                    })
                  )
                }
              >
                −
              </button>

              <button
                type="button"
                aria-label="Bigger"
                onClick={() =>
                  updateBuilderPiece(
                    builderSelectedId,
                    (piece) => ({
                      ...piece,
                      scale: clamp(
                        piece.scale + 0.08,
                        0.45,
                        1.8
                      ),
                    })
                  )
                }
              >
                ＋
              </button>

              <button
                type="button"
                aria-label="Rotate left"
                onClick={() =>
                  updateBuilderPiece(
                    builderSelectedId,
                    (piece) => ({
                      ...piece,
                      rotation:
                        piece.rotation - 5,
                    })
                  )
                }
              >
                <RotateCcw size={15} />
              </button>

              <button
                type="button"
                aria-label="Rotate right"
                onClick={() =>
                  updateBuilderPiece(
                    builderSelectedId,
                    (piece) => ({
                      ...piece,
                      rotation:
                        piece.rotation + 5,
                    })
                  )
                }
              >
                <RotateCw size={15} />
              </button>

              <button
                type="button"
                onClick={() =>
                  updateBuilderPiece(
                    builderSelectedId,
                    (piece) => ({
                      ...piece,
                      z: Math.max(
                        1,
                        piece.z - 1
                      ),
                    })
                  )
                }
              >
                back
              </button>

              <button
                type="button"
                onClick={() =>
                  updateBuilderPiece(
                    builderSelectedId,
                    (piece) => ({
                      ...piece,
                      z:
                        Math.max(
                          0,
                          ...builderLayout.map(
                            (candidate) =>
                              candidate.z
                          )
                        ) + 1,
                    })
                  )
                }
              >
                front
              </button>

              <button
                type="button"
                className="remove"
                onClick={() =>
                  removeBuilderPiece(
                    builderSelectedId
                  )
                }
              >
                remove
              </button>
            </div>
          )}

          <div className="wardrobe-builder-rail">
            {visibleItems.length === 0 ? (
              <p>
                Add clothing to the closet first.
              </p>
            ) : (
              visibleItems.map((item) => {
                const mediaUrl =
                  mediaByItemId[item.id];

                const onBoard =
                  builderLayout.some(
                    (piece) =>
                      piece.clothingId ===
                      item.id
                  );

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={
                      onBoard ? "active" : ""
                    }
                    onClick={() =>
                      addPieceToBuilder(item)
                    }
                  >
                    <span>
                      {mediaUrl ? (
                        <img src={mediaUrl} alt="" />
                      ) : (
                        <Shirt
                          size={21}
                          strokeWidth={1.2}
                        />
                      )}
                    </span>

                    <small>
                      {item.title ??
                        "Untitled"}
                    </small>
                  </button>
                );
              })
            )}
          </div>

          <div className="wardrobe-builder-meta">
            <input
              value={builderTitle}
              onChange={(event) =>
                setBuilderTitle(
                  event.target.value
                )
              }
              placeholder="Look name"
            />

            <textarea
              value={builderNote}
              onChange={(event) =>
                setBuilderNote(
                  event.target.value
                )
              }
              placeholder="Where would you wear this?"
              rows={2}
            />

            <div className="diary-editor-actions">
              <button
                type="button"
                onClick={resetBuilder}
              >
                Clear board
              </button>

              <button
                type="button"
                className="wardrobe-create-look"
                disabled={
                  savingBuilder ||
                  !builderTitle.trim() ||
                  builderLayout.length === 0
                }
                onClick={() =>
                  void saveBuiltLook()
                }
              >
                Save look
              </button>
            </div>
          </div>
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
                        <article key={item.id} className="wardrobe-wearing-piece">
                          {mediaByItemId[item.id] ? (
                            <img
                              className="wardrobe-wearing-thumb"
                              src={mediaByItemId[item.id]}
                              alt=""
                            />
                          ) : (
                            <Shirt
                              size={19}
                              strokeWidth={
                                1.3
                              }
                            />
                          )}

                          <span>
                            <strong>
                              {item.title ??
                                "Untitled"}
                            </strong>

                            <small>{category}</small>
                          </span>
                          <button
                            type="button"
                            className="wardrobe-remove-piece"
                            title="Remove this piece from Wearing"
                            aria-label={`Remove ${item.title ?? category} from Wearing`}
                            disabled={updatingWearing}
                            onClick={() => void removeWearingItem(item.id)}
                          >
                            <X size={15} />
                          </button>
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
        <section className="wardrobe-closet" ref={wardrobeClosetRef}>
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

          <nav className="wardrobe-category-tabs" aria-label="Clothing categories">
            {WARDROBE_CATEGORIES.map(category => {
              const count = category.id === "all" ? visibleItems.length :
                visibleItems.filter(item =>
                  (typeof item.data?.category === "string" ? item.data.category : "other") === category.id
                ).length;
              return (
                <button key={category.id} type="button"
                  className={closetCategory === category.id ? "active" : ""}
                  aria-pressed={closetCategory === category.id}
                  onClick={() => setClosetCategory(category.id)}>
                  {category.label}<span>{count}</span>
                </button>
              );
            })}
          </nav>

          <div className="wardrobe-closet-toolbar">
            {addingClothing ? (
              <button type="button" className="wardrobe-add-button" disabled={savingClothing}
                onClick={resetClothingEditor}>× Close editor</button>
            ) : (
              <button type="button" className="wardrobe-add-button" onClick={beginAddClothing}>
                ＋ Add clothing
              </button>
            )}
          </div>

          {wardrobeError && (
            <p className="wardrobe-management-error" role="alert">{wardrobeError}</p>
          )}

          {addingClothing ? (
            <div className="wardrobe-empty">
              <small>
                new clothing
              </small>

              <h2>
                {editingClothingId ? "Edit clothing" : "Add clothing"}
              </h2>
              {editingClothingId && (
                <p className="wardrobe-edit-note">
                  Change the name, category or note without losing its saved looks or Currently Wearing selection.
                  Choose another photo only if you want to replace the existing image.
                </p>
              )}

              <label className="wardrobe-image-picker">
                <span>
                  {clothingPreviewUrl || (editingClothingId && mediaByItemId[editingClothingId]) ? (
                    <img
                      src={clothingPreviewUrl || mediaByItemId[editingClothingId]!}
                      alt="Clothing preview"
                    />
                  ) : (
                    <>
                      <ImageIcon size={24} strokeWidth={1.2} />
                      <strong>
                        Add the piece photo
                      </strong>
                      <small>
                        PNG works best · photo is fine too
                      </small>
                    </>
                  )}
                </span>

                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => {
                    const file =
                      event.target.files?.[0] ??
                      null;
                    if (!file) return;

                    // Never silently replace a real garment photo with a
                    // lossy cutout. The original always wins by default.
                    cutoutRunId.current += 1;
                    setClothingOriginalFile(file);
                    setClothingImageFile(file);
                    setClothingCutoutMode("original");
                    setCutoutCandidateFile(null);
                    setManualCutoutOpen(false);
                    setCropEditorOpen(false);
                    setWardrobeError(null);
                  }}
                />
              </label>

              {clothingOriginalFile && (
                <>
                  <p className="wardrobe-edit-note">
                    Your original photo is safe. Automatic cleanup is optional and works only on
                    a plain contrasting background. It is not AI segmentation and cannot
                    accurately remove a complicated background.
                  </p>
                  <div className="wardrobe-cutout-tools">
                    <button
                      type="button"
                      disabled={cutoutBusy || savingClothing}
                      onClick={async () => {
                        const runId = ++cutoutRunId.current;
                        setCutoutBusy(true);
                        setCutoutCandidateFile(null);
                        setWardrobeError(null);
                        try {
                          const candidate = await autoCutoutClothing(clothingOriginalFile);
                          if (runId === cutoutRunId.current) {
                            setCutoutCandidateFile(candidate);
                          }
                        } catch (error) {
                          console.info("Conservative background cleanup unavailable:", error);
                          if (runId === cutoutRunId.current) {
                            setWardrobeError(
                              error instanceof Error ? error.message : "Could not clean this background safely. Original photo preserved."
                            );
                          }
                        } finally {
                          if (runId === cutoutRunId.current) setCutoutBusy(false);
                        }
                      }}
                    >
                      <Scissors size={14} />
                      {cutoutBusy ? "Checking background…" : "Try background cleanup"}
                    </button>

                    <button
                      type="button"
                      disabled={savingClothing}
                      onClick={() => {
                        cutoutRunId.current += 1;
                        setCutoutBusy(false);
                        setClothingImageFile(clothingOriginalFile);
                        setClothingCutoutMode("original");
                        setCutoutCandidateFile(null);
                        setManualCutoutOpen(false);
                      }}
                    >Use original</button>

                    <button type="button" disabled={cutoutBusy || savingClothing}
                      onClick={() => setCropEditorOpen(true)}>
                      <Scissors size={14} /> Crop photo
                    </button>
                    <button type="button" disabled={cutoutBusy || savingClothing}
                      onClick={() => setManualCutoutOpen(true)}>
                      <Scissors size={14} /> Refine cutout
                    </button>
                  </div>

                  {cutoutCandidateFile && cutoutCandidateUrl && (
                    <section className="wardrobe-cutout-review" aria-label="Review optional background cleanup">
                      <strong>Review before applying</strong>
                      <p>Compare carefully: if the fabric, soles or edges are missing, keep the original.</p>
                      <div className="wardrobe-cutout-review-grid">
                        <figure>
                          <img src={clothingPreviewUrl || ""} alt="Current original clothing photo" />
                          <figcaption>Current photo</figcaption>
                        </figure>
                        <figure>
                          <img src={cutoutCandidateUrl} alt="Proposed automatic background removal" />
                          <figcaption>Proposed cleanup</figcaption>
                        </figure>
                      </div>
                      <div className="wardrobe-cutout-review-actions">
                        <button type="button" onClick={() => {
                          setClothingImageFile(cutoutCandidateFile);
                          setClothingCutoutMode("auto");
                          setCutoutCandidateFile(null);
                        }}>Use this cutout</button>
                        <button type="button" onClick={() => setCutoutCandidateFile(null)}>
                          Reject cutout
                        </button>
                      </div>
                    </section>
                  )}
                </>
              )}

              {cropEditorOpen && clothingOriginalFile && (
                <WardrobeCropEditor
                  file={clothingOriginalFile}
                  onCancel={() => setCropEditorOpen(false)}
                  onApply={(cropped) => {
                    setClothingOriginalFile(cropped);
                    setClothingImageFile(cropped);
                    setClothingCutoutMode("original");
                    setCutoutCandidateFile(null);
                    cutoutRunId.current += 1;
                    setCropEditorOpen(false);
                    // Cropping must NEVER secretly trigger another cutout.
                  }}
                />
              )}

              {manualCutoutOpen &&
                clothingOriginalFile &&
                clothingImageFile && (
                  <WardrobeManualCutout
                    file={
                      clothingImageFile
                    }
                    restoreFile={
                      clothingOriginalFile
                    }
                    onCancel={() =>
                      setManualCutoutOpen(
                        false
                      )
                    }
                    onApply={(cutout) => {
                      setClothingImageFile(
                        cutout
                      );
                      setClothingCutoutMode(
                        "manual"
                      );
                      setCutoutCandidateFile(null);
                      setManualCutoutOpen(
                        false
                      );
                    }}
                  />
                )}

              <input
                type="text"
                value={clothingName}
                onChange={(event) =>
                  setClothingName(
                    event.target.value
                  )
                }
                placeholder="Name"
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
                <option value="bag">
                  Bag
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
                <button type="button" onClick={resetClothingEditor} disabled={savingClothing}>
                  Cancel
                </button>

                <button
                  type="button"
                  className="wardrobe-add-button"
                  disabled={!clothingName.trim() || savingClothing || cutoutBusy}
                  onClick={saveClothing}
                >
                  {savingClothing ? "Saving…" : editingClothingId ? "Save changes" : "Save clothing"}
                </button>
              </div>
            </div>
          ) : closetItems.length ===
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
                {visibleItems.length ? "No items in this category." : "No clothes added yet."}
              </h2>

              <p>
                Real clothes can be added
                here over time.
              </p>

              {/* Add Clothing remains at the top of the closet. */}
            </div>
          ) : (
            <>
              <div className="wardrobe-item-grid">
                {closetItems.map(
                  (item) => {
                    const category =
                      typeof item.data
                        ?.category ===
                      "string"
                        ? item.data
                            .category
                        : "other";

                    const isWearing =
                      selectedWearingIds.includes(item.id);

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
                          {mediaByItemId[item.id] ? (
                            <img
                              src={
                                mediaByItemId[
                                  item.id
                                ]
                              }
                              alt=""
                            />
                          ) : (
                            <Shirt
                              size={23}
                              strokeWidth={
                                1.25
                              }
                            />
                          )}
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

                        <div className="wardrobe-card-management">
                          <button type="button" disabled={Boolean(deletingClothingId) || savingClothing}
                            onClick={() => beginEditClothing(item)}>Edit</button>
                          <button type="button" className="danger"
                            disabled={Boolean(deletingClothingId) || savingClothing}
                            onClick={() => void removeClothingItem(item)}>
                            {deletingClothingId === item.id ? "Deleting…" : "Delete"}
                          </button>
                        </div>
                        <button type="button" className="letter-connected-button"
                          onClick={() => setSelectedWardrobeObjectId(item.id)}>
                          View connections
                        </button>
                        
                      </article>
                    );
                  }
                )}
              </div>

              {/* Add Clothing remains at the top of the closet. */}
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
                onClick={() => {
                  resetBuilder();
                  setWardrobeView("builder");
                }}
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
                        <div
                          className="wardrobe-look-preview"
                          aria-hidden="true"
                        >
                          {readLookLayout(look)
                            .slice()
                            .sort((a, b) => a.z - b.z)
                            .map((piece) => {
                              const mediaUrl =
                                mediaByItemId[
                                  piece.clothingId
                                ];

                              if (!mediaUrl) {
                                return null;
                              }

                              return (
                                <img
                                  key={piece.clothingId}
                                  src={mediaUrl}
                                  alt=""
                                  style={{
                                    left: piece.x + "%",
                                    top: piece.y + "%",
                                    zIndex: piece.z,
                                    transform:
                                      "translate(-50%, -50%) rotate(" +
                                      piece.rotation +
                                      "deg) scale(" +
                                      piece.scale +
                                      ")",
                                  }}
                                />
                              );
                            })}
                        </div>

                        <div className="wardrobe-look-copy">
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

                        <button
  type="button"
  className="letter-connected-button"
  onClick={() =>
    setSelectedWardrobeObjectId(
      look.id
    )
  }
>
  View connections
</button>
                        
                      </article>
                    );
                  }
                )}
              </div>

              <button
                type="button"
                className="wardrobe-create-look"
                onClick={() => {
                  resetBuilder();
                  setWardrobeView("builder");
                }}
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
