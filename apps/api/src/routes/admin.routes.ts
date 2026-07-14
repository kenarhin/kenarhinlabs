import { assertFutureSchedule, PERMISSIONS } from "@labs/core";
import {
  adminListQuerySchema,
  createClientSchema,
  createContentSchema,
  createEmailSchema,
  createOfferSchema,
  createProjectSchema,
  emailThreadListQuerySchema,
  emailThreadReplySchema,
  mediaUploadRequestSchema,
  scheduleContentSchema,
  updateClientSchema,
  updateContentSchema,
  updateEmailThreadSchema,
  uuidSchema,
} from "@labs/validators";
import { Hono } from "hono";

import { createAuthenticationMiddleware, requireRoutePermission } from "../middleware/auth";
import { success } from "../responses";
import type { ApiServices } from "../services/contracts";
import type { AppContext, AppEnv } from "../types/app";
import { parseInput, parseJsonBody, queryObject } from "../validation";

/** Returns the authenticated actor ID after the auth middleware has resolved RBAC. */
function actorId(context: AppContext): string {
  return context.get("principal").identity.sub;
}

/** Validates a UUID path parameter using the shared identifier contract. */
function entityId(context: AppContext): string {
  return parseInput(context.req.param("id"), uuidSchema);
}

/** Extracts audit metadata without persisting an authenticated request body. */
function requestMetadata(context: AppContext) {
  return {
    ipAddress: context.req.header("cf-connecting-ip") ?? null,
    requestId: context.get("requestId"),
    userAgent: context.req.header("user-agent")?.slice(0, 1_024) ?? null,
  };
}

