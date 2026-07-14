import type { IntakeTransactionPlan } from "@labs/db/queries/intake.queries";
import { EMAIL_OUTBOX_EVENT_TYPE } from "@labs/db/queries/email-outbox.queries";
import {
  createThreadReplyAddress,
  mailboxForChannel,
  renderEmailJob,
  type EmailChannel,
  type TransactionalEmailJobV1,
} from "@labs/email";
import type { LeadInput } from "@labs/validators";

import type {
  IntakeService,
  RequestMetadata,
  VerifiedContactInput,
  VerifiedInquiryInput,
  VerifiedProjectIntakeInput,
  VerifiedSupportRequestInput,
} from "./contracts";

/** Non-secret display data plus the secret used to authenticate reply aliases. */
export interface IntakeEmailConfiguration {
  fromName: string;
  replyTokenSecret: string;
}

/** Persistence and publishing boundaries used by the transactional intake service. */
export interface IntakeServiceDependencies {
  configuration: IntakeEmailConfiguration;
  persist(plan: IntakeTransactionPlan): Promise<void>;
  publishPending(): Promise<void>;
  generateId?: () => string;
  now?: () => Date;
  onPublishFailure?: (fields: { event: string; intakeId: string }) => void;
}

/** Planned intake transaction plus its public conversation reference. */
export interface PlannedIntake {
  intakeId: string;
  transaction: IntakeTransactionPlan;
}

/** Common message fields accepted by every public communication channel. */
interface PublicMessageInput {
  email: string;
  message: string;
  name: string;
  subject: string;
}

/** Converts a Queue job into the durable outbound communications record. */
function durableEmailMessage(
  job: TransactionalEmailJobV1,
  threadId: string,
  requestId: string,
): NonNullable<IntakeTransactionPlan["messages"]>[number] {
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
    references: [],
    replyToEmail: job.replyTo,
    retryable: true,
    status: "queued",
    subject: rendered.subject,
    textBody: rendered.text,
    threadId,
    toEmails: Array.isArray(job.to) ? [...job.to] : [job.to],
  };
}

