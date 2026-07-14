import { AppError, dependencyUnavailable } from "@labs/core";

import type { AbuseProtectionService } from "./contracts";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

interface TurnstileVerificationResponse {
  action?: unknown;
  hostname?: unknown;
  success?: unknown;
}

interface TurnstileServiceDependencies {
  allowedHostnames: readonly string[];
  fetcher?: typeof fetch;
  secretKey: string;
}

/** Creates the public-safe error returned when a challenge cannot be trusted. */
function verificationFailed(): AppError {
  return new AppError({
    code: "TURNSTILE_VERIFICATION_FAILED",
    message: "Please complete the security check and try again",
    status: 403,
  });
}

/** Parses an untrusted Siteverify body without exposing provider error details. */
async function verificationBody(response: Response): Promise<TurnstileVerificationResponse> {
  try {
    const body: unknown = await response.json();
    return typeof body === "object" && body !== null ? (body as TurnstileVerificationResponse) : {};
  } catch (error) {
    throw new AppError({
      code: "DEPENDENCY_UNAVAILABLE",
      message: "Turnstile verification is temporarily unavailable",
      status: 503,
      cause: error,
    });
  }
}

/**
 * Creates a server-side Cloudflare Turnstile verifier.
 *
 * Tokens are checked for success, the form-specific action, and an allowed
 * hostname before the caller may persist a public message. The secret stays in
 * the Worker binding and is never returned to the browser or application logs.
 */
export function createTurnstileService(
  dependencies: TurnstileServiceDependencies,
): AbuseProtectionService {
  const fetcher = dependencies.fetcher ?? fetch;
  const allowedHostnames = new Set(
    dependencies.allowedHostnames.map((hostname) => hostname.toLowerCase()),
  );

  return {
    verifyTurnstile: async ({ action, remoteIp, token }) => {
      let response: Response;
      try {
        response = await fetcher(SITEVERIFY_URL, {
          body: JSON.stringify({
            ...(remoteIp === null ? {} : { remoteip: remoteIp }),
            response: token,
            secret: dependencies.secretKey,
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
          signal: AbortSignal.timeout(5_000),
        });
      } catch (error) {
        throw new AppError({
          code: "DEPENDENCY_UNAVAILABLE",
          message: "Turnstile verification is temporarily unavailable",
          status: 503,
          cause: error,
        });
      }

      if (!response.ok) throw dependencyUnavailable("Turnstile verification");

      const result = await verificationBody(response);
      const hostname = typeof result.hostname === "string" ? result.hostname.toLowerCase() : "";
      if (result.success !== true || result.action !== action || !allowedHostnames.has(hostname)) {
        throw verificationFailed();
      }
    },
  };
}
