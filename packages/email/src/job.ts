import type { TransactionalEmailJobV1 } from "./types";

/**
 * Parses an untrusted queue body into transactional email job version 1.
 *
 * @param value - Queue body received from Cloudflare Queues.
 * @returns A validated JSON-safe email job.
 */
export function parseTransactionalEmailJob(value: unknown): TransactionalEmailJobV1 {
  if (typeof value !== "object" || value === null) {
    throw new TypeError("Email job must be an object.");
  }

  const candidate = value as Partial<TransactionalEmailJobV1>;
  const from = candidate.from;
  if (
    candidate.schemaVersion !== 1 ||
    !isNonEmptyString(candidate.jobId) ||
    !isNonEmptyString(candidate.messageId) ||
    !isNonEmptyString(candidate.idempotencyKey) ||
    !isRecipient(candidate.to) ||
    typeof from !== "object" ||
    from === null ||
    !isNonEmptyString(from.email) ||
    (from.name !== undefined && !isNonEmptyString(from.name)) ||
    (candidate.replyTo !== undefined && !isNonEmptyString(candidate.replyTo)) ||
    (candidate.headers !== undefined && !isThreadingHeaders(candidate.headers)) ||
    !isTemplateRequest(candidate.template) ||
    !isNonEmptyString(candidate.enqueuedAt)
  ) {
    throw new TypeError("Email job does not match schema version 1.");
  }

  return candidate as TransactionalEmailJobV1;
}

/** Restricts queued custom headers to standards-based conversation threading. */
function isThreadingHeaders(value: unknown): value is Readonly<Record<string, string>> {
  if (!isRecord(value)) return false;
  const entries = Object.entries(value);
  return (
    entries.length <= 2 &&
    entries.every(
      ([name, headerValue]) =>
        ["In-Reply-To", "References"].includes(name) &&
        isNonEmptyString(headerValue) &&
        headerValue.length <= 8_192 &&
        !headerValue.includes("\r") &&
        !headerValue.includes("\n"),
    )
  );
}

/**
 * Narrows identifiers and template text to strings that contain useful data.
 *
 * @param value - Candidate queue field.
 * @returns True when the value contains at least one non-whitespace character.
 */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Verifies a queue-safe recipient field.
 *
 * @param value - Candidate recipient or recipient list.
 * @returns True when every recipient is a non-empty string.
 */
function isRecipient(value: unknown): value is string | string[] {
  return (
    isNonEmptyString(value) ||
    (Array.isArray(value) &&
      value.length > 0 &&
      value.length <= 50 &&
      value.every(isNonEmptyString))
  );
}

/**
 * Checks whether an untrusted value is a non-null object with named fields.
 *
 * @param value - Candidate template variables.
 * @returns True when string-keyed property checks are safe.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Validates a link used by a first-party transactional template.
 *
 * @param value - Candidate absolute URL.
 * @returns True for absolute HTTP or HTTPS URLs only.
 */
function isHttpUrl(value: unknown): value is string {
  if (!isNonEmptyString(value)) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Performs the structural checks needed before template rendering.
 *
 * @param value - Candidate template request.
 * @returns True when the template discriminator and variables are supported.
 */
function isTemplateRequest(value: unknown): value is TransactionalEmailJobV1["template"] {
  if (!isRecord(value) || !isRecord(value.variables)) {
    return false;
  }

  const variables = value.variables;
  switch (value.template) {
    case "contact-confirmation":
      return isNonEmptyString(variables.recipientName) && isNonEmptyString(variables.reference);
    case "lead-received":
      return (
        isNonEmptyString(variables.leadName) &&
        isNonEmptyString(variables.interest) &&
        isHttpUrl(variables.adminUrl) &&
        isNonEmptyString(variables.reference)
      );
    case "project-update":
      return (
        isNonEmptyString(variables.recipientName) &&
        isNonEmptyString(variables.projectName) &&
        isNonEmptyString(variables.update) &&
        (variables.projectUrl === undefined || isHttpUrl(variables.projectUrl))
      );
    case "content-workflow":
      return (
        isNonEmptyString(variables.recipientName) &&
        isNonEmptyString(variables.contentTitle) &&
        ["review", "published", "failed"].includes(String(variables.status)) &&
        isHttpUrl(variables.adminUrl)
      );
    case "thread-reply":
      return (
        isNonEmptyString(variables.subject) &&
        variables.subject.length <= 300 &&
        isNonEmptyString(variables.body) &&
        variables.body.length <= 500_000
      );
    default:
      return false;
  }
}
