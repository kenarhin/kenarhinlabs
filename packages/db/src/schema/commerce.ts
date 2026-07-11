import { sql } from "drizzle-orm";
import { boolean, check, index, jsonb, numeric, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { timestamps, uuidPrimaryKey } from "./common.js";
import { assets } from "./media.js";
import { commerceSchema } from "./namespaces.js";

export const vendors = commerceSchema.table(
  "vendors",
  {
    id: uuidPrimaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    websiteUrl: text("website_url"),
    description: text("description"),
    logoAssetId: uuid("logo_asset_id").references(() => assets.id, { onDelete: "set null" }),
    status: text("status").default("draft").notNull(),
    ...timestamps,
  },
  (table) => [
    index("vendors_logo_asset_idx")
      .on(table.logoAssetId)
      .where(sql`${table.logoAssetId} is not null`),
    check("vendors_status_check", sql`${table.status} in ('draft','active','archived')`),
  ],
);

export const tools = commerceSchema.table(
  "tools",
  {
    id: uuidPrimaryKey(),
    vendorId: uuid("vendor_id").references(() => vendors.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    category: text("category").notNull(),
    description: text("description"),
    websiteUrl: text("website_url"),
    status: text("status").default("draft").notNull(),
    isRecommended: boolean("is_recommended").default(false).notNull(),
    setupDifficulty: text("setup_difficulty").default("beginner").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    ...timestamps,
  },
  (table) => [
    index("tools_vendor_idx")
      .on(table.vendorId)
      .where(sql`${table.vendorId} is not null`),
    index("tools_category_status_idx").on(table.category, table.status),
    check("tools_status_check", sql`${table.status} in ('draft','active','archived')`),
    check(
      "tools_setup_difficulty_check",
      sql`${table.setupDifficulty} in ('beginner','intermediate','advanced')`,
    ),
  ],
);

export const offers = commerceSchema.table(
  "offers",
  {
    id: uuidPrimaryKey(),
    toolId: uuid("tool_id").references(() => tools.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    offerType: text("offer_type").notNull(),
    code: text("code"),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    status: text("status").default("draft").notNull(),
    terms: text("terms"),
    ...timestamps,
  },
  (table) => [
    index("offers_tool_idx")
      .on(table.toolId)
      .where(sql`${table.toolId} is not null`),
    index("offers_status_window_idx").on(table.status, table.startsAt, table.endsAt),
    check(
      "offers_type_check",
      sql`${table.offerType} in ('discount','free_trial','credit','coupon','bundle','internal_service')`,
    ),
    check("offers_status_check", sql`${table.status} in ('draft','active','expired','archived')`),
    check(
      "offers_window_check",
      sql`${table.startsAt} is null or ${table.endsAt} is null or ${table.startsAt} < ${table.endsAt}`,
    ),
  ],
);

export const affiliateLinks = commerceSchema.table(
  "affiliate_links",
  {
    id: uuidPrimaryKey(),
    toolId: uuid("tool_id").references(() => tools.id, { onDelete: "cascade" }),
    offerId: uuid("offer_id").references(() => offers.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    url: text("url").notNull(),
    disclosure: text("disclosure"),
    status: text("status").default("active").notNull(),
    ...timestamps,
  },
  (table) => [
    index("affiliate_links_tool_idx")
      .on(table.toolId)
      .where(sql`${table.toolId} is not null`),
    index("affiliate_links_offer_idx")
      .on(table.offerId)
      .where(sql`${table.offerId} is not null`),
    check(
      "affiliate_links_parent_check",
      sql`${table.toolId} is not null or ${table.offerId} is not null`,
    ),
    check("affiliate_links_status_check", sql`${table.status} in ('active','paused','archived')`),
  ],
);

export const pricingSnapshots = commerceSchema.table(
  "pricing_snapshots",
  {
    id: uuidPrimaryKey(),
    toolId: uuid("tool_id")
      .notNull()
      .references(() => tools.id, { onDelete: "cascade" }),
    planName: text("plan_name").notNull(),
    priceAmount: numeric("price_amount", { precision: 18, scale: 4 }),
    currency: text("currency"),
    billingInterval: text("billing_interval").notNull(),
    sourceUrl: text("source_url"),
    capturedAt: timestamp("captured_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("pricing_snapshots_tool_captured_idx").on(table.toolId, table.capturedAt.desc()),
    check(
      "pricing_snapshots_amount_check",
      sql`${table.priceAmount} is null or ${table.priceAmount} >= 0`,
    ),
    check(
      "pricing_snapshots_currency_check",
      sql`${table.currency} is null or ${table.currency} ~ '^[A-Z]{3}$'`,
    ),
    check(
      "pricing_snapshots_interval_check",
      sql`${table.billingInterval} in ('monthly','yearly','one_time','usage_based')`,
    ),
  ],
);
