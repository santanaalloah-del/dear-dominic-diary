import { supabase } from "@/integrations/supabase/client";

type SignedUrlResult = {
  data: { signedUrl: string } | null;
  error: Error | null;
};

const signedUrlCache = new Map<string, { url: string; validUntil: number }>();
const pendingRequests = new Map<string, Promise<SignedUrlResult>>();

const cacheKey = (bucket: string, path: string) => `${bucket}:${path}`;

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

  const pending = pendingRequests.get(key);
  if (pending) return pending;

  const request = (async (): Promise<SignedUrlResult> => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresInSeconds);

    if (error || !data?.signedUrl) {
      return { data: null, error: error ?? new Error("Could not create a signed media URL.") };
    }

    // Reuse the same signed URL across screens for most of its lifetime.
    const safetyMargin = Math.min(5 * 60, Math.max(30, expiresInSeconds * 0.1));
    signedUrlCache.set(key, {
      url: data.signedUrl,
      validUntil: Date.now() + Math.max(1, expiresInSeconds - safetyMargin) * 1000,
    });

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
  signedUrlCache.delete(cacheKey(bucket, path));
}
