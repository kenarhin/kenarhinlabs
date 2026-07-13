import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { timestamps, uuidPrimaryKey } from "./common.js";
import { clients, leads } from "./crm.js";
import { commsSchema } from "./namespaces.js";

export const emailTemplates = commsSchema.table(
  "email_templates",
  {
    id: uuidPrimaryKey(),
    key: text("key").notNull().unique(),
    name: text("name").notNull(),
    subject: text("subject").notNull(),
    htmlBody: text("html_body").notNull(),
    textBody: text("text_body"),
    variables: jsonb("variables").$type<Record<string, unknown>>().default({}).notNull(),
    status: text("status").default("draft").notNull(),
    ...timestamps,
  },
  (table) => [
    check("email_templates_status_check", sql`${table.status} in ('draft','active','archived')`),
  ],
);

export const emailThreads = commsSchema.table(
  "email_threads",
  {
    id: uuidPrimaryKey(),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
    leadId: uuid("lead_id").references(() => leads.id, { onDelete: "set null" }),
    subject: text("subject").notNull(),
    status: text("status").default("open").notNull(),
    ...timestamps,
  },
  (table) => [
    index("email_threads_client_idx")
      .on(table.clientId)
      .where(sql`${table.clientId} is not null`),
    index("email_threads_lead_idx")
      .on(table.leadId)
      .where(sql`${table.leadId} is not null`),
    check(
      "email_threads_status_check",
      sql`${table.status} in ('open','waiting','closed','archived')`,
    ),
    check(
      "email_threads_parent_check",
      sql`${table.clientId} is not null or ${table.leadId} is not null`,
    ),
  ],
);

export const emailMessages = commsSchema.table(
  "email_messages",
  {
    id: uuidPrimaryKey(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => emailThreads.id, { onDelete: "cascade" }),
    direction: text("direction").notNull(),
    fromEmail: text("from_email").notNull(),
    toEmails: jsonb("to_emails").$type<string[]>().notNull(),
    ccEmails: jsonb("cc_emails").$type<string[]>(),
    bccEmails: jsonb("bcc_emails").$type<string[]>(),
    subject: text("subject").notNull(),
    htmlBody: text("html_body"),
    textBody: text("text_body"),
    provider: text("provider").notNull(),
    providerMessageId: text("provider_message_id"),
    jobId: uuid("job_id").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    status: text("status").default("queued").notNull(),
    attempts: integer("attempts").default(0).notNull(),
    retryable: boolean("retryable").default(true).notNull(),
    lastErrorCode: text("last_error_code"),
    lastError: text("last_error"),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("email_messages_job_id_unique").on(table.jobId),
    uniqueIndex("email_messages_idempotency_key_unique").on(table.idempotencyKey),
    uniqueIndex("email_messages_provider_id_unique")
      .on(table.provider, table.providerMessageId)
      .where(sql`${table.providerMessageId} is not null`),
    index("email_messages_delivery_claim_idx").on(
      table.status,
      table.retryable,
      table.nextAttemptAt,
    ),
    index("email_messages_thread_created_idx").on(table.threadId, table.createdAt),
    check("email_messages_direction_check", sql`${table.direction} in ('inbound','outbound')`),
    check(
      "email_messages_status_check",
      sql`${table.status} in ('queued','processing','sent','failed','received')`,
    ),
    check("email_messages_attempts_check", sql`${table.attempts} >= 0`),
    check("email_messages_to_emails_check", sql`jsonb_typeof(${table.toEmails}) = 'array'`),
    check(
      "email_messages_cc_emails_check",
      sql`${table.ccEmails} is null or jsonb_typeof(${table.ccEmails}) = 'array'`,
    ),
    check(
      "email_messages_bcc_emails_check",
      sql`${table.bccEmails} is null or jsonb_typeof(${table.bccEmails}) = 'array'`,
    ),
    check(
      "email_messages_body_check",
      sql`${table.htmlBody} is not null or ${table.textBody} is not null`,
    ),
  ],
);
