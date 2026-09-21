import { useEffect, useMemo, useState } from "react";

export type TimeMood = "early" | "morning" | "afternoon" | "golden" | "night" | "late";

export type TimeMoodState = {
  mood: TimeMood;
  hour: number;
  minute: number;
  timeLabel: string;
  dateLabel: string;
  greeting: string;
  homeLine: string;
};

const TIME_ZONE = "America/Sao_Paulo";

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
