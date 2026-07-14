import { isAppError } from "@labs/core";
import { describe, expect, it, vi } from "vitest";

import { createTurnstileService } from "../src/services/turnstile";

/** Builds a deterministic verifier around a single mocked Siteverify response. */
function verifier(body: unknown, status = 200) {
  const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    void input;
    void init;
    return Response.json(body, { status });
  });
  return {
    fetcher,
    service: createTurnstileService({
      allowedHostnames: ["kenarhinlabs.com"],
      fetcher,
      secretKey: "test-secret",
    }),
  };
}

describe("Turnstile abuse protection", () => {
  it("accepts a successful token only for the expected hostname and action", async () => {
    const { fetcher, service } = verifier({
      action: "contact",
      hostname: "kenarhinlabs.com",
      success: true,
    });

    await expect(
      service.verifyTurnstile({
        action: "contact",
        remoteIp: "203.0.113.10",
        token: "verified-token",
      }),
    ).resolves.toBeUndefined();
    expect(fetcher).toHaveBeenCalledOnce();

    const request = fetcher.mock.calls[0]?.[1];
    expect(request?.method).toBe("POST");
    expect(JSON.parse(String(request?.body))).toMatchObject({
      remoteip: "203.0.113.10",
      response: "verified-token",
      secret: "test-secret",
    });
  });

  it.each([
    [{ action: "project-intake", hostname: "kenarhinlabs.com", success: true }],
    [{ action: "contact", hostname: "untrusted.example", success: true }],
    [{ action: "contact", hostname: "kenarhinlabs.com", success: false }],
  ])("rejects an untrusted Siteverify result", async (body) => {
    const { service } = verifier(body);

    await expect(
      service.verifyTurnstile({ action: "contact", remoteIp: null, token: "token" }),
    ).rejects.toMatchObject({ code: "TURNSTILE_VERIFICATION_FAILED", status: 403 });
  });

  it("fails closed when Siteverify is unavailable", async () => {
    const service = createTurnstileService({
      allowedHostnames: ["kenarhinlabs.com"],
      fetcher: vi.fn(async () => new Response(null, { status: 503 })),
      secretKey: "test-secret",
    });

    try {
      await service.verifyTurnstile({ action: "contact", remoteIp: null, token: "token" });
      expect.fail("Expected Turnstile verification to fail closed");
    } catch (error) {
      expect(isAppError(error)).toBe(true);
      expect(error).toMatchObject({ code: "DEPENDENCY_UNAVAILABLE", status: 503 });
    }
  });
});
