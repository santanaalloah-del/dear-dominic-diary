import { getSpotifyAccessToken } from "@/lib/spotify";

type SpotifySdkTrack = {
  id: string;
  name: string;
  uri: string;
  duration_ms: number;
  album?: {
    name?: string;
    images?: { url: string }[];
  };
  artists?: { name: string }[];
};

type SpotifySdkState = {
  paused: boolean;
  position: number;
  duration: number;
  track_window: {
    current_track: SpotifySdkTrack;
  };
};

type SpotifySdkPlayer = {
  addListener: (
    event:
      | "ready"
      | "not_ready"
      | "player_state_changed"
      | "initialization_error"
      | "authentication_error"
      | "account_error"
      | "playback_error",
    callback: (payload: any) => void
  ) => void;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  togglePlay: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  nextTrack: () => Promise<void>;
  previousTrack: () => Promise<void>;
  seek: (positionMs: number) => Promise<void>;
};

declare global {
  interface Window {
    Spotify?: {
      Player: new (options: {
        name: string;
        getOAuthToken: (callback: (token: string) => void) => void;
        volume?: number;
      }) => SpotifySdkPlayer;
    };
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

export type DiarioSpotifyTrack = {
  id: string;
  name: string;
  uri: string;
  artist: string;
  album: string;
  coverUrl: string | null;
  durationMs: number;
};

export type DiarioSpotifyState = {
  deviceId: string | null;
  connected: boolean;
  paused: boolean;
  positionMs: number;
  durationMs: number;
  track: DiarioSpotifyTrack | null;
  error: string | null;
};

let sdkPromise: Promise<void> | null = null;
let player: SpotifySdkPlayer | null = null;
let deviceId: string | null = null;

let latestState: DiarioSpotifyState = {
  deviceId: null,
  connected: false,
  paused: true,
  positionMs: 0,
  durationMs: 0,
  track: null,
  error: null,
};

const listeners = new Set<(state: DiarioSpotifyState) => void>();

const emitState = (nextState: Partial<DiarioSpotifyState>) => {
  latestState = {
    ...latestState,
    ...nextState,
  };

  listeners.forEach((listener) => listener(latestState));
};

const mapTrack = (
  track?: SpotifySdkTrack | null
): DiarioSpotifyTrack | null => {
  if (!track) return null;

  return {
    id: track.id,
    name: track.name,
    uri: track.uri,
    artist:
      track.artists
        ?.map((artist) => artist.name)
        .join(", ") ?? "Unknown artist",
    album: track.album?.name ?? "",
    coverUrl: track.album?.images?.[0]?.url ?? null,
    durationMs: track.duration_ms ?? 0,
  };
};

export const subscribeSpotifyPlayer = (
  listener: (state: DiarioSpotifyState) => void
) => {
  listeners.add(listener);
  listener(latestState);

  return () => {
    listeners.delete(listener);
  };
};

export const getLatestSpotifyPlayerState = () => latestState;

const loadSpotifySdk = () => {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("Spotify player can only run in the browser.")
    );
  }

  if (window.Spotify) {
    return Promise.resolve();
  }

  if (sdkPromise) {
    return sdkPromise;
  }

  sdkPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://sdk.scdn.co/spotify-player.js"]'
    );

    window.onSpotifyWebPlaybackSDKReady = () => {
      resolve();
    };

    if (existingScript) {
      return;
    }

    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;

    script.onerror = () => {
      reject(new Error("Spotify Web Playback SDK could not be loaded."));
    };

    document.body.appendChild(script);
  });

  return sdkPromise;
};

