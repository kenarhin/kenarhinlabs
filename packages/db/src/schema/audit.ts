import { index, inet, jsonb, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { uuidPrimaryKey } from "./common.js";
import { auditSchema } from "./namespaces.js";

/** Append-only security and business audit record. */
export const auditLogs = auditSchema.table(
  "audit_logs",
  {
    id: uuidPrimaryKey(),
    actorId: uuid("actor_id"),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    ipAddress: inet("ip_address"),
    userAgent: text("user_agent"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("audit_logs_entity_created_idx").on(
      table.entityType,
      table.entityId,
      table.createdAt.desc(),
    ),
    index("audit_logs_actor_created_idx").on(table.actorId, table.createdAt.desc()),
    index("audit_logs_created_brin_idx").using("brin", table.createdAt),
  ],
);
