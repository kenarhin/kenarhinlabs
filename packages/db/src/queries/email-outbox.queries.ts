import { inArray, sql } from "drizzle-orm";

import type { WorkerDatabase } from "../client/worker.js";
import { outboxEvents } from "../schema/index.js";

export const EMAIL_OUTBOX_EVENT_TYPE = "email.transactional.requested.v1";

/** Queue-ready email payload claimed from the canonical transactional outbox. */
export interface ClaimedEmailOutboxEvent {
  id: string;
  payload: unknown;
}

/**
 * Atomically leases retryable email outbox rows while recovering abandoned leases.
 *
 * @param database - Request-scoped Drizzle client backed by Hyperdrive.
 * @param limit - Maximum rows to lease; capped to the Cloudflare Queue batch limit.
 * @returns Claimed event IDs and their versioned, JSON-safe Queue payloads.
 */
export async function claimEmailOutboxEvents(
  database: WorkerDatabase,
  limit = 50,
): Promise<ClaimedEmailOutboxEvent[]> {
  const safeLimit = Math.max(1, Math.min(limit, 100));
  const result = await database.execute(
    sql<ClaimedEmailOutboxEvent>`
      with candidates as (
        select event.id
          from sync.outbox_events event
         where event.event_type = ${EMAIL_OUTBOX_EVENT_TYPE}
           and event.available_at <= now()
           and (
             event.status in ('pending', 'failed')
             or (
               event.status = 'processing'
               and event.locked_at < now() - interval '15 minutes'
             )
           )
         order by event.created_at
         for update skip locked
         limit ${safeLimit}
      )
      update sync.outbox_events event
         set status = 'processing',
             attempts = event.attempts + 1,
             locked_at = now(),
             last_error = null,
             updated_at = now()
        from candidates
       where event.id = candidates.id
      returning event.id, event.payload
    `,
  );

  return result.rows.map((row) => {
    if (typeof row.id !== "string") {
      throw new TypeError("Claimed email outbox event has an invalid identifier");
    }
    return { id: row.id, payload: row.payload };
  });
}

/**
 * Marks outbox rows complete only after Cloudflare confirms Queue persistence.
 *
 * @param database - Request-scoped Drizzle client backed by Hyperdrive.
 * @param eventIds - Successfully published outbox event IDs.
 * @returns A promise that resolves when completion state is durable.
 */
export async function completeEmailOutboxEvents(
  database: WorkerDatabase,
  eventIds: readonly string[],
): Promise<void> {
  if (eventIds.length === 0) return;
  await database
    .update(outboxEvents)
    .set({ lockedAt: null, processedAt: new Date(), status: "processed" })
    .where(inArray(outboxEvents.id, [...eventIds]));
}

/**
 * Releases failed outbox leases with bounded diagnostics and exponential retry timing.
 *
 * @param database - Request-scoped Drizzle client backed by Hyperdrive.
 * @param eventIds - Failed outbox event IDs.
 * @param message - Provider-neutral operational failure text; never recipient data.
 * @returns A promise that resolves when retry state is durable.
 */
export async function failEmailOutboxEvents(
  database: WorkerDatabase,
  eventIds: readonly string[],
  message: string,
): Promise<void> {
  if (eventIds.length === 0) return;
  await database
    .update(outboxEvents)
    .set({
      availableAt: sql`now() + least(interval '1 hour', interval '30 seconds' * power(2, greatest(${outboxEvents.attempts} - 1, 0)))`,
      lastError: message.slice(0, 1_000),
      lockedAt: null,
      status: sql`case when ${outboxEvents.attempts} >= 10 then 'dead_lettered' else 'failed' end`,
    })
    .where(inArray(outboxEvents.id, [...eventIds]));
}

/**
 * Permanently rejects malformed email outbox payloads that retries cannot repair.
 *
 * @param database - Request-scoped Drizzle client backed by Hyperdrive.
 * @param eventIds - Invalid event IDs.
 * @param message - Contract failure without payload or recipient contents.
 * @returns A promise that resolves when dead-letter state is durable.
 */
export async function deadLetterEmailOutboxEvents(
  database: WorkerDatabase,
  eventIds: readonly string[],
  message: string,
): Promise<void> {
  if (eventIds.length === 0) return;
  await database
    .update(outboxEvents)
    .set({ lastError: message.slice(0, 1_000), lockedAt: null, status: "dead_lettered" })
    .where(inArray(outboxEvents.id, [...eventIds]));
}
