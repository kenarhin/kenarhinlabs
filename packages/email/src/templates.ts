import { createEmailBrandAttachment, EMAIL_BRAND_MARK_SOURCE } from "./brand-assets";
import { canonicalMailboxForAddress, type EmailChannel } from "./channels";
import type {
  RenderedTransactionalEmail,
  TransactionalEmailJobV1,
  TransactionalTemplateRequest,
} from "./types";

const BRAND_NAME = "Ken Arhin Labs";
const BRAND_URL = "https://kenarhinlabs.com/";

interface EmailShellOptions {
  bodyHtml: string;
  eyebrow: string;
  heading: string;
  preheader: string;
}

interface TemplateRenderContext {
  channel?: EmailChannel;
}

const CONTACT_RECEIPT_COPY = {
  general: {
    eyebrow: "GENERAL / MESSAGE RECEIVED",
    heading: "Your message is in the right place.",
    intro: "Your note is now in our General inbox for review.",
    next: "We will read the context and continue the conversation from this email channel.",
    subject: "Message received · Ken Arhin Labs",
  },
  privacy: {
    eyebrow: "PRIVACY / MESSAGE RECEIVED",
    heading: "Your message is in the right place.",
    intro: "Your note is now in our Privacy inbox for review.",
    next: "We will review the context and continue the conversation from this email channel.",
    subject: "Message received · Ken Arhin Labs",
  },
  projects: {
    eyebrow: "PROJECTS / BRIEF RECEIVED",
    heading: "Your project brief has arrived.",
    intro: "Your brief is now in our Projects inbox, with its context kept together.",
    next: "We will review the problem, constraints, and useful next step before continuing the conversation.",
    subject: "Project brief received · Ken Arhin Labs",
  },
  support: {
    eyebrow: "SUPPORT / REQUEST RECEIVED",
    heading: "Your support request has arrived.",
    intro: "Your request is now in our Support inbox for review.",
    next: "We will read the issue and continue the conversation from this email channel.",
    subject: "Support request received · Ken Arhin Labs",
  },
} as const satisfies Record<
  EmailChannel,
  { eyebrow: string; heading: string; intro: string; next: string; subject: string }
>;

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
 * @param options - Controlled shell copy plus escaped template content.
 * @returns A complete HTML document fragment.
 */
