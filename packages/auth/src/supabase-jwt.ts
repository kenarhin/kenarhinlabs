import { dependencyUnavailable, unauthorized } from "@labs/core";
import { createLocalJWKSet, errors as joseErrors, jwtVerify, type JSONWebKeySet } from "jose";
import { z } from "zod";

// Supabase adds standard and project-specific claims beyond this required set.
const authIdentitySchema = z.object({
  sub: z.uuid(),
  iss: z.url(),
  aud: z.union([z.string(), z.array(z.string())]),
  role: z.literal("authenticated"),
  email: z.email().optional(),
  exp: z.number().int(),
  iat: z.number().int().optional(),
  session_id: z.string().optional(),
  aal: z.enum(["aal1", "aal2"]).optional(),
  app_metadata: z.record(z.string(), z.unknown()).optional(),
  user_metadata: z.record(z.string(), z.unknown()).optional(),
});

export type AuthIdentity = z.infer<typeof authIdentitySchema>;

export interface SupabaseJwtConfig {
  supabaseUrl: string;
  audience: string;
  fetcher?: typeof fetch;
}

const MAX_JWKS_BYTES = 64 * 1024;

/** Narrows a parsed JSON value to the minimum structure jose requires for JWKS. */
function isJsonWebKeySet(value: unknown): value is JSONWebKeySet {
  if (typeof value !== "object" || value === null || !("keys" in value)) {
    return false;
  }

  const keys = value.keys;
  return (
    Array.isArray(keys) &&
    keys.length > 0 &&
    keys.every(
      (key) =>
        typeof key === "object" &&
        key !== null &&
        "kty" in key &&
        typeof key.kty === "string" &&
        "kid" in key &&
        typeof key.kid === "string",
    )
  );
}

/** Reads the JWKS stream into a strictly bounded buffer before parsing JSON. */
async function readBoundedJson(response: Response): Promise<unknown> {
  if (response.body === null) {
    throw dependencyUnavailable("Supabase Auth signing keys");
  }

  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  const reader = response.body.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    byteLength += value.byteLength;
    if (byteLength > MAX_JWKS_BYTES) {
      await reader.cancel();
      throw dependencyUnavailable("Supabase Auth signing keys");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    throw dependencyUnavailable("Supabase Auth signing keys");
  }
}

/**
 * Fetches the project's public signing keys through Supabase's edge-cached JWKS
 * endpoint. A local key set avoids retaining request-scoped fetch state in a
 * reused Worker isolate.
 */
async function fetchSigningKeys(config: SupabaseJwtConfig): Promise<JSONWebKeySet> {
  const fetcher = config.fetcher ?? fetch;
  let response: Response;
  try {
    response = await fetcher(
      `${config.supabaseUrl.replace(/\/$/, "")}/auth/v1/.well-known/jwks.json`,
      { headers: { accept: "application/json" } },
    );
  } catch {
    throw dependencyUnavailable("Supabase Auth signing keys");
  }

  if (!response.ok) {
    throw dependencyUnavailable("Supabase Auth signing keys");
  }

  const contentLength = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_JWKS_BYTES) {
    await response.body?.cancel();
    throw dependencyUnavailable("Supabase Auth signing keys");
  }

  const value = await readBoundedJson(response);
  if (!isJsonWebKeySet(value)) {
    throw dependencyUnavailable("Supabase Auth signing keys");
  }

  return value;
}

/**
 * Verifies a Supabase access token with asymmetric signing keys and validates
 * issuer, audience, lifetime, authenticated role, and identity claims.
 */
export async function verifySupabaseJwt(
  token: string,
  config: SupabaseJwtConfig,
): Promise<AuthIdentity> {
  const issuer = `${config.supabaseUrl.replace(/\/$/, "")}/auth/v1`;
  const jwks = await fetchSigningKeys(config);

  try {
    const result = await jwtVerify(token, createLocalJWKSet(jwks), {
      algorithms: ["ES256", "RS256"],
      audience: config.audience,
      issuer,
      requiredClaims: ["sub", "role", "exp"],
    });

    const parsed = authIdentitySchema.safeParse(result.payload);
    if (!parsed.success) {
      throw unauthorized("The access token claims are invalid");
    }

    return parsed.data;
  } catch (error) {
    if (error instanceof joseErrors.JOSEError) {
      throw unauthorized("The access token is invalid or expired");
    }

    throw error;
  }
}
