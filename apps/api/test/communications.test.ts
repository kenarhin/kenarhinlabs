import type { InboundEmailTransaction } from "@labs/db/queries/email-inbox.queries";
import { createThreadReplyAddress, mailboxForChannel } from "@labs/email";
import { describe, expect, it, vi } from "vitest";

import { createCommunicationsService } from "../src/services/communications";
import {
  createInboundEmailService,
  InboundEmailRejection,
  type InboundAttachmentWrite,
} from "../src/services/inbound-email";

const replyTokenSecret = "synthetic-email-reply-token-secret-value";

/** Creates a Cloudflare-compatible inbound message without external network I/O. */
function inboundMessage(raw: string, to = "hello@kenarhinlabs.com"): ForwardableEmailMessage {
  const bytes = new TextEncoder().encode(raw);
  return {
    forward: async () => ({ messageId: "forwarded" }),
    from: "visitor@example.com",
    headers: new Headers(),
    raw: new Blob([bytes]).stream(),
    rawSize: bytes.byteLength,
    reply: async () => ({ messageId: "replied" }),
    setReject: () => undefined,
    to,
  };
}

/** Returns deterministic UUIDs for inbound thread/message/attachment planning. */
function stableIds(): () => string {
  let counter = 1;
  return () => `10000000-0000-4000-8000-${String(counter++).padStart(12, "0")}`;
}

describe("inbound Email Routing", () => {
  it("parses MIME, stores private attachments, and creates one unread general thread", async () => {
    let persisted: InboundEmailTransaction | undefined;
    const putObject = vi.fn(async (input: InboundAttachmentWrite) => {
      expect(input.objectKey).toMatch(/^email\//u);
    });
    const service = createInboundEmailService({
      attachmentBucketName: "kenarhinlabs-email-attachments",
      deleteObject: async () => undefined,
      findThread: async () => null,
      generateId: stableIds(),
      now: () => new Date("2026-07-13T12:00:00.000Z"),
      persist: async (plan) => {
        persisted = plan;
        return { inserted: true, threadId: plan.message.threadId };
      },
      putObject,
      replyTokenSecret,
    });
    const raw = [
      "From: Visitor <visitor@example.com>",
      "To: hello@kenarhinlabs.com",
      "Subject: General question",
      "Message-ID: <general-1@example.com>",
      "MIME-Version: 1.0",
      'Content-Type: multipart/mixed; boundary="boundary-1"',
      "",
      "--boundary-1",
      "Content-Type: text/plain; charset=utf-8",
      "",
      "Hello from the website visitor.",
      "--boundary-1",
      "Content-Type: text/plain; name=brief.txt",
      "Content-Disposition: attachment; filename=brief.txt",
      "Content-Transfer-Encoding: base64",
      "",
      "U3ludGhldGljIGJyaWVm",
      "--boundary-1--",
      "",
    ].join("\r\n");

    const result = await service.receive(inboundMessage(raw));

    expect(result.duplicate).toBe(false);
    expect(persisted?.newThread).toMatchObject({
      mailboxId: "30000000-0000-4000-8000-000000000001",
      participantEmail: "visitor@example.com",
      source: "direct_email",
      unreadCount: 0,
    });
    expect(persisted?.message).toMatchObject({
      direction: "inbound",
      rfcMessageId: "<general-1@example.com>",
      status: "received",
      toEmails: ["hello@kenarhinlabs.com"],
    });
    expect(persisted?.attachments).toHaveLength(1);
    expect(putObject).toHaveBeenCalledOnce();
    expect(putObject.mock.calls[0]?.[0].objectKey).not.toContain("visitor@example.com");
  });

  it("accepts a valid signed plus address as a trusted thread hint", async () => {
    const mailbox = mailboxForChannel("projects");
    const threadId = "10000000-0000-4000-8000-000000000099";
    const recipient = await createThreadReplyAddress(mailbox, threadId, replyTokenSecret);
    const findThread = vi.fn(async () => ({ id: threadId, subject: "Existing project" }));
    const service = createInboundEmailService({
      attachmentBucketName: "kenarhinlabs-email-attachments",
      deleteObject: async () => undefined,
      findThread,
      generateId: stableIds(),
      persist: async (plan) => ({ inserted: true, threadId: plan.message.threadId }),
      putObject: async () => undefined,
      replyTokenSecret,
    });
    const raw = [
      "From: visitor@example.com",
      `To: ${recipient}`,
      "Subject: Re: Existing project",
      "Message-ID: <reply-1@example.com>",
      "",
      "Here is the requested reply.",
    ].join("\r\n");

    await service.receive(inboundMessage(raw, recipient));

    expect(findThread).toHaveBeenCalledWith(
      expect.objectContaining({
        mailboxId: mailbox.id,
        participantEmail: "visitor@example.com",
        signedThreadId: threadId,
      }),
    );
  });

  it("rejects a forged reserved plus address before persistence", async () => {
    const persist = vi.fn();
    const service = createInboundEmailService({
      attachmentBucketName: "kenarhinlabs-email-attachments",
      deleteObject: async () => undefined,
      findThread: async () => null,
      persist,
      putObject: async () => undefined,
      replyTokenSecret,
    });

    await expect(
      service.receive(
        inboundMessage(
          "From: visitor@example.com\r\nSubject: Forged\r\n\r\nBody",
          "hello+not-a-valid-token@kenarhinlabs.com",
        ),
      ),
    ).rejects.toBeInstanceOf(InboundEmailRejection);
    expect(persist).not.toHaveBeenCalled();
  });
});

describe("admin communications", () => {
  it("derives the reply sender and recipient from the stored thread", async () => {
    const persistReply = vi.fn(async () => undefined);
    const service = createCommunicationsService({
      attachmentBucketName: "kenarhinlabs-email-attachments",
      fromName: "Ken Arhin Labs",
      generateId: stableIds(),
      getAttachment: async () => null,
      getObject: async () => null,
      getThread: async () => ({
        id: "10000000-0000-4000-8000-000000000099",
        mailboxAddress: "support@kenarhinlabs.com",
        messages: [{ references: [], rfcMessageId: "<customer-1@example.com>" }],
        participantEmail: "customer@example.com",
        subject: "Support request",
      }),
      listThreads: async () => ({ items: [] }),
      persistReply,
      publishPending: async () => undefined,
      replyTokenSecret,
      serialize: (value) => value as never,
      updateThread: async () => null,
    });

    const result = await service.replyToThread(
      "10000000-0000-4000-8000-000000000099",
      { body: "We are looking into this." },
      "20000000-0000-4000-8000-000000000001",
      { ipAddress: "192.0.2.1", requestId: "request-1", userAgent: "test" },
    );

    expect(result.status).toBe("accepted");
    expect(persistReply).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.objectContaining({
          fromEmail: "support@kenarhinlabs.com",
          status: "queued",
          toEmails: ["customer@example.com"],
        }),
        outboxEvent: expect.objectContaining({
          payload: expect.objectContaining({
            from: expect.objectContaining({ email: "support@kenarhinlabs.com" }),
            to: "customer@example.com",
          }),
        }),
      }),
    );
  });
});
