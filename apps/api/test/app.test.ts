import { createHmac } from "node:crypto";

import { dependencyUnavailable } from "@labs/core";
import { describe, expect, it, vi } from "vitest";

import { createApp } from "../src/app";
import type { ApiServices, IntakeService } from "../src/services/contracts";
import { createUnavailableServices } from "../src/services/unavailable";

/** Creates the complete generated binding shape used by workerd route tests. */
function testBindings() {
  return {
    ALLOWED_ORIGINS: "https://kenarhinlabs.com,https://admin.kenarhinlabs.com",
    ADMIN_SITE_URL: "https://admin.kenarhinlabs.com",
    CLOUDFLARE_EMAIL_WEBHOOK_SECRET: "cloudflare-email-webhook-secret-value",
    EMAIL_ATTACHMENT_BUCKET_NAME: "kenarhinlabs-email-attachments",
    EMAIL_FROM_NAME: "Ken Arhin Labs",
    EMAIL_REPLY_TOKEN_SECRET: "email-reply-token-secret-value-123456",
    ENVIRONMENT: "test",
    HEALTH_CHECK_TIMEOUT_MS: "2000",
    HYPERDRIVE: {
      connect: () => {
        throw new Error("Hyperdrive is not used by the injected test services");
      },
      connectionString: "postgres://test:test@localhost:5432/test",
      database: "test",
      host: "localhost",
      password: "test",
      port: 5432,
      user: "test",
    },
    INTERNAL_QUEUE_WEBHOOK_SECRET: "internal-queue-webhook-secret-value",
    PUBLIC_RATE_LIMITER: { limit: async () => ({ success: true }) },
    SUPABASE_JWT_AUDIENCE: "authenticated",
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_WEBHOOK_SECRET: "supabase-webhook-secret-value-1234",
    WEBHOOK_RATE_LIMITER: { limit: async () => ({ success: true }) },
  };
}

/** Creates complete intake ports so individual route tests override only their subject. */
function testIntake(overrides: Partial<IntakeService> = {}): IntakeService {
  const accepted = async () => ({ id: crypto.randomUUID(), status: "accepted" as const });
  return {
    createContact: accepted,
    createInquiry: accepted,
    createLead: accepted,
    createProjectIntake: accepted,
    createSupportRequest: accepted,
    ...overrides,
  };
}

/** Creates successful domain ports while retaining fail-closed unused adapters. */
function testServices(overrides: Partial<ApiServices> = {}): ApiServices {
  const unavailable = createUnavailableServices();
  return {
    ...unavailable,
    databaseProbe: { check: async () => ({ ok: true }) },
    idempotency: {
      claim: async () => "claimed",
      complete: async () => undefined,
      release: async () => undefined,
    },
    intake: testIntake(),
    publicRead: {
      getContent: async () => null,
      getHomepage: async () => ({ sections: [] }),
      getNavigation: async () => ({ footer: [], header: [] }),
      listOffers: async () => ({ items: [] }),
      listTools: async () => ({ items: [] }),
    },
    webhooks: { handle: async () => undefined },
    ...overrides,
  };
}

