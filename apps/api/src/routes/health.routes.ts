import { dependencyUnavailable } from "@labs/core";
import { Hono } from "hono";

import { success } from "../responses";
import type { ApiServices } from "../services/contracts";
import type { AppEnv } from "../types/app";

/** Runs a bounded dependency check so readiness cannot hang indefinitely. */
async function checkSupabaseAuth(url: string, timeoutMs: number): Promise<boolean> {
  const response = await fetch(`${url.replace(/\/$/, "")}/auth/v1/.well-known/jwks.json`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  await response.body?.cancel();
  return response.ok;
}

/** Creates liveness and dependency-aware readiness endpoints. */
export function createHealthRoutes(services: ApiServices): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  routes.get("/health", (context) =>
    success(context, {
      environment: context.get("runtimeEnv").ENVIRONMENT,
      service: "kenarhinlabs-api",
      status: "ok",
      timestamp: new Date().toISOString(),
    }),
  );

  routes.get("/ready", async (context) => {
    const runtimeEnv = context.get("runtimeEnv");
    const [database, auth] = await Promise.all([
      services.databaseProbe.check(),
      checkSupabaseAuth(runtimeEnv.SUPABASE_URL, runtimeEnv.HEALTH_CHECK_TIMEOUT_MS)
        .then((ok) => ({ ok }))
        .catch(() => ({ ok: false })),
    ]);
    const checks = {
      auth,
      database,
      rateLimiting: {
        ok:
          typeof context.env.PUBLIC_RATE_LIMITER?.limit === "function" &&
          typeof context.env.WEBHOOK_RATE_LIMITER?.limit === "function",
      },
    };
    const ready = Object.values(checks).every((check) => check.ok);

    if (!ready) {
      throw dependencyUnavailable("API dependencies");
    }

    return success(context, { checks, status: "ready" });
  });

  return routes;
}
