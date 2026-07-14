import { describe, expect, it, vi } from "vitest";

import {
  createTransactionalIntakeService,
  planInquiryIntake,
  planProjectIntake,
  planSupportIntake,
} from "../src/services/intake";

const configuration = {
  fromName: "Ken Arhin Labs",
  replyTokenSecret: "synthetic-email-reply-token-secret-value",
};

const metadata = {
  ipAddress: "192.0.2.10",
  requestId: "request-contact-1",
  userAgent: "Synthetic browser details",
};

/** Returns stable UUIDs so each durable plan can be asserted without randomness. */
function stableUuidGenerator(): () => string {
  const ids = [
    "10000000-0000-4000-8000-000000000001",
    "10000000-0000-4000-8000-000000000002",
    "10000000-0000-4000-8000-000000000003",
    "10000000-0000-4000-8000-000000000004",
    "10000000-0000-4000-8000-000000000005",
    "10000000-0000-4000-8000-000000000006",
  ];
  return () => {
    const next = ids.shift();
    if (next === undefined) throw new Error("Stable UUID fixture exhausted");
    return next;
  };
}

const publicMessage = {
  email: "visitor@example.com",
  message: "A sufficiently detailed synthetic project request.",
  name: "Contact Tester",
  subject: "Synthetic project enquiry",
};

describe("transactional intake service", () => {
  it("stores a general inquiry in the hello inbox without creating a CRM lead", async () => {
    const planned = await planInquiryIntake(
      publicMessage,
      metadata,
      configuration,
      stableUuidGenerator(),
      new Date("2026-07-13T12:00:00.000Z"),
    );

    expect(planned.transaction.lead).toBeUndefined();
    expect(planned.transaction.thread).toMatchObject({
      mailboxId: "30000000-0000-4000-8000-000000000001",
      source: "website_inquiry",
      unreadCount: 1,
    });
    expect(planned.transaction.messages).toHaveLength(2);
    expect(planned.transaction.messages?.[0]).toMatchObject({
      direction: "inbound",
      fromEmail: "visitor@example.com",
      status: "received",
      toEmails: ["hello@kenarhinlabs.com"],
    });
    expect(planned.transaction.messages?.[1]).toMatchObject({
      direction: "outbound",
      fromEmail: "hello@kenarhinlabs.com",
      status: "queued",
      toEmails: ["visitor@example.com"],
    });
    expect(planned.transaction.outboxEvents).toHaveLength(1);
    expect(JSON.stringify(planned.transaction)).not.toContain(metadata.ipAddress);
    expect(JSON.stringify(planned.transaction)).not.toContain(metadata.userAgent);
  });

  it("creates a CRM lead only for the Projects channel", async () => {
    const planned = await planProjectIntake(
      { ...publicMessage, company: "Example Co", services: ["Web platform"] },
      metadata,
      configuration,
      stableUuidGenerator(),
      new Date("2026-07-13T12:00:00.000Z"),
    );

    expect(planned.transaction.lead).toMatchObject({
      company: "Example Co",
      email: "visitor@example.com",
      interest: "project_enquiry",
      source: "website_project_intake",
      status: "new",
    });
    expect(planned.transaction.thread).toMatchObject({
      mailboxId: "30000000-0000-4000-8000-000000000002",
      source: "website_project_intake",
    });
    expect(planned.transaction.messages?.[1]).toMatchObject({
      fromEmail: "projects@kenarhinlabs.com",
      toEmails: ["visitor@example.com"],
    });
    expect(JSON.stringify(planned.transaction)).not.toContain('"to":["projects@kenarhinlabs.com"]');
  });

  it("preserves an untrusted support reference without creating a client relation", async () => {
    const planned = await planSupportIntake(
      { ...publicMessage, clientReference: "CLIENT-REFERENCE" },
      metadata,
      configuration,
      stableUuidGenerator(),
      new Date("2026-07-13T12:00:00.000Z"),
    );

    expect(planned.transaction.lead).toBeUndefined();
    expect(planned.transaction.thread?.clientId).toBeUndefined();
    expect(planned.transaction.messages?.[0]?.metadata).toMatchObject({
      clientReference: "CLIENT-REFERENCE",
      source: "website_support",
    });
  });

  it("does not accept or publish when the database transaction fails", async () => {
    const publishPending = vi.fn(async () => undefined);
    const service = createTransactionalIntakeService({
      configuration,
      generateId: stableUuidGenerator(),
      persist: async () => {
        throw new Error("Synthetic persistence failure");
      },
      publishPending,
    });

    await expect(service.createContact(publicMessage, metadata)).rejects.toThrow(
      "Synthetic persistence failure",
    );
    expect(publishPending).not.toHaveBeenCalled();
  });

  it("keeps an accepted intake successful when immediate Queue publication is deferred", async () => {
    const onPublishFailure = vi.fn();
    const persist = vi.fn(async () => undefined);
    const service = createTransactionalIntakeService({
      configuration,
      generateId: stableUuidGenerator(),
      onPublishFailure,
      persist,
      publishPending: async () => {
        throw new Error("Synthetic Queue failure");
      },
    });

    const result = await service.createContact(publicMessage, metadata);

    expect(result.status).toBe("accepted");
    expect(persist).toHaveBeenCalledOnce();
    expect(onPublishFailure).toHaveBeenCalledWith({
      event: "email_outbox_publish_deferred",
      intakeId: result.id,
    });
  });
});
