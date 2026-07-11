import type { MiddlewareHandler } from "hono";

import type { AppEnv } from "../types/app";

export type LogFields = Record<string, boolean | null | number | string | undefined>;

/** Emits a structured log entry suitable for Workers Logs field search. */
export function logInfo(event: string, fields: LogFields): void {
  // eslint-disable-next-line no-console -- Workers captures console JSON as structured platform logs.
  console.log(JSON.stringify({ event, level: "info", ...fields }));
}

/** Emits a structured error without serializing request bodies or secrets. */
export function logError(event: string, fields: LogFields): void {
  console.error(JSON.stringify({ event, level: "error", ...fields }));
}

/** Logs request completion after downstream middleware has finalized the status. */
export const requestLoggingMiddleware: MiddlewareHandler<AppEnv> = async (context, next) => {
  const startedAt = performance.now();
  await next();

  logInfo("http.request.completed", {
    durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
    method: context.req.method,
    path: new URL(context.req.url).pathname,
    requestId: context.get("requestId"),
    status: context.res.status,
  });
};
