import { canonicalMailboxForAddress, type EmailMailboxDefinition } from "./channels";

const encoder = new TextEncoder();
const THREAD_SIGNATURE_BYTES = 12;
const THREAD_TOKEN_PATTERN =
  /^(?<local>[a-z0-9._-]+)\+(?<thread>[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.(?<signature>[a-zA-Z0-9_-]+)@(?<domain>[^@]+)$/i;

/** Converts bytes to URL-safe base64 without padding for an email local part. */
function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

/** Decodes URL-safe base64 while rejecting malformed thread signatures. */
function decodeBase64Url(value: string): Uint8Array<ArrayBuffer> | null {
  try {
    const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const binary = atob(padded);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

/** Imports one request-scoped HMAC key without retaining secret material globally. */
async function signingKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign", "verify"],
  );
}

/** Creates the exact authenticated payload used for reply-address signatures. */
function signaturePayload(mailboxAddress: string, threadId: string): Uint8Array<ArrayBuffer> {
  return encoder.encode(`${mailboxAddress.toLowerCase()}\n${threadId.toLowerCase()}`);
}

/** Compares fixed-length signatures without an early-exit timing difference. */
function signaturesMatch(actual: Uint8Array, expected: Uint8Array): boolean {
  if (actual.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < actual.length; index += 1) {
    difference |= (actual[index] ?? 0) ^ (expected[index] ?? 0);
  }
  return difference === 0;
}

/**
 * Builds a signed plus-address that routes a future reply to one stored thread.
 *
 * @param mailbox - Canonical From/Reply-To identity for the conversation.
 * @param threadId - Stable communications thread UUID.
 * @param secret - Worker secret dedicated to reply-token authentication.
 * @returns A subaddress accepted by the mailbox's Cloudflare routing rule.
 */
export async function createThreadReplyAddress(
  mailbox: EmailMailboxDefinition,
  threadId: string,
  secret: string,
): Promise<string> {
  const [localPart, domain] = mailbox.address.split("@");
  if (localPart === undefined || domain === undefined) {
    throw new TypeError("Mailbox address is invalid");
  }

  const signature = await crypto.subtle.sign(
    "HMAC",
    await signingKey(secret),
    signaturePayload(mailbox.address, threadId),
  );
  // A 96-bit truncated HMAC keeps the complete local part within RFC limits
  // while retaining ample unguessability for a conversation-routing token.
  const token = new Uint8Array(signature).slice(0, THREAD_SIGNATURE_BYTES);
  return `${localPart}+${threadId}.${base64Url(token)}@${domain}`;
}

/**
 * Verifies a signed reply address and returns its trusted mailbox/thread pair.
 *
 * Invalid or ordinary recipients return null so the inbound handler can fall
 * back to Message-ID threading or start a new conversation safely.
 */
export async function parseThreadReplyAddress(
  address: string,
  secret: string,
): Promise<{ mailbox: EmailMailboxDefinition; threadId: string } | null> {
  const match = THREAD_TOKEN_PATTERN.exec(address.trim());
  if (match?.groups === undefined) return null;

  const mailbox = canonicalMailboxForAddress(address);
  const signature = decodeBase64Url(match.groups.signature ?? "");
  const threadId = match.groups.thread?.toLowerCase();
  if (
    mailbox === null ||
    signature === null ||
    signature.length !== THREAD_SIGNATURE_BYTES ||
    threadId === undefined
  ) {
    return null;
  }

  const expected = new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      await signingKey(secret),
      signaturePayload(mailbox.address, threadId),
    ),
  ).slice(0, THREAD_SIGNATURE_BYTES);
  return signaturesMatch(signature, expected) ? { mailbox, threadId } : null;
}
