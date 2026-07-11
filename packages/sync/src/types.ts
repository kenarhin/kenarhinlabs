/**
 * Represents a canonical transactional outbox event loaded from Supabase Postgres.
 */
export interface OutboxEvent {
  id: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: unknown;
  syncVersion: number;
  createdAt: string;
}

/**
 * Defines the compact, JSON-safe message sent through the content projection Queue.
 */
export interface ProjectionQueueMessageV1 {
  schemaVersion: 1;
  eventId: string;
  enqueuedAt: string;
}

/**
 * Restricts D1 bind values to the primitives accepted by the Workers binding.
 */
export type ProjectionValue = string | number | null | ArrayBuffer;

/**
 * Describes a public D1 upsert or delete produced by a registered projector.
 */
export type ProjectionMutation =
  | {
      action: "upsert";
      projection: string;
      table: string;
      keyColumn: string;
      keyValue: ProjectionValue;
      values: Readonly<Record<string, ProjectionValue>>;
    }
  | {
      action: "delete";
      projection: string;
      table: string;
      keyColumn: string;
      keyValue: ProjectionValue;
    };

/**
 * Converts a canonical outbox event into one or more public D1 mutations.
 */
export type Projector = (event: OutboxEvent) => ProjectionMutation | readonly ProjectionMutation[];

/**
 * Loads and updates canonical outbox state through the owning database package.
 */
export interface OutboxEventSource {
  load(eventId: string): Promise<OutboxEvent | null>;
  markProcessed(eventId: string, processedAt: string): Promise<void>;
  markFailed(eventId: string, failure: { message: string; deadLettered: boolean }): Promise<void>;
}

/**
 * Summarizes a projection attempt for queue logs and Workflow persistence.
 */
export type ProjectionProcessResult =
  | { status: "applied"; eventId: string; mutations: number }
  | { status: "already-applied"; eventId: string; mutations: number }
  | { status: "missing"; eventId: string; mutations: 0 };
