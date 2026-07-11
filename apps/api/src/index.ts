import type { ProjectionWorkflowParams } from "@labs/sync";
import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";

import { createApp } from "./app";
import { consumeQueueBatch, runSyncWorkflow } from "./queues";
import { createWorkerServices } from "./services/postgres";

export { createApp } from "./app";
export type { ApiServices } from "./services/contracts";

/** Creates request-scoped pg resources so no I/O object crosses Worker requests. */
const worker = {
  fetch(request, env, context) {
    return createApp(createWorkerServices(env)).fetch(request, env, context);
  },
  async queue(batch, env) {
    await consumeQueueBatch(batch, env, createWorkerServices(env));
  },
} satisfies ExportedHandler<CloudflareBindings>;

/** Durable entrypoint for retried public read-model projection work. */
export class SyncWorkflow extends WorkflowEntrypoint<CloudflareBindings, ProjectionWorkflowParams> {
  public override run(
    event: Readonly<WorkflowEvent<ProjectionWorkflowParams>>,
    step: WorkflowStep,
  ) {
    return runSyncWorkflow(event, step, this.env, createWorkerServices(this.env));
  }
}

export default worker;
