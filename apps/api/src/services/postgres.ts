import type { AuthorizationRepository, ProfileStatus } from "@labs/auth";
import { dependencyUnavailable } from "@labs/core";
import { createWorkerDatabase, profiles, type WorkerDatabase } from "@labs/db";
import { findPublishedContent, listPublicNavigation } from "@labs/db/queries/content.queries";
import {
  claimEmailDelivery,
  markEmailDeliveryFailed,
  markEmailDeliverySent,
} from "@labs/db/queries/email-delivery.queries";
import {
  findInboundEmailThread,
  getEmailAttachment,
  getEmailThread,
  listEmailThreads,
  persistInboundEmail,
  persistThreadReply,
  updateEmailThread,
} from "@labs/db/queries/email-inbox.queries";
import { persistIntakeTransaction } from "@labs/db/queries/intake.queries";
import { listCurrentOffers } from "@labs/db/queries/offers.queries";
import { getUserAuthorization } from "@labs/db/queries/users.queries";
import type { EmailDeliveryRepository } from "@labs/email";

import { parseRuntimeEnv } from "../env";
import { logError, logInfo } from "../middleware/logging";
import type { JsonValue } from "../types/app";
import type { ApiServices } from "./contracts";
import { createCommunicationsService } from "./communications";
import { publishPendingEmailOutbox } from "./email-outbox";
import { createTransactionalIntakeService } from "./intake";
import { createInboundEmailService } from "./inbound-email";
import { createTurnstileService } from "./turnstile";
import { createUnavailableServices } from "./unavailable";

/** Narrows an unknown binding without duplicating Cloudflare's generated Env interface. */
function isHyperdriveBinding(value: unknown): value is Hyperdrive {
  return (
    typeof value === "object" &&
    value !== null &&
    "connectionString" in value &&
    typeof value.connectionString === "string" &&
    value.connectionString.length > 0
  );
}

/** Retrieves the generated Worker binding and fails closed when not provisioned. */
function hyperdrive(bindings: CloudflareBindings): Hyperdrive {
  if (!("HYPERDRIVE" in bindings) || !isHyperdriveBinding(bindings.HYPERDRIVE)) {
    throw dependencyUnavailable("Hyperdrive");
  }
  return bindings.HYPERDRIVE;
}

/** Runs one request-scoped database operation and always releases pg resources. */
async function withDatabase<T>(
  bindings: CloudflareBindings,
  operation: (database: WorkerDatabase) => Promise<T>,
): Promise<T> {
  const resource = createWorkerDatabase(hyperdrive(bindings));
  try {
    return await operation(resource.db);
  } finally {
    await resource.close();
  }
}

/** Converts database values such as Date and bigint into a JSON-safe response. */
function jsonSafe(value: unknown): JsonValue {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map(jsonSafe);
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, jsonSafe(nestedValue)]),
    );
  }
  return null;
}

/** Validates the database status before adapting it to the auth package contract. */
function profileStatus(value: string): ProfileStatus {
  if (value === "active" || value === "invited" || value === "suspended" || value === "deleted") {
    return value;
  }
  throw dependencyUnavailable("Authorization data");
}

/** Creates the Postgres-backed authorization repository required by admin middleware. */
function createAuthorizationRepository(bindings: CloudflareBindings): AuthorizationRepository {
  return {
    findByUserId: async (userId) =>
      withDatabase(bindings, async (database) => {
        const result = await getUserAuthorization(database, userId);
        if (result === null) {
          return null;
        }
        return {
          permissions: result.permissions,
          profileStatus: profileStatus(result.profile.status),
          roles: result.roles,
          userId: result.profile.id,
        };
      }),
  };
}

/** Creates the durable delivery-state adapter used by the email Queue consumer. */
function createEmailDeliveryRepository(bindings: CloudflareBindings): EmailDeliveryRepository {
  return {
    claim: async (job) =>
      withDatabase(bindings, (database) =>
        claimEmailDelivery(database, job.messageId, job.idempotencyKey),
      ),
    markFailed: async (job, failure, willRetry) =>
      withDatabase(bindings, (database) =>
        markEmailDeliveryFailed(database, {
          code: failure.code,
          idempotencyKey: job.idempotencyKey,
          message: failure.message,
          messageId: job.messageId,
          willRetry,
        }),
      ),
    markSent: async (job, receipt) =>
      withDatabase(bindings, (database) =>
        markEmailDeliverySent(database, {
          idempotencyKey: job.idempotencyKey,
          messageId: job.messageId,
          provider: receipt.provider,
          providerMessageId: receipt.providerMessageId,
        }),
      ),
  };
}