/** Creates permission-gated administration route foundations by backend domain. */
export function createAdminRoutes(services: ApiServices): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();
  routes.use("*", createAuthenticationMiddleware(services));

  routes.get("/me", (context) => {
    const principal = context.get("principal");
    return success(context, {
      email: principal.identity.email ?? null,
      permissions: [...principal.permissions],
      roles: [...principal.roles],
      userId: principal.identity.sub,
    });
  });

  routes.get("/dashboard", requireRoutePermission(PERMISSIONS.ANALYTICS_READ), async (context) =>
    success(context, await services.admin.getDashboard()),
  );

  routes.get("/content", requireRoutePermission(PERMISSIONS.CONTENT_READ), async (context) => {
    const query = parseInput(queryObject(new URL(context.req.url)), adminListQuerySchema);
    return success(context, await services.admin.listContent(query));
  });
  routes.post("/content", requireRoutePermission(PERMISSIONS.CONTENT_WRITE), async (context) => {
    const input = await parseJsonBody(context.req.raw, createContentSchema);
    return success(context, await services.admin.createContent(input, actorId(context)), 201);
  });
  routes.patch(
    "/content/:id",
    requireRoutePermission(PERMISSIONS.CONTENT_WRITE),
    async (context) => {
      const input = await parseJsonBody(context.req.raw, updateContentSchema);
      return success(
        context,
        await services.admin.updateContent(entityId(context), input, actorId(context)),
      );
    },
  );
  routes.post(
    "/content/:id/publish",
    requireRoutePermission(PERMISSIONS.CONTENT_PUBLISH),
    async (context) =>
      success(context, await services.admin.publishContent(entityId(context), actorId(context))),
  );
  routes.post(
    "/content/:id/schedule",
    requireRoutePermission(PERMISSIONS.CONTENT_SCHEDULE),
    async (context) => {
      const input = await parseJsonBody(context.req.raw, scheduleContentSchema);
      const scheduledFor = new Date(input.scheduledFor);
      assertFutureSchedule(scheduledFor);
      return success(
        context,
        await services.admin.scheduleContent(entityId(context), scheduledFor, actorId(context)),
      );
    },
  );

  routes.get("/clients", requireRoutePermission(PERMISSIONS.CRM_READ), async (context) => {
    const query = parseInput(queryObject(new URL(context.req.url)), adminListQuerySchema);
    return success(context, await services.admin.listClients(query));
  });
  routes.post("/clients", requireRoutePermission(PERMISSIONS.CRM_WRITE), async (context) => {
    const input = await parseJsonBody(context.req.raw, createClientSchema);
    return success(context, await services.admin.createClient(input, actorId(context)), 201);
  });
  routes.patch("/clients/:id", requireRoutePermission(PERMISSIONS.CRM_WRITE), async (context) => {
    const input = await parseJsonBody(context.req.raw, updateClientSchema);
    return success(
      context,
      await services.admin.updateClient(entityId(context), input, actorId(context)),
    );
  });

  routes.get("/projects", requireRoutePermission(PERMISSIONS.CRM_READ), async (context) => {
    const query = parseInput(queryObject(new URL(context.req.url)), adminListQuerySchema);
    return success(context, await services.admin.listProjects(query));
  });
  routes.post("/projects", requireRoutePermission(PERMISSIONS.CRM_WRITE), async (context) => {
    const input = await parseJsonBody(context.req.raw, createProjectSchema);
    return success(context, await services.admin.createProject(input, actorId(context)), 201);
  });

  routes.get("/offers", requireRoutePermission(PERMISSIONS.COMMERCE_READ), async (context) => {
    const query = parseInput(queryObject(new URL(context.req.url)), adminListQuerySchema);
    return success(context, await services.admin.listOffers(query));
  });
  routes.post("/offers", requireRoutePermission(PERMISSIONS.COMMERCE_WRITE), async (context) => {
    const input = await parseJsonBody(context.req.raw, createOfferSchema);
    return success(context, await services.admin.createOffer(input, actorId(context)), 201);
  });

  routes.get("/media", requireRoutePermission(PERMISSIONS.MEDIA_READ), async (context) => {
    const query = parseInput(queryObject(new URL(context.req.url)), adminListQuerySchema);
    return success(context, await services.admin.listMedia(query));
  });
  routes.post(
    "/media/upload-url",
    requireRoutePermission(PERMISSIONS.MEDIA_UPLOAD),
    async (context) => {
      const input = await parseJsonBody(context.req.raw, mediaUploadRequestSchema);
      return success(context, await services.admin.createMediaUpload(input, actorId(context)), 201);
    },
  );

  routes.get("/emails", requireRoutePermission(PERMISSIONS.EMAIL_READ), async (context) => {
    const query = parseInput(queryObject(new URL(context.req.url)), adminListQuerySchema);
    return success(context, await services.admin.listEmails(query));
  });
  routes.post("/emails/send", requireRoutePermission(PERMISSIONS.EMAIL_SEND), async (context) => {
    const input = await parseJsonBody(context.req.raw, createEmailSchema);
    return success(context, await services.admin.queueEmail(input, actorId(context)), 202);
  });

  routes.get("/email-threads", requireRoutePermission(PERMISSIONS.EMAIL_READ), async (context) => {
    const query = parseInput(queryObject(new URL(context.req.url)), emailThreadListQuerySchema);
    return success(context, await services.communications.listThreads(query));
  });
  routes.get(
    "/email-threads/:id",
    requireRoutePermission(PERMISSIONS.EMAIL_READ),
    async (context) => {
      const thread = await services.communications.getThread(entityId(context));
      if (thread === null) {
        return context.json(
          {
            error: { code: "EMAIL_THREAD_NOT_FOUND", message: "Email thread not found" },
            ok: false,
            requestId: context.get("requestId"),
          },
          404,
        );
      }
      return success(context, thread);
    },
  );
  routes.patch(
    "/email-threads/:id",
    requireRoutePermission(PERMISSIONS.EMAIL_MANAGE),
    async (context) => {
      const input = await parseJsonBody(context.req.raw, updateEmailThreadSchema);
      const updated = await services.communications.updateThread(
        entityId(context),
        input,
        actorId(context),
        requestMetadata(context),
      );
      if (updated === null) {
        return context.json(
          {
            error: { code: "EMAIL_THREAD_NOT_FOUND", message: "Email thread not found" },
            ok: false,
            requestId: context.get("requestId"),
          },
          404,
        );
      }
      return success(context, updated);
    },
  );
  routes.post(
    "/email-threads/:id/replies",
    requireRoutePermission(PERMISSIONS.EMAIL_SEND),
    async (context) => {
      const input = await parseJsonBody(context.req.raw, emailThreadReplySchema);
      return success(
        context,
        await services.communications.replyToThread(
          entityId(context),
          input,
          actorId(context),
          requestMetadata(context),
        ),
        202,
      );
    },
  );
  routes.get(
    "/email-attachments/:id",
    requireRoutePermission(PERMISSIONS.EMAIL_READ),
    async (context) => {
      const attachment = await services.communications.getAttachment(entityId(context));
      if (attachment === null) {
        return context.json(
          {
            error: { code: "EMAIL_ATTACHMENT_NOT_FOUND", message: "Attachment not found" },
            ok: false,
            requestId: context.get("requestId"),
          },
          404,
        );
      }
      return new Response(attachment.body, {
        headers: {
          "Cache-Control": "private, no-store",
          "Content-Disposition": `attachment; filename="${attachment.filename}"`,
          "Content-Length": String(attachment.sizeBytes),
          "Content-Type": attachment.mimeType,
          "X-Content-Type-Options": "nosniff",
          "X-Request-Id": context.get("requestId"),
        },
      });
    },
  );

  return routes;
}
