import { AppError } from "@labs/core";
import {
  contactInputSchema,
  inquiryInputSchema,
  leadInputSchema,
  projectIntakeInputSchema,
  publicContentParamsSchema,
  publicListQuerySchema,
  supportRequestInputSchema,
} from "@labs/validators";
import { Hono } from "hono";

import { enforceRateLimit, publicRateLimitKey } from "../middleware/rate-limit";
import { success } from "../responses";
import type { ApiServices, RequestMetadata } from "../services/contracts";
import type { AppEnv } from "../types/app";
import { parseInput, parseJsonBody, queryObject } from "../validation";

/** Extracts audit-safe request metadata without persisting request bodies. */
function requestMetadata(request: Request, requestId: string): RequestMetadata {
  return {
    ipAddress: request.headers.get("cf-connecting-ip"),
    requestId,
    userAgent: request.headers.get("user-agent")?.slice(0, 1_024) ?? null,
  };
}

/** Verifies a public message token before the request can cross into intake persistence. */
async function verifyPublicMessage(
  services: ApiServices,
  input: { turnstileToken: string },
  metadata: RequestMetadata,
  action: "contact" | "project-intake",
): Promise<void> {
  await services.abuseProtection.verifyTurnstile({
    action,
    remoteIp: metadata.ipAddress,
    token: input.turnstileToken,
  });
}

/** Removes a verified challenge token before data crosses into the intake domain. */
function verifiedIntakeInput<T extends { turnstileToken: string }>(
  input: T,
): Omit<T, "turnstileToken"> {
  const { turnstileToken, ...message } = input;
  void turnstileToken;
  return message;
}

/** Creates public read and intake contracts backed by injected domain ports. */
export function createPublicRoutes(services: ApiServices): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  routes.get("/navigation", async (context) =>
    success(context, await services.publicRead.getNavigation()),
  );
  routes.get("/homepage", async (context) =>
    success(context, await services.publicRead.getHomepage()),
  );
  routes.get("/content/:type/:slug", async (context) => {
    const params = parseInput(context.req.param(), publicContentParamsSchema);
    const item = await services.publicRead.getContent(params.type, params.slug);
    if (item === null) {
      throw new AppError({
        code: "CONTENT_NOT_FOUND",
        message: "Content item not found",
        status: 404,
      });
    }
    return success(context, item);
  });
  routes.get("/tools", async (context) => {
    const query = parseInput(queryObject(new URL(context.req.url)), publicListQuerySchema);
    return success(context, await services.publicRead.listTools(query));
  });
  routes.get("/offers", async (context) => {
    const query = parseInput(queryObject(new URL(context.req.url)), publicListQuerySchema);
    return success(context, await services.publicRead.listOffers(query));
  });

  routes.post("/leads", async (context) => {
    await enforceRateLimit(
      context.env.PUBLIC_RATE_LIMITER,
      publicRateLimitKey(context.req.raw, "lead"),
    );
    const input = await parseJsonBody(context.req.raw, leadInputSchema);
    const result = await services.intake.createLead(
      input,
      requestMetadata(context.req.raw, context.get("requestId")),
    );
    return success(context, result, 202);
  });

  routes.post("/contact", async (context) => {
    await enforceRateLimit(
      context.env.PUBLIC_RATE_LIMITER,
      publicRateLimitKey(context.req.raw, "contact"),
    );
    const input = await parseJsonBody(context.req.raw, contactInputSchema);
    const metadata = requestMetadata(context.req.raw, context.get("requestId"));
    await verifyPublicMessage(services, input, metadata, "project-intake");
    const result = await services.intake.createContact(verifiedIntakeInput(input), metadata);
    context.header("Deprecation", "true");
    context.header("Link", '</public/project-intake>; rel="successor-version"');
    return success(context, result, 202);
  });

  routes.post("/inquiries", async (context) => {
    await enforceRateLimit(
      context.env.PUBLIC_RATE_LIMITER,
      publicRateLimitKey(context.req.raw, "inquiry"),
    );
    const input = await parseJsonBody(context.req.raw, inquiryInputSchema);
    const metadata = requestMetadata(context.req.raw, context.get("requestId"));
    await verifyPublicMessage(services, input, metadata, "contact");
    return success(
      context,
      await services.intake.createInquiry(verifiedIntakeInput(input), metadata),
      202,
    );
  });

  routes.post("/project-intake", async (context) => {
    await enforceRateLimit(
      context.env.PUBLIC_RATE_LIMITER,
      publicRateLimitKey(context.req.raw, "project-intake"),
    );
    const input = await parseJsonBody(context.req.raw, projectIntakeInputSchema);
    const metadata = requestMetadata(context.req.raw, context.get("requestId"));
    await verifyPublicMessage(services, input, metadata, "project-intake");
    return success(
      context,
      await services.intake.createProjectIntake(verifiedIntakeInput(input), metadata),
      202,
    );
  });

  routes.post("/support", async (context) => {
    await enforceRateLimit(
      context.env.PUBLIC_RATE_LIMITER,
      publicRateLimitKey(context.req.raw, "support"),
    );
    const input = await parseJsonBody(context.req.raw, supportRequestInputSchema);
    const metadata = requestMetadata(context.req.raw, context.get("requestId"));
    await verifyPublicMessage(services, input, metadata, "contact");
    return success(
      context,
      await services.intake.createSupportRequest(verifiedIntakeInput(input), metadata),
      202,
    );
  });

  return routes;
}
