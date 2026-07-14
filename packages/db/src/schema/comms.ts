import { sql } from "drizzle-orm";
import {
  bigint,
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
import { profiles } from "./app.js";

export const emailMailboxes = commsSchema.table(
  "email_mailboxes",
  {
    id: uuidPrimaryKey(),
    channel: text("channel").notNull().unique(),
    address: text("address").notNull().unique(),
    displayName: text("display_name").notNull(),
    isPublic: boolean("is_public").default(false).notNull(),
    receivesEmail: boolean("receives_email").default(true).notNull(),
    sendsEmail: boolean("sends_email").default(true).notNull(),
    status: text("status").default("active").notNull(),
    ...timestamps,
  },
  (table) => [
    check(
      "email_mailboxes_channel_check",
      sql`${table.channel} in ('general','projects','support','privacy')`,
    ),
    check("email_mailboxes_status_check", sql`${table.status} in ('active','paused','retired')`),
  ],
);

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
    mailboxId: uuid("mailbox_id")
      .notNull()
      .references(() => emailMailboxes.id, { onDelete: "restrict" }),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
    leadId: uuid("lead_id").references(() => leads.id, { onDelete: "set null" }),
    participantEmail: text("participant_email").notNull(),
    participantName: text("participant_name"),
    subject: text("subject").notNull(),
    status: text("status").default("open").notNull(),
    source: text("source").default("email").notNull(),
    priority: text("priority").default("normal").notNull(),
    assignedTo: uuid("assigned_to").references(() => profiles.id, { onDelete: "set null" }),
    unreadCount: integer("unread_count").default(0).notNull(),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }).defaultNow().notNull(),
    lastInboundAt: timestamp("last_inbound_at", { withTimezone: true }),
    lastOutboundAt: timestamp("last_outbound_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("email_threads_mailbox_status_last_idx").on(
      table.mailboxId,
      table.status,
      table.lastMessageAt.desc(),
    ),
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
      "email_threads_priority_check",
      sql`${table.priority} in ('low','normal','high','urgent')`,
    ),
    check("email_threads_unread_count_check", sql`${table.unreadCount} >= 0`),
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
    replyToEmail: text("reply_to_email"),
    rfcMessageId: text("rfc_message_id"),
    inReplyTo: text("in_reply_to"),
    references: jsonb("references").$type<string[]>().default([]).notNull(),
    createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
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
    receivedAt: timestamp("received_at", { withTimezone: true }),
    providerAcceptedAt: timestamp("provider_accepted_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    bouncedAt: timestamp("bounced_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("email_messages_job_id_unique").on(table.jobId),
    uniqueIndex("email_messages_idempotency_key_unique").on(table.idempotencyKey),
    uniqueIndex("email_messages_provider_id_unique")
      .on(table.provider, table.providerMessageId)
      .where(sql`${table.providerMessageId} is not null`),
    uniqueIndex("email_messages_rfc_message_id_unique")
      .on(table.provider, table.rfcMessageId)
      .where(sql`${table.rfcMessageId} is not null`),
    index("email_messages_delivery_claim_idx").on(
      table.status,
      table.retryable,
      table.nextAttemptAt,
    ),
    index("email_messages_thread_created_idx").on(table.threadId, table.createdAt),
    index("email_messages_created_by_idx")
      .on(table.createdBy)
      .where(sql`${table.createdBy} is not null`),
    check("email_messages_direction_check", sql`${table.direction} in ('inbound','outbound')`),
    check(
      "email_messages_status_check",
      sql`${table.status} in ('queued','processing','provider_accepted','delivered','bounced','failed','received')`,
    ),
    check("email_messages_references_check", sql`jsonb_typeof(${table.references}) = 'array'`),
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

export const emailAttachments = commsSchema.table(
  "email_attachments",
  {
    id: uuidPrimaryKey(),
    messageId: uuid("message_id")
      .notNull()
      .references(() => emailMessages.id, { onDelete: "cascade" }),
    bucket: text("bucket").notNull(),
    objectKey: text("object_key").notNull(),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    contentId: text("content_id"),
    disposition: text("disposition").default("attachment").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("email_attachments_bucket_object_unique").on(table.bucket, table.objectKey),
    index("email_attachments_message_idx").on(table.messageId, table.createdAt),
    check("email_attachments_size_check", sql`${table.sizeBytes} >= 0`),
    check(
      "email_attachments_disposition_check",
      sql`${table.disposition} in ('attachment','inline')`,
    ),
  ],
);
