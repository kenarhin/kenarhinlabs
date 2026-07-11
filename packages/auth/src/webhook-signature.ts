import { unauthorized } from "@labs/core";

const encoder = new TextEncoder();

/** Converts an exact-length lowercase or uppercase hex digest into bytes. */
function parseSha256Hex(value: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[0-9a-f]{64}$/i.test(value)) {
    return null;
  }

  const bytes = new Uint8Array(new ArrayBuffer(32));
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Verifies a timestamped v1 HMAC signature over `${timestamp}.${rawBody}` and
 * rejects replay attempts outside the configured clock-skew window.
 */
export async function verifyWebhookSignature(options: {
  rawBody: string;
  signatureHeader: string | undefined;
  timestampHeader: string | undefined;
  secret: string;
  now?: Date;
  toleranceSeconds?: number;
}): Promise<void> {
  const timestamp = Number(options.timestampHeader);
  const now = options.now ?? new Date();
  const toleranceSeconds = options.toleranceSeconds ?? 300;
  const signatureValue = options.signatureHeader?.match(/^v1=([0-9a-f]{64})$/i)?.[1];

  if (
    !Number.isInteger(timestamp) ||
    Math.abs(Math.floor(now.getTime() / 1_000) - timestamp) > toleranceSeconds ||
    signatureValue === undefined
  ) {
    throw unauthorized("The webhook signature is invalid");
  }

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(options.secret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["verify"],
  );
  const provided = parseSha256Hex(signatureValue);

  // Web Crypto performs the MAC verification without a JavaScript string comparison.
  const valid =
    provided !== null &&
    (await crypto.subtle.verify(
      "HMAC",
      key,
      provided,
      encoder.encode(`${timestamp}.${options.rawBody}`),
    ));
  if (!valid) {
    throw unauthorized("The webhook signature is invalid");
  }
}
