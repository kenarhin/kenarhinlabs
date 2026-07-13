import type { IntakeTransactionPlan } from "@labs/db/queries/intake.queries";
import { EMAIL_OUTBOX_EVENT_TYPE } from "@labs/db/queries/email-outbox.queries";
import { renderEmailJob, type TransactionalEmailJobV1 } from "@labs/email";
import type { ContactInput, LeadInput } from "@labs/validators";

import type { IntakeService, RequestMetadata } from "./contracts";

/** Non-secret delivery configuration owned by the Worker environment. */
export interface IntakeEmailConfiguration {
  adminSiteUrl: string;
  fromEmail: string;
  fromName: string;
  projectIntakeEmail: string;
}

/** Persistence and publishing boundaries used by the transactional intake service. */
export interface IntakeServiceDependencies {
  configuration: IntakeEmailConfiguration;
  persist(plan: IntakeTransactionPlan): Promise<void>;
  publishPending(): Promise<void>;
  generateId?: () => string;
  now?: () => Date;
  onPublishFailure?: (fields: { event: string; leadId: string }) => void;
}

/** Planned intake transaction plus its public acceptance identity. */
export interface PlannedIntake {
  leadId: string;
  transaction: IntakeTransactionPlan;
}

/** Converts a transactional job into the durable communications row sent by the consumer. */
function durableEmailMessage(
  job: TransactionalEmailJobV1,
  threadId: string,
  requestId: string,
): IntakeTransactionPlan["messages"][number] {
  const rendered = renderEmailJob(job);
  return {
    attempts: 0,
    direction: "outbound",
    fromEmail: job.from.email,
    htmlBody: rendered.html,
    id: job.messageId,
    idempotencyKey: job.idempotencyKey,
    jobId: job.jobId,
    metadata: { requestId, template: job.template.template },
    provider: "cloudflare_email",
    retryable: true,
    status: "queued",
    subject: rendered.subject,
    textBody: rendered.text,
    threadId,
    toEmails: Array.isArray(job.to) ? [...job.to] : [job.to],
  };
}

/** Converts one versioned email job into a recoverable transactional-outbox row. */
function emailOutboxEvent(
  job: TransactionalEmailJobV1,
): IntakeTransactionPlan["outboxEvents"][number] {
  return {
    aggregateId: job.messageId,
    aggregateType: "comms.email_messages",
    dedupeKey: `email:${job.idempotencyKey}`,
    eventType: EMAIL_OUTBOX_EVENT_TYPE,
    id: job.jobId,
    payload: {
      ...job,
      from: { ...job.from },
      template: { ...job.template, variables: { ...job.template.variables } },
    },
  };
}

/** Creates stable IDs without sharing request-scoped state between Worker invocations. */
function idFactory(generateId: () => string) {
  return {
    confirmationJobId: generateId(),
    confirmationMessageId: generateId(),
    internalJobId: generateId(),
    internalMessageId: generateId(),
    leadId: generateId(),
    threadId: generateId(),
  };
}

/**
 * Builds the canonical Contact transaction without retaining IP or user-agent data.
 *
 * @param input - Strictly validated public Contact payload.
 * @param metadata - Trusted request correlation metadata.
 * @param configuration - Approved sender, intake recipient, and admin origin.
 * @param generateId - Cryptographically secure UUID generator.
 * @param now - Acceptance timestamp.
 * @returns Lead, communications records, and two durable email outbox events.
 */
