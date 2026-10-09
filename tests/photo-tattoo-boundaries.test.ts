import { describe, expect, test } from "bun:test";
import {
  tattooSceneText,
  visibleTattooRegions,
  TATTOO_FABRIC_BOUNDARY,
} from "../src/lib/photo-tattoo-boundaries";

describe("skin tattoos never become fake shirt prints", () => {
  test("only the requested photo scene determines exposed tattoo regions", () => {
    const text = tattooSceneText({
      scene: "Alloah and Dominic making coffee together in the kitchen",
      shot_type: null,
      adjustment_instruction: null,
      context_snapshot: { conversationSummary: "Tattooed chest in a previous photo" },
    } as Parameters<typeof tattooSceneText>[0]);
    expect(text).not.toContain("tattooed chest");
    expect(text).toContain("making coffee");
  });

  test("a real opaque top hides chest, back and abdomen tattoos", () => {
    expect(visibleTattooRegions(
      ["face", "neck", "chest", "abdomen", "back", "left_arm", "right_hand"],
      { hasTop: true, scene: "making coffee in the kitchen" }
    )).toEqual(["face", "neck", "left_arm", "right_hand"]);
  });

  test("without a saved top, tattoo references remain available", () => {
    const regions = ["face", "chest", "abdomen", "back", "right_arm"] as const;
    expect(visibleTattooRegions([...regions], { hasTop: false, scene: "swimming" }))
      .toEqual([...regions]);
  });

  test("specifically requested bare torso remains supported", () => {
    expect(visibleTattooRegions(["face", "chest", "left_hand"], {
      hasTop: true, scene: "Dominic shirtless, bare chest portrait",
    })).toEqual(["face", "chest", "left_hand"]);
  });

  test("separation says only the garment board defines garment artwork", () => {
    expect(TATTOO_FABRIC_BOUNDARY).toContain("NEVER CLOTHING");
    expect(TATTOO_FABRIC_BOUNDARY).toContain("Current Wearing board");
    expect(TATTOO_FABRIC_BOUNDARY).toContain("Never tattoo through fabric");
  });
});