describe("API runtime", () => {
  it("accepts generated platform bindings while validating runtime string configuration", async () => {
    const response = await createApp(testServices()).request("/health", {}, testBindings());

    expect(response.status).toBe(200);
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-request-id")).toBeTruthy();
  });

  it("reports dependency readiness separately from Worker liveness", async () => {
    // Keep this route test deterministic and offline: readiness only needs to
    // prove that the Auth discovery endpoint is reachable, not parse its body.
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null));
    try {
      const response = await createApp(
        testServices({ databaseProbe: { check: async () => ({ ok: false }) } }),
      ).request("/ready", {}, testBindings());
      const body = await response.json<{ error: { code: string } }>();

      expect(response.status).toBe(503);
      expect(body.error.code).toBe("DEPENDENCY_UNAVAILABLE");
    } finally {
      fetchMock.mockRestore();
    }
  });

  it("rejects invalid public intake before persistence", async () => {
    const response = await createApp(testServices()).request(
      "/public/leads",
      {
        body: JSON.stringify({ name: "No contact method" }),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
      testBindings(),
    );
    const body = await response.json<{ error: { code: string } }>();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe("VALIDATION_FAILED");
  });

  it("accepts a valid lead through the rate-limit and intake ports", async () => {
    const createLead = vi.fn(async () => ({
      id: crypto.randomUUID(),
      status: "accepted" as const,
    }));
    const services = testServices({
      intake: testIntake({ createLead }),
    });
    const response = await createApp(services).request(
      "/public/leads",
      {
        body: JSON.stringify({ email: "hello@example.com", name: "Ada Lovelace" }),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
      testBindings(),
    );

    expect(response.status).toBe(202);
    expect(createLead).toHaveBeenCalledOnce();
  });

  it("accepts a valid Contact request with its lead and request identities", async () => {
    const leadId = "10000000-0000-4000-8000-000000000001";
    const createContact = vi.fn(async () => ({ id: leadId, status: "accepted" as const }));
    const response = await createApp(
      testServices({
        intake: testIntake({ createContact }),
      }),
    ).request(
      "/public/contact",
      {
        body: JSON.stringify({
          email: "visitor@example.com",
          message: "A sufficiently detailed synthetic project request.",
          name: "Contact Tester",
          subject: "Synthetic project enquiry",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
      testBindings(),
    );
    const body = await response.json<{
      data: { id: string; status: string };
      ok: boolean;
      requestId: string;
    }>();

    expect(response.status).toBe(202);
    expect(body).toMatchObject({ data: { id: leadId, status: "accepted" }, ok: true });
    expect(body.requestId).toBeTruthy();
    expect(response.headers.get("x-request-id")).toBe(body.requestId);
    expect(createContact).toHaveBeenCalledOnce();
  });

  it("preserves the structured 503 when Contact persistence is unavailable", async () => {
    const response = await createApp(
      testServices({
        intake: testIntake({
          createContact: async () => {
            throw dependencyUnavailable("Backend persistence");
          },
        }),
      }),
    ).request(
      "/public/contact",
      {
        body: JSON.stringify({
          email: "visitor@example.com",
          message: "A sufficiently detailed synthetic project request.",
          name: "Contact Tester",
          subject: "Synthetic project enquiry",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
      testBindings(),
    );
    const body = await response.json<{ error: { code: string }; requestId: string }>();

    expect(response.status).toBe(503);
    expect(body.error.code).toBe("DEPENDENCY_UNAVAILABLE");
    expect(body.requestId).toBeTruthy();
  });

  it("rejects a rate-limited Contact request before invoking intake", async () => {
    const createContact = vi.fn(async () => ({
      id: crypto.randomUUID(),
      status: "accepted" as const,
    }));
    const bindings = {
      ...testBindings(),
      PUBLIC_RATE_LIMITER: { limit: async () => ({ success: false }) },
    };
    const response = await createApp(
      testServices({
        intake: testIntake({ createContact }),
      }),
    ).request(
      "/public/contact",
      {
        body: JSON.stringify({
          email: "visitor@example.com",
          message: "A sufficiently detailed synthetic project request.",
          name: "Contact Tester",
          subject: "Synthetic project enquiry",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
      bindings,
    );
    const body = await response.json<{ error: { code: string } }>();

    expect(response.status).toBe(429);
    expect(body.error.code).toBe("RATE_LIMITED");
    expect(createContact).not.toHaveBeenCalled();
  });

  it("never writes submitted Contact content or addresses to application logs", async () => {
    // Capture the Worker logger surface while keeping test-runner output intact.
    const info = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const privateEmail = "private-contact@example.com";
    const privateMessage = "Synthetic confidential project details for a logging assertion.";
    try {
      const response = await createApp(testServices()).request(
        "/public/contact",
        {
          body: JSON.stringify({
            email: privateEmail,
            message: privateMessage,
            name: "Logging Tester",
            subject: "Private logging assertion",
          }),
          headers: { "content-type": "application/json" },
          method: "POST",
        },
        testBindings(),
      );
      const serializedLogs = JSON.stringify([...info.mock.calls, ...error.mock.calls]);

      expect(response.status).toBe(202);
      expect(serializedLogs).not.toContain(privateEmail);
      expect(serializedLogs).not.toContain(privateMessage);
    } finally {
      info.mockRestore();
      error.mockRestore();
    }
  });

  it("requires authentication before resolving an admin route", async () => {
    const response = await createApp(testServices()).request("/admin/me", {}, testBindings());
    const body = await response.json<{ error: { code: string } }>();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("AUTH_REQUIRED");
  });

  it("verifies a webhook signature and completes its idempotency claim", async () => {
    const complete = vi.fn(async () => undefined);
    const handle = vi.fn(async () => undefined);
    const services = testServices({
      idempotency: {
        claim: async () => "claimed",
        complete,
        release: async () => undefined,
      },
      webhooks: { handle },
    });
    const payload = JSON.stringify({
      data: { table: "content_items" },
      id: "event-1",
      occurredAt: new Date().toISOString(),
      type: "content.updated",
    });
    const timestamp = Math.floor(Date.now() / 1_000).toString();
    const signature = createHmac("sha256", "supabase-webhook-secret-value-1234")
      .update(`${timestamp}.${payload}`)
      .digest("hex");
    const response = await createApp(services).request(
      "/webhooks/supabase",
      {
        body: payload,
        headers: {
          "content-type": "application/json",
          "x-webhook-signature": `v1=${signature}`,
          "x-webhook-timestamp": timestamp,
        },
        method: "POST",
      },
      testBindings(),
    );

    expect(response.status).toBe(202);
    expect(handle).toHaveBeenCalledOnce();
    expect(complete).toHaveBeenCalledWith("supabase", "event-1");
  });
});
