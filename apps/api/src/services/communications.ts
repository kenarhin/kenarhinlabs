import { AppError } from "@labs/core";
import type {
  ThreadReplyTransaction,
  ThreadUpdateTransaction,
} from "@labs/db/queries/email-inbox.queries";
import { EMAIL_OUTBOX_EVENT_TYPE } from "@labs/db/queries/email-outbox.queries";
import {
  canonicalMailboxForAddress,
  createThreadReplyAddress,
  renderEmailJob,
  type TransactionalEmailJobV1,
} from "@labs/email";
import type {
  EmailThreadListQuery,
  EmailThreadReplyInput,
  UpdateEmailThreadInput,
} from "@labs/validators";

import type { JsonValue } from "../types/app";
import type { CommunicationsService, EmailAttachmentDownload, RequestMetadata } from "./contracts";

/** Message fields required to preserve standards-based reply threading. */
export interface CommunicationsThreadMessage {
  references: string[];
  rfcMessageId: string | null;
}

/** Server-owned addressing data required to create a safe admin reply. */
export interface CommunicationsThreadRecord {
  id: string;
  mailboxAddress: string;
  participantEmail: string;
  subject: string;
  messages: CommunicationsThreadMessage[];
}

/** Private attachment metadata resolved before reading the R2 object. */
export interface CommunicationsAttachmentRecord {
  bucket: string;
  filename: string;
  mimeType: string;
  objectKey: string;
  sizeBytes: number;
}

/** Persistence, Queue, and private-object ports used by communications workflows. */
export interface CommunicationsServiceDependencies {
  attachmentBucketName: string;
  fromName: string;
  replyTokenSecret: string;
  getAttachment(id: string): Promise<CommunicationsAttachmentRecord | null>;
  getObject(key: string): Promise<R2ObjectBody | null>;
  getThread(id: string): Promise<CommunicationsThreadRecord | null>;
  listThreads(query: EmailThreadListQuery): Promise<unknown>;
  persistReply(plan: ThreadReplyTransaction): Promise<void>;
  publishPending(): Promise<void>;
  updateThread(plan: ThreadUpdateTransaction): Promise<{ id: string } | null>;
  serialize(value: unknown): JsonValue;
  onPublishFailure?: (fields: { event: string; threadId: string }) => void;
  generateId?: () => string;
  now?: () => Date;
}

/** Creates a public 404 without revealing any private storage information. */
function threadNotFound(): AppError {
  return new AppError({
    code: "EMAIL_THREAD_NOT_FOUND",
    message: "Email thread not found",
    status: 404,
  });
}

/** Builds a compact RFC References chain while keeping the latest ancestor. */
function replyReferences(thread: CommunicationsThreadRecord): string[] {
  const latest = thread.messages.at(-1);
  if (latest === undefined) return [];
  const candidates = [
    ...new Set(
      [...latest.references, latest.rfcMessageId].filter((value): value is string => value != null),
    ),
  ]
    .filter((value) => /^<[^<>\s]{1,998}>$/u.test(value))
    .slice(-100);

  const bounded: string[] = [];
  let length = 0;
  for (const reference of candidates.toReversed()) {
    const nextLength = length + reference.length + (bounded.length === 0 ? 0 : 1);
    if (nextLength > 8_000) break;
    bounded.unshift(reference);
    length = nextLength;
  }
  return bounded;
}

/** Converts a reply Queue job into the durable email message row. */
function replyMessage(
  job: TransactionalEmailJobV1,
  thread: CommunicationsThreadRecord,
  actorId: string,
  requestId: string,
): ThreadReplyTransaction["message"] {
  const rendered = renderEmailJob(job);
  const references = replyReferences(thread);
  return {
    attempts: 0,
    createdBy: actorId,
    direction: "outbound",
    fromEmail: job.from.email,
    htmlBody: rendered.html,
    id: job.messageId,
    idempotencyKey: job.idempotencyKey,
    inReplyTo: references.at(-1),
    jobId: job.jobId,
    metadata: { requestId, template: "thread-reply" },
    provider: "cloudflare_email",
    references,
    replyToEmail: job.replyTo,
    retryable: true,
    status: "queued",
    subject: rendered.subject,
    textBody: rendered.text,
    threadId: thread.id,
    toEmails: [thread.participantEmail],
  };
}

