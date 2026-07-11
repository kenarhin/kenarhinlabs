import { assertValidObjectKey } from "./keys";

/**
 * Defines the JSON-safe media processing message sent through Cloudflare Queues.
 */
export interface MediaProcessingJobV1 {
  schemaVersion: 1;
  jobId: string;
  assetId: string;
  objectKey: string;
  operation: "inspect" | "derive-image" | "purge";
  enqueuedAt: string;
}

/**
 * Parses an untrusted queue body into the supported media job version.
 *
 * @param value - Queue body received from the Workers runtime.
 * @returns A validated media processing job.
 */
export function parseMediaProcessingJob(value: unknown): MediaProcessingJobV1 {
  if (typeof value !== "object" || value === null) {
    throw new TypeError("Media job must be an object.");
  }

  const candidate = value as Partial<MediaProcessingJobV1>;
  const operations: readonly MediaProcessingJobV1["operation"][] = [
    "inspect",
    "derive-image",
    "purge",
  ];
  if (
    candidate.schemaVersion !== 1 ||
    typeof candidate.jobId !== "string" ||
    typeof candidate.assetId !== "string" ||
    typeof candidate.objectKey !== "string" ||
    typeof candidate.operation !== "string" ||
    !operations.includes(candidate.operation as MediaProcessingJobV1["operation"]) ||
    typeof candidate.enqueuedAt !== "string"
  ) {
    throw new TypeError("Media job does not match schema version 1.");
  }

  assertValidObjectKey(candidate.objectKey);
  return candidate as MediaProcessingJobV1;
}

/**
 * Processes one validated media job using application-owned image or inspection logic.
 */
export interface MediaJobProcessor {
  process(job: MediaProcessingJobV1): Promise<void>;
}

/**
 * Records structured media consumer events without logging file contents.
 */
export interface MediaQueueLogger {
  info(event: Readonly<Record<string, string | number | boolean>>): void;
  error(event: Readonly<Record<string, string | number | boolean>>): void;
}

/**
 * Handles media messages independently so one failure does not retry the full batch.
 *
 * @param batch - Cloudflare Queue batch containing untrusted media jobs.
 * @param processor - Application-owned media operation implementation.
 * @param logger - Optional structured queue logger.
 * @returns A promise that resolves after every message is explicitly handled.
 */
export async function consumeMediaBatch(
  batch: MessageBatch<unknown>,
  processor: MediaJobProcessor,
  logger?: MediaQueueLogger,
): Promise<void> {
  for (const message of batch.messages) {
    let job: MediaProcessingJobV1;
    try {
      job = parseMediaProcessingJob(message.body);
    } catch (error) {
      logger?.error({
        event: "media_job_rejected",
        queueMessageId: message.id,
        reason: error instanceof Error ? error.message : "Invalid payload",
      });
      message.ack();
      continue;
    }

    try {
      await processor.process(job);
      logger?.info({ event: "media_job_processed", jobId: job.jobId });
      message.ack();
    } catch (error) {
      logger?.error({
        event: "media_job_failed",
        jobId: job.jobId,
        reason: error instanceof Error ? error.message : "Unknown media failure",
      });
      message.retry({
        delaySeconds: Math.min(30 * 2 ** Math.max(0, message.attempts - 1), 3_600),
      });
    }
  }
}
