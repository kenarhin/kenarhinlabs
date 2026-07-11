/**
 * Represents a sender or recipient accepted by the transactional email layer.
 */
export interface TransactionalEmailAddress {
  email: string;
  name?: string;
}

/**
 * Represents a rendered, provider-independent transactional email.
 */
export interface RenderedTransactionalEmail {
  to: string | readonly string[];
  from: TransactionalEmailAddress;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  headers?: Readonly<Record<string, string>>;
}

/**
 * Enumerates the first-party templates supported by queue payload version 1.
 */
export type TransactionalTemplateRequest =
  | {
      template: "contact-confirmation";
      variables: { recipientName: string; reference: string };
    }
  | {
      template: "lead-received";
      variables: {
        leadName: string;
        interest: string;
        adminUrl: string;
        reference: string;
      };
    }
  | {
      template: "project-update";
      variables: {
        recipientName: string;
        projectName: string;
        update: string;
        projectUrl?: string;
      };
    }
  | {
      template: "content-workflow";
      variables: {
        recipientName: string;
        contentTitle: string;
        status: "review" | "published" | "failed";
        adminUrl: string;
      };
    };

/**
 * Defines the JSON-only payload sent to the transactional email Queue.
 */
export interface TransactionalEmailJobV1 {
  schemaVersion: 1;
  jobId: string;
  messageId: string;
  idempotencyKey: string;
  to: string | string[];
  from: TransactionalEmailAddress;
  replyTo?: string;
  template: TransactionalTemplateRequest;
  enqueuedAt: string;
}

/**
 * Describes a successful provider send for persistence and observability.
 */
export interface EmailSendReceipt {
  provider: "cloudflare_email";
  providerMessageId: string;
}

/**
 * Classifies provider failures so queue consumers retry only transient faults.
 */
export interface EmailFailure {
  code: string;
  message: string;
  retryable: boolean;
}
