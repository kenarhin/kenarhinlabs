import type {
  RenderedTransactionalEmail,
  TransactionalEmailJobV1,
  TransactionalTemplateRequest,
} from "./types";

const BRAND_NAME = "Ken Arhin Labs";

/**
 * Escapes untrusted text before interpolation into a first-party HTML template.
 *
 * @param value - Plain text supplied by an application or database record.
 * @returns HTML-safe text.
 */
function escapeHtml(value: string): string {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character] ?? character,
  );
}

/**
 * Accepts only HTTP(S) URLs before placing a link in an email template.
 *
 * @param value - Candidate absolute URL.
 * @returns The validated URL string.
 */
function safeLink(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new TypeError("Email links must use HTTP or HTTPS.");
  }
  return url.href;
}

/**
 * Wraps template content in the shared transactional email shell.
 *
 * @param heading - Primary email heading.
 * @param bodyHtml - Escaped or controlled HTML body.
 * @returns A complete HTML document fragment.
 */
function emailShell(heading: string, bodyHtml: string): string {
  return `<!doctype html><html lang="en"><body style="margin:0;background:#f5f5f5;color:#171717;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="100%" style="max-width:600px;background:#ffffff;border-radius:12px" cellspacing="0" cellpadding="0"><tr><td style="padding:32px"><p style="margin:0 0 24px;font-weight:700">${BRAND_NAME}</p><h1 style="font-size:24px;margin:0 0 16px">${heading}</h1>${bodyHtml}<p style="margin:32px 0 0;color:#666;font-size:13px">This is a transactional message from ${BRAND_NAME}.</p></td></tr></table></td></tr></table></body></html>`;
}

/** Escapes a plain-text reply and preserves paragraphs without accepting HTML. */
function replyBodyHtml(value: string): string {
  return escapeHtml(value)
    .split(/\n{2,}/u)
    .map((paragraph) => `<p>${paragraph.replaceAll("\n", "<br>")}</p>`)
    .join("");
}

/**
 * Renders a supported first-party transactional template.
 *
 * @param request - Discriminated template name and validated variables.
 * @returns Subject plus matching HTML and plain-text bodies.
 */
export function renderTemplate(
  request: TransactionalTemplateRequest,
): Pick<RenderedTransactionalEmail, "subject" | "html" | "text"> {
  switch (request.template) {
    case "contact-confirmation": {
      const name = escapeHtml(request.variables.recipientName);
      const reference = escapeHtml(request.variables.reference);
      return {
        subject: `We received your message — ${request.variables.reference}`,
        html: emailShell(
          "We received your message",
          `<p>Hello ${name},</p><p>Thanks for contacting us. Your reference is <strong>${reference}</strong>. We will review your request and reply as soon as possible.</p>`,
        ),
        text: `Hello ${request.variables.recipientName},\n\nThanks for contacting ${BRAND_NAME}. Your reference is ${request.variables.reference}. We will review your request and reply as soon as possible.`,
      };
    }
    case "lead-received": {
      const adminUrl = safeLink(request.variables.adminUrl);
      return {
        subject: `New lead: ${request.variables.leadName}`,
        html: emailShell(
          "A new lead is waiting",
          `<p><strong>${escapeHtml(request.variables.leadName)}</strong> is interested in ${escapeHtml(request.variables.interest)}.</p><p>Reference: ${escapeHtml(request.variables.reference)}</p><p><a href="${escapeHtml(adminUrl)}">Open the lead in admin</a></p>`,
        ),
        text: `New lead: ${request.variables.leadName}\nInterest: ${request.variables.interest}\nReference: ${request.variables.reference}\nOpen: ${adminUrl}`,
      };
    }
    case "project-update": {
      const optionalLink =
        request.variables.projectUrl === undefined
          ? ""
          : `<p><a href="${escapeHtml(safeLink(request.variables.projectUrl))}">View project</a></p>`;
      const textLink =
        request.variables.projectUrl === undefined
          ? ""
          : `\nView project: ${safeLink(request.variables.projectUrl)}`;
      return {
        subject: `Project update: ${request.variables.projectName}`,
        html: emailShell(
          `Update for ${escapeHtml(request.variables.projectName)}`,
          `<p>Hello ${escapeHtml(request.variables.recipientName)},</p><p>${escapeHtml(request.variables.update)}</p>${optionalLink}`,
        ),
        text: `Hello ${request.variables.recipientName},\n\n${request.variables.update}${textLink}`,
      };
    }
    case "content-workflow": {
      const adminUrl = safeLink(request.variables.adminUrl);
      return {
        subject: `Content ${request.variables.status}: ${request.variables.contentTitle}`,
        html: emailShell(
          `Content ${escapeHtml(request.variables.status)}`,
          `<p>Hello ${escapeHtml(request.variables.recipientName)},</p><p><strong>${escapeHtml(request.variables.contentTitle)}</strong> is now <strong>${escapeHtml(request.variables.status)}</strong>.</p><p><a href="${escapeHtml(adminUrl)}">Open content in admin</a></p>`,
        ),
        text: `Hello ${request.variables.recipientName},\n\n${request.variables.contentTitle} is now ${request.variables.status}.\nOpen: ${adminUrl}`,
      };
    }
    case "thread-reply": {
      const subject = request.variables.subject.toLowerCase().startsWith("re:")
        ? request.variables.subject
        : `Re: ${request.variables.subject}`;
      return {
        subject,
        html: emailShell("Reply from Ken Arhin Labs", replyBodyHtml(request.variables.body)),
        text: request.variables.body,
      };
    }
  }
}

/**
 * Renders a queue job into the provider-independent email contract.
 *
 * @param job - Validated queue job.
 * @returns Complete transactional email with trace headers.
 */
export function renderEmailJob(job: TransactionalEmailJobV1): RenderedTransactionalEmail {
  const rendered = renderTemplate(job.template);
  return {
    to: job.to,
    from: job.from,
    ...(job.replyTo === undefined ? {} : { replyTo: job.replyTo }),
    ...rendered,
    headers: {
      ...job.headers,
      "X-KenarhinLabs-Message-ID": job.messageId,
      "X-KenarhinLabs-Idempotency-Key": job.idempotencyKey,
    },
  };
}
