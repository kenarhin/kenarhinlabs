import { and, eq, isNull, lt, lte, or, sql } from "drizzle-orm";

import type { WorkerDatabase } from "../client/worker.js";
import { emailMessages } from "../schema/index.js";

export type EmailDeliveryClaim = "claimed" | "already-processed" | "busy";

/**
 * Atomically claims a durable email message or reports its idempotent terminal state.
 *
 * @param database - Request-scoped Drizzle client backed by Hyperdrive.
 * @param messageId - Durable communications message UUID.
 * @param idempotencyKey - Stable Queue retry identity.
 * @param now - Claim timestamp, injectable for deterministic tests.
 * @returns Whether this consumer owns delivery, should acknowledge, or should retry later.
 */
export async function claimEmailDelivery(
  database: WorkerDatabase,
  messageId: string,
  idempotencyKey: string,
  now = new Date(),
): Promise<EmailDeliveryClaim> {
  const staleBefore = new Date(now.getTime() - 15 * 60 * 1_000);
  const [claimed] = await database
    .update(emailMessages)
    .set({
      attempts: sql`${emailMessages.attempts} + 1`,
      lastAttemptAt: now,
      lastError: null,
      lastErrorCode: null,
      nextAttemptAt: null,
      status: "processing",
    })
    .where(
      and(
        eq(emailMessages.id, messageId),
        eq(emailMessages.idempotencyKey, idempotencyKey),
        or(
          eq(emailMessages.status, "queued"),
          and(
            eq(emailMessages.status, "failed"),
            eq(emailMessages.retryable, true),
            or(isNull(emailMessages.nextAttemptAt), lte(emailMessages.nextAttemptAt, now)),
          ),
          and(
            eq(emailMessages.status, "processing"),
            or(isNull(emailMessages.lastAttemptAt), lt(emailMessages.lastAttemptAt, staleBefore)),
          ),
        ),
      ),
    )
    .returning({ id: emailMessages.id });

  if (claimed !== undefined) return "claimed";

  const [existing] = await database
    .select({ retryable: emailMessages.retryable, status: emailMessages.status })
    .from(emailMessages)
    .where(and(eq(emailMessages.id, messageId), eq(emailMessages.idempotencyKey, idempotencyKey)))
    .limit(1);

  if (existing === undefined) throw new Error("Durable email message was not found");
  if (
    existing.status === "sent" ||
    existing.status === "received" ||
    (existing.status === "failed" && !existing.retryable)
  ) {
    return "already-processed";
  }
  return "busy";
}

/** Persists a successful Cloudflare Email Service receipt for one claimed message. */
export async function markEmailDeliverySent(
  database: WorkerDatabase,
  input: {
    messageId: string;
    idempotencyKey: string;
    provider: string;
    providerMessageId: string;
    sentAt?: Date;
  },
): Promise<void> {
  const [updated] = await database
    .update(emailMessages)
    .set({
      lastError: null,
      lastErrorCode: null,
      nextAttemptAt: null,
      provider: input.provider,
      providerMessageId: input.providerMessageId,
      retryable: false,
      sentAt: input.sentAt ?? new Date(),
      status: "sent",
    })
    .where(
      and(
        eq(emailMessages.id, input.messageId),
        eq(emailMessages.idempotencyKey, input.idempotencyKey),
        eq(emailMessages.status, "processing"),
      ),
    )
    .returning({ id: emailMessages.id });

  if (updated === undefined) throw new Error("Claimed email message could not be marked sent");
}

/** Persists a retryable or terminal provider failure for one claimed message. */
export async function markEmailDeliveryFailed(
  database: WorkerDatabase,
  input: {
    messageId: string;
    idempotencyKey: string;
    code: string;
    message: string;
    willRetry: boolean;
  },
): Promise<void> {
  const [updated] = await database
    .update(emailMessages)
    .set({
      lastError: input.message.slice(0, 1_000),
      lastErrorCode: input.code.slice(0, 160),
      nextAttemptAt: input.willRetry ? new Date() : null,
      retryable: input.willRetry,
      status: "failed",
    })
    .where(
      and(
        eq(emailMessages.id, input.messageId),
        eq(emailMessages.idempotencyKey, input.idempotencyKey),
        eq(emailMessages.status, "processing"),
      ),
    )
    .returning({ id: emailMessages.id });

  if (updated === undefined) throw new Error("Claimed email message could not be marked failed");
}
