import { describe, expect, it, vi } from "vitest";

import { createTransactionalIntakeService, planContactIntake } from "../src/services/intake";

const configuration = {
  adminSiteUrl: "https://admin.kenarhinlabs.com",
  fromEmail: "projects@kenarhinlabs.com",
  fromName: "Ken Arhin Labs",
  projectIntakeEmail: "projects@kenarhinlabs.com",
};

const metadata = {
  ipAddress: "192.0.2.10",
  requestId: "request-contact-1",
  userAgent: "Synthetic browser details",
};

/** Returns stable UUIDs so the complete durable plan can be asserted without randomness. */
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

describe("transactional intake service", () => {
  it("plans one lead and two durable notification jobs without retaining network metadata", () => {
    const planned = planContactIntake(
      {
        email: "visitor@example.com",
        message: "A sufficiently detailed synthetic project request.",
        name: "Contact Tester",
        subject: "Synthetic project enquiry",
      },
      metadata,
      configuration,
      stableUuidGenerator(),
      new Date("2026-07-13T12:00:00.000Z"),
    );

    expect(planned.transaction.lead).toMatchObject({
      email: "visitor@example.com",
      interest: "project_enquiry",
      metadata: {
        requestId: "request-contact-1",
        subject: "Synthetic project enquiry",
      },
      source: "website_contact",
      status: "new",
    });
    expect(planned.transaction.messages).toHaveLength(2);
    expect(planned.transaction.outboxEvents).toHaveLength(2);
    expect(planned.transaction.outboxEvents.map((event) => event.eventType)).toEqual([
      "email.transactional.requested.v1",
      "email.transactional.requested.v1",
    ]);
    expect(JSON.stringify(planned.transaction)).not.toContain(metadata.ipAddress);
    expect(JSON.stringify(planned.transaction)).not.toContain(metadata.userAgent);
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

    await expect(
      service.createContact(
        {
          email: "visitor@example.com",
          message: "A sufficiently detailed synthetic project request.",
          name: "Contact Tester",
          subject: "Synthetic project enquiry",
        },
        metadata,
      ),
    ).rejects.toThrow("Synthetic persistence failure");
    expect(publishPending).not.toHaveBeenCalled();
  });

  it("keeps an accepted lead successful when immediate Queue publication is deferred", async () => {
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

    const result = await service.createContact(
      {
        email: "visitor@example.com",
        message: "A sufficiently detailed synthetic project request.",
        name: "Contact Tester",
        subject: "Synthetic project enquiry",
      },
      metadata,
    );

    expect(result.status).toBe("accepted");
    expect(persist).toHaveBeenCalledOnce();
    expect(onPublishFailure).toHaveBeenCalledWith({
      event: "email_outbox_publish_deferred",
      leadId: result.id,
    });
  });
});
