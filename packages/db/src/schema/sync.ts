import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  integer,
  jsonb,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { timestamps, uuidPrimaryKey } from "./common.js";
import { syncSchema } from "./namespaces.js";

/** Durable transactional outbox consumed by Cloudflare Queue/Workflow projectors. */
export const outboxEvents = syncSchema.table(
  "outbox_events",
  {
    id: uuidPrimaryKey(),
    eventType: text("event_type").notNull(),
    aggregateType: text("aggregate_type").notNull(),
    aggregateId: uuid("aggregate_id").notNull(),
    syncVersion: bigint("sync_version", { mode: "number" })
      .generatedAlwaysAsIdentity({ name: "outbox_events_sync_version_seq" })
      .notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    status: text("status").default("pending").notNull(),
    attempts: integer("attempts").default(0).notNull(),
    availableAt: timestamp("available_at", { withTimezone: true }).defaultNow().notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lastError: text("last_error"),
    dedupeKey: text("dedupe_key"),
    ...timestamps,
  },
  (table) => [
    index("outbox_events_poll_idx").on(table.status, table.availableAt),
    index("outbox_events_aggregate_version_idx").on(
      table.aggregateType,
      table.aggregateId,
      table.syncVersion,
    ),
    uniqueIndex("outbox_events_dedupe_key_unique")
      .on(table.dedupeKey)
      .where(sql`${table.dedupeKey} is not null`),
    check(
      "outbox_events_status_check",
      sql`${table.status} in ('pending','processing','processed','failed','dead_lettered')`,
    ),
    check("outbox_events_attempts_check", sql`${table.attempts} >= 0`),
  ],
);

export const projectionRuns = syncSchema.table(
  "projection_runs",
  {
    id: uuidPrimaryKey(),
    projection: text("projection").notNull(),
    status: text("status").default("started").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    error: text("error"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  },
  (table) => [
    check("projection_runs_status_check", sql`${table.status} in ('started','completed','failed')`),
    check(
      "projection_runs_completion_check",
      sql`${table.status} = 'started' or ${table.completedAt} is not null`,
    ),
  ],
);
