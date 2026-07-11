import { AppError, isAppError } from "@labs/core";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";

import { logError, requestLoggingMiddleware } from "./middleware/logging";
import { requestContextMiddleware } from "./middleware/request-context";
import { corsMiddleware, securityHeadersMiddleware } from "./middleware/security";
import { createAdminRoutes } from "./routes/admin.routes";
import { createHealthRoutes } from "./routes/health.routes";
import { createPublicRoutes } from "./routes/public.routes";
import { createWebhookRoutes } from "./routes/webhooks.routes";
import type { ApiServices } from "./services/contracts";
import type { AppEnv } from "./types/app";

/** Serializes expected failures while keeping internal causes out of responses. */
function errorResponse(error: unknown, requestId: string): Response {
  const appError = isAppError(error)
    ? error
    : new AppError({
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
        status: 500,
        cause: error,
      });

  const body = {
    error: {
      code: appError.code,
      ...(appError.details === undefined ? {} : { details: appError.details }),
      message: appError.expose ? appError.message : "An unexpected error occurred",
    },
    ok: false as const,
    requestId,
  };

  return Response.json(body, {
    headers: { "x-request-id": requestId },
    status: appError.status,
  });
}

/** Builds the modular Hono API around explicit persistence/platform ports. */
export function createApp(services: ApiServices): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  app.use("*", requestContextMiddleware);
  app.use("*", securityHeadersMiddleware);
  app.use("*", corsMiddleware);
  app.use(
    "*",
    bodyLimit({
      maxSize: 256 * 1024,
      onError: () => {
        throw new AppError({
          code: "REQUEST_BODY_TOO_LARGE",
          message: "The request body exceeds the 256 KiB API limit",
          status: 413,
        });
      },
    }),
  );
  app.use("*", requestLoggingMiddleware);

  app.get("/", (context) =>
    context.json({
      data: { name: "Ken Arhin Labs API", version: "v1" },
      ok: true,
      requestId: context.get("requestId"),
    }),
  );
  app.route("/", createHealthRoutes(services));
  app.route("/public", createPublicRoutes(services));
  app.route("/admin", createAdminRoutes(services));
  app.route("/webhooks", createWebhookRoutes(services));

  app.notFound((context) =>
    errorResponse(
      new AppError({ code: "ROUTE_NOT_FOUND", message: "Route not found", status: 404 }),
      context.get("requestId"),
    ),
  );

  app.onError((error, context) => {
    const requestId = context.get("requestId") || crypto.randomUUID();
    logError("http.request.failed", {
      code: isAppError(error) ? error.code : "INTERNAL_ERROR",
      error: error instanceof Error ? error.message : "Unknown error",
      method: context.req.method,
      path: new URL(context.req.url).pathname,
      requestId,
      status: isAppError(error) ? error.status : 500,
    });
    return errorResponse(error, requestId);
  });

  return app;
}
