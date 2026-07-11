import { pgSchema } from "drizzle-orm/pg-core";

/** Central schema objects prevent accidental placement in Postgres `public`. */
export const appSchema = pgSchema("app");
export const contentSchema = pgSchema("content");
export const crmSchema = pgSchema("crm");
export const commerceSchema = pgSchema("commerce");
export const mediaSchema = pgSchema("media");
export const commsSchema = pgSchema("comms");
export const syncSchema = pgSchema("sync");
export const auditSchema = pgSchema("audit");
export const analyticsSchema = pgSchema("analytics");
export const systemSchema = pgSchema("system");
