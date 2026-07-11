import { CloudflareEmailTransport, consumeEmailBatch } from "@labs/email";
import { consumeMediaBatch } from "@labs/storage";
import {
  consumeProjectionBatch,
  createDefaultProjectionRegistry,
  D1ProjectionWriter,
  processOutboxEvent,
  runProjectionWorkflow,
  type ProjectionProcessorDependencies,
  type ProjectionWorkflowParams,
} from "@labs/sync";
import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";

import { logError, logInfo } from "./middleware/logging";
import type { ApiServices } from "./services/contracts";

const QUEUES = {
  content: "kenarhinlabs-content",
  email: "kenarhinlabs-email",
  media: "kenarhinlabs-media",
} as const;

/** Adapts package consumer fields to the API's structured Workers logger. */
const queueLogger = {
  info(fields: Readonly<Record<string, string | number | boolean>>) {
    const { event, ...details } = fields;
    logInfo(typeof event === "string" ? event : "queue.info", details);
  },
  error(fields: Readonly<Record<string, string | number | boolean>>) {
    const { event, ...details } = fields;
    logError(typeof event === "string" ? event : "queue.error", details);
  },
};

/** Creates one invocation-scoped projection dependency graph from generated bindings. */
function projectionDependencies(
  env: CloudflareBindings,
  services: ApiServices,
): ProjectionProcessorDependencies {
  return {
    registry: createDefaultProjectionRegistry(),
    source: services.platform.outboxEventSource,
    writer: new D1ProjectionWriter(env.D1_PUBLIC),
  };
}

/** Dispatches each configured Queue batch to its typed package consumer. */
export async function consumeQueueBatch(
  batch: MessageBatch<unknown>,
  env: CloudflareBindings,
  services: ApiServices,
): Promise<void> {
  switch (batch.queue) {
    case QUEUES.content:
      await consumeProjectionBatch(batch, {
        ...projectionDependencies(env, services),
        logger: queueLogger,
      });
      return;
    case QUEUES.email:
      await consumeEmailBatch(batch, {
        logger: queueLogger,
        repository: services.platform.emailDeliveryRepository,
        transport: new CloudflareEmailTransport(env.EMAIL),
      });
      return;
    case QUEUES.media:
      await consumeMediaBatch(batch, services.platform.mediaJobProcessor, queueLogger);
      return;
    default:
      // An unexpected binding name is operational misconfiguration, not a
      // reason to acknowledge and lose the entire batch.
      logError("queue.unrecognized", { queue: batch.queue });
      batch.retryAll({ delaySeconds: 60 });
  }
}

/** Runs one durable projection using the same ports as the Queue consumer. */
export function runSyncWorkflow(
  event: Readonly<WorkflowEvent<ProjectionWorkflowParams>>,
  step: WorkflowStep,
  env: CloudflareBindings,
  services: ApiServices,
) {
  const dependencies = projectionDependencies(env, services);
  return runProjectionWorkflow(event, step, (eventId) => processOutboxEvent(eventId, dependencies));
}
