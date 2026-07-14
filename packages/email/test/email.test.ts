import { describe, expect, it, vi } from "vitest";

import {
  CloudflareEmailTransport,
  canonicalMailboxForAddress,
  classifyEmailFailure,
  consumeEmailBatch,
  createThreadReplyAddress,
  mailboxForChannel,
  parseThreadReplyAddress,
  parseTransactionalEmailJob,
  renderEmailJob,
  renderTemplate,
  type TransactionalEmailJobV1,
} from "../src";

const job: TransactionalEmailJobV1 = {
  schemaVersion: 1,
  jobId: "job-1",
  messageId: "message-1",
  idempotencyKey: "contact-1-confirmation",
  to: "client@example.com",
  from: { email: "projects@kenarhinlabs.com", name: "Ken Arhin Labs" },
  template: {
    template: "contact-confirmation",
    variables: { recipientName: "Ada", reference: "LEAD-100" },
  },
  enqueuedAt: "2026-07-10T00:00:00.000Z",
};

describe("transactional email", () => {
  it("escapes template variables and always emits text plus HTML", () => {
    const rendered = renderTemplate({
      template: "contact-confirmation",
      variables: { recipientName: "<Ada>", reference: "LEAD-100" },
    });

    expect(rendered.html).toContain("&lt;Ada&gt;");
    expect(rendered.text).toContain("<Ada>");
  });

  it("adds internal trace headers without exposing provider credentials", () => {
    const rendered = renderEmailJob(job);
    expect(rendered.headers?.["X-KenarhinLabs-Message-ID"]).toBe("message-1");
    expect(JSON.stringify(rendered)).not.toContain("token");
  });

  it("creates and verifies a signed channel-preserving reply address", async () => {
    const mailbox = mailboxForChannel("support");
    const threadId = "10000000-0000-4000-8000-000000000001";
    const secret = "synthetic-email-reply-token-secret-value";

    const address = await createThreadReplyAddress(mailbox, threadId, secret);

    expect(address).toContain(`support+${threadId}.`);
    expect(address.split("@")[0]?.length).toBeLessThanOrEqual(64);
    await expect(parseThreadReplyAddress(address, secret)).resolves.toEqual({ mailbox, threadId });
  });

  it("rejects a tampered signed reply address", async () => {
    const mailbox = mailboxForChannel("general");
    const address = await createThreadReplyAddress(
      mailbox,
      "10000000-0000-4000-8000-000000000001",
      "synthetic-email-reply-token-secret-value",
    );

    await expect(
      parseThreadReplyAddress(
        `${address.slice(0, -1)}x`,
        "synthetic-email-reply-token-secret-value",
      ),
    ).resolves.toBeNull();
  });

  it("normalizes the inbound contact alias to the General mailbox", () => {
    expect(canonicalMailboxForAddress("contact@kenarhinlabs.com")?.channel).toBe("general");
  });

  it("marks rate-limit failures as retryable", () => {
    const error = Object.assign(new Error("Slow down"), {
      code: "E_RATE_LIMIT_EXCEEDED",
    });
    expect(classifyEmailFailure(error).retryable).toBe(true);
  });

  it("rejects malformed template variables before delivery", () => {
    expect(() =>
      parseTransactionalEmailJob({
        ...job,
        template: {
          template: "lead-received",
          variables: { leadName: "Ada", interest: "website" },
        },
      }),
    ).toThrow(TypeError);
  });

  it("rejects recipient lists above the Email Service limit", () => {
    expect(() =>
      parseTransactionalEmailJob({
        ...job,
        to: Array.from({ length: 51 }, (_, index) => `recipient-${index}@example.com`),
      }),
    ).toThrow(TypeError);
  });

  it("rejects newline injection in queued threading headers", () => {
    expect(() =>
      parseTransactionalEmailJob({
        ...job,
        headers: { "In-Reply-To": "<safe@example.com>\r\nBcc: attacker@example.com" },
      }),
    ).toThrow(TypeError);
  });

  it("acknowledges a successfully delivered queue message", async () => {
    const ack = vi.fn();
    const retry = vi.fn();
    const send = vi.fn().mockResolvedValue({ messageId: "provider-1" });
    const repository = {
      claim: vi.fn().mockResolvedValue("claimed" as const),
      markSent: vi.fn().mockResolvedValue(undefined),
      markFailed: vi.fn().mockResolvedValue(undefined),
    };
    const batch = {
      queue: "email",
      metadata: { metrics: { backlogCount: 0, backlogBytes: 0 } },
      messages: [
        {
          id: "queue-1",
          timestamp: new Date(),
          attempts: 1,
          body: job,
          ack,
          retry,
        },
      ],
      ackAll: vi.fn(),
      retryAll: vi.fn(),
    } satisfies MessageBatch<unknown>;

    await consumeEmailBatch(batch, {
      transport: new CloudflareEmailTransport({ send } as SendEmail),
      repository,
    });

    expect(send).toHaveBeenCalledOnce();
    expect(repository.markSent).toHaveBeenCalledOnce();
    expect(ack).toHaveBeenCalledOnce();
    expect(retry).not.toHaveBeenCalled();
  });

  it("retries a message while another consumer owns its delivery lease", async () => {
    const ack = vi.fn();
    const retry = vi.fn();
    const send = vi.fn();
    const batch = {
      queue: "email",
      metadata: { metrics: { backlogCount: 0, backlogBytes: 0 } },
      messages: [
        {
          id: "queue-busy",
          timestamp: new Date(),
          attempts: 2,
          body: job,
          ack,
          retry,
        },
      ],
      ackAll: vi.fn(),
      retryAll: vi.fn(),
    } satisfies MessageBatch<unknown>;

    await consumeEmailBatch(batch, {
      transport: new CloudflareEmailTransport({ send } as SendEmail),
      repository: {
        claim: vi.fn().mockResolvedValue("busy" as const),
        markFailed: vi.fn(),
        markSent: vi.fn(),
      },
    });

    expect(send).not.toHaveBeenCalled();
    expect(ack).not.toHaveBeenCalled();
    expect(retry).toHaveBeenCalledOnce();
  });

  it("persists a retryable provider failure before retrying the Queue message", async () => {
    const ack = vi.fn();
    const retry = vi.fn();
    const providerError = Object.assign(new Error("Synthetic provider throttling"), {
      code: "E_RATE_LIMIT_EXCEEDED",
    });
    const repository = {
      claim: vi.fn().mockResolvedValue("claimed" as const),
      markFailed: vi.fn().mockResolvedValue(undefined),
      markSent: vi.fn(),
    };
    const batch = {
      queue: "email",
      metadata: { metrics: { backlogCount: 0, backlogBytes: 0 } },
      messages: [
        {
          id: "queue-retryable-failure",
          timestamp: new Date(),
          attempts: 1,
          body: job,
          ack,
          retry,
        },
      ],
      ackAll: vi.fn(),
      retryAll: vi.fn(),
    } satisfies MessageBatch<unknown>;

    await consumeEmailBatch(batch, {
      transport: new CloudflareEmailTransport({
        send: vi.fn().mockRejectedValue(providerError),
      } as unknown as SendEmail),
      repository,
    });

    expect(repository.markFailed).toHaveBeenCalledWith(
      job,
      expect.objectContaining({ code: "E_RATE_LIMIT_EXCEEDED", retryable: true }),
      true,
    );
    expect(retry).toHaveBeenCalledOnce();
    expect(ack).not.toHaveBeenCalled();
  });

  it("persists a terminal provider failure before acknowledging the Queue message", async () => {
    const ack = vi.fn();
    const retry = vi.fn();
    const providerError = Object.assign(new Error("Synthetic recipient rejection"), {
      code: "E_RECIPIENT_NOT_ALLOWED",
    });
    const repository = {
      claim: vi.fn().mockResolvedValue("claimed" as const),
      markFailed: vi.fn().mockResolvedValue(undefined),
      markSent: vi.fn(),
    };
    const batch = {
      queue: "email",
      metadata: { metrics: { backlogCount: 0, backlogBytes: 0 } },
      messages: [
        {
          id: "queue-terminal-failure",
          timestamp: new Date(),
          attempts: 1,
          body: job,
          ack,
          retry,
        },
      ],
      ackAll: vi.fn(),
      retryAll: vi.fn(),
    } satisfies MessageBatch<unknown>;

    await consumeEmailBatch(batch, {
      transport: new CloudflareEmailTransport({
        send: vi.fn().mockRejectedValue(providerError),
      } as unknown as SendEmail),
      repository,
    });

    expect(repository.markFailed).toHaveBeenCalledWith(
      job,
      expect.objectContaining({ code: "E_RECIPIENT_NOT_ALLOWED", retryable: false }),
      false,
    );
    expect(ack).toHaveBeenCalledOnce();
    expect(retry).not.toHaveBeenCalled();
  });
});
