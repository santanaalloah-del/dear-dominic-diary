import { describe, expect, test } from "bun:test";
import { shouldDominicConsiderOutfitChange } from "../src/lib/dominic-wardrobe-autonomy";

const when = (iso: string) => new Date(iso);
const awakeHome = { activity: "relaxing" as const, location: "living" as const };

describe("Dominic's ordinary once-a-day wardrobe autonomy", () => {
  test("picks an outfit when first seen awake at home without a recorded dressing event", () => {
    expect(shouldDominicConsiderOutfitChange({state:awakeHome,lastChangeAt:null,now:when("2026-10-09T15:00:00Z")})).toBe(true);
  });
  test("never churns wardrobe multiple times in one Rio day, even for explicit dressing", () => {
    expect(shouldDominicConsiderOutfitChange({state:awakeHome,lastChangeAt:"2026-10-09T13:10:00Z",now:when("2026-10-09T17:00:00Z")})).toBe(false);
    expect(shouldDominicConsiderOutfitChange({state:{activity:"getting_ready",location:"bedroom"},lastChangeAt:"2026-10-09T13:10:00Z",now:when("2026-10-09T17:00:00Z")})).toBe(false);
  });
  test("doesn't change in sleep, shower, work, outings or the middle of the night", () => {
    for(const activity of ["sleeping","napping","showering","driving","working","recording","performing"] as const){
      expect(shouldDominicConsiderOutfitChange({state:{activity,location:"living"},lastChangeAt:null,now:when("2026-10-09T15:00:00Z")})).toBe(false);
    }
    expect(shouldDominicConsiderOutfitChange({state:{activity:"relaxing",location:"out"},lastChangeAt:null,now:when("2026-10-09T15:00:00Z")})).toBe(false);
    expect(shouldDominicConsiderOutfitChange({state:awakeHome,lastChangeAt:null,now:when("2026-10-09T05:00:00Z")})).toBe(false);
  });
  test("permits a new day only, not a random activity transition", () => {
    expect(shouldDominicConsiderOutfitChange({state:awakeHome,lastChangeAt:"2026-10-08T14:00:00Z",now:when("2026-10-09T14:10:00Z")})).toBe(true);
  });
});
