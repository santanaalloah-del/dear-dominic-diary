import { useEffect, useMemo, useState } from "react";

export type TimeMood = "early" | "morning" | "afternoon" | "golden" | "night" | "late";

export type HomeSceneAnchor =
  | "02:00"
  | "07:00"
  | "11:00"
  | "17:40"
  | "18:30"
  | "19:10"
  | "21:00";

export type HomeSceneBlend = {
  from: HomeSceneAnchor;
  to: HomeSceneAnchor;
  amount: number;
};

export type TimeMoodState = {
  mood: TimeMood;
  hour: number;
  minute: number;
  dayProgress: number;
  timeLabel: string;
  dateLabel: string;
  greeting: string;
  homeLine: string;
  homeScene: HomeSceneBlend;
  visualTheme: {
    background: string;
    surface: string;
    surfaceRaised: string;
    surfaceDeep: string;
    text: string;
    textSoft: string;
    accent: string;
    accentDeep: string;
    border: string;
    divider: string;
    grainOpacity: number;
  };
  homeLight: {
    phase: "late-night" | "morning" | "day" | "afternoon" | "golden" | "dusk" | "night";
    naturalLight: number;
    warmth: number;
    nightDepth: number;
    shadowPosition: number;
    skyProgress: number;
  };
};

const TIME_ZONE = "America/Sao_Paulo";

type HomeLightKeyframe = {
  minute: number;
  phase: TimeMoodState["homeLight"]["phase"];
  naturalLight: number;
  warmth: number;
  nightDepth: number;
  shadowPosition: number;
  skyProgress: number;
};

const HOME_LIGHT_KEYFRAMES: HomeLightKeyframe[] = [
  { minute: 120, phase: "late-night", naturalLight: 0.04, warmth: 0.08, nightDepth: 1, shadowPosition: 0.08, skyProgress: 1 },
  { minute: 420, phase: "morning", naturalLight: 0.58, warmth: 0.18, nightDepth: 0.12, shadowPosition: 0.18, skyProgress: 0.12 },
  { minute: 660, phase: "day", naturalLight: 1, warmth: 0.08, nightDepth: 0, shadowPosition: 0.42, skyProgress: 0 },
  { minute: 930, phase: "afternoon", naturalLight: 0.86, warmth: 0.22, nightDepth: 0, shadowPosition: 0.68, skyProgress: 0.08 },
  { minute: 1060, phase: "golden", naturalLight: 0.66, warmth: 0.92, nightDepth: 0.06, shadowPosition: 0.84, skyProgress: 0.28 },
  { minute: 1110, phase: "golden", naturalLight: 0.46, warmth: 1, nightDepth: 0.18, shadowPosition: 0.94, skyProgress: 0.48 },
  { minute: 1150, phase: "dusk", naturalLight: 0.22, warmth: 0.38, nightDepth: 0.55, shadowPosition: 1, skyProgress: 0.72 },
  { minute: 1260, phase: "night", naturalLight: 0.06, warmth: 0.1, nightDepth: 0.92, shadowPosition: 1, skyProgress: 0.94 },
  { minute: 1560, phase: "late-night", naturalLight: 0.04, warmth: 0.08, nightDepth: 1, shadowPosition: 0.08, skyProgress: 1 },
];

function mix(a: number, b: number, amount: number) {
  return a + (b - a) * amount;
}

type Rgb = [number, number, number];

type VisualThemeKeyframe = {
  minute: number;
  background: Rgb;
  surface: Rgb;
  surfaceRaised: Rgb;
  surfaceDeep: Rgb;
  text: Rgb;
  textSoft: Rgb;
  accent: Rgb;
  accentDeep: Rgb;
  border: Rgb;
  divider: Rgb;
  grainOpacity: number;
};

