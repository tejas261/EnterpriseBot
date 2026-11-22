import { ApiError } from "./api";

interface Bucket {
  count: number;
  resetAt: number;
}

const globalForRateLimit = globalThis as unknown as { iplRateLimits?: Map<string, Bucket> };
const buckets = (globalForRateLimit.iplRateLimits ??= new Map());

/**
 * Fixed-window rate limit, per process. Single-instance realtime/web deployment only;
 * a shared store (Redis) is required once the web tier scales horizontally.
 */
export function rateLimit(request: Request, scope: string, limit: number, windowMs: number): void {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "local";
  const key = `${scope}:${ip}`;
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) {
      for (const [candidate, value] of buckets) {
        if (value.resetAt <= now) buckets.delete(candidate);
      }
    }
    return;
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    throw new ApiError(429, "RATE_LIMITED", "Too many requests. Try again shortly.");
  }
}
