import { AppError } from "@labs/core";

/**
 * Enforces a Cloudflare Rate Limiting binding using a stable actor/resource key.
 * Counters are abuse controls and must not be used for billing or accounting.
 */
export async function enforceRateLimit(binding: RateLimit, key: string): Promise<void> {
  const outcome = await binding.limit({ key });
  if (!outcome.success) {
    throw new AppError({
      code: "RATE_LIMITED",
      message: "Too many requests; try again later",
      status: 429,
    });
  }
}

/** Chooses a stable client ID where available and a coarse network fallback otherwise. */
export function publicRateLimitKey(request: Request, resource: string): string {
  const clientId = request.headers.get("x-client-id")?.slice(0, 128);
  const networkFallback = request.headers.get("cf-connecting-ip")?.slice(0, 64) ?? "unknown";
  return `${resource}:${clientId ?? networkFallback}`;
}
