import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  bigint,
  check,
  index,
  integer,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { timestamps, uuidPrimaryKey } from "./common.js";
import { mediaSchema } from "./namespaces.js";

export const assetFolders = mediaSchema.table(
  "asset_folders",
  {
    id: uuidPrimaryKey(),
    name: text("name").notNull(),
    parentId: uuid("parent_id").references((): AnyPgColumn => assetFolders.id, {
      onDelete: "cascade",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("asset_folders_parent_idx")
      .on(table.parentId)
      .where(sql`${table.parentId} is not null`),
    // Prevent direct self-cycles; deeper tree-cycle prevention belongs in domain validation.
    check(
      "asset_folders_parent_check",
      sql`${table.parentId} is null or ${table.parentId} <> ${table.id}`,
    ),
  ],
);

/** R2 object metadata; binaries remain in R2 and never enter Postgres. */
export const assets = mediaSchema.table(
  "assets",
  {
    id: uuidPrimaryKey(),
    folderId: uuid("folder_id").references(() => assetFolders.id, { onDelete: "set null" }),
    bucket: text("bucket").notNull(),
    objectKey: text("object_key").notNull(),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "bigint" }).notNull(),
    width: integer("width"),
    height: integer("height"),
    altText: text("alt_text"),
    caption: text("caption"),
    uploadedBy: uuid("uploaded_by").notNull(),
    ...timestamps,
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("assets_uploaded_by_idx").on(table.uploadedBy),
    uniqueIndex("assets_bucket_object_key_unique").on(table.bucket, table.objectKey),
    index("assets_folder_idx")
      .on(table.folderId)
      .where(sql`${table.deletedAt} is null`),
    check("assets_size_bytes_check", sql`${table.sizeBytes} >= 0`),
    check(
      "assets_dimensions_check",
      sql`(${table.width} is null or ${table.width} > 0) and (${table.height} is null or ${table.height} > 0)`,
    ),
  ],
);

export const assetUsages = mediaSchema.table(
  "asset_usages",
  {
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    usageType: text("usage_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.assetId, table.entityType, table.entityId, table.usageType] }),
    index("asset_usages_entity_idx").on(table.entityType, table.entityId),
  ],
);
