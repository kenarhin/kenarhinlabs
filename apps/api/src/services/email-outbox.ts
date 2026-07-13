import { type WorkerDatabase } from "@labs/db";
import {
  claimEmailOutboxEvents,
  completeEmailOutboxEvents,
  deadLetterEmailOutboxEvents,
  failEmailOutboxEvents,
} from "@labs/db/queries/email-outbox.queries";
import { parseTransactionalEmailJob, type TransactionalEmailJobV1 } from "@labs/email";

/** Summarizes one outbox publication pass without including recipient data. */
export interface EmailOutboxPublishResult {
  claimed: number;
  deadLettered: number;
  published: number;
}

/**
 * Publishes claimed transactional email jobs and durably records Queue handoff.
 *
 * @param database - Request-scoped Drizzle client backed by Hyperdrive.
 * @param queue - Bound Cloudflare Queue producer.
 * @param limit - Maximum jobs to claim in this pass.
 * @returns Counts safe for structured operational logging.
 */
export async function publishPendingEmailOutbox(
  database: WorkerDatabase,
  queue: Queue<TransactionalEmailJobV1>,
  limit = 50,
): Promise<EmailOutboxPublishResult> {
  const claimed = await claimEmailOutboxEvents(database, limit);
  const valid: { eventId: string; job: TransactionalEmailJobV1 }[] = [];
  const invalidEventIds: string[] = [];

  for (const event of claimed) {
    try {
      valid.push({ eventId: event.id, job: parseTransactionalEmailJob(event.payload) });
    } catch {
      invalidEventIds.push(event.id);
    }
  }

  await deadLetterEmailOutboxEvents(
    database,
    invalidEventIds,
    "Email outbox payload failed schema validation",
  );

  if (valid.length === 0) {
    return { claimed: claimed.length, deadLettered: invalidEventIds.length, published: 0 };
  }

  const validEventIds = valid.map(({ eventId }) => eventId);
  try {
    // Cloudflare confirms these messages are persisted before sendBatch resolves.
    await queue.sendBatch(valid.map(({ job }) => ({ body: job })));
    await completeEmailOutboxEvents(database, validEventIds);
    return {
      claimed: claimed.length,
      deadLettered: invalidEventIds.length,
      published: valid.length,
    };
  } catch (error) {
    await failEmailOutboxEvents(
      database,
      validEventIds,
      error instanceof Error ? error.message : "Queue publication failed",
    );
    throw new Error("Transactional email Queue publication was deferred", { cause: error });
  }
}
