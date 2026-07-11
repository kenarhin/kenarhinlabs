import { parseProjectionQueueMessage } from "./payload";
import { processOutboxEvent, type ProjectionProcessorDependencies } from "./processor";
import { NonRetryableProjectionError } from "./registry";

/**
 * Receives structured projection events without serializing canonical payload data.
 */
export interface ProjectionQueueLogger {
  info(event: Readonly<Record<string, string | number | boolean>>): void;
  error(event: Readonly<Record<string, string | number | boolean>>): void;
}

/**
 * Calculates capped exponential retry delay for transient projection failures.
 *
 * @param attempts - One-indexed delivery count from Cloudflare Queues.
 * @returns Delay in seconds before the next attempt.
 */
function retryDelaySeconds(attempts: number): number {
  return Math.min(15 * 2 ** Math.max(0, attempts - 1), 3_600);
}

/**
 * Handles every projection message independently to avoid whole-batch retries.
 *
 * @param batch - Cloudflare Queue batch with untrusted JSON bodies.
 * @param dependencies - Projection dependencies plus optional logger.
 * @returns A promise that resolves after each message is acked or retried.
 */
export async function consumeProjectionBatch(
  batch: MessageBatch<unknown>,
  dependencies: ProjectionProcessorDependencies & {
    logger?: ProjectionQueueLogger;
  },
): Promise<void> {
  for (const message of batch.messages) {
    let eventId: string;
    try {
      eventId = parseProjectionQueueMessage(message.body).eventId;
    } catch (error) {
      dependencies.logger?.error({
        event: "projection_message_rejected",
        queueMessageId: message.id,
        reason: error instanceof Error ? error.message : "Invalid payload",
      });
      message.ack();
      continue;
    }

    try {
      const result = await processOutboxEvent(eventId, dependencies);
      dependencies.logger?.info({
        event: "projection_message_processed",
        eventId,
        status: result.status,
        mutations: result.mutations,
      });
      message.ack();
    } catch (error) {
      const permanent = error instanceof NonRetryableProjectionError;
      try {
        await dependencies.source.markFailed(eventId, {
          message: error instanceof Error ? error.message : "Unknown projection failure",
          deadLettered: permanent,
        });
      } catch (persistenceError) {
        dependencies.logger?.error({
          event: "projection_failure_persistence_failed",
          eventId,
          reason:
            persistenceError instanceof Error
              ? persistenceError.message
              : "Unknown persistence failure",
        });
        message.retry({ delaySeconds: retryDelaySeconds(message.attempts) });
        continue;
      }

      dependencies.logger?.error({
        event: "projection_message_failed",
        eventId,
        permanent,
      });
      if (permanent) {
        message.ack();
      } else {
        message.retry({ delaySeconds: retryDelaySeconds(message.attempts) });
      }
    }
  }
}
