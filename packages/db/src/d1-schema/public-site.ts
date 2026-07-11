import { sql } from "drizzle-orm";
import {
  type AnySQLiteColumn,
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const publicNavigation = sqliteTable(
  "public_navigation",
  {
    id: text("id").primaryKey(),
    location: text("location").notNull(),
    label: text("label").notNull(),
    href: text("href").notNull(),
    parentId: text("parent_id").references((): AnySQLiteColumn => publicNavigation.id, {
      onDelete: "cascade",
    }),
    sortOrder: integer("sort_order").default(0).notNull(),
    syncVersion: integer("sync_version").default(1).notNull(),
  },
  (table) => [
    index("public_navigation_location_order_idx").on(table.location, table.sortOrder),
    check(
      "public_navigation_parent_check",
      sql`${table.parentId} is null or ${table.parentId} <> ${table.id}`,
    ),
    check("public_navigation_sync_version_check", sql`${table.syncVersion} > 0`),
  ],
);

export const publicHomepageSections = sqliteTable(
  "public_homepage_sections",
  {
    id: text("id").primaryKey(),
    sectionKey: text("section_key").notNull(),
    sectionType: text("section_type").notNull(),
    dataJson: text("data_json").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    updatedAt: text("updated_at").notNull(),
    syncVersion: integer("sync_version").default(1).notNull(),
  },
  (table) => [
    uniqueIndex("public_homepage_sections_key_unique").on(table.sectionKey),
    check("public_homepage_sections_data_check", sql`json_valid(${table.dataJson})`),
    check("public_homepage_sections_sync_version_check", sql`${table.syncVersion} > 0`),
  ],
);

export const publicSitemapUrls = sqliteTable(
  "public_sitemap_urls",
  {
    url: text("url").primaryKey(),
    lastModified: text("last_modified"),
    changeFrequency: text("change_frequency"),
    priority: integer("priority_basis_points"),
    syncVersion: integer("sync_version").default(1).notNull(),
  },
  (table) => [
    index("public_sitemap_urls_modified_idx").on(table.lastModified),
    check(
      "public_sitemap_urls_frequency_check",
      sql`${table.changeFrequency} is null or ${table.changeFrequency} in ('always','hourly','daily','weekly','monthly','yearly','never')`,
    ),
    check(
      "public_sitemap_urls_priority_check",
      sql`${table.priority} is null or ${table.priority} between 0 and 10000`,
    ),
    check("public_sitemap_urls_sync_version_check", sql`${table.syncVersion} > 0`),
  ],
);

export const publicRedirects = sqliteTable(
  "public_redirects",
  {
    sourcePath: text("source_path").primaryKey(),
    targetPath: text("target_path").notNull(),
    statusCode: integer("status_code").notNull(),
    syncVersion: integer("sync_version").default(1).notNull(),
  },
  (table) => [
    check("public_redirects_status_check", sql`${table.statusCode} in (301, 302)`),
    check("public_redirects_sync_version_check", sql`${table.syncVersion} > 0`),
  ],
);

export const publicSeoMetadata = sqliteTable(
  "public_seo_metadata",
  {
    path: text("path").primaryKey(),
    title: text("title"),
    description: text("description"),
    canonicalUrl: text("canonical_url"),
    ogImageUrl: text("og_image_url"),
    robots: text("robots"),
    structuredDataJson: text("structured_data_json"),
    updatedAt: text("updated_at").notNull(),
    syncVersion: integer("sync_version").default(1).notNull(),
  },
  (table) => [
    index("public_seo_metadata_updated_idx").on(table.updatedAt),
    check(
      "public_seo_metadata_structured_data_check",
      sql`${table.structuredDataJson} is null or json_valid(${table.structuredDataJson})`,
    ),
    check("public_seo_metadata_sync_version_check", sql`${table.syncVersion} > 0`),
  ],
);

/** Idempotency receipt inserted atomically with each projection mutation. */
export const projectionReceipts = sqliteTable(
  "projection_receipts",
  {
    eventId: text("event_id").primaryKey(),
    projection: text("projection").notNull(),
    aggregateType: text("aggregate_type").notNull(),
    aggregateId: text("aggregate_id").notNull(),
    syncVersion: integer("sync_version").notNull(),
    payloadChecksum: text("payload_checksum").notNull(),
    appliedAt: text("applied_at").notNull(),
  },
  (table) => [
    index("projection_receipts_aggregate_idx").on(table.aggregateType, table.aggregateId),
    check("projection_receipts_sync_version_check", sql`${table.syncVersion} > 0`),
  ],
);
