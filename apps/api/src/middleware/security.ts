import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import type { MiddlewareHandler } from "hono";

import type { AppEnv } from "../types/app";

export const securityHeadersMiddleware = secureHeaders({
  crossOriginResourcePolicy: "same-site",
  referrerPolicy: "strict-origin-when-cross-origin",
  strictTransportSecurity: "max-age=63072000; includeSubDomains; preload",
  xFrameOptions: "DENY",
});

/** Applies a strict allowlist while supporting per-environment origins. */
export const corsMiddleware: MiddlewareHandler<AppEnv> = async (context, next) => {
  const allowedOrigins = context.get("runtimeEnv").ALLOWED_ORIGINS;
  const middleware = cors({
    allowHeaders: ["Authorization", "Content-Type", "Idempotency-Key", "X-Client-Id"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
    exposeHeaders: ["X-Request-Id"],
    maxAge: 600,
    origin: (origin) => (allowedOrigins.includes(origin) ? origin : undefined),
  });

  return middleware(context, next);
};
