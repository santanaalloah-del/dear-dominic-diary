import { describe, expect, test } from "bun:test";
import { analyzePhotoScene } from "../src/lib/photo-scene-intent";

describe("Photo Engine explicit activity and framing", () => {
  test("coffee together is an active candid in the kitchen, never a random standing pose", () => {
    const scene = analyzePhotoScene(
      "Alloah and Dominic making coffee together in the kitchen, candid natural iPhone photo.",
      "natural_iphone", "both"
    );
    expect(scene.room).toBe("kitchen");
    expect(scene.pose).toBe("making_coffee_candid");
    expect(scene.actionNotes.join(" ")).toContain("NOT a symmetrical couple posing");
  });

  test("coffee selfie still honors the explicitly requested selfie", () => {
    const scene = analyzePhotoScene(
      "Dominic making coffee in the kitchen, taking a casual selfie to send me.",
      "natural_iphone", "dominic"
    );
    expect(scene.selfie).toBe(true);
    expect(scene.pose).toBe("relaxed_phone_selfie");
  });

  test("explicit crop is never overridden by inferred kitchen shot", () => {
    const scene = analyzePhotoScene(
      "Alloah and Dominic making coffee in the kitchen, close-up of their faces.",
      "natural_iphone", "both"
    );
    expect(scene.framing).toBe("head_and_shoulders");
  });

  test("coffee outdoors is not interpreted as a coffee-making activity", () => {
    const scene = analyzePhotoScene(
      "Alloah and Dominic walking together holding takeaway coffee on the sidewalk.",
      "candid", "both"
    );
    expect(scene.room).toBe(null);
    expect(scene.outdoors).toBe(true);
    expect(scene.pose).toBe("walking_together");
  });

  test("lying-on-partner scene still retains horizontal cuddle", () => {
    const scene = analyzePhotoScene(
      "Alloah lying on top of Dominic cuddling on the couch.",
      "natural_iphone", "both"
    );
    expect(scene.pose).toBe("reclining_on_partner");
    expect(scene.actionNotes.join(" ")).toContain("LYING DOWN");
  });

  test("sitting on lap remains seated, not reclining", () => {
    const scene = analyzePhotoScene(
      "Alloah sitting on Dominic's lap on the sofa.",
      "natural_iphone", "both"
    );
    expect(scene.pose).not.toBe("reclining_on_partner");
    expect(scene.actionNotes.join(" ")).toContain("seated on Dominic's lap");
  });
});