/** Converts a versioned email job into a recoverable transactional-outbox row. */
function emailOutboxEvent(
  job: TransactionalEmailJobV1,
): NonNullable<IntakeTransactionPlan["outboxEvents"]>[number] {
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

/** Creates stable intake IDs without sharing request state across Worker invocations. */
function idFactory(generateId: () => string) {
  return {
    confirmationJobId: generateId(),
    confirmationMessageId: generateId(),
    inboundJobId: generateId(),
    inboundMessageId: generateId(),
    leadId: generateId(),
    threadId: generateId(),
  };
}

/** Builds one received website-form record that appears directly in the admin inbox. */
function websiteFormMessage(
  input: PublicMessageInput,
  fields: {
    id: string;
    jobId: string;
    mailboxAddress: string;
    messageMetadata?: Record<string, unknown>;
    requestId: string;
    source: string;
    threadId: string;
    receivedAt: Date;
  },
): NonNullable<IntakeTransactionPlan["messages"]>[number] {
  return {
    attempts: 0,
    direction: "inbound",
    fromEmail: input.email.toLowerCase(),
    id: fields.id,
    idempotencyKey: `intake:${fields.threadId}:inbound:v1`,
    jobId: fields.jobId,
    metadata: {
      ...fields.messageMetadata,
      requestId: fields.requestId,
      source: fields.source,
    },
    provider: "website_form",
    providerMessageId: fields.requestId,
    receivedAt: fields.receivedAt,
    references: [],
    retryable: false,
    status: "received",
    subject: input.subject,
    textBody: input.message,
    threadId: fields.threadId,
    toEmails: [fields.mailboxAddress],
  };
}

/**
 * Builds a channel-aware form intake and one visitor confirmation.
 *
 * The original submission is the inbound admin message. No internal email is
 * sent back to the same mailbox; unread thread state is the durable alert.
 */
async function planPublicMessageIntake(
  input: PublicMessageInput,
  metadata: RequestMetadata,
  configuration: IntakeEmailConfiguration,
  options: {
    channel: EmailChannel;
    source: string;
    lead?: NonNullable<IntakeTransactionPlan["lead"]>;
    messageMetadata?: Record<string, unknown>;
  },
  generateId: () => string,
  receivedAt: Date,
): Promise<PlannedIntake> {
  const ids = idFactory(generateId);
  const mailbox = mailboxForChannel(options.channel);
  const replyTo = await createThreadReplyAddress(
    mailbox,
    ids.threadId,
    configuration.replyTokenSecret,
  );
  const confirmation: TransactionalEmailJobV1 = {
    enqueuedAt: receivedAt.toISOString(),
    from: { email: mailbox.address, name: configuration.fromName },
    idempotencyKey: `intake:${ids.threadId}:confirmation:v1`,
    jobId: ids.confirmationJobId,
    messageId: ids.confirmationMessageId,
    replyTo,
    schemaVersion: 1,
    template: {
      template: "contact-confirmation",
      variables: { recipientName: input.name, reference: ids.threadId },
    },
    to: input.email,
  };

  return {
    intakeId: ids.threadId,
    transaction: {
      ...(options.lead === undefined ? {} : { lead: { ...options.lead, id: ids.leadId } }),
      messages: [
        websiteFormMessage(input, {
          id: ids.inboundMessageId,
          jobId: ids.inboundJobId,
          mailboxAddress: mailbox.address,
          ...(options.messageMetadata === undefined
            ? {}
            : { messageMetadata: options.messageMetadata }),
          receivedAt,
          requestId: metadata.requestId,
          source: options.source,
          threadId: ids.threadId,
        }),
        durableEmailMessage(confirmation, ids.threadId, metadata.requestId),
      ],
      outboxEvents: [emailOutboxEvent(confirmation)],
      thread: {
        id: ids.threadId,
        ...(options.lead === undefined ? {} : { leadId: ids.leadId }),
        lastInboundAt: receivedAt,
        lastMessageAt: receivedAt,
        lastOutboundAt: receivedAt,
        mailboxId: mailbox.id,
        participantEmail: input.email.toLowerCase(),
        participantName: input.name,
        priority: options.channel === "support" ? "high" : "normal",
        source: options.source,
        status: "open",
        subject: input.subject,
        unreadCount: 1,
      },
    },
  };
}

/** Plans a general Contact-page inquiry without prematurely creating a CRM lead. */
export function planInquiryIntake(
  input: VerifiedInquiryInput,
  metadata: RequestMetadata,
  configuration: IntakeEmailConfiguration,
  generateId: () => string = () => crypto.randomUUID(),
  now = new Date(),
): Promise<PlannedIntake> {
  return planPublicMessageIntake(
    input,
    metadata,
    configuration,
    { channel: "general", source: "website_inquiry" },
    generateId,
    now,
  );
}

/** Plans a project inquiry as both a CRM lead and a Projects mailbox thread. */
export function planProjectIntake(
  input: VerifiedProjectIntakeInput | VerifiedContactInput,
  metadata: RequestMetadata,
  configuration: IntakeEmailConfiguration,
  generateId: () => string = () => crypto.randomUUID(),
  now = new Date(),
  source = "website_project_intake",
): Promise<PlannedIntake> {
  const project = input as VerifiedProjectIntakeInput;
  return planPublicMessageIntake(
    input,
    metadata,
    configuration,
    {
      channel: "projects",
      lead: {
        ...(project.company === undefined ? {} : { company: project.company }),
        email: input.email,
        interest: "project_enquiry",
        message: input.message,
        metadata: {
          ...(project.budgetRange === undefined ? {} : { budgetRange: project.budgetRange }),
          requestId: metadata.requestId,
          ...(project.services === undefined ? {} : { services: project.services }),
          subject: input.subject,
          ...(project.timeframe === undefined ? {} : { timeframe: project.timeframe }),
        },
        name: input.name,
        source,
        status: "new",
      },
      source,
    },
    generateId,
    now,
  );
}

/** Plans an existing-client support request without fabricating a client relation. */
export function planSupportIntake(
  input: VerifiedSupportRequestInput,
  metadata: RequestMetadata,
  configuration: IntakeEmailConfiguration,
  generateId: () => string = () => crypto.randomUUID(),
  now = new Date(),
): Promise<PlannedIntake> {
  return planPublicMessageIntake(
    input,
    metadata,
    configuration,
    {
      channel: "support",
      ...(input.clientReference === undefined
        ? {}
        : { messageMetadata: { clientReference: input.clientReference } }),
      source: "website_support",
    },
    generateId,
    now,
  );
}

/** Builds a standalone CRM lead; email threads are created only by message channels. */
export function planLeadIntake(
  input: LeadInput,
  metadata: RequestMetadata,
  generateId: () => string = () => crypto.randomUUID(),
): PlannedIntake {
  const leadId = generateId();
  return {
    intakeId: leadId,
    transaction: {
      lead: {
        ...(input.company === undefined ? {} : { company: input.company }),
        ...(input.email === undefined ? {} : { email: input.email }),
        id: leadId,
        ...(input.interest === undefined ? {} : { interest: input.interest }),
        ...(input.message === undefined ? {} : { message: input.message }),
        metadata: { ...input.metadata, requestId: metadata.requestId },
        name: input.name,
        ...(input.phone === undefined ? {} : { phone: input.phone }),
        source: input.source,
        status: "new",
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
    if ((planned.transaction.outboxEvents?.length ?? 0) > 0) {
      try {
        await dependencies.publishPending();
      } catch {
        dependencies.onPublishFailure?.({
          event: "email_outbox_publish_deferred",
          intakeId: planned.intakeId,
        });
      }
    }
    return { id: planned.intakeId, status: "accepted" };
  }

  return {
    createContact: async (input, metadata) =>
      accept(
        await planProjectIntake(
          input,
          metadata,
          dependencies.configuration,
          generateId,
          now(),
          "legacy_website_contact",
        ),
      ),
    createInquiry: async (input, metadata) =>
      accept(
        await planInquiryIntake(input, metadata, dependencies.configuration, generateId, now()),
      ),
    createLead: async (input, metadata) => accept(planLeadIntake(input, metadata, generateId)),
    createProjectIntake: async (input, metadata) =>
      accept(
        await planProjectIntake(input, metadata, dependencies.configuration, generateId, now()),
      ),
    createSupportRequest: async (input, metadata) =>
      accept(
        await planSupportIntake(input, metadata, dependencies.configuration, generateId, now()),
      ),
  };
}
