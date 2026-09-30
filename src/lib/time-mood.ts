import { useEffect, useMemo, useState } from "react";

export type TimeMood = "early" | "morning" | "afternoon" | "golden" | "night" | "late";

export type TimeMoodState = {
  mood: TimeMood;
  hour: number;
  minute: number;
  dayProgress: number;
  timeLabel: string;
  dateLabel: string;
  greeting: string;
  homeLine: string;
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
