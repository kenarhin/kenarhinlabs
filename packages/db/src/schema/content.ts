import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  customType,
  index,
  integer,
  jsonb,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { profiles } from "./app.js";
import { timestamps, uuidPrimaryKey } from "./common.js";
import { assets } from "./media.js";
import { contentSchema } from "./namespaces.js";

/** PostgreSQL full-text vector used by the canonical content search index. */
const tsvector = customType<{ data: string }>({
  dataType: () => "tsvector",
});

/** Canonical CMS record for every public content family. */
export const contentItems = contentSchema.table(
  "content_items",
  {
    id: uuidPrimaryKey(),
    type: text("type").notNull(),
    status: text("status").default("draft").notNull(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    excerpt: text("excerpt"),
    bodyFormat: text("body_format").default("markdown").notNull(),
    bodyMarkdown: text("body_markdown"),
    bodyBlocks: jsonb("body_blocks").$type<unknown[]>(),
    coverAssetId: uuid("cover_asset_id").references(() => assets.id, { onDelete: "set null" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    canonicalUrl: text("canonical_url"),
    ogAssetId: uuid("og_asset_id").references(() => assets.id, { onDelete: "set null" }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    createdBy: uuid("created_by").notNull(),
    updatedBy: uuid("updated_by").notNull(),
    publishedBy: uuid("published_by"),
    ...timestamps,
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      // Raw column names avoid a self-reference while the table object is being initialized.
      sql`to_tsvector('english'::regconfig, coalesce(title, '') || ' ' || coalesce(excerpt, '') || ' ' || coalesce(body_markdown, ''))`,
    ),
  },
  (table) => [
    index("content_items_author_idx").on(table.authorId),
    index("content_items_cover_asset_idx")
      .on(table.coverAssetId)
      .where(sql`${table.coverAssetId} is not null`),
    index("content_items_created_by_idx").on(table.createdBy),
    index("content_items_og_asset_idx")
      .on(table.ogAssetId)
      .where(sql`${table.ogAssetId} is not null`),
    index("content_items_published_by_idx")
      .on(table.publishedBy)
      .where(sql`${table.publishedBy} is not null`),
    index("content_items_updated_by_idx").on(table.updatedBy),
    uniqueIndex("content_items_type_slug_active_unique")
      .on(table.type, table.slug)
      .where(sql`${table.deletedAt} is null`),
    index("content_items_status_published_idx").on(table.status, table.publishedAt.desc()),
    index("content_items_type_status_published_idx").on(
      table.type,
      table.status,
      table.publishedAt.desc(),
    ),
    index("content_items_search_idx").using("gin", table.searchVector),
    check(
      "content_items_type_check",
      sql`${table.type} in ('post','case_study','stack_guide','lab_note','service_page','landing_page','tool_page','offer_page','legal_page','product_update')`,
    ),
    check(
      "content_items_status_check",
      sql`${table.status} in ('draft','review','scheduled','published','archived')`,
    ),
    check(
      "content_items_body_format_check",
      sql`${table.bodyFormat} in ('markdown','blocks','html_sanitized')`,
    ),
    check(
      "content_items_blocks_check",
      sql`${table.bodyBlocks} is null or jsonb_typeof(${table.bodyBlocks}) = 'array'`,
    ),
    check(
      "content_items_published_at_check",
      sql`${table.status} <> 'published' or ${table.publishedAt} is not null`,
    ),
    check(
      "content_items_scheduled_for_check",
      sql`${table.status} <> 'scheduled' or ${table.scheduledFor} is not null`,
    ),
  ],
);

export const contentRevisions = contentSchema.table(
  "content_revisions",
  {
    id: uuidPrimaryKey(),
    contentId: uuid("content_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    revisionNumber: integer("revision_number").notNull(),
    snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
    changeNote: text("change_note"),
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("content_revisions_created_by_idx").on(table.createdBy),
    uniqueIndex("content_revisions_content_revision_unique").on(
      table.contentId,
      table.revisionNumber,
    ),
    check("content_revisions_number_check", sql`${table.revisionNumber} > 0`),
  ],
);

export const categories = contentSchema.table("categories", {
  id: uuidPrimaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const tags = contentSchema.table("tags", {
  id: uuidPrimaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const contentCategories = contentSchema.table(
  "content_categories",
  {
    contentId: uuid("content_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.contentId, table.categoryId] }),
    index("content_categories_category_idx").on(table.categoryId),
  ],
);

export const contentTags = contentSchema.table(
  "content_tags",
  {
    contentId: uuid("content_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.contentId, table.tagId] }),
    index("content_tags_tag_idx").on(table.tagId),
  ],
);

export const redirects = contentSchema.table(
  "redirects",
  {
    id: uuidPrimaryKey(),
    sourcePath: text("source_path").notNull().unique(),
    targetPath: text("target_path").notNull(),
    statusCode: integer("status_code").default(301).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    check("redirects_status_code_check", sql`${table.statusCode} in (301, 302)`),
    check("redirects_source_path_check", sql`${table.sourcePath} like '/%'`),
    check(
      "redirects_target_path_check",
      sql`${table.targetPath} like '/%' or ${table.targetPath} ~ '^https://'`,
    ),
  ],
);

export const navigationItems = contentSchema.table(
  "navigation_items",
  {
    id: uuidPrimaryKey(),
    location: text("location").notNull(),
    label: text("label").notNull(),
    href: text("href").notNull(),
    parentId: uuid("parent_id").references((): AnyPgColumn => navigationItems.id, {
      onDelete: "cascade",
    }),
    sortOrder: integer("sort_order").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    index("navigation_items_parent_idx")
      .on(table.parentId)
      .where(sql`${table.parentId} is not null`),
    index("navigation_items_location_sort_idx").on(table.location, table.sortOrder),
    check(
      "navigation_items_parent_check",
      sql`${table.parentId} is null or ${table.parentId} <> ${table.id}`,
    ),
  ],
);
