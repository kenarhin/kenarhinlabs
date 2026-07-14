import type { InboundEmailTransaction } from "@labs/db/queries/email-inbox.queries";
import {
  canonicalMailboxForAddress,
  parseThreadReplyAddress,
  type EmailMailboxDefinition,
} from "@labs/email";
import PostalMime, { type Address, type Attachment, type Email } from "postal-mime";

import type { InboundEmailService } from "./contracts";

const MAX_RAW_EMAIL_BYTES = 25 * 1024 * 1024;
const MAX_HEADER_VALUE_LENGTH = 8_192;
const MAX_SUBJECT_LENGTH = 300;
const ENVELOPE_ADDRESS_PATTERN = /^[^@\s]+@[^@\s]+$/u;

/** Existing-thread lookup input constrained by mailbox and participant identity. */
export interface InboundThreadLookup {
  mailboxId: string;
  participantEmail: string;
  referenceIds: readonly string[];
  signedThreadId?: string;
}

/** Minimal existing-thread record required by inbound persistence. */
export interface InboundThreadRecord {
  id: string;
  subject: string;
}

/** R2 write boundary for one parsed private attachment. */
export interface InboundAttachmentWrite {
  content: ArrayBuffer | Uint8Array;
  contentType: string;
  objectKey: string;
}

/** Database and object-storage ports used by the Email Routing consumer. */
export interface InboundEmailServiceDependencies {
  attachmentBucketName: string;
  deleteObject(key: string): Promise<void>;
  findThread(input: InboundThreadLookup): Promise<InboundThreadRecord | null>;
  persist(plan: InboundEmailTransaction): Promise<{ inserted: boolean; threadId: string }>;
  putObject(input: InboundAttachmentWrite): Promise<void>;
  replyTokenSecret: string;
  generateId?: () => string;
  now?: () => Date;
}

/** Typed permanent rejection raised before any database or R2 mutation. */
export class InboundEmailRejection extends Error {
  public constructor(public readonly reason: string) {
    super(reason);
    this.name = "InboundEmailRejection";
  }
}

/** Extracts lower-cased mailbox addresses while ignoring RFC group wrappers. */
function mailboxAddresses(addresses: Address[] | undefined): string[] {
  if (addresses === undefined) return [];
  return addresses.flatMap((address) =>
    address.group === undefined
      ? [address.address.toLowerCase()]
      : address.group.map((mailbox) => mailbox.address.toLowerCase()),
  );
}

/** Uses the parsed display name only when it belongs to the envelope sender. */
function participantName(email: Email, envelopeSender: string): string | undefined {
  const sender = email.from;
  if (
    sender === undefined ||
    sender.group !== undefined ||
    sender.address.toLowerCase() !== envelopeSender
  ) {
    return undefined;
  }
  const name = sender.name.trim();
  return name.length === 0 ? undefined : name.slice(0, 200);
}

/** Normalizes one RFC Message-ID token without accepting arbitrarily large headers. */
function messageId(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  if (normalized === undefined || normalized.length === 0) return undefined;
  return /^<[^<>\s]{1,8176}>$/u.test(normalized)
    ? normalized.slice(0, MAX_HEADER_VALUE_LENGTH)
    : undefined;
}

/** Parses RFC References into a bounded, de-duplicated ancestor chain. */
function referenceIds(email: Email): string[] {
  const candidates = [email.inReplyTo, ...(email.references?.match(/<[^>]+>/g) ?? [])];
  if (email.references !== undefined && !email.references.includes("<")) {
    candidates.push(...email.references.split(/\s+/));
  }
  return [
    ...new Set(candidates.map(messageId).filter((value): value is string => value != null)),
  ].slice(-100);
}