function emailShell(options: EmailShellOptions): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${options.heading}</title>
  <style>
    @media only screen and (max-width: 620px) {
      .kal-shell { width: 100% !important; }
      .kal-pad { padding-left: 24px !important; padding-right: 24px !important; }
      .kal-heading { font-size: 32px !important; line-height: 1.08 !important; }
    }
    .kal-copy p { margin: 0 0 20px; }
    .kal-copy a { color: #11130f; font-weight: 700; text-decoration-color: #ff5a1f; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f3f0e8;color:#11130f;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;color:transparent;">${options.preheader}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#F3F0E8">
    <tr>
      <td align="center" style="padding:40px 12px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" class="kal-shell" style="width:600px;max-width:600px;background-color:#fffdf7;border:1px solid #d8d2c6;">
          <tr>
            <td class="kal-pad" style="padding:24px 48px;border-bottom:1px solid #d8d2c6;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td width="56" valign="middle">
                    <img src="${EMAIL_BRAND_MARK_SOURCE}" width="56" height="56" alt="" border="0" style="display:block;width:56px;height:56px;border:0;">
                  </td>
                  <td valign="middle" style="padding-left:16px;">
                    <p style="margin:0;color:#11130f;font-size:17px;font-weight:700;line-height:1.2;">${BRAND_NAME}</p>
                    <p style="margin:5px 0 0;color:#69665f;font-family:'Courier New',Courier,monospace;font-size:10px;line-height:1.4;letter-spacing:1.4px;text-transform:uppercase;">Digital systems, built around people</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="kal-pad" style="padding:48px 48px 16px;">
              <p style="margin:0 0 18px;color:#69665f;font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:700;line-height:1.4;letter-spacing:1.4px;text-transform:uppercase;"><span style="color:#ff5a1f;">●</span>&nbsp;&nbsp;${options.eyebrow}</p>
              <h1 class="kal-heading" style="margin:0;color:#11130f;font-size:40px;font-weight:700;line-height:1.05;letter-spacing:-1.5px;">${options.heading}</h1>
            </td>
          </tr>
          <tr>
            <td class="kal-pad kal-copy" style="padding:24px 48px 48px;color:#2d2d29;font-size:16px;line-height:1.65;">
              ${options.bodyHtml}
            </td>
          </tr>
          <tr>
            <td class="kal-pad" bgcolor="#11130F" style="padding:28px 48px;background-color:#11130f;color:#f3f0e8;">
              <p style="margin:0 0 8px;color:#f3f0e8;font-size:15px;font-weight:700;line-height:1.4;">Digital systems, built around people.</p>
              <p style="margin:0 0 18px;font-size:13px;line-height:1.5;"><a href="${BRAND_URL}" style="color:#ff8a5f;text-decoration:underline;">kenarhinlabs.com</a></p>
              <p style="margin:0;color:#aaa79f;font-family:'Courier New',Courier,monospace;font-size:10px;line-height:1.5;letter-spacing:1px;text-transform:uppercase;">Operational email · No marketing subscription</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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
  context: TemplateRenderContext = {},
): Pick<RenderedTransactionalEmail, "subject" | "html" | "text"> {
  switch (request.template) {
    case "contact-confirmation": {
      const name = escapeHtml(request.variables.recipientName);
      const reference = escapeHtml(request.variables.reference);
      const receipt = CONTACT_RECEIPT_COPY[context.channel ?? "general"];
      return {
        subject: receipt.subject,
        html: emailShell({
          bodyHtml: `<p>Hello <strong>${name}</strong>,</p>
<p>Thanks for writing to ${BRAND_NAME}. ${receipt.intro}</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#F3F0E8" style="margin:28px 0;background-color:#f3f0e8;border-left:3px solid #ff5a1f;">
  <tr>
    <td style="padding:18px 20px 6px;color:#69665f;font-family:'Courier New',Courier,monospace;font-size:10px;font-weight:700;letter-spacing:1.3px;text-transform:uppercase;">Conversation reference</td>
  </tr>
  <tr>
    <td style="padding:0 20px 18px;color:#11130f;font-family:'Courier New',Courier,monospace;font-size:14px;font-weight:700;line-height:1.5;word-break:break-all;">${reference}</td>
  </tr>
</table>
<p style="margin:32px 0 16px;color:#69665f;font-family:'Courier New',Courier,monospace;font-size:10px;font-weight:700;letter-spacing:1.3px;text-transform:uppercase;">What happens next</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
  <tr>
    <td width="42" valign="top" style="padding:0 0 18px;color:#ff5a1f;font-family:'Courier New',Courier,monospace;font-size:12px;font-weight:700;">01</td>
    <td valign="top" style="padding:0 0 18px;color:#2d2d29;font-size:15px;line-height:1.55;"><strong style="color:#11130f;">Context review</strong><br>We read what you shared before deciding what the useful response should be.</td>
  </tr>
  <tr>
    <td width="42" valign="top" style="padding:0;color:#ff5a1f;font-family:'Courier New',Courier,monospace;font-size:12px;font-weight:700;">02</td>
    <td valign="top" style="padding:0;color:#2d2d29;font-size:15px;line-height:1.55;"><strong style="color:#11130f;">One conversation</strong><br>${receipt.next}</td>
  </tr>
</table>
<p style="margin:30px 0 0;">Need to add useful context? Reply directly to this email so it stays with the same conversation.</p>`,
          eyebrow: receipt.eyebrow,
          heading: receipt.heading,
          preheader: `${receipt.heading} Reference ${reference}.`,
        }),
        text: `Hello ${request.variables.recipientName},\n\nThanks for writing to ${BRAND_NAME}. ${receipt.intro}\n\nConversation reference: ${request.variables.reference}\n\nWhat happens next\n1. We read what you shared before deciding what the useful response should be.\n2. ${receipt.next}\n\nNeed to add useful context? Reply directly to this email so it stays with the same conversation.\n\n${BRAND_NAME}\n${BRAND_URL}`,
      };
    }
    case "lead-received": {
      const adminUrl = safeLink(request.variables.adminUrl);
      return {
        subject: `New lead: ${request.variables.leadName}`,
        html: emailShell({
          bodyHtml: `<p><strong>${escapeHtml(request.variables.leadName)}</strong> is interested in ${escapeHtml(request.variables.interest)}.</p><p>Reference: ${escapeHtml(request.variables.reference)}</p><p><a href="${escapeHtml(adminUrl)}">Open the lead in admin</a></p>`,
          eyebrow: "ADMIN / NEW LEAD",
          heading: "A new lead is waiting.",
          preheader: `New lead: ${escapeHtml(request.variables.leadName)}.`,
        }),
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
        html: emailShell({
          bodyHtml: `<p>Hello ${escapeHtml(request.variables.recipientName)},</p><p>${escapeHtml(request.variables.update)}</p>${optionalLink}`,
          eyebrow: "PROJECTS / UPDATE",
          heading: `Update for ${escapeHtml(request.variables.projectName)}.`,
          preheader: `Project update for ${escapeHtml(request.variables.projectName)}.`,
        }),
        text: `Hello ${request.variables.recipientName},\n\n${request.variables.update}${textLink}`,
      };
    }
    case "content-workflow": {
      const adminUrl = safeLink(request.variables.adminUrl);
      return {
        subject: `Content ${request.variables.status}: ${request.variables.contentTitle}`,
        html: emailShell({
          bodyHtml: `<p>Hello ${escapeHtml(request.variables.recipientName)},</p><p><strong>${escapeHtml(request.variables.contentTitle)}</strong> is now <strong>${escapeHtml(request.variables.status)}</strong>.</p><p><a href="${escapeHtml(adminUrl)}">Open content in admin</a></p>`,
          eyebrow: "CONTENT / WORKFLOW",
          heading: `Content ${escapeHtml(request.variables.status)}.`,
          preheader: `${escapeHtml(request.variables.contentTitle)} is now ${escapeHtml(request.variables.status)}.`,
        }),
        text: `Hello ${request.variables.recipientName},\n\n${request.variables.contentTitle} is now ${request.variables.status}.\nOpen: ${adminUrl}`,
      };
    }
    case "thread-reply": {
      const subject = request.variables.subject.toLowerCase().startsWith("re:")
        ? request.variables.subject
        : `Re: ${request.variables.subject}`;
      return {
        subject,
        html: emailShell({
          bodyHtml: replyBodyHtml(request.variables.body),
          eyebrow: "CONVERSATION / REPLY",
          heading: "A reply from Ken Arhin Labs.",
          preheader: "A new reply has been added to your conversation.",
        }),
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
  const mailbox = canonicalMailboxForAddress(job.from.email);
  const rendered = renderTemplate(
    job.template,
    mailbox === null ? {} : { channel: mailbox.channel },
  );
  return {
    to: job.to,
    from: job.from,
    ...(job.replyTo === undefined ? {} : { replyTo: job.replyTo }),
    ...rendered,
    attachments: [createEmailBrandAttachment()],
    headers: {
      ...job.headers,
      "X-KenarhinLabs-Message-ID": job.messageId,
      "X-KenarhinLabs-Idempotency-Key": job.idempotencyKey,
    },
  };
}
