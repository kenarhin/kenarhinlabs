import { describe, expect, it, vi } from "vitest";

import {
  CloudflareEmailTransport,
  classifyEmailFailure,
  consumeEmailBatch,
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
});