// Pinterest direction: paper/blush by day → dusty rose/wine → rich wood at night.
// The final 26:00 keyframe lets midnight flow naturally back toward the 02:00 palette.
const VISUAL_THEME_KEYFRAMES: VisualThemeKeyframe[] = [
  { minute: 120, background: [42, 27, 27], surface: [52, 34, 33], surfaceRaised: [62, 40, 38], surfaceDeep: [73, 45, 42], text: [248, 237, 222], textSoft: [211, 187, 171], accent: [203, 116, 127], accentDeep: [125, 38, 45], border: [137, 92, 84], divider: [112, 72, 68], grainOpacity: .16 },
  { minute: 420, background: [249, 240, 224], surface: [247, 235, 217], surfaceRaised: [252, 244, 231], surfaceDeep: [234, 215, 193], text: [78, 51, 45], textSoft: [122, 87, 78], accent: [185, 93, 104], accentDeep: [111, 31, 37], border: [184, 143, 128], divider: [198, 164, 150], grainOpacity: .10 },
  { minute: 660, background: [251, 239, 226], surface: [248, 232, 217], surfaceRaised: [253, 244, 232], surfaceDeep: [237, 207, 198], text: [75, 47, 43], textSoft: [125, 82, 78], accent: [195, 100, 115], accentDeep: [122, 31, 42], border: [190, 139, 136], divider: [207, 169, 164], grainOpacity: .09 },
  { minute: 930, background: [246, 218, 213], surface: [241, 207, 203], surfaceRaised: [250, 229, 219], surfaceDeep: [221, 173, 171], text: [82, 43, 43], textSoft: [126, 71, 73], accent: [177, 73, 88], accentDeep: [111, 25, 34], border: [169, 104, 106], divider: [190, 133, 134], grainOpacity: .11 },
  { minute: 1060, background: [207, 139, 140], surface: [193, 116, 121], surfaceRaised: [226, 169, 165], surfaceDeep: [160, 82, 88], text: [255, 244, 228], textSoft: [244, 214, 199], accent: [255, 205, 203], accentDeep: [103, 22, 31], border: [235, 185, 176], divider: [218, 160, 157], grainOpacity: .13 },
  { minute: 1110, background: [143, 55, 62], surface: [126, 43, 50], surfaceRaised: [159, 68, 73], surfaceDeep: [99, 31, 37], text: [255, 242, 224], textSoft: [237, 199, 184], accent: [241, 159, 166], accentDeep: [74, 19, 25], border: [206, 132, 132], divider: [179, 103, 108], grainOpacity: .14 },
  { minute: 1150, background: [104, 37, 42], surface: [88, 31, 35], surfaceRaised: [119, 47, 51], surfaceDeep: [70, 26, 29], text: [250, 239, 222], textSoft: [224, 195, 179], accent: [224, 132, 143], accentDeep: [62, 18, 22], border: [178, 111, 111], divider: [145, 81, 84], grainOpacity: .15 },
  { minute: 1260, background: [54, 31, 30], surface: [62, 35, 33], surfaceRaised: [73, 41, 38], surfaceDeep: [45, 27, 26], text: [247, 237, 221], textSoft: [207, 184, 168], accent: [202, 111, 123], accentDeep: [92, 28, 34], border: [133, 88, 82], divider: [108, 68, 65], grainOpacity: .16 },
  { minute: 1560, background: [42, 27, 27], surface: [52, 34, 33], surfaceRaised: [62, 40, 38], surfaceDeep: [73, 45, 42], text: [248, 237, 222], textSoft: [211, 187, 171], accent: [203, 116, 127], accentDeep: [125, 38, 45], border: [137, 92, 84], divider: [112, 72, 68], grainOpacity: .16 },
];

function rgb([r, g, b]: Rgb) {
  return `rgb(${Math.round(r)} ${Math.round(g)} ${Math.round(b)})`;
}

function mixRgb(a: Rgb, b: Rgb, amount: number): Rgb {
  return [mix(a[0], b[0], amount), mix(a[1], b[1], amount), mix(a[2], b[2], amount)];
}

function getVisualTheme(totalMinutes: number): TimeMoodState["visualTheme"] {
  const minute = totalMinutes < 120 ? totalMinutes + 1440 : totalMinutes;
  let left = VISUAL_THEME_KEYFRAMES[0];
  let right = VISUAL_THEME_KEYFRAMES[1];

  for (let index = 0; index < VISUAL_THEME_KEYFRAMES.length - 1; index += 1) {
    const current = VISUAL_THEME_KEYFRAMES[index];
    const next = VISUAL_THEME_KEYFRAMES[index + 1];
    if (minute >= current.minute && minute <= next.minute) {
      left = current;
      right = next;
      break;
    }
  }

  const span = Math.max(1, right.minute - left.minute);
  const amount = smoothstep((minute - left.minute) / span);
  return {
    background: rgb(mixRgb(left.background, right.background, amount)),
    surface: rgb(mixRgb(left.surface, right.surface, amount)),
    surfaceRaised: rgb(mixRgb(left.surfaceRaised, right.surfaceRaised, amount)),
    surfaceDeep: rgb(mixRgb(left.surfaceDeep, right.surfaceDeep, amount)),
    text: rgb(mixRgb(left.text, right.text, amount)),
    textSoft: rgb(mixRgb(left.textSoft, right.textSoft, amount)),
    accent: rgb(mixRgb(left.accent, right.accent, amount)),
    accentDeep: rgb(mixRgb(left.accentDeep, right.accentDeep, amount)),
    border: rgb(mixRgb(left.border, right.border, amount)),
    divider: rgb(mixRgb(left.divider, right.divider, amount)),
    grainOpacity: mix(left.grainOpacity, right.grainOpacity, amount),
  };
}

type HomeSceneKeyframe = {
  minute: number;
  anchor: HomeSceneAnchor;
};