/** Publishes one bounded batch of durable email outbox work through the Queue binding. */
export async function publishPendingEmailJobs(
  bindings: CloudflareBindings,
  limit = 50,
): Promise<void> {
  const result = await withDatabase(bindings, (database) =>
    publishPendingEmailOutbox(database, bindings.EMAIL_QUEUE, limit),
  );
  if (result.claimed > 0) {
    logInfo("email_outbox.published", { ...result });
  }
}

/**
 * Creates request-scoped production services that can be implemented safely
 * with the database lane today, leaving unavailable adapters fail-closed.
 */
export function createWorkerServices(bindings: CloudflareBindings): ApiServices {
  const unavailable = createUnavailableServices();
  const runtime = parseRuntimeEnv(bindings);
  const intake = createTransactionalIntakeService({
    configuration: {
      fromName: runtime.EMAIL_FROM_NAME,
      replyTokenSecret: runtime.EMAIL_REPLY_TOKEN_SECRET,
    },
    onPublishFailure: (fields) => logError(fields.event, { intakeId: fields.intakeId }),
    persist: (plan) =>
      withDatabase(bindings, (database) => persistIntakeTransaction(database, plan)),
    publishPending: () => publishPendingEmailJobs(bindings, 10),
  });
  const communications = createCommunicationsService({
    attachmentBucketName: runtime.EMAIL_ATTACHMENT_BUCKET_NAME,
    fromName: runtime.EMAIL_FROM_NAME,
    getAttachment: (id) => withDatabase(bindings, (database) => getEmailAttachment(database, id)),
    getObject: (key) => bindings.R2_EMAIL_ATTACHMENTS.get(key),
    getThread: (id) => withDatabase(bindings, (database) => getEmailThread(database, id)),
    listThreads: (query) => withDatabase(bindings, (database) => listEmailThreads(database, query)),
    onPublishFailure: (fields) => logError(fields.event, { threadId: fields.threadId }),
    persistReply: (plan) =>
      withDatabase(bindings, (database) => persistThreadReply(database, plan)),
    publishPending: () => publishPendingEmailJobs(bindings, 10),
    replyTokenSecret: runtime.EMAIL_REPLY_TOKEN_SECRET,
    serialize: jsonSafe,
    updateThread: (plan) => withDatabase(bindings, (database) => updateEmailThread(database, plan)),
  });
  const inboundEmail = createInboundEmailService({
    attachmentBucketName: runtime.EMAIL_ATTACHMENT_BUCKET_NAME,
    deleteObject: (key) => bindings.R2_EMAIL_ATTACHMENTS.delete(key),
    findThread: (input) =>
      withDatabase(bindings, (database) => findInboundEmailThread(database, input)),
    persist: (plan) => withDatabase(bindings, (database) => persistInboundEmail(database, plan)),
    putObject: async ({ content, contentType, objectKey }) => {
      await bindings.R2_EMAIL_ATTACHMENTS.put(objectKey, content, {
        httpMetadata: { contentType },
      });
    },
    replyTokenSecret: runtime.EMAIL_REPLY_TOKEN_SECRET,
  });

  return {
    ...unavailable,
    abuseProtection: createTurnstileService({
      allowedHostnames: runtime.TURNSTILE_ALLOWED_HOSTNAMES,
      secretKey: runtime.TURNSTILE_SECRET_KEY,
    }),
    authorizationRepository: createAuthorizationRepository(bindings),
    communications,
    databaseProbe: {
      check: async () => {
        try {
          await withDatabase(bindings, async (database) => {
            await database.select({ id: profiles.id }).from(profiles).limit(1);
          });
          return { ok: true };
        } catch (error) {
          return {
            detail: error instanceof Error ? error.message.slice(0, 160) : "database check failed",
            ok: false,
          };
        }
      },
    },
    intake,
    inboundEmail,
    platform: {
      ...unavailable.platform,
      emailDeliveryRepository: createEmailDeliveryRepository(bindings),
    },
    publicRead: {
      ...unavailable.publicRead,
      getContent: async (type, slug) =>
        withDatabase(bindings, async (database) => {
          const item = await findPublishedContent(database, type, slug);
          return item === null ? null : jsonSafe(item);
        }),
      getNavigation: async () =>
        withDatabase(bindings, async (database) => {
          const [header, footer] = await Promise.all([
            listPublicNavigation(database, "header"),
            listPublicNavigation(database, "footer"),
          ]);
          return jsonSafe({ footer, header });
        }),
      listOffers: async () =>
        withDatabase(bindings, async (database) => jsonSafe(await listCurrentOffers(database))),
    },
  };
}
