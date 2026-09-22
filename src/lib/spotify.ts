const SPOTIFY_CLIENT_ID =
  "39401033dc1a4636a9e49e37674c8967";

const SPOTIFY_REDIRECT_URI =
  "https://e90b5e86-41ae-492f-a282-0a1dd34a6e61.lovableproject.com/";

const SPOTIFY_TOKEN_KEY =
  "diario_spotify_token";

const SPOTIFY_VERIFIER_KEY =
  "diario_spotify_verifier";

const SPOTIFY_STATE_KEY =
  "diario_spotify_state";

const SPOTIFY_SCOPES = [
  "streaming",
  "user-read-private",
  "user-read-email",
  "user-read-playback-state",
  "user-read-currently-playing",
  "user-modify-playback-state",
].join(" ");

type SpotifyToken = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  expires_at: number;
};

function randomString(
  length: number
) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  const values =
    crypto.getRandomValues(
      new Uint8Array(length)
    );

  return Array.from(
    values,
    (value) =>
      characters[
        value %
          characters.length
      ]
  ).join("");
}

async function createCodeChallenge(
  verifier: string
) {
  const data =
    new TextEncoder().encode(
      verifier
    );

  const digest =
    await crypto.subtle.digest(
      "SHA-256",
      data
    );

  return btoa(
    String.fromCharCode(
      ...new Uint8Array(digest)
    )
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function saveSpotifyToken(
  token: Omit<
    SpotifyToken,
    "expires_at"
  >
) {
  const savedToken: SpotifyToken = {
    ...token,

    expires_at:
      Date.now() +
      Math.max(
        token.expires_in - 60,
        0
      ) *
        1000,
  };

  localStorage.setItem(
    SPOTIFY_TOKEN_KEY,
    JSON.stringify(savedToken)
  );

  return savedToken;
}

function readSpotifyToken():
  | SpotifyToken
  | null {
  if (
    typeof window === "undefined"
  ) {
    return null;
  }

  const raw =
    localStorage.getItem(
      SPOTIFY_TOKEN_KEY
    );

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(
      raw
    ) as SpotifyToken;
  } catch {
    localStorage.removeItem(
      SPOTIFY_TOKEN_KEY
    );

    return null;
  }
}

export function isSpotifyConnected() {
  return Boolean(
    readSpotifyToken()
  );
}

export function disconnectSpotify() {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  localStorage.removeItem(
    SPOTIFY_TOKEN_KEY
  );
}

export async function connectSpotify() {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  const verifier =
    randomString(96);

  const challenge =
    await createCodeChallenge(
      verifier
    );

  const state =
    randomString(32);

  sessionStorage.setItem(
    SPOTIFY_VERIFIER_KEY,
    verifier
  );

  sessionStorage.setItem(
    SPOTIFY_STATE_KEY,
    state
  );

  const authUrl =
    new URL(
      "https://accounts.spotify.com/authorize"
    );

  authUrl.search =
    new URLSearchParams({
      client_id:
        SPOTIFY_CLIENT_ID,

      response_type: "code",

      redirect_uri:
        SPOTIFY_REDIRECT_URI,

      scope:
        SPOTIFY_SCOPES,

      state,

      code_challenge_method:
        "S256",

      code_challenge:
        challenge,
    }).toString();

  window.location.assign(
    authUrl.toString()
  );
}

export async function finishSpotifyConnection() {
  if (
    typeof window === "undefined"
  ) {
    return false;
  }

  const url =
    new URL(
      window.location.href
    );

  const spotifyError =
    url.searchParams.get(
      "error"
    );

  if (spotifyError) {
    throw new Error(
      `Spotify authorization failed: ${spotifyError}`
    );
  }

  const code =
    url.searchParams.get(
      "code"
    );

  if (!code) {
    return false;
  }

  const returnedState =
    url.searchParams.get(
      "state"
    );

  const expectedState =
    sessionStorage.getItem(
      SPOTIFY_STATE_KEY
    );

  if (
    !returnedState ||
    !expectedState ||
    returnedState !==
      expectedState
  ) {
    throw new Error(
      "Spotify authorization state did not match."
    );
  }

  const verifier =
    sessionStorage.getItem(
      SPOTIFY_VERIFIER_KEY
    );

  if (!verifier) {
    throw new Error(
      "Spotify authorization verifier was lost."
    );
  }

  const response =
    await fetch(
      "https://accounts.spotify.com/api/token",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },

        body:
          new URLSearchParams({
            client_id:
              SPOTIFY_CLIENT_ID,

            grant_type:
              "authorization_code",

            code,

            redirect_uri:
              SPOTIFY_REDIRECT_URI,

            code_verifier:
              verifier,
          }),
      }
    );

  if (!response.ok) {
    throw new Error(
      "Spotify connection could not be completed."
    );
  }

  const token =
    (await response.json()) as Omit<
      SpotifyToken,
      "expires_at"
    >;

  saveSpotifyToken(token);

  sessionStorage.removeItem(
    SPOTIFY_VERIFIER_KEY
  );

  sessionStorage.removeItem(
    SPOTIFY_STATE_KEY
  );

  url.searchParams.delete(
    "code"
  );

  url.searchParams.delete(
    "state"
  );

  url.searchParams.delete(
    "error"
  );

  const cleanUrl =
    `${url.pathname}${
      url.search
    }${url.hash}`;

  window.history.replaceState(
    {},
    "",
    cleanUrl
  );

  return true;
}