export const initializeSpotifyPlayer = async () => {
  if (player && deviceId) {
    return {
      player,
      deviceId,
    };
  }

  await loadSpotifySdk();

  if (!window.Spotify) {
    throw new Error("Spotify SDK is not available.");
  }

  player = new window.Spotify.Player({
    name: "Diário Player",
    volume: 0.72,
    getOAuthToken: async (callback) => {
      const token = await getSpotifyAccessToken();

      if (token) {
        callback(token);
      }
    },
  });

  player.addListener("ready", ({ device_id }) => {
    deviceId = device_id;

    emitState({
      deviceId: device_id,
      connected: true,
      error: null,
    });
  });

  player.addListener("not_ready", () => {
    emitState({
      connected: false,
    });
  });

  player.addListener("player_state_changed", (state: SpotifySdkState | null) => {
    if (!state) return;

    emitState({
      paused: state.paused,
      positionMs: state.position,
      durationMs: state.duration,
      track: mapTrack(state.track_window.current_track),
      error: null,
    });
  });

  player.addListener("initialization_error", ({ message }) => {
    emitState({ error: message });
  });

  player.addListener("authentication_error", ({ message }) => {
    emitState({ error: message });
  });

  player.addListener("account_error", ({ message }) => {
    emitState({ error: message });
  });

  player.addListener("playback_error", ({ message }) => {
    emitState({ error: message });
  });

  const connected = await player.connect();

  if (!connected) {
    throw new Error("Spotify player could not connect.");
  }

  return new Promise<{
    player: SpotifySdkPlayer;
    deviceId: string;
  }>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error("Spotify player device was not ready yet."));
    }, 8000);

    const unsubscribe = subscribeSpotifyPlayer((state) => {
      if (!state.deviceId || !player) return;

      window.clearTimeout(timeout);
      unsubscribe();

      resolve({
        player,
        deviceId: state.deviceId,
      });
    });
  });
};

const spotifyFetch = async (
  endpoint: string,
  options: RequestInit = {}
) => {
  const token = await getSpotifyAccessToken();

  if (!token) {
    throw new Error("Spotify is not connected.");
  }

  const response = await fetch(
    `https://api.spotify.com/v1${endpoint}`,
    {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    }
  );

  if (response.status === 204) {
    return null;
  }

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      `Spotify request failed (${response.status}): ${body}`
    );
  }

  return response.json();
};

export const transferSpotifyPlaybackToDiario = async (
  shouldPlay = false
) => {
  const { deviceId } = await initializeSpotifyPlayer();

  await spotifyFetch("/me/player", {
    method: "PUT",
    body: JSON.stringify({
      device_ids: [deviceId],
      play: shouldPlay,
    }),
  });

  return deviceId;
};

export const playSpotifyUri = async (uri: string) => {
  const deviceId = await transferSpotifyPlaybackToDiario(true);

  await spotifyFetch(
    `/me/player/play?device_id=${encodeURIComponent(deviceId)}`,
    {
      method: "PUT",
      body: JSON.stringify({
        uris: [uri],
      }),
    }
  );
};

export const toggleSpotifyPlayback = async () => {
  const { player } = await initializeSpotifyPlayer();

  await player.togglePlay();
};

export const pauseSpotifyPlayback = async () => {
  const { player } = await initializeSpotifyPlayer();

  await player.pause();
};

export const resumeSpotifyPlayback = async () => {
  const { player } = await initializeSpotifyPlayer();

  await player.resume();
};

export const nextSpotifyTrack = async () => {
  const { player } = await initializeSpotifyPlayer();

  await player.nextTrack();
};

export const previousSpotifyTrack = async () => {
  const { player } = await initializeSpotifyPlayer();

  await player.previousTrack();
};

export const seekSpotifyPlayback = async (positionMs: number) => {
  const { player } = await initializeSpotifyPlayer();

  await player.seek(positionMs);
};

export const addSpotifyUriToQueue = async (uri: string) => {
  const { deviceId } = await initializeSpotifyPlayer();

  await spotifyFetch(
    `/me/player/queue?uri=${encodeURIComponent(uri)}&device_id=${encodeURIComponent(deviceId)}`,
    {
      method: "POST",
    }
  );
};

export const getSpotifyQueue = async () => {
  const data = await spotifyFetch("/me/player/queue");

  return {
    currentlyPlaying: mapTrack(data?.currently_playing),
    queue:
      data?.queue
        ?.map((item: SpotifySdkTrack) => mapTrack(item))
        .filter(Boolean) ?? [],
  };
};
