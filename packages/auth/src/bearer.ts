import { unauthorized } from "@labs/core";

/** Extracts a single RFC 6750 Bearer credential from an Authorization header. */
export function extractBearerToken(authorizationHeader: string | undefined): string {
  if (authorizationHeader === undefined) {
    throw unauthorized();
  }

  const match = /^Bearer ([^\s]+)$/i.exec(authorizationHeader.trim());
  if (match?.[1] === undefined) {
    throw unauthorized("The Authorization header must contain one Bearer token");
  }

  return match[1];
}
