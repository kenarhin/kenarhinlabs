import type { OutboxEvent, ProjectionQueueMessageV1 } from "./types";

/**
 * Parses an untrusted queue body into projection message version 1.
 *
 * @param value - Queue body received from Cloudflare Queues.
 * @returns A validated compact projection message.
 */
export function parseProjectionQueueMessage(value: unknown): ProjectionQueueMessageV1 {
  if (typeof value !== "object" || value === null) {
    throw new TypeError("Projection queue message must be an object.");
  }

  const candidate = value as Partial<ProjectionQueueMessageV1>;
  if (
    candidate.schemaVersion !== 1 ||
    typeof candidate.eventId !== "string" ||
    candidate.eventId.length === 0 ||
    typeof candidate.enqueuedAt !== "string"
  ) {
    throw new TypeError("Projection queue message does not match schema version 1.");
  }
  return candidate as ProjectionQueueMessageV1;
}

/**
 * Asserts the base invariants required for idempotent projection ordering.
 *
 * @param event - Outbox event loaded from canonical Postgres storage.
 * @returns The same event after invariant validation.
 */
export function assertValidOutboxEvent(event: OutboxEvent): OutboxEvent {
  if (
    event.id.length === 0 ||
    event.eventType.length === 0 ||
    event.aggregateType.length === 0 ||
    event.aggregateId.length === 0 ||
    !Number.isSafeInteger(event.syncVersion) ||
    event.syncVersion < 1
  ) {
    throw new TypeError("Outbox event is missing a stable identity or sync version.");
  }
  return event;
}
