import type { OutboxEvent, Projector, ProjectionMutation } from "./types";

/**
 * Signals a permanent projection contract failure that retries cannot repair.
 */
export class NonRetryableProjectionError extends Error {
  public override readonly name = "NonRetryableProjectionError";
}

/**
 * Maps versioned outbox event names to deterministic D1 projector functions.
 */
export class ProjectionRegistry {
  private readonly projectors = new Map<string, Projector>();

  /**
   * Registers a projector for one exact outbox event type.
   *
   * @param eventType - Stable, versioned event name such as content.published.v1.
   * @param projector - Pure event-to-mutation function.
   * @returns This registry for fluent composition.
   */
  public register(eventType: string, projector: Projector): this {
    if (this.projectors.has(eventType)) {
      throw new TypeError(`A projector is already registered for ${eventType}.`);
    }
    this.projectors.set(eventType, projector);
    return this;
  }

  /**
   * Projects an event or throws a permanent contract error for unknown event types.
   *
   * @param event - Canonical outbox event loaded from Supabase.
   * @returns One or more deterministic D1 mutations.
   */
  public project(event: OutboxEvent): readonly ProjectionMutation[] {
    const projector = this.projectors.get(event.eventType);
    if (projector === undefined) {
      throw new NonRetryableProjectionError(
        `No D1 projector is registered for ${event.eventType}.`,
      );
    }

    const mutations = projector(event);
    return Array.isArray(mutations) ? mutations : [mutations as ProjectionMutation];
  }
}
