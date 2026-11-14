import { supabase } from "@/integrations/supabase/client";

type SignedUrlResult = {
  data: { signedUrl: string } | null;
  error: Error | null;
};

type CachedUrl = { url: string; validUntil: number };

const signedUrlCache = new Map<string, CachedUrl>();
const pendingRequests = new Map<string, Promise<SignedUrlResult>>();
const SESSION_CACHE_PREFIX = "diario:signed-url:v1:";

const cacheKey = (bucket: string, path: string) => `${bucket}:${path}`;

function readSessionCache(key: string, now: number): CachedUrl | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(SESSION_CACHE_PREFIX + key);
    if (!raw) return null;

    const cached = JSON.parse(raw) as CachedUrl;
    if (
      typeof cached.url !== "string" ||
      typeof cached.validUntil !== "number" ||
      cached.validUntil <= now + 30_000
    ) {
      window.sessionStorage.removeItem(SESSION_CACHE_PREFIX + key);
      return null;
    }

    return cached;
  } catch {
    return null;
  }
}

function writeSessionCache(key: string, cached: CachedUrl) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(
      SESSION_CACHE_PREFIX + key,
      JSON.stringify(cached),
    );
  } catch {
    // Session storage can be unavailable or full; the in-memory cache still works.
  }
}

export async function getCachedSignedUrl(
  bucket: string,
  path: string,
  expiresInSeconds = 60 * 60
): Promise<SignedUrlResult> {
  const key = cacheKey(bucket, path);
  const now = Date.now();
  const cached = signedUrlCache.get(key);

  if (cached && cached.validUntil > now + 30_000) {
    return { data: { signedUrl: cached.url }, error: null };
  }

  const persisted = readSessionCache(key, now);
  if (persisted) {
    signedUrlCache.set(key, persisted);
    return { data: { signedUrl: persisted.url }, error: null };
  }

  const pending = pendingRequests.get(key);
  if (pending) return pending;

  const request = (async (): Promise<SignedUrlResult> => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresInSeconds);

    if (error || !data?.signedUrl) {
      return { data: null, error: error ?? new Error("Could not create a signed media URL.") };
    }

    const safetyMargin = Math.min(5 * 60, Math.max(30, expiresInSeconds * 0.1));
    const entry = {
      url: data.signedUrl,
      validUntil: Date.now() + Math.max(1, expiresInSeconds - safetyMargin) * 1000,
    };

    signedUrlCache.set(key, entry);
    writeSessionCache(key, entry);

    return { data: { signedUrl: data.signedUrl }, error: null };
  })();

  pendingRequests.set(key, request);
  try {
    return await request;
  } finally {
    pendingRequests.delete(key);
  }
}

export function clearCachedSignedUrl(bucket: string, path: string) {
  const key = cacheKey(bucket, path);
  signedUrlCache.delete(key);

  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.removeItem(SESSION_CACHE_PREFIX + key);
    } catch {
      // Ignore unavailable session storage.
    }
  }
}
