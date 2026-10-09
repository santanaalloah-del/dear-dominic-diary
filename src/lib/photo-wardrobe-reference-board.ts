/**
 * Zero-AI-cost composite of the exact private Currently Wearing cutouts.
 * A single per-person board preserves outfit pieces while leaving more image
 * reference slots for faces, tattoos, and the actual home.
 *
 * This is ONLY a clothing reference: the provider is instructed to never
 * derive body/face identities from the board.
 */
export type CurrentGarment = {
  id: string;
  title: string;
  category: string;
  imageUrl: string | null;
};

async function openPrivateGarment(url: string): Promise<{
  image: HTMLImageElement;
  release: () => void;
}> {
  const response = await fetch(url, {
    credentials: "omit",
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error("A Currently Wearing image could not load");
  const blob = await response.blob();
  if (!blob.type.startsWith("image/") || blob.size > 8 * 1024 * 1024) {
    throw new Error("Invalid Currently Wearing image");
  }
  const blobUrl = URL.createObjectURL(blob);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Could not decode a wardrobe image"));
      image.src = blobUrl;
    });
    if (!image.naturalWidth || !image.naturalHeight) {
      throw new Error("Empty outfit image");
    }
    return { image, release: () => URL.revokeObjectURL(blobUrl) };
  } catch (error) {
    URL.revokeObjectURL(blobUrl);
    throw error;
  }
}

export async function makeCurrentlyWearingBoard(
  owner: "alloah" | "dominic",
  garments: CurrentGarment[]
): Promise<string | null> {
  if (typeof document === "undefined") return null;
  const items = garments.filter((garment): garment is CurrentGarment & { imageUrl: string } =>
    Boolean(garment.imageUrl)
  );
  if (!items.length) return null;
  // The caller divides outfits into chunks of six. Never silently crop off
  // a user's actual Currently Wearing shoes, trousers or accessories.
  if (items.length > 6) throw new Error("A wardrobe board may contain at most six garments");

  // Never synthesize garment details: only arrange the real selected images.
  const columns = items.length === 1 ? 1 : 2;
  const rows = Math.ceil(items.length / columns);
  const cellWidth = 540;
  const cellHeight = 620;
  const margin = 35;
  const headerHeight = 100;
  const canvas = document.createElement("canvas");
  canvas.width = columns * cellWidth + margin * 2;
  canvas.height = rows * cellHeight + margin * 2 + headerHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#fffaf3";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#2d2425";
  ctx.font = "bold 25px Arial, sans-serif";
  ctx.fillText(owner === "alloah" ? "ALLOAH — CURRENTLY WEARING" : "DOMINIC — CURRENTLY WEARING", margin, 54);
  ctx.font = "18px Arial, sans-serif";
  ctx.fillText("EXACT GARMENT IMAGES • CLOTHING ONLY • NOT A PERSON REFERENCE", margin, 82);
  for (let index = 0; index < items.length; index += 1) {
    const garment = items[index];
    // Draw each cutout before revoking its blob URL. This works on Safari
    // and avoids holding six full-resolution decoded images simultaneously.
    const loaded = await openPrivateGarment(garment.imageUrl);
    const image = loaded.image;
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = margin + col * cellWidth;
    const y = headerHeight + margin + row * cellHeight;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x, y, cellWidth - 16, cellHeight - 15);
    ctx.strokeStyle = "#d2c2bc";
    ctx.strokeRect(x, y, cellWidth - 16, cellHeight - 15);
    const targetWidth = cellWidth - 60;
    const targetHeight = cellHeight - 115;
    const scale = Math.min(targetWidth / image.naturalWidth, targetHeight / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    try {
      ctx.drawImage(
        image,
        x + ((cellWidth - 16) - width) / 2,
        y + 16 + (targetHeight - height) / 2,
        width,
        height
      );
    } finally {
      loaded.release();
    }
    ctx.fillStyle = "#33282b";
    ctx.font = "bold 20px Arial, sans-serif";
    const label = (garment.category + ": " + garment.title).slice(0, 41);
    ctx.fillText(label, x + 22, y + cellHeight - 42);
  }
  // Keep private Vercel request bodies small, even when there are multiple
  // outfit boards. OpenRouter is never used to create these composites.
  let board = canvas.toDataURL("image/jpeg", 0.82);
  if (board.length > 750_000) board = canvas.toDataURL("image/jpeg", 0.66);
  if (board.length > 900_000) return null;
  return board;
}
