import { forbidden } from "@labs/core";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { describe, expect, it } from "vitest";

import { extractBearerToken, resolvePrincipal, verifySupabaseJwt } from "./index";

describe("authentication helpers", () => {
  it("requires one bearer token", () => {
    expect(extractBearerToken("Bearer token-value")).toBe("token-value");
    expect(() => extractBearerToken("Basic value")).toThrowError(/Bearer token/);
  });

  it("resolves current permissions from the repository instead of JWT claims", async () => {
    const principal = await resolvePrincipal(
      {
        aud: "authenticated",
        exp: Math.floor(Date.now() / 1_000) + 60,
        iss: "https://example.supabase.co/auth/v1",
        role: "authenticated",
        sub: "8f66b3be-d77c-4aac-a621-1d9171717a22",
      },
      {
        findByUserId: async (userId) => ({
          permissions: ["content.read"],
          profileStatus: "active",
          roles: ["editor"],
          userId,
        }),
      },
    );

    expect([...principal.permissions]).toEqual(["content.read"]);
    expect([...principal.roles]).toEqual(["editor"]);
  });

  it("fails closed for a suspended database profile", async () => {
    await expect(
      resolvePrincipal(
        {
          aud: "authenticated",
          exp: Math.floor(Date.now() / 1_000) + 60,
          iss: "https://example.supabase.co/auth/v1",
          role: "authenticated",
          sub: "8f66b3be-d77c-4aac-a621-1d9171717a22",
        },
        {
          findByUserId: async (userId) => ({
            permissions: [],
            profileStatus: "suspended",
            roles: [],
            userId,
          }),
        },
      ),
    ).rejects.toEqual(forbidden("This account is not permitted to access the administration API"));
  });

  it("verifies issuer, audience, signature, and required Supabase claims", async () => {
    const { privateKey, publicKey } = await generateKeyPair("ES256");
    const jwk = await exportJWK(publicKey);
    const issuer = "https://example.supabase.co/auth/v1";
    const token = await new SignJWT({ role: "authenticated" })
      .setProtectedHeader({ alg: "ES256", kid: "test-key" })
      .setSubject("8f66b3be-d77c-4aac-a621-1d9171717a22")
      .setIssuer(issuer)
      .setAudience("authenticated")
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(privateKey);
    const fetcher: typeof fetch = async () =>
      Response.json({ keys: [{ ...jwk, kid: "test-key" }] });

    const identity = await verifySupabaseJwt(token, {
      audience: "authenticated",
      fetcher,
      supabaseUrl: "https://example.supabase.co",
    });

    expect(identity.sub).toBe("8f66b3be-d77c-4aac-a621-1d9171717a22");
  });
});
