import { describe, expect, test } from "bun:test";
import {
  normalizeWearingIds, toggleWearingPiece, removeWearingPiece,
} from "../src/lib/wardrobe-selection";

const clothes = [
  {id:"tee-1",category:"top"}, {id:"tee-2",category:"top"},
  {id:"jeans-1",category:"bottom"}, {id:"jeans-2",category:"bottom"},
  {id:"shoes-1",category:"shoes"}, {id:"shoes-2",category:"shoes"},
  {id:"coat-1",category:"outerwear"}, {id:"dress-1",category:"dress"},
  {id:"necklace-1",category:"accessory"}, {id:"necklace-2",category:"accessory"},
];

describe("Currently Wearing garment choices", () => {
  test("replacing shoes removes the old shoes without changing top or bottom", () => {
    expect(toggleWearingPiece(["tee-1","jeans-1","shoes-1"],"shoes-2",clothes))
      .toEqual(["tee-1","jeans-1","shoes-2"]);
  });
  test("replacing top and bottom replaces exactly their own category", () => {
    const first=toggleWearingPiece(["tee-1","jeans-1","shoes-1"],"tee-2",clothes);
    expect(first).toEqual(["jeans-1","shoes-1","tee-2"]);
    expect(toggleWearingPiece(first,"jeans-2",clothes)).toEqual(["shoes-1","tee-2","jeans-2"]);
  });
  test("a second tap or an X removes only the target garment", () => {
    const ids=["tee-1","jeans-1","shoes-1"];
    expect(toggleWearingPiece(ids,"shoes-1",clothes)).toEqual(["tee-1","jeans-1"]);
    expect(removeWearingPiece(ids,"tee-1",clothes)).toEqual(["jeans-1","shoes-1"]);
  });
  test("a dress cannot coexist with an old top and bottom; independent shoes remain", () => {
    expect(toggleWearingPiece(["tee-1","jeans-1","shoes-1"],"dress-1",clothes))
      .toEqual(["shoes-1","dress-1"]);
    expect(toggleWearingPiece(["dress-1","shoes-1"],"tee-2",clothes))
      .toEqual(["shoes-1","tee-2"]);
  });
  test("old duplicate selections never leak to Photo Engine", () => {
    expect(normalizeWearingIds(["tee-1","shoes-1","jeans-1","shoes-2","tee-2"],clothes))
      .toEqual(["jeans-1","shoes-2","tee-2"]);
  });
  test("multiple explicitly chosen accessories are still supported", () => {
    expect(toggleWearingPiece(["tee-1","necklace-1"],"necklace-2",clothes))
      .toEqual(["tee-1","necklace-1","necklace-2"]);
  });
  test("invalid or removed clothes do not survive normalization", () => {
    expect(normalizeWearingIds(["deleted-item","shoes-1"],clothes)).toEqual(["shoes-1"]);
  });
});