/** Creates the durable outbox row published to Cloudflare Queues after commit. */
function replyOutboxEvent(job: TransactionalEmailJobV1): ThreadReplyTransaction["outboxEvent"] {
  return {
    aggregateId: job.messageId,
    aggregateType: "comms.email_messages",
    dedupeKey: `email:${job.idempotencyKey}`,
    eventType: EMAIL_OUTBOX_EVENT_TYPE,
    id: job.jobId,
    payload: {
      ...job,
      from: { ...job.from },
      template: { ...job.template, variables: { ...job.template.variables } },
    },
  };
}

/** Produces a filename safe for Content-Disposition without changing stored metadata. */
function contentDispositionFilename(filename: string): string {
  return filename.replace(/[\r\n"\\]/g, "_").slice(0, 255) || "attachment";
}

/** Creates server-derived, audited communications workflows for the admin API. */
export function createCommunicationsService(
  dependencies: CommunicationsServiceDependencies,
): CommunicationsService {
  const generateId = dependencies.generateId ?? (() => crypto.randomUUID());
  const now = dependencies.now ?? (() => new Date());

  return {
    getAttachment: async (id): Promise<EmailAttachmentDownload | null> => {
      const attachment = await dependencies.getAttachment(id);
      if (attachment === null || attachment.bucket !== dependencies.attachmentBucketName) {
        return null;
      }
      const object = await dependencies.getObject(attachment.objectKey);
      if (object === null) return null;
      return {
        body: object.body,
        filename: contentDispositionFilename(attachment.filename),
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
      };
    },
    getThread: async (id) => {
      const thread = await dependencies.getThread(id);
      return thread === null ? null : dependencies.serialize(thread);
    },
    listThreads: async (query) => dependencies.serialize(await dependencies.listThreads(query)),
    replyToThread: async (
      id: string,
      input: EmailThreadReplyInput,
      actorId: string,
      metadata: RequestMetadata,
    ) => {
      const thread = await dependencies.getThread(id);
      if (thread === null) throw threadNotFound();
      const mailbox = canonicalMailboxForAddress(thread.mailboxAddress);
      if (mailbox === null || !mailbox.sendsEmail) {
        throw new AppError({
          code: "EMAIL_MAILBOX_NOT_SENDABLE",
          message: "This mailbox cannot send replies",
          status: 409,
        });
      }

      const messageId = generateId();
      const jobId = generateId();
      const repliedAt = now();
      const references = replyReferences(thread);
      const threadingHeaders: Record<string, string> = {};
      const latestReference = references.at(-1);
      if (latestReference !== undefined) threadingHeaders["In-Reply-To"] = latestReference;
      if (references.length > 0) threadingHeaders.References = references.join(" ");
      const replyTo = await createThreadReplyAddress(
        mailbox,
        thread.id,
        dependencies.replyTokenSecret,
      );
      const job: TransactionalEmailJobV1 = {
        enqueuedAt: repliedAt.toISOString(),
        from: { email: mailbox.address, name: dependencies.fromName },
        headers: threadingHeaders,
        idempotencyKey: `thread:${thread.id}:reply:${messageId}:v1`,
        jobId,
        messageId,
        replyTo,
        schemaVersion: 1,
        template: {
          template: "thread-reply",
          variables: {
            body: input.body,
            subject: thread.subject
              .replace(/[\r\n]+/g, " ")
              .trim()
              .slice(0, 300),
          },
        },
        to: thread.participantEmail,
      };
      await dependencies.persistReply({
        auditLog: {
          action: "email.thread.reply_queued",
          actorId,
          entityId: thread.id,
          entityType: "comms.email_threads",
          id: generateId(),
          ipAddress: metadata.ipAddress,
          metadata: { messageId, requestId: metadata.requestId },
          userAgent: metadata.userAgent,
        },
        message: replyMessage(job, thread, actorId, metadata.requestId),
        outboxEvent: replyOutboxEvent(job),
        repliedAt,
      });

      try {
        await dependencies.publishPending();
      } catch {
        dependencies.onPublishFailure?.({
          event: "email_outbox_publish_deferred",
          threadId: thread.id,
        });
      }
      return { id: messageId, status: "accepted" as const };
    },
    updateThread: async (
      id: string,
      input: UpdateEmailThreadInput,
      actorId: string,
      metadata: RequestMetadata,
    ) =>
      dependencies.updateThread({
        auditLog: {
          action: "email.thread.updated",
          actorId,
          entityId: id,
          entityType: "comms.email_threads",
          id: generateId(),
          ipAddress: metadata.ipAddress,
          metadata: { changes: input, requestId: metadata.requestId },
          userAgent: metadata.userAgent,
        },
        input,
        threadId: id,
      }),
  };
}
