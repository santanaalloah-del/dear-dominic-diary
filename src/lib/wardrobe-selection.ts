/** One active garment per outfit slot, preserving independent accessories. */
export type ClothingSlotItem = {
  id: string;
  category: string | null | undefined;
};

export const WARDROBE_CATEGORIES = [
  { id: "all", label: "All" },
  { id: "top", label: "Tops" },
  { id: "bottom", label: "Bottoms" },
  { id: "shoes", label: "Shoes" },
  { id: "outerwear", label: "Outerwear" },
  { id: "dress", label: "Dresses" },
  { id: "bag", label: "Bags" },
  { id: "accessory", label: "Accessories" },
  { id: "other", label: "Other" },
] as const;

const SINGLE_CHOICE_SLOTS = new Set(["top", "bottom", "shoes", "dress", "outerwear", "bag"]);

export function garmentCategory(item: ClothingSlotItem): string {
  return (item.category ?? "other").toLowerCase().trim() || "other";
}

/** The final selection in a slot wins, including old arrays with duplicates. */
export function normalizeWearingIds(
  selectedIds: readonly string[],
  catalog: readonly ClothingSlotItem[],
): string[] {
  const byId = new Map(catalog.map(item => [item.id, garmentCategory(item)]));
  const chosen: string[] = [];
  for (const id of selectedIds) {
    const category = byId.get(id);
    if (!category || chosen.includes(id)) continue;
    if (SINGLE_CHOICE_SLOTS.has(category)) {
      for (let i = chosen.length - 1; i >= 0; i--) {
        const old = byId.get(chosen[i]);
        if (old === category ||
          (category === "dress" && (old === "top" || old === "bottom")) ||
          ((category === "top" || category === "bottom") && old === "dress")) {
          chosen.splice(i, 1);
        }
      }
    }
    chosen.push(id);
  }
  return chosen;
}

export function toggleWearingPiece(
  selectedIds: readonly string[],
  itemId: string,
  catalog: readonly ClothingSlotItem[],
): string[] {
  const canonical = normalizeWearingIds(selectedIds, catalog);
  if (canonical.includes(itemId)) {
    return canonical.filter(id => id !== itemId);
  }
  return normalizeWearingIds([...canonical, itemId], catalog);
}

export function removeWearingPiece(
  selectedIds: readonly string[],
  itemId: string,
  catalog: readonly ClothingSlotItem[],
): string[] {
  return normalizeWearingIds(selectedIds.filter(id => id !== itemId), catalog);
}
