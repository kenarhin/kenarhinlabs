import { timestamp, uuid } from "drizzle-orm/pg-core";

/** Reusable UUID primary key with a database-generated value. */
export const uuidPrimaryKey = () => uuid("id").defaultRandom().primaryKey();

/** Reusable created/updated timestamps; SQL triggers maintain updated_at. */
export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};