async function refreshSpotifyToken(
  token: SpotifyToken
) {
  if (!token.refresh_token) {
    disconnectSpotify();

    return null;
  }

  const response =
    await fetch(
      "https://accounts.spotify.com/api/token",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },

        body:
          new URLSearchParams({
            client_id:
              SPOTIFY_CLIENT_ID,

            grant_type:
              "refresh_token",

            refresh_token:
              token.refresh_token,
          }),
      }
    );

  if (!response.ok) {
    disconnectSpotify();

    return null;
  }

  const refreshed =
    (await response.json()) as Omit<
      SpotifyToken,
      "expires_at"
    >;

  const saved =
    saveSpotifyToken({
      ...refreshed,

      refresh_token:
        refreshed.refresh_token ??
        token.refresh_token,
    });

  return saved;
}

export async function getSpotifyAccessToken() {
  const token =
    readSpotifyToken();

  if (!token) {
    return null;
  }

  if (
    Date.now() <
    token.expires_at
  ) {
    return token.access_token;
  }

  const refreshed =
    await refreshSpotifyToken(
      token
    );

  return (
    refreshed?.access_token ??
    null
  );
}
export type SpotifyTrack = {
  id: string;
  name: string;
  uri: string;
  externalUrl: string;
  artists: string[];
  album: string;
  coverUrl: string | null;
  durationMs: number;
};

export async function searchSpotifyTracks(
  query: string
): Promise<SpotifyTrack[]> {
  const cleanQuery = query.trim();

  if (!cleanQuery) {
    return [];
  }

  const accessToken =
    await getSpotifyAccessToken();

  if (!accessToken) {
    throw new Error(
      "Spotify is not connected."
    );
  }

  const url =
    new URL(
      "https://api.spotify.com/v1/search"
    );

  url.searchParams.set(
    "q",
    cleanQuery
  );

  url.searchParams.set(
    "type",
    "track"
  );

  url.searchParams.set(
    "limit",
    "10"
  );

  const response =
    await fetch(
      url.toString(),
      {
        headers: {
          Authorization:
            `Bearer ${accessToken}`,
        },
      }
    );

  if (!response.ok) {
    throw new Error(
      "Spotify search failed."
    );
  }

  const data =
    await response.json();

  return (
    data.tracks?.items ?? []
  ).map((track: any) => ({
    id: track.id,
    name: track.name,
    uri: track.uri,
    externalUrl:
      track.external_urls?.spotify ??
      "",
    artists:
      track.artists?.map(
        (artist: any) =>
          artist.name
      ) ?? [],
    album:
      track.album?.name ?? "",
    coverUrl:
      track.album?.images?.[0]
        ?.url ?? null,
    durationMs:
      track.duration_ms ?? 0,
  }));
}
