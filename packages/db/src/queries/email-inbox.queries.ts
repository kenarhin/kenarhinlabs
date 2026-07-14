import { and, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";

import type { WorkerDatabase } from "../client/worker.js";
import {
  auditLogs,
  emailAttachments,
  emailMailboxes,
  emailMessages,
  emailThreads,
  outboxEvents,
} from "../schema/index.js";

/** Filter and pagination contract for the authenticated unified inbox. */
export interface EmailThreadListQuery {
  channel?: string | undefined;
  status?: string | undefined;
  search?: string | undefined;
  page: number;
  limit: number;
}

/** Complete inbound message unit persisted after MIME parsing and R2 writes. */
export interface InboundEmailTransaction {
  newThread?: typeof emailThreads.$inferInsert;
  message: typeof emailMessages.$inferInsert;
  attachments: readonly (typeof emailAttachments.$inferInsert)[];
  receivedAt: Date;
}

/** Durable admin reply and outbox unit committed before Queue publication. */
export interface ThreadReplyTransaction {
  message: typeof emailMessages.$inferInsert;
  outboxEvent: typeof outboxEvents.$inferInsert;
  auditLog: typeof auditLogs.$inferInsert;
  repliedAt: Date;
}

/** Audited workflow change applied to one inbox thread. */
export interface ThreadUpdateTransaction {
  auditLog: typeof auditLogs.$inferInsert;
  input: {
    markRead?: boolean | undefined;
    priority?: string | undefined;
    status?: string | undefined;
  };
  threadId: string;
}

/** Builds an AND expression while preserving an unfiltered query when empty. */
function whereAll(conditions: SQL[]): SQL | undefined {
  return conditions.length === 0 ? undefined : and(...conditions);
}

/** Lists channel-aware threads with a bounded latest-message preview. */
export async function listEmailThreads(database: WorkerDatabase, query: EmailThreadListQuery) {
  const conditions: SQL[] = [];
  if (query.channel !== undefined) conditions.push(eq(emailMailboxes.channel, query.channel));
  if (query.status !== undefined) conditions.push(eq(emailThreads.status, query.status));
  if (query.search !== undefined) {
    const pattern = `%${query.search}%`;
    conditions.push(
      or(
        ilike(emailThreads.subject, pattern),
        ilike(emailThreads.participantEmail, pattern),
        ilike(emailThreads.participantName, pattern),
      ) ?? sql`false`,
    );
  }

  const filter = whereAll(conditions);
  const offset = (query.page - 1) * query.limit;
  const [items, countRows] = await Promise.all([
    database
      .select({
        id: emailThreads.id,
        channel: emailMailboxes.channel,
        mailboxAddress: emailMailboxes.address,
        participantEmail: emailThreads.participantEmail,
        participantName: emailThreads.participantName,
        subject: emailThreads.subject,
        status: emailThreads.status,
        priority: emailThreads.priority,
        unreadCount: emailThreads.unreadCount,
        source: emailThreads.source,
        leadId: emailThreads.leadId,
        clientId: emailThreads.clientId,
        assignedTo: emailThreads.assignedTo,
        lastMessageAt: emailThreads.lastMessageAt,
        lastDirection: sql<string | null>`(
          select message.direction
            from comms.email_messages message
           where message.thread_id = ${emailThreads.id}
           order by message.created_at desc
           limit 1
        )`,
        preview: sql<string | null>`(
          select left(coalesce(message.text_body, regexp_replace(message.html_body, '<[^>]+>', ' ', 'g')), 240)
            from comms.email_messages message
           where message.thread_id = ${emailThreads.id}
           order by message.created_at desc
           limit 1
        )`,
      })
      .from(emailThreads)
      .innerJoin(emailMailboxes, eq(emailThreads.mailboxId, emailMailboxes.id))
      .where(filter)
      .orderBy(desc(emailThreads.lastMessageAt), desc(emailThreads.id))
      .limit(query.limit)
      .offset(offset),
    database
      .select({ count: sql<number>`count(*)::int` })
      .from(emailThreads)
      .innerJoin(emailMailboxes, eq(emailThreads.mailboxId, emailMailboxes.id))
      .where(filter),
  ]);

  const total = countRows[0]?.count ?? 0;
  return {
    items,
    pagination: {
      limit: query.limit,
      page: query.page,
      pages: Math.max(1, Math.ceil(total / query.limit)),
      total,
    },
  };
}

/** Loads one thread, its chronological messages, and private attachment metadata. */
export async function getEmailThread(database: WorkerDatabase, threadId: string) {
  const [thread] = await database
    .select({
      id: emailThreads.id,
      channel: emailMailboxes.channel,
      mailboxId: emailMailboxes.id,
      mailboxAddress: emailMailboxes.address,
      mailboxDisplayName: emailMailboxes.displayName,
      participantEmail: emailThreads.participantEmail,
      participantName: emailThreads.participantName,
      subject: emailThreads.subject,
      status: emailThreads.status,
      priority: emailThreads.priority,
      unreadCount: emailThreads.unreadCount,
      source: emailThreads.source,
      leadId: emailThreads.leadId,
      clientId: emailThreads.clientId,
      assignedTo: emailThreads.assignedTo,
      lastMessageAt: emailThreads.lastMessageAt,
      lastInboundAt: emailThreads.lastInboundAt,
      lastOutboundAt: emailThreads.lastOutboundAt,
      createdAt: emailThreads.createdAt,
      updatedAt: emailThreads.updatedAt,
    })
    .from(emailThreads)
    .innerJoin(emailMailboxes, eq(emailThreads.mailboxId, emailMailboxes.id))
    .where(eq(emailThreads.id, threadId))
    .limit(1);
  if (thread === undefined) return null;

  const messages = await database
    .select()
    .from(emailMessages)
    .where(eq(emailMessages.threadId, threadId))
    .orderBy(emailMessages.createdAt, emailMessages.id);
  const messageIds = messages.map((message) => message.id);
  const attachments =
    messageIds.length === 0
      ? []
      : await database
          .select()
          .from(emailAttachments)
          .where(inArray(emailAttachments.messageId, messageIds))
          .orderBy(emailAttachments.createdAt, emailAttachments.id);
  const attachmentsByMessage = new Map<string, typeof attachments>();
  for (const attachment of attachments) {
    const current = attachmentsByMessage.get(attachment.messageId) ?? [];
    current.push(attachment);
    attachmentsByMessage.set(attachment.messageId, current);
  }

  return {
    ...thread,
    messages: messages.map((message) => ({
      ...message,
      attachments: attachmentsByMessage.get(message.id) ?? [],
    })),
  };
}

/** Loads private attachment storage metadata without exposing an R2 object URL. */
export async function getEmailAttachment(database: WorkerDatabase, attachmentId: string) {
  const [attachment] = await database
    .select()
    .from(emailAttachments)
    .where(eq(emailAttachments.id, attachmentId))
    .limit(1);
  return attachment ?? null;
}

/**
 * Resolves a trusted existing thread using a signed hint or RFC reply headers.
 *
 * Sender matching prevents a forged Message-ID from attaching a third party to
 * an unrelated conversation.
 */
export async function findInboundEmailThread(
  database: WorkerDatabase,
  input: {
    mailboxId: string;
    participantEmail: string;
    signedThreadId?: string;
    referenceIds: readonly string[];
  },
): Promise<{ id: string; subject: string } | null> {
  const participant = input.participantEmail.toLowerCase();
  if (input.signedThreadId !== undefined) {
    const [thread] = await database
      .select({ id: emailThreads.id, subject: emailThreads.subject })
      .from(emailThreads)
      .where(
        and(
          eq(emailThreads.id, input.signedThreadId),
          eq(emailThreads.mailboxId, input.mailboxId),
          sql`lower(${emailThreads.participantEmail}) = ${participant}`,
        ),
      )
      .limit(1);
    if (thread !== undefined) return thread;
  }

  const referenceIds = [...new Set(input.referenceIds.filter(Boolean))].slice(-100);
  if (referenceIds.length === 0) return null;
  const [thread] = await database
    .select({ id: emailThreads.id, subject: emailThreads.subject })
    .from(emailMessages)
    .innerJoin(emailThreads, eq(emailMessages.threadId, emailThreads.id))
    .where(
      and(
        eq(emailThreads.mailboxId, input.mailboxId),
        sql`lower(${emailThreads.participantEmail}) = ${participant}`,
        inArray(emailMessages.rfcMessageId, referenceIds),
      ),
    )
    .orderBy(desc(emailMessages.createdAt))
    .limit(1);
  return thread ?? null;
}

/** Commits one deduplicated inbound email and advances its thread unread state. */
export async function persistInboundEmail(
  database: WorkerDatabase,
  transactionPlan: InboundEmailTransaction,
): Promise<{ inserted: boolean; threadId: string }> {
  return database.transaction(async (transaction) => {
    if (transactionPlan.newThread !== undefined) {
      await transaction.insert(emailThreads).values(transactionPlan.newThread);
    }

    const [inserted] = await transaction
      .insert(emailMessages)
      .values(transactionPlan.message)
      .onConflictDoNothing()
      .returning({ id: emailMessages.id });
    if (inserted === undefined) {
      if (transactionPlan.newThread !== undefined) {
        const newThreadId = transactionPlan.newThread.id;
        if (typeof newThreadId !== "string") {
          throw new TypeError("A new inbound email thread requires an explicit ID");
        }
        await transaction.delete(emailThreads).where(eq(emailThreads.id, newThreadId));
      }
      const [existing] = await transaction
        .select({ threadId: emailMessages.threadId })
        .from(emailMessages)
        .where(eq(emailMessages.idempotencyKey, transactionPlan.message.idempotencyKey))
        .limit(1);
      return {
        inserted: false,
        threadId: existing?.threadId ?? transactionPlan.message.threadId,
      };
    }

    if (transactionPlan.attachments.length > 0) {
      await transaction.insert(emailAttachments).values([...transactionPlan.attachments]);
    }
    await transaction
      .update(emailThreads)
      .set({
        lastInboundAt: transactionPlan.receivedAt,
        lastMessageAt: transactionPlan.receivedAt,
        status: "open",
        unreadCount: sql`${emailThreads.unreadCount} + 1`,
      })
      .where(eq(emailThreads.id, transactionPlan.message.threadId));

    return { inserted: true, threadId: transactionPlan.message.threadId };
  });
}

/** Commits an admin reply, its Queue outbox event, and an append-only audit record. */
export async function persistThreadReply(
  database: WorkerDatabase,
  transactionPlan: ThreadReplyTransaction,
): Promise<void> {
  await database.transaction(async (transaction) => {
    await transaction.insert(emailMessages).values(transactionPlan.message);
    await transaction.insert(outboxEvents).values(transactionPlan.outboxEvent);
    await transaction.insert(auditLogs).values(transactionPlan.auditLog);
    await transaction
      .update(emailThreads)
      .set({
        lastMessageAt: transactionPlan.repliedAt,
        lastOutboundAt: transactionPlan.repliedAt,
        status: "waiting",
        unreadCount: 0,
      })
      .where(eq(emailThreads.id, transactionPlan.message.threadId));
  });
}

/** Applies explicit thread workflow changes without accepting sender identities. */
export async function updateEmailThread(
  database: WorkerDatabase,
  transactionPlan: ThreadUpdateTransaction,
): Promise<{ id: string } | null> {
  return database.transaction(async (transaction) => {
    const [updated] = await transaction
      .update(emailThreads)
      .set({
        ...(transactionPlan.input.markRead === true ? { unreadCount: 0 } : {}),
        ...(transactionPlan.input.priority === undefined
          ? {}
          : { priority: transactionPlan.input.priority }),
        ...(transactionPlan.input.status === undefined
          ? {}
          : { status: transactionPlan.input.status }),
      })
      .where(eq(emailThreads.id, transactionPlan.threadId))
      .returning({ id: emailThreads.id });
    if (updated === undefined) return null;
    await transaction.insert(auditLogs).values(transactionPlan.auditLog);
    return updated;
  });
}