export function planContactIntake(
  input: ContactInput,
  metadata: RequestMetadata,
  configuration: IntakeEmailConfiguration,
  generateId: () => string = () => crypto.randomUUID(),
  now = new Date(),
): PlannedIntake {
  const ids = idFactory(generateId);
  const enqueuedAt = now.toISOString();
  const sender = { email: configuration.fromEmail, name: configuration.fromName };
  const confirmation: TransactionalEmailJobV1 = {
    enqueuedAt,
    from: sender,
    idempotencyKey: `contact:${ids.leadId}:confirmation:v1`,
    jobId: ids.confirmationJobId,
    messageId: ids.confirmationMessageId,
    replyTo: configuration.projectIntakeEmail,
    schemaVersion: 1,
    template: {
      template: "contact-confirmation",
      variables: { recipientName: input.name, reference: ids.leadId },
    },
    to: input.email,
  };
  const internal: TransactionalEmailJobV1 = {
    enqueuedAt,
    from: sender,
    idempotencyKey: `contact:${ids.leadId}:internal:v1`,
    jobId: ids.internalJobId,
    messageId: ids.internalMessageId,
    replyTo: input.email,
    schemaVersion: 1,
    template: {
      template: "lead-received",
      variables: {
        adminUrl: `${configuration.adminSiteUrl.replace(/\/$/, "")}/leads/${ids.leadId}`,
        interest: "project enquiry",
        leadName: input.name,
        reference: ids.leadId,
      },
    },
    to: configuration.projectIntakeEmail,
  };

  return {
    leadId: ids.leadId,
    transaction: {
      lead: {
        email: input.email,
        id: ids.leadId,
        interest: "project_enquiry",
        message: input.message,
        metadata: { requestId: metadata.requestId, subject: input.subject },
        name: input.name,
        source: "website_contact",
        status: "new",
      },
      messages: [
        durableEmailMessage(confirmation, ids.threadId, metadata.requestId),
        durableEmailMessage(internal, ids.threadId, metadata.requestId),
      ],
      outboxEvents: [emailOutboxEvent(confirmation), emailOutboxEvent(internal)],
      thread: {
        id: ids.threadId,
        leadId: ids.leadId,
        status: "open",
        subject: input.subject,
      },
    },
  };
}

/** Builds a general lead transaction with one durable internal notification. */
export function planLeadIntake(
  input: LeadInput,
  metadata: RequestMetadata,
  configuration: IntakeEmailConfiguration,
  generateId: () => string = () => crypto.randomUUID(),
  now = new Date(),
): PlannedIntake {
  const ids = idFactory(generateId);
  const interest = input.interest ?? "general enquiry";
  const internal: TransactionalEmailJobV1 = {
    enqueuedAt: now.toISOString(),
    from: { email: configuration.fromEmail, name: configuration.fromName },
    idempotencyKey: `lead:${ids.leadId}:internal:v1`,
    jobId: ids.internalJobId,
    messageId: ids.internalMessageId,
    ...(input.email === undefined ? {} : { replyTo: input.email }),
    schemaVersion: 1,
    template: {
      template: "lead-received",
      variables: {
        adminUrl: `${configuration.adminSiteUrl.replace(/\/$/, "")}/leads/${ids.leadId}`,
        interest,
        leadName: input.name,
        reference: ids.leadId,
      },
    },
    to: configuration.projectIntakeEmail,
  };

  return {
    leadId: ids.leadId,
    transaction: {
      lead: {
        ...(input.company === undefined ? {} : { company: input.company }),
        ...(input.email === undefined ? {} : { email: input.email }),
        id: ids.leadId,
        ...(input.interest === undefined ? {} : { interest: input.interest }),
        ...(input.message === undefined ? {} : { message: input.message }),
        metadata: { ...input.metadata, requestId: metadata.requestId },
        name: input.name,
        ...(input.phone === undefined ? {} : { phone: input.phone }),
        source: input.source,
        status: "new",
      },
      messages: [durableEmailMessage(internal, ids.threadId, metadata.requestId)],
      outboxEvents: [emailOutboxEvent(internal)],
      thread: {
        id: ids.threadId,
        leadId: ids.leadId,
        status: "open",
        subject: `New lead: ${interest}`,
      },
    },
  };
}

/** Creates the public intake service whose acceptance boundary is the Postgres commit. */
export function createTransactionalIntakeService(
  dependencies: IntakeServiceDependencies,
): IntakeService {
  const generateId = dependencies.generateId ?? (() => crypto.randomUUID());
  const now = dependencies.now ?? (() => new Date());

  async function accept(planned: PlannedIntake): Promise<{ id: string; status: "accepted" }> {
    await dependencies.persist(planned.transaction);
    try {
      await dependencies.publishPending();
    } catch {
      // Persistence remains the acceptance boundary. The scheduled outbox
      // publisher retries this durable work without exposing mail failures.
      dependencies.onPublishFailure?.({
        event: "email_outbox_publish_deferred",
        leadId: planned.leadId,
      });
    }
    return { id: planned.leadId, status: "accepted" };
  }

  return {
    createContact: async (input, metadata) =>
      accept(planContactIntake(input, metadata, dependencies.configuration, generateId, now())),
    createLead: async (input, metadata) =>
      accept(planLeadIntake(input, metadata, dependencies.configuration, generateId, now())),
  };
}
