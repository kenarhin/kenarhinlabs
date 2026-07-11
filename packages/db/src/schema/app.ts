import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  jsonb,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { timestamps, uuidPrimaryKey } from "./common.js";
import { appSchema } from "./namespaces.js";

/** Auth-linked application profile; auth.users references are enforced in SQL migrations. */
export const profiles = appSchema.table(
  "profiles",
  {
    id: uuid("id").primaryKey(),
    displayName: text("display_name").notNull(),
    avatarAssetId: uuid("avatar_asset_id"),
    bio: text("bio"),
    timezone: text("timezone").default("Africa/Accra").notNull(),
    status: text("status").default("active").notNull(),
    ...timestamps,
  },
  (table) => [
    index("profiles_avatar_asset_idx")
      .on(table.avatarAssetId)
      .where(sql`${table.avatarAssetId} is not null`),
    check(
      "profiles_status_check",
      sql`${table.status} in ('active', 'invited', 'suspended', 'deleted')`,
    ),
  ],
);

export const roles = appSchema.table("roles", {
  id: uuidPrimaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  isSystem: boolean("is_system").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const permissions = appSchema.table("permissions", {
  id: uuidPrimaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  group: text("group").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const userRoles = appSchema.table(
  "user_roles",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    assignedBy: uuid("assigned_by"),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.roleId] }),
    index("user_roles_role_idx").on(table.roleId),
    index("user_roles_assigned_by_idx")
      .on(table.assignedBy)
      .where(sql`${table.assignedBy} is not null`),
  ],
);

export const rolePermissions = appSchema.table(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.roleId, table.permissionId] }),
    index("role_permissions_permission_idx").on(table.permissionId),
  ],
);

export const settings = appSchema.table(
  "settings",
  {
    key: text("key").primaryKey(),
    value: jsonb("value").$type<unknown>().default({}).notNull(),
    description: text("description"),
    updatedBy: uuid("updated_by"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("settings_updated_by_idx")
      .on(table.updatedBy)
      .where(sql`${table.updatedBy} is not null`),
  ],
);
