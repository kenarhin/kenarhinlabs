import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";

import type { ProjectionProcessResult } from "./types";

/**
 * Defines the serializable event payload accepted by a durable sync Workflow.
 */
export interface ProjectionWorkflowParams {
  eventId: string;
}

/**
 * Runs one projection as a durable, independently retried Workflow step.
 *
 * @param event - Workflow event containing the canonical outbox event ID.
 * @param step - Workflow step API supplied by the Workers runtime.
 * @param process - Application-owned function that projects the event.
 * @returns Serializable projection result persisted by Workflows.
 */
export async function runProjectionWorkflow(
  event: Readonly<WorkflowEvent<ProjectionWorkflowParams>>,
  step: WorkflowStep,
  process: (eventId: string) => Promise<ProjectionProcessResult>,
): Promise<ProjectionProcessResult> {
  return await step.do(
    `project-${event.payload.eventId}`,
    {
      retries: { limit: 5, delay: "15 seconds", backoff: "exponential" },
      timeout: "5 minutes",
    },
    async () => await process(event.payload.eventId),
  );
}
