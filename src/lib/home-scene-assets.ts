import living07 from "@/assets/home-living-0700.png";
import living11 from "@/assets/home-living-1100.jpeg";
import living1740 from "@/assets/home-living-1740.png";
import living1830 from "@/assets/home-living-1830.png";
import living1910 from "@/assets/home-living-1910.png";
import living21 from "@/assets/home-living-2100.png";
import living02 from "@/assets/home-living-0200.png";

import bedroom07 from "@/assets/home-bedroom-0700.png";
import bedroom11 from "@/assets/home-bedroom-1100.png";
import bedroom1740 from "@/assets/home-bedroom-1740.png";
import bedroom1830 from "@/assets/home-bedroom-1830.png";
import bedroom1910 from "@/assets/home-bedroom-1910.png";
import bedroom21 from "@/assets/home-bedroom-2100.png";
import bedroom02 from "@/assets/home-bedroom-0200.png";

import kitchen07 from "@/assets/home-kitchen-0700.jpeg";
import kitchen11 from "@/assets/home-kitchen-1100.jpeg";
import kitchen1740 from "@/assets/home-kitchen-1740.jpeg";
import kitchen1830 from "@/assets/home-kitchen-1830.jpeg";
import kitchen1910 from "@/assets/home-kitchen-1910.jpeg";
import kitchen21 from "@/assets/home-kitchen-2100.jpeg";
import kitchen02 from "@/assets/home-kitchen-0200.jpeg";

import bathroom07 from "@/assets/home-bathroom-0700.jpeg";
import bathroom11 from "@/assets/home-bathroom-1100.jpeg";
import bathroom1740 from "@/assets/home-bathroom-1740.jpeg";
import bathroom1830 from "@/assets/home-bathroom-1830.jpeg";
import bathroom1910 from "@/assets/home-bathroom-1910.jpeg";
import bathroom21 from "@/assets/home-bathroom-2100.jpeg";
import bathroom02 from "@/assets/home-bathroom-0200.jpeg";

import type { HomeSceneAnchor } from "@/lib/time-mood";

export type HomeSceneRoomId = "living" | "bedroom" | "kitchen" | "bathroom";
export type HomeSceneSet = Record<HomeSceneAnchor, string>;

export const HOME_SCENE_ASSETS: Record<HomeSceneRoomId, HomeSceneSet> = {
  living: {
    "02:00": living02,
    "07:00": living07,
    "11:00": living11,
    "17:40": living1740,
    "18:30": living1830,
    "19:10": living1910,
    "21:00": living21,
  },
  bedroom: {
    "02:00": bedroom02,
    "07:00": bedroom07,
    "11:00": bedroom11,
    "17:40": bedroom1740,
    "18:30": bedroom1830,
    "19:10": bedroom1910,
    "21:00": bedroom21,
  },
  kitchen: {
    "02:00": kitchen02,
    "07:00": kitchen07,
    "11:00": kitchen11,
    "17:40": kitchen1740,
    "18:30": kitchen1830,
    "19:10": kitchen1910,
    "21:00": kitchen21,
  },
  bathroom: {
    "02:00": bathroom02,
    "07:00": bathroom07,
    "11:00": bathroom11,
    "17:40": bathroom1740,
    "18:30": bathroom1830,
    "19:10": bathroom1910,
    "21:00": bathroom21,
  },
};

export function hasHomeSceneTimeline(roomId: string): roomId is HomeSceneRoomId {
  return roomId in HOME_SCENE_ASSETS;
}
