import { describe, expect, test } from "bun:test";
import { buildPhotoVariationPlan, photoFramingBoundary } from "../src/lib/photo-variation-plan";

function planned(id: string, scene: string, subject_type = "both", shot_type: string | null = null, photo_style = "natural_iphone") {
  return buildPhotoVariationPlan({
    id, mode: "daily_life", scene, subject_type, shot_type, photo_style,
    mood: "everyday", context_snapshot: {}, anti_repeat_snapshot: {},
  });
}

describe("natural iPhone framing and candid scenes", () => {
  test("quiet solo living-room moments keep relaxed non-posed close framing", () => {
    const scene = "Dominic sending a relaxed at-home phone photo while doing nothing special. Context detail: chilling on the couch.";
    for (let i = 0; i < 30; i++) {
      const shot = planned("quiet-" + i, scene, "dominic", "candid", "candid");
      expect(shot.poseType).toBe("lounging_unposed");
      expect(["chest_up", "waist_up", "close_up"]).toContain(shot.framing);
      expect(shot.poseType).not.toBe("hands_busy");
      expect(shot.poseType).not.toBe("relaxed_seated");
    }
  });

  test("coffee or other explicit activity overrides generic relaxation", () => {
    const shot = planned("doing-coffee", "Dominic making coffee in the kitchen, relaxed but busy making coffee", "dominic");
    expect(shot.poseType).toBe("making_coffee_candid");
  });

  test("explicit user request for full-body solo portrait is still honored", () => {
    const shot = planned("outfit-portrait", "Dominic chilling on the couch", "dominic", "full-body");
    expect(shot.framing).toBe("full_body");
  });

  test("handheld solo selfie while lounging stays close", () => {
    const shot = planned("selfie-quiet", "Dominic taking a relaxed selfie while chilling on the couch", "dominic", "selfie", "selfie");
    expect(shot.poseType).toBe("relaxed_phone_selfie");
    expect(shot.framing).toBe("chest_up");
  });

  test("the coffee couple scene stays mid-action without whole-body shots", () => {
    const options = new Set(["chest_up", "waist_up", "three_quarter", "medium_wide"]);
    const camera = new Set([
      "from_counter_side", "casual_kitchen_doorway", "over_shoulder_at_counter",
      "handheld_side_angle", "diagonal_from_kitchen", "eye_level",
    ]);
    for (let i = 1; i <= 30; i++) {
      const plan = planned(String(i), "Alloah and Dominic making coffee together in the kitchen, candid natural iPhone photo.");
      expect(plan.poseType).toBe("making_coffee_candid");
      expect(options.has(plan.framing)).toBe(true);
      expect(camera.has(plan.cameraAngle)).toBe(true);
      expect(plan.expression).not.toBe("both_faces_clearly_visible_relaxed");
    }
  });

  test("natural and candid portraits never RANDOMLY demand shoes/full-body", () => {
    const scenes = [
      "Alloah and Dominic eating breakfast in the kitchen",
      "Dominic reading a book in the bedroom",
      "Alloah and Dominic cuddling in the living room",
      "Dominic walking outside",
    ];
    for (const style of ["natural_iphone", "candid"]) {
      for (const scene of scenes) {
        for (let i = 0; i < 30; i++) {
          const plan = planned("photo-" + i, scene,
            scene.startsWith("Dominic") ? "dominic" : "both", null, style);
          expect(plan.framing).not.toBe("full_body");
          expect(plan.framing).not.toBe("environmental_wide");
        }
      }
    }
  });

  test("ordinary couple couch photography avoids wide, full-body and shoe-centered crops", () => {
    for (let i = 0; i < 40; i++) {
      const plan = planned("couch-natural-" + i,
        "Alloah and Dominic lying together on the couch in their living room, laughing at something on his phone.");
      expect(["head_and_shoulders", "chest_up", "waist_up", "three_quarter"]).toContain(plan.framing);
      expect(plan.framing).not.toBe("medium_wide");
      expect(plan.framing).not.toBe("full_body");
    }
  });

  test("manual framing changes the actual plan, not only the camera UI", () => {
    const source = {
      id: "user-camera", mode: "request", photo_style: "natural_iphone",
      subject_type: "both", scene: "Alloah and Dominic resting on the couch",
      shot_type: null, anti_repeat_snapshot: {},
    };
    for (const value of ["close_up", "chest_up", "waist_up", "full_body"]) {
      const plan = buildPhotoVariationPlan({
        ...source, context_snapshot: { custom: { framingOverride: value } },
      });
      expect(plan.framing).toBe(value);
    }
  });

  test("explicit full-body clothing shot still wins", () => {
    expect(planned("outfit", "Us walking in the kitchen", "both", "full-body-outfit").framing)
      .toBe("full_body");
    expect(planned("feet", "Full body photo of us in the bedroom").framing)
      .toBe("full_body");
  });

  test("explicit wide establishing view still wins", () => {
    expect(planned("wide", "Wide angle view of Dominic in the living room").framing)
      .toBe("environmental_wide");
  });

  test("chosen crop has a physical boundary that excludes irrelevant outfit refs", () => {
    expect(photoFramingBoundary("close_up")).toContain("legs, waists, shoes");
    expect(photoFramingBoundary("waist_up")).toContain("ALL footwear");
    expect(photoFramingBoundary("three_quarter")).toContain("Do not show shoes");
    expect(photoFramingBoundary("full_body")).toContain("head-to-toe");
  });

  test("true selfie remains a selfie even near coffee equipment", () => {
    const result = planned("selfie", "Dominic making coffee in the kitchen taking a selfie", "dominic");
    expect(result.poseType).toBe("relaxed_phone_selfie");
    expect(result.framing).toBe("chest_up");
  });
});
