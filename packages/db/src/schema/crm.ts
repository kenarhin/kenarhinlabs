import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { profiles } from "./app.js";
import { timestamps, uuidPrimaryKey } from "./common.js";
import { crmSchema } from "./namespaces.js";

export const clients = crmSchema.table(
  "clients",
  {
    id: uuidPrimaryKey(),
    type: text("type").notNull(),
    name: text("name").notNull(),
    slug: text("slug"),
    websiteUrl: text("website_url"),
    industry: text("industry"),
    status: text("status").default("lead").notNull(),
    source: text("source"),
    notes: text("notes"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    ...timestamps,
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("clients_created_by_idx").on(table.createdBy),
    uniqueIndex("clients_slug_active_unique")
      .on(table.slug)
      .where(sql`${table.slug} is not null and ${table.deletedAt} is null`),
    index("clients_status_idx")
      .on(table.status)
      .where(sql`${table.deletedAt} is null`),
    check("clients_type_check", sql`${table.type} in ('individual','company','organization')`),
    check(
      "clients_status_check",
      sql`${table.status} in ('lead','active','paused','completed','archived')`,
    ),
  ],
);

export const contacts = crmSchema.table(
  "contacts",
  {
    id: uuidPrimaryKey(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    roleTitle: text("role_title"),
    isPrimary: boolean("is_primary").default(false).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("contacts_one_primary_per_client")
      .on(table.clientId)
      .where(sql`${table.isPrimary}`),
    check("contacts_contact_check", sql`${table.email} is not null or ${table.phone} is not null`),
  ],
);

export const leads = crmSchema.table(
  "leads",
  {
    id: uuidPrimaryKey(),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    company: text("company"),
    source: text("source").notNull(),
    message: text("message"),
    interest: text("interest"),
    status: text("status").default("new").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    assignedTo: uuid("assigned_to").references(() => profiles.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (table) => [
    index("leads_assigned_to_idx")
      .on(table.assignedTo)
      .where(sql`${table.assignedTo} is not null`),
    index("leads_status_created_idx").on(table.status, table.createdAt.desc()),
    check(
      "leads_status_check",
      sql`${table.status} in ('new','contacted','qualified','won','lost','spam')`,
    ),
    check("leads_contact_check", sql`${table.email} is not null or ${table.phone} is not null`),
  ],
);

export const projects = crmSchema.table(
  "projects",
  {
    id: uuidPrimaryKey(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    slug: text("slug"),
    type: text("type").notNull(),
    status: text("status").default("planned").notNull(),
    description: text("description"),
    startDate: date("start_date"),
    targetLaunchDate: date("target_launch_date"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    ...timestamps,
  },
  (table) => [
    index("projects_created_by_idx").on(table.createdBy),
    uniqueIndex("projects_client_slug_unique")
      .on(table.clientId, table.slug)
      .where(sql`${table.slug} is not null`),
    index("projects_client_status_idx").on(table.clientId, table.status),
    check(
      "projects_status_check",
      sql`${table.status} in ('planned','active','paused','launched','completed','cancelled')`,
    ),
    check(
      "projects_dates_check",
      sql`${table.startDate} is null or ${table.targetLaunchDate} is null or ${table.startDate} <= ${table.targetLaunchDate}`,
    ),
  ],
);

export const projectMilestones = crmSchema.table(
  "project_milestones",
  {
    id: uuidPrimaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status").default("pending").notNull(),
    dueDate: date("due_date"),
    sortOrder: integer("sort_order").default(0).notNull(),
    ...timestamps,
  },
  (table) => [
    index("project_milestones_project_sort_idx").on(table.projectId, table.sortOrder),
    check(
      "project_milestones_status_check",
      sql`${table.status} in ('pending','active','done','blocked')`,
    ),
  ],
);

export const projectTasks = crmSchema.table(
  "project_tasks",
  {
    id: uuidPrimaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    milestoneId: uuid("milestone_id").references(() => projectMilestones.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status").default("todo").notNull(),
    priority: text("priority").default("normal").notNull(),
    assignedTo: uuid("assigned_to").references(() => profiles.id, { onDelete: "set null" }),
    dueAt: timestamp("due_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("project_tasks_milestone_idx")
      .on(table.milestoneId)
      .where(sql`${table.milestoneId} is not null`),
    index("project_tasks_project_status_idx").on(table.projectId, table.status),
    index("project_tasks_assignee_status_idx")
      .on(table.assignedTo, table.status)
      .where(sql`${table.assignedTo} is not null`),
    check(
      "project_tasks_status_check",
      sql`${table.status} in ('todo','doing','review','done','blocked')`,
    ),
    check(
      "project_tasks_priority_check",
      sql`${table.priority} in ('low','normal','high','urgent')`,
    ),
  ],
);
