import { sql } from "drizzle-orm";
import { boolean, check, index, jsonb, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { timestamps, uuidPrimaryKey } from "./common.js";
import { systemSchema } from "./namespaces.js";

export const featureFlags = systemSchema.table(
  "feature_flags",
  {
    key: text("key").primaryKey(),
    enabled: boolean("enabled").default(false).notNull(),
    description: text("description"),
    rules: jsonb("rules").$type<Record<string, unknown>>().default({}).notNull(),
    updatedBy: uuid("updated_by"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("feature_flags_updated_by_idx")
      .on(table.updatedBy)
      .where(sql`${table.updatedBy} is not null`),
  ],
);

export const integrations = systemSchema.table(
  "integrations",
  {
    id: uuidPrimaryKey(),
    provider: text("provider").notNull(),
    name: text("name").notNull(),
    status: text("status").default("active").notNull(),
    config: jsonb("config").$type<Record<string, unknown>>().default({}).notNull(),
    ...timestamps,
  },
  (table) => [
    check(
      "integrations_status_check",
      sql`${table.status} in ('active','paused','broken','archived')`,
    ),
  ],
);
