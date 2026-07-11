import { verifyWebhookSignature } from "@labs/auth";
import { AppError } from "@labs/core";
import { webhookEnvelopeSchema, type WebhookSource } from "@labs/validators";
import { Hono } from "hono";

import type { RuntimeEnv } from "../env";
import { enforceRateLimit, publicRateLimitKey } from "../middleware/rate-limit";
import { success } from "../responses";
import type { ApiServices } from "../services/contracts";
import type { AppContext, AppEnv } from "../types/app";
import { parseInput } from "../validation";

/** Selects an independently rotatable secret for each webhook trust boundary. */
function webhookSecret(runtimeEnv: RuntimeEnv, source: WebhookSource): string {
  switch (source) {
    case "supabase":
      return runtimeEnv.SUPABASE_WEBHOOK_SECRET;
    case "cloudflare-email":
      return runtimeEnv.CLOUDFLARE_EMAIL_WEBHOOK_SECRET;
    case "internal-queue":
      return runtimeEnv.INTERNAL_QUEUE_WEBHOOK_SECRET;
  }
}

/** Processes one verified event through a database-backed idempotency claim. */
async function processWebhook(
  services: ApiServices,
  source: WebhookSource,
  context: AppContext,
): Promise<Response> {
  await enforceRateLimit(
    context.env.WEBHOOK_RATE_LIMITER,
    publicRateLimitKey(context.req.raw, `webhook:${source}`),
  );

  const rawBody = await context.req.text();
  await verifyWebhookSignature({
    rawBody,
    secret: webhookSecret(context.get("runtimeEnv"), source),
    signatureHeader: context.req.header("x-webhook-signature"),
    timestampHeader: context.req.header("x-webhook-timestamp"),
  });

  let value: unknown;
  try {
    value = JSON.parse(rawBody);
  } catch (error) {
    throw new AppError({
      code: "JSON_INVALID",
      message: "The webhook body is not valid JSON",
      status: 400,
      cause: error,
    });
  }
  const event = parseInput(value, webhookEnvelopeSchema);
  const claim = await services.idempotency.claim(source, event.id);
  if (claim === "duplicate") {
    return success(context, { duplicate: true, received: true });
  }

  try {
    await services.webhooks.handle(source, event);
    await services.idempotency.complete(source, event.id);
  } catch (error) {
    await services.idempotency.release(source, event.id);
    throw error;
  }

  return success(context, { duplicate: false, received: true }, 202);
}

/** Creates signed, replay-bounded, and idempotent webhook ingestion routes. */
export function createWebhookRoutes(services: ApiServices): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  routes.post("/supabase", (context) => processWebhook(services, "supabase", context));
  routes.post("/cloudflare-email", (context) =>
    processWebhook(services, "cloudflare-email", context),
  );
  routes.post("/internal/queue", (context) => processWebhook(services, "internal-queue", context));

  return routes;
}
