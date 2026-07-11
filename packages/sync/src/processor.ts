import { D1ProjectionWriter } from "./d1-writer";
import { assertValidOutboxEvent } from "./payload";
import { ProjectionRegistry } from "./registry";
import type { OutboxEventSource, ProjectionProcessResult } from "./types";

/**
 * Dependencies required to project one canonical outbox event.
 */
export interface ProjectionProcessorDependencies {
  source: OutboxEventSource;
  registry: ProjectionRegistry;
  writer: D1ProjectionWriter;
  now?: () => Date;
}

/**
 * Loads, projects, atomically writes, and acknowledges one outbox event.
 *
 * @param eventId - Stable outbox event UUID carried by the Queue or Workflow.
 * @param dependencies - Canonical source, registry, D1 writer, and optional clock.
 * @returns Serializable projection outcome.
 */
export async function processOutboxEvent(
  eventId: string,
  dependencies: ProjectionProcessorDependencies,
): Promise<ProjectionProcessResult> {
  const event = await dependencies.source.load(eventId);
  if (event === null) {
    return { status: "missing", eventId, mutations: 0 };
  }

  assertValidOutboxEvent(event);
  const mutations = dependencies.registry.project(event);
  const status = await dependencies.writer.apply(event, mutations);
  const processedAt = (dependencies.now ?? (() => new Date()))().toISOString();
  await dependencies.source.markProcessed(event.id, processedAt);
  return { status, eventId: event.id, mutations: mutations.length };
}
