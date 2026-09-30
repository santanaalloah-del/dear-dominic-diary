import { useEffect } from "react";

const SHELL_STATE_KEY = "diario-app-shell-state-v1";
const SHELL_STATE_MAX_AGE = 24 * 60 * 60 * 1000;

type StoredShellState = {
  screen: string;
  scrollTop: number;
  savedAt: number;
};

const PRIMARY_SCREEN_LABELS: Record<string, string> = {
  home: "Home",
  chat: "Chat",
  music: "Player",
  diary: "Diary",
  more: "More",
};

const MORE_SCREEN_LABELS: Record<string, string> = {
  memories: "Memories",
  gallery: "Gallery",
  "photo-engine": "Photo Engine",
  references: "References",
  letters: "Letters",
  calendar: "Calendar",
  timeline: "Timeline",
  dates: "Dates",
  places: "Places",
  keepsakes: "Keepsakes",
  wardrobe: "Wardrobe",
  night: "Morning / Night",
  settings: "Settings",
};

function currentScreenElement() {
  return document.querySelector<HTMLElement>(
    ".phone-shell .screen-scroll"
  );
}

function currentScreenName() {
  const element = currentScreenElement();

  if (!element) {
    return null;
  }

  const className = Array.from(element.classList).find(
    (value) =>
      value.startsWith("screen-") &&
      value !== "screen-scroll"
  );

  return className
    ? className.slice("screen-".length)
    : null;
}

function readStoredState(): StoredShellState | null {
  try {
    const raw = window.localStorage.getItem(
      SHELL_STATE_KEY
    );

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<StoredShellState>;

    if (
      typeof parsed.screen !== "string" ||
      typeof parsed.scrollTop !== "number" ||
      typeof parsed.savedAt !== "number" ||
      Date.now() - parsed.savedAt > SHELL_STATE_MAX_AGE
    ) {
      return null;
    }

    return parsed as StoredShellState;
  } catch {
    return null;
  }
}

function persistCurrentShell() {
  const screen = currentScreenName();
  const element = currentScreenElement();

  if (!screen || !element) {
    return;
  }

  const state: StoredShellState = {
    screen,
    scrollTop: element.scrollTop,
    savedAt: Date.now(),
  };

  try {
    window.localStorage.setItem(
      SHELL_STATE_KEY,
      JSON.stringify(state)
    );
  } catch {
    // Navigation must keep working even if browser storage is unavailable.
  }
}

function clickButtonByLabel(
  selector: string,
  label: string
) {
  const normalizedLabel = label
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  const button = Array.from(
    document.querySelectorAll<HTMLButtonElement>(selector)
  ).find((candidate) =>
    (candidate.textContent ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase()
      .includes(normalizedLabel)
  );

  button?.click();
  return Boolean(button);
}

function restoreScroll(scrollTop: number) {
  window.setTimeout(() => {
    const element = currentScreenElement();

    if (element) {
      element.scrollTop = Math.max(0, scrollTop);
    }
  }, 180);
}

export function clearAppShellContinuity() {
  try {
    window.localStorage.removeItem(
      SHELL_STATE_KEY
    );
  } catch {
    // Ignore storage failures during sign out.
  }
}

export function AppShellContinuity() {
  useEffect(() => {
    let restoring = true;
    let restoreTimer: number | undefined;
    let scrollTimer: number | undefined;

    const syncBackOwnership = () => {
      const shell = document.querySelector<HTMLElement>(
        ".phone-shell"
      );

      if (!shell) {
        return;
      }

      const globalBack = shell.querySelector<HTMLButtonElement>(
        ":scope > .back-button"
      );

      if (!globalBack) {
        return;
      }

      const localBack = shell.querySelector(
        ".screen-scroll .connected-object-back"
      );

      const localOwnsBack = Boolean(localBack);

      globalBack.hidden = localOwnsBack;
      globalBack.setAttribute(
        "aria-hidden",
        localOwnsBack ? "true" : "false"
      );
    };

    const syncShell = () => {
      syncBackOwnership();

      if (!restoring) {
        persistCurrentShell();
      }
    };

    const restore = () => {
      const stored = readStoredState();

      if (!stored || stored.screen === "home") {
        restoring = false;
        syncShell();
        return;
      }

      const primaryLabel =
        PRIMARY_SCREEN_LABELS[stored.screen];

      if (primaryLabel) {
        clickButtonByLabel(
          ".bottom-nav button",
          primaryLabel
        );

        restoreScroll(stored.scrollTop);
        restoring = false;
        return;
      }

      const moreLabel =
        MORE_SCREEN_LABELS[stored.screen];

      if (!moreLabel) {
        restoring = false;
        return;
      }

      clickButtonByLabel(
        ".bottom-nav button",
        "More"
      );

      restoreTimer = window.setTimeout(() => {
        clickButtonByLabel(
          ".screen-more button",
          moreLabel
        );

        restoreScroll(stored.scrollTop);
        restoring = false;
      }, 90);
    };

    const observer = new MutationObserver(
      syncShell
    );

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class"],
    });

    const handleScroll = () => {
      if (restoring) {
        return;
      }

      if (scrollTimer) {
        window.clearTimeout(scrollTimer);
      }

      scrollTimer = window.setTimeout(
        persistCurrentShell,
        120
      );
    };

    document.addEventListener(
      "scroll",
      handleScroll,
      true
    );

    const handlePageHide = () => {
      persistCurrentShell();
    };

    window.addEventListener(
      "pagehide",
      handlePageHide
    );

    window.addEventListener(
      "beforeunload",
      handlePageHide
    );

    window.requestAnimationFrame(restore);

    return () => {
      observer.disconnect();

      document.removeEventListener(
        "scroll",
        handleScroll,
        true
      );

      window.removeEventListener(
        "pagehide",
        handlePageHide
      );

      window.removeEventListener(
        "beforeunload",
        handlePageHide
      );

      if (restoreTimer) {
        window.clearTimeout(restoreTimer);
      }

      if (scrollTimer) {
        window.clearTimeout(scrollTimer);
      }
    };
  }, []);

  return null;
}
