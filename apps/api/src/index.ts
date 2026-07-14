import type { ProjectionWorkflowParams } from "@labs/sync";
import { canonicalMailboxForAddress, NO_REPLY_EMAIL } from "@labs/email";
import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";

import { createApp } from "./app";
import { logInfo } from "./middleware/logging";
import { consumeQueueBatch, runSyncWorkflow } from "./queues";
import { createWorkerServices, publishPendingEmailJobs } from "./services/postgres";
import { InboundEmailRejection } from "./services/inbound-email";

export { createApp } from "./app";
export type { ApiServices } from "./services/contracts";

/** Creates request-scoped pg resources so no I/O object crosses Worker requests. */
const worker = {
  fetch(request, env, context) {
    return createApp(createWorkerServices(env)).fetch(request, env, context);
  },
  async email(message, env) {
    const recipient = message.to.trim().toLowerCase();
    if (recipient === NO_REPLY_EMAIL) {
      message.setReject("This address does not accept replies");
      return;
    }
    const mailbox = canonicalMailboxForAddress(recipient);
    if (mailbox === null || !mailbox.receivesEmail) {
      message.setReject("Unknown recipient");
      return;
    }

    try {
      const result = await createWorkerServices(env).inboundEmail.receive(message);
      logInfo("inbound_email.persisted", {
        channel: mailbox.channel,
        duplicate: result.duplicate,
        threadId: result.threadId,
      });
    } catch (error) {
      if (error instanceof InboundEmailRejection) {
        message.setReject(error.reason);
        return;
      }
      // Throwing leaves infrastructure failures retriable at the SMTP boundary.
      throw error;
    }
  },
  async queue(batch, env) {
    await consumeQueueBatch(batch, env, createWorkerServices(env));
  },
  async scheduled(_controller, env) {
    // The cron publisher closes the transaction-to-Queue failure window. Each
    // pass is bounded and duplicate Queue messages remain idempotent downstream.
    await publishPendingEmailJobs(env, 100);
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
