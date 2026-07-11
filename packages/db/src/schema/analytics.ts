import { sql } from "drizzle-orm";
import { bigint, check, date, jsonb, text, unique, uuid } from "drizzle-orm/pg-core";

import { uuidPrimaryKey } from "./common.js";
import { analyticsSchema } from "./namespaces.js";

/** Compact daily aggregates; nullable dimensions are deduplicated by a NULLS NOT DISTINCT SQL index. */
export const eventsDaily = analyticsSchema.table(
  "events_daily",
  {
    id: uuidPrimaryKey(),
    date: date("date").notNull(),
    eventName: text("event_name").notNull(),
    entityType: text("entity_type"),
    entityId: uuid("entity_id"),
    // SQL literal avoids JSON serialization of a JavaScript bigint in Drizzle Kit.
    count: bigint("count", { mode: "bigint" })
      .default(sql`0`)
      .notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  },
  (table) => [
    unique("events_daily_dimensions_unique")
      .on(table.date, table.eventName, table.entityType, table.entityId)
      .nullsNotDistinct(),
    check("events_daily_count_check", sql`${table.count} >= 0`),
  ],
);
