import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const publicTools = sqliteTable(
  "public_tools",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    vendorName: text("vendor_name"),
    category: text("category").notNull(),
    description: text("description"),
    websiteUrl: text("website_url"),
    logoUrl: text("logo_url"),
    isRecommended: integer("is_recommended", { mode: "boolean" }).default(false).notNull(),
    setupDifficulty: text("setup_difficulty").notNull(),
    metadataJson: text("metadata_json").default("{}").notNull(),
    updatedAt: text("updated_at").notNull(),
    syncVersion: integer("sync_version").default(1).notNull(),
  },
  (table) => [
    uniqueIndex("public_tools_slug_unique").on(table.slug),
    index("public_tools_category_recommended_idx").on(table.category, table.isRecommended),
    check("public_tools_recommended_check", sql`${table.isRecommended} in (0, 1)`),
    check(
      "public_tools_difficulty_check",
      sql`${table.setupDifficulty} in ('beginner','intermediate','advanced')`,
    ),
    check("public_tools_metadata_check", sql`json_valid(${table.metadataJson})`),
    check("public_tools_sync_version_check", sql`${table.syncVersion} > 0`),
  ],
);

export const publicOffers = sqliteTable(
  "public_offers",
  {
    id: text("id").primaryKey(),
    toolId: text("tool_id").references(() => publicTools.id, { onDelete: "set null" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    offerType: text("offer_type").notNull(),
    code: text("code"),
    startsAt: text("starts_at"),
    endsAt: text("ends_at"),
    terms: text("terms"),
    affiliateUrl: text("affiliate_url"),
    updatedAt: text("updated_at").notNull(),
    syncVersion: integer("sync_version").default(1).notNull(),
  },
  (table) => [
    uniqueIndex("public_offers_slug_unique").on(table.slug),
    index("public_offers_window_idx").on(table.startsAt, table.endsAt),
    check(
      "public_offers_type_check",
      sql`${table.offerType} in ('discount','free_trial','credit','coupon','bundle','internal_service')`,
    ),
    check(
      "public_offers_window_check",
      sql`${table.startsAt} is null or ${table.endsAt} is null or ${table.startsAt} < ${table.endsAt}`,
    ),
    check("public_offers_sync_version_check", sql`${table.syncVersion} > 0`),
  ],
);