/** Produces a stable SHA-256 identifier for retries that lack an RFC Message-ID. */
async function rawDigest(raw: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", raw);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Converts every PostalMime attachment representation into binary R2 data. */
function attachmentContent(attachment: Attachment): ArrayBuffer | Uint8Array {
  if (typeof attachment.content === "string") {
    return new TextEncoder().encode(attachment.content);
  }
  return attachment.content;
}

/** Removes path and control characters from untrusted attachment filenames. */
function safeFilename(filename: string | null, attachmentId: string): string {
  const untrustedLeaf = filename?.split(/[\\/]/).at(-1);
  const leaf =
    untrustedLeaf === undefined
      ? undefined
      : Array.from(untrustedLeaf, (character) => {
          const codePoint = character.codePointAt(0) ?? 0;
          return codePoint <= 31 || codePoint === 127 ? "_" : character;
        })
          .join("")
          .trim();
  return (leaf && leaf.length > 0 ? leaf : `attachment-${attachmentId}`).slice(0, 255);
}

/** Creates R2 storage plans without embedding sender data in object keys. */
function attachmentPlans(
  attachments: Attachment[],
  fields: { bucketName: string; messageId: string; threadId: string },
  generateId: () => string,
) {
  return attachments.map((attachment) => {
    const id = generateId();
    const filename = safeFilename(attachment.filename, id);
    const content = attachmentContent(attachment);
    const sizeBytes = content.byteLength;
    const objectKey = `email/${fields.threadId}/${fields.messageId}/${id}`;
    return {
      database: {
        bucket: fields.bucketName,
        contentId: attachment.contentId?.slice(0, 998),
        disposition: attachment.disposition === "inline" ? "inline" : "attachment",
        filename,
        id,
        messageId: fields.messageId,
        mimeType: attachment.mimeType.slice(0, 255) || "application/octet-stream",
        objectKey,
        sizeBytes,
      },
      storage: {
        content,
        contentType: attachment.mimeType.slice(0, 255) || "application/octet-stream",
        objectKey,
      },
    };
  });
}

/** Rejects malformed reserved plus-addresses instead of opening an unrelated thread. */
async function signedThreadId(
  recipient: string,
  mailbox: EmailMailboxDefinition,
  secret: string,
): Promise<string | undefined> {
  const localPart = recipient.split("@", 1)[0] ?? "";
  if (!localPart.includes("+")) return undefined;
  const parsed = await parseThreadReplyAddress(recipient, secret);
  if (parsed === null || parsed.mailbox.channel !== mailbox.channel) {
    throw new InboundEmailRejection("Invalid conversation reply address");
  }
  return parsed.threadId;
}

/** Creates one production inbound-email consumer backed by Postgres and private R2. */
export function createInboundEmailService(
  dependencies: InboundEmailServiceDependencies,
): InboundEmailService {
  const generateId = dependencies.generateId ?? (() => crypto.randomUUID());
  const now = dependencies.now ?? (() => new Date());

  return {
    receive: async (message) => {
      // Preserve the signature's case while normalizing the stored envelope.
      const rawRecipient = message.to.trim();
      const recipient = rawRecipient.toLowerCase();
      const sender = message.from.trim().toLowerCase();
      const mailbox = canonicalMailboxForAddress(recipient);
      if (mailbox === null || !mailbox.receivesEmail) {
        throw new InboundEmailRejection("Mailbox does not accept inbound email");
      }
      if (sender.length > 320 || !ENVELOPE_ADDRESS_PATTERN.test(sender)) {
        throw new InboundEmailRejection("Invalid envelope sender");
      }
      if (message.rawSize <= 0 || message.rawSize > MAX_RAW_EMAIL_BYTES) {
        throw new InboundEmailRejection("Email exceeds the accepted message size");
      }

      const threadHint = await signedThreadId(rawRecipient, mailbox, dependencies.replyTokenSecret);
      const raw = await new Response(message.raw).arrayBuffer();
      if (raw.byteLength > MAX_RAW_EMAIL_BYTES) {
        throw new InboundEmailRejection("Email exceeds the accepted message size");
      }
      const [email, digest] = await Promise.all([
        PostalMime.parse(raw, {
          attachmentEncoding: "arraybuffer",
          maxHeadersSize: 1024 * 1024,
          maxNestingDepth: 30,
        }),
        rawDigest(raw),
      ]);
      const references = referenceIds(email);
      const existingThread = await dependencies.findThread({
        mailboxId: mailbox.id,
        participantEmail: sender,
        referenceIds: references,
        ...(threadHint === undefined ? {} : { signedThreadId: threadHint }),
      });
      const threadId = existingThread?.id ?? generateId();
      const inboundMessageId = generateId();
      const inboundJobId = generateId();
      const receivedAt = now();
      const providerMessageId = messageId(email.messageId) ?? digest;
      const subject = (email.subject?.trim() || existingThread?.subject || "No subject")
        .replace(/[\r\n]+/g, " ")
        .slice(0, MAX_SUBJECT_LENGTH);
      const attachmentWork = attachmentPlans(
        email.attachments,
        {
          bucketName: dependencies.attachmentBucketName,
          messageId: inboundMessageId,
          threadId,
        },
        generateId,
      );

      const uploadedKeys: string[] = [];
      try {
        for (const attachment of attachmentWork) {
          await dependencies.putObject(attachment.storage);
          uploadedKeys.push(attachment.storage.objectKey);
        }
        const result = await dependencies.persist({
          attachments: attachmentWork.map((attachment) => attachment.database),
          message: {
            attempts: 0,
            ccEmails: mailboxAddresses(email.cc),
            direction: "inbound",
            fromEmail: sender,
            htmlBody: email.html,
            id: inboundMessageId,
            idempotencyKey: `inbound:cloudflare:${digest}`,
            inReplyTo: messageId(email.inReplyTo),
            jobId: inboundJobId,
            metadata: { rawSize: raw.byteLength, source: "email_routing" },
            provider: "cloudflare_email_routing",
            providerMessageId,
            receivedAt,
            references,
            retryable: false,
            rfcMessageId: messageId(email.messageId),
            status: "received",
            subject,
            textBody: email.text ?? (email.html === undefined ? "(No message body)" : undefined),
            threadId,
            toEmails: [recipient],
          },
          ...(existingThread === null
            ? {
                newThread: {
                  id: threadId,
                  lastInboundAt: receivedAt,
                  lastMessageAt: receivedAt,
                  mailboxId: mailbox.id,
                  participantEmail: sender,
                  participantName: participantName(email, sender),
                  priority: mailbox.channel === "privacy" ? "high" : "normal",
                  source:
                    recipient.startsWith("contact+") || recipient === "contact@kenarhinlabs.com"
                      ? "contact_alias"
                      : "direct_email",
                  status: "open",
                  subject,
                  unreadCount: 0,
                },
              }
            : {}),
          receivedAt,
        });
        if (!result.inserted) {
          await Promise.allSettled(uploadedKeys.map((key) => dependencies.deleteObject(key)));
        }
        return { duplicate: !result.inserted, threadId: result.threadId };
      } catch (error) {
        await Promise.allSettled(uploadedKeys.map((key) => dependencies.deleteObject(key)));
        throw error;
      }
    },
  };
}
