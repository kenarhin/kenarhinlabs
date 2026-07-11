import { classifyEmailFailure, CloudflareEmailTransport } from "./cloudflare-transport";
import { parseTransactionalEmailJob } from "./job";
import { renderEmailJob } from "./templates";
import type { EmailFailure, EmailSendReceipt, TransactionalEmailJobV1 } from "./types";

/**
 * Persists transactional email claims and delivery outcomes around provider sends.
 */
export interface EmailDeliveryRepository {
  claim(job: TransactionalEmailJobV1): Promise<"claimed" | "already-processed">;
  markSent(job: TransactionalEmailJobV1, receipt: EmailSendReceipt): Promise<void>;
  markFailed(
    job: TransactionalEmailJobV1,
    failure: EmailFailure,
    willRetry: boolean,
  ): Promise<void>;
}

/**
 * Receives structured queue-consumer events without logging email addresses or bodies.
 */
export interface EmailQueueLogger {
  info(event: Readonly<Record<string, string | number | boolean>>): void;
  error(event: Readonly<Record<string, string | number | boolean>>): void;
}

/**
 * Dependencies required by the email queue consumer.
 */
export interface EmailQueueConsumerDependencies {
  transport: CloudflareEmailTransport;
  repository: EmailDeliveryRepository;
  logger?: EmailQueueLogger;
}

/**
 * Calculates capped exponential backoff for a Cloudflare Queue retry.
 *
 * @param attempts - One-indexed delivery attempt count from the Queue runtime.
 * @returns Retry delay in seconds.
 */
function retryDelaySeconds(attempts: number): number {
  return Math.min(30 * 2 ** Math.max(0, attempts - 1), 3_600);
}

/**
 * Consumes an email batch with per-message acknowledgement and retry decisions.
 *
 * @param batch - Typed Cloudflare Queue batch.
 * @param dependencies - Provider, persistence, and optional structured logger.
 * @returns A promise that resolves after every message is explicitly handled.
 */
export async function consumeEmailBatch(
  batch: MessageBatch<unknown>,
  dependencies: EmailQueueConsumerDependencies,
): Promise<void> {
  for (const message of batch.messages) {
    let job: TransactionalEmailJobV1;
    try {
      job = parseTransactionalEmailJob(message.body);
    } catch (error) {
      dependencies.logger?.error({
        event: "email_job_rejected",
        queueMessageId: message.id,
        reason: error instanceof Error ? error.message : "Invalid payload",
      });
      message.ack();
      continue;
    }

    try {
      const claim = await dependencies.repository.claim(job);
      if (claim === "already-processed") {
        message.ack();
        continue;
      }

      const receipt = await dependencies.transport.send(renderEmailJob(job));
      await dependencies.repository.markSent(job, receipt);
      dependencies.logger?.info({
        event: "email_job_sent",
        jobId: job.jobId,
        messageId: job.messageId,
        providerMessageId: receipt.providerMessageId,
      });
      message.ack();
    } catch (error) {
      const failure = classifyEmailFailure(error);
      try {
        await dependencies.repository.markFailed(job, failure, failure.retryable);
      } catch (persistenceError) {
        dependencies.logger?.error({
          event: "email_status_persistence_failed",
          jobId: job.jobId,
          reason:
            persistenceError instanceof Error
              ? persistenceError.message
              : "Unknown persistence failure",
        });
        message.retry({ delaySeconds: retryDelaySeconds(message.attempts) });
        continue;
      }

      dependencies.logger?.error({
        event: "email_job_failed",
        jobId: job.jobId,
        code: failure.code,
        retryable: failure.retryable,
      });
      if (failure.retryable) {
        message.retry({ delaySeconds: retryDelaySeconds(message.attempts) });
      } else {
        message.ack();
      }
    }
  }
}
