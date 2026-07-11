import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/** Denormalized, sanitized content rendered for public delivery. */
export const publicContent = sqliteTable(
  "public_content",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    excerpt: text("excerpt"),
    bodyHtml: text("body_html").notNull(),
    coverUrl: text("cover_url"),
    authorName: text("author_name").notNull(),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    publishedAt: text("published_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    syncVersion: integer("sync_version").default(1).notNull(),
  },
  (table) => [
    uniqueIndex("public_content_type_slug_unique").on(table.type, table.slug),
    index("public_content_type_published_idx").on(table.type, table.publishedAt),
    index("public_content_published_idx").on(table.publishedAt),
    check("public_content_sync_version_check", sql`${table.syncVersion} > 0`),
  ],
);

export const publicContentBlocks = sqliteTable(
  "public_content_blocks",
  {
    contentId: text("content_id")
      .notNull()
      .references(() => publicContent.id, { onDelete: "cascade" }),
    blockKey: text("block_key").notNull(),
    blockType: text("block_type").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    dataJson: text("data_json").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.contentId, table.blockKey] }),
    index("public_content_blocks_order_idx").on(table.contentId, table.sortOrder),
    check("public_content_blocks_data_check", sql`json_valid(${table.dataJson})`),
  ],
);

export const publicCaseStudies = sqliteTable(
  "public_case_studies",
  {
    id: text("id")
      .primaryKey()
      .references(() => publicContent.id, { onDelete: "cascade" }),
    clientName: text("client_name"),
    summary: text("summary"),
    challenge: text("challenge"),
    solution: text("solution"),
    outcome: text("outcome"),
    featured: integer("featured", { mode: "boolean" }).default(false).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
  },
  (table) => [check("public_case_studies_featured_check", sql`${table.featured} in (0, 1)`)],
);

export const publicStackGuides = sqliteTable(
  "public_stack_guides",
  {
    id: text("id")
      .primaryKey()
      .references(() => publicContent.id, { onDelete: "cascade" }),
    summary: text("summary"),
    audience: text("audience"),
    difficulty: text("difficulty"),
    toolsJson: text("tools_json").default("[]").notNull(),
  },
  (table) => [
    check(
      "public_stack_guides_difficulty_check",
      sql`${table.difficulty} is null or ${table.difficulty} in ('beginner','intermediate','advanced')`,
    ),
    check("public_stack_guides_tools_check", sql`json_valid(${table.toolsJson})`),
  ],
);