const HOME_SCENE_KEYFRAMES: HomeSceneKeyframe[] = [
  { minute: 120, anchor: "02:00" },
  { minute: 420, anchor: "07:00" },
  { minute: 660, anchor: "11:00" },
  { minute: 1060, anchor: "17:40" },
  { minute: 1110, anchor: "18:30" },
  { minute: 1150, anchor: "19:10" },
  { minute: 1260, anchor: "21:00" },
  { minute: 1560, anchor: "02:00" },
];

function smoothstep(value: number) {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
}

function getHomeSceneBlend(totalMinutes: number): HomeSceneBlend {
  // 00:00–01:59 belongs to the previous evening → 02:00 transition.
  const minute = totalMinutes < 120 ? totalMinutes + 1440 : totalMinutes;
  let left = HOME_SCENE_KEYFRAMES[0];
  let right = HOME_SCENE_KEYFRAMES[1];

  for (let index = 0; index < HOME_SCENE_KEYFRAMES.length - 1; index += 1) {
    const current = HOME_SCENE_KEYFRAMES[index];
    const next = HOME_SCENE_KEYFRAMES[index + 1];
    if (minute >= current.minute && minute <= next.minute) {
      left = current;
      right = next;
      break;
    }
  }

  const span = Math.max(1, right.minute - left.minute);
  const linear = (minute - left.minute) / span;

  return {
    from: left.anchor,
    to: right.anchor,
    amount: smoothstep(linear),
  };
}

function getHomeLight(totalMinutes: number): TimeMoodState["homeLight"] {
  const minute = totalMinutes < 120 ? totalMinutes + 1440 : totalMinutes;
  let left = HOME_LIGHT_KEYFRAMES[0];
  let right = HOME_LIGHT_KEYFRAMES[1];

  for (let index = 0; index < HOME_LIGHT_KEYFRAMES.length - 1; index += 1) {
    const current = HOME_LIGHT_KEYFRAMES[index];
    const next = HOME_LIGHT_KEYFRAMES[index + 1];
    if (minute >= current.minute && minute <= next.minute) {
      left = current;
      right = next;
      break;
    }
  }

  const span = Math.max(1, right.minute - left.minute);
  const amount = Math.min(1, Math.max(0, (minute - left.minute) / span));

  return {
    phase: amount < 0.5 ? left.phase : right.phase,
    naturalLight: mix(left.naturalLight, right.naturalLight, amount),
    warmth: mix(left.warmth, right.warmth, amount),
    nightDepth: mix(left.nightDepth, right.nightDepth, amount),
    shadowPosition: mix(left.shadowPosition, right.shadowPosition, amount),
    skyProgress: mix(left.skyProgress, right.skyProgress, amount),
  };
}


function partsFor(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  return { hour, minute };
}

export function getTimeMood(date = new Date()): TimeMoodState {
  const { hour, minute } = partsFor(date);
  
  const totalMinutes = hour * 60 + minute;
const dayProgress = totalMinutes / (24 * 60);
  const homeLight = getHomeLight(totalMinutes);
  const homeScene = getHomeSceneBlend(totalMinutes);
  const visualTheme = getVisualTheme(totalMinutes);

  let mood: TimeMood;
  if (hour >= 4 && hour < 8) mood = "early";
  else if (hour >= 8 && hour < 13) mood = "morning";
  else if (hour >= 13 && hour < 17) mood = "afternoon";
  else if (hour >= 17 && hour < 19) mood = "golden";
  else if (hour >= 19 || hour < 1) mood = "night";
  else mood = "late";

  const copy: Record<TimeMood, Pick<TimeMoodState, "greeting" | "homeLine">> = {
    early: {
      greeting: "good morning, Alloah.",
      homeLine: "a new day. same place. different light.",
    },
    morning: {
      greeting: "good morning, Alloah.",
      homeLine: "the day is here. the apartment is waking up with you.",
    },
    afternoon: {
      greeting: "good afternoon, Alloah.",
      homeLine: "same place. new energy.",
    },
    golden: {
      greeting: "golden hour.",
      homeLine: "everything looks softer with you here.",
    },
    night: {
      greeting: "good evening, Alloah.",
      homeLine: "the city slows down. so do we.",
    },
    late: {
      greeting: "still here.",
      homeLine: "just us, and a quieter world.",
    },
  };

return {
  mood,
  hour,
  minute,
  dayProgress,
  homeScene,
  visualTheme,
  homeLight,
  timeLabel: new Intl.DateTimeFormat("en-US", {
      timeZone: TIME_ZONE,
      hour: "numeric",
      minute: "2-digit",
    }).format(date),
    dateLabel: new Intl.DateTimeFormat("en-US", {
      timeZone: TIME_ZONE,
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(date),
    ...copy[mood],
  };
}

export function useTimeMood() {
  const [tick, setTick] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setTick(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  return useMemo(() => getTimeMood(new Date(tick)), [tick]);
}
