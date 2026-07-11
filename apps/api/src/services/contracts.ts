import type { AuthorizationRepository } from "@labs/auth";
import type { EmailDeliveryRepository } from "@labs/email";
import type { MediaJobProcessor } from "@labs/storage";
import type { OutboxEventSource } from "@labs/sync";
import type {
  AdminListQuery,
  ContactInput,
  CreateClientInput,
  CreateContentInput,
  CreateEmailInput,
  CreateOfferInput,
  CreateProjectInput,
  LeadInput,
  MediaUploadRequest,
  PublicListQuery,
  UpdateClientInput,
  UpdateContentInput,
  WebhookEnvelope,
  WebhookSource,
} from "@labs/validators";

import type { JsonValue } from "../types/app";

export interface RequestMetadata {
  ipAddress: string | null;
  requestId: string;
  userAgent: string | null;
}

export interface PublicReadService {
  getNavigation(): Promise<JsonValue>;
  getHomepage(): Promise<JsonValue>;
  getContent(type: string, slug: string): Promise<JsonValue | null>;
  listTools(query: PublicListQuery): Promise<JsonValue>;
  listOffers(query: PublicListQuery): Promise<JsonValue>;
}

export interface IntakeService {
  createLead(
    input: LeadInput,
    metadata: RequestMetadata,
  ): Promise<{ id: string; status: "accepted" }>;
  createContact(
    input: ContactInput,
    metadata: RequestMetadata,
  ): Promise<{ id: string; status: "accepted" }>;
}

export interface AdminDomainService {
  getDashboard(): Promise<JsonValue>;
  listContent(query: AdminListQuery): Promise<JsonValue>;
  createContent(input: CreateContentInput, actorId: string): Promise<JsonValue>;
  updateContent(id: string, input: UpdateContentInput, actorId: string): Promise<JsonValue>;
  publishContent(id: string, actorId: string): Promise<JsonValue>;
  scheduleContent(id: string, scheduledFor: Date, actorId: string): Promise<JsonValue>;
  listClients(query: AdminListQuery): Promise<JsonValue>;
  createClient(input: CreateClientInput, actorId: string): Promise<JsonValue>;
  updateClient(id: string, input: UpdateClientInput, actorId: string): Promise<JsonValue>;
  listProjects(query: AdminListQuery): Promise<JsonValue>;
  createProject(input: CreateProjectInput, actorId: string): Promise<JsonValue>;
  listOffers(query: AdminListQuery): Promise<JsonValue>;
  createOffer(input: CreateOfferInput, actorId: string): Promise<JsonValue>;
  listMedia(query: AdminListQuery): Promise<JsonValue>;
  createMediaUpload(input: MediaUploadRequest, actorId: string): Promise<JsonValue>;
  listEmails(query: AdminListQuery): Promise<JsonValue>;
  queueEmail(input: CreateEmailInput, actorId: string): Promise<JsonValue>;
}

export interface IdempotencyStore {
  claim(source: WebhookSource, eventId: string): Promise<"claimed" | "duplicate">;
  complete(source: WebhookSource, eventId: string): Promise<void>;
  release(source: WebhookSource, eventId: string): Promise<void>;
}

export interface WebhookService {
  handle(source: WebhookSource, event: WebhookEnvelope): Promise<void>;
}

export interface DatabaseProbe {
  check(): Promise<{ detail?: string; ok: boolean }>;
}

/** Application-owned persistence and processing ports used by platform consumers. */
export interface PlatformPorts {
  emailDeliveryRepository: EmailDeliveryRepository;
  mediaJobProcessor: MediaJobProcessor;
  outboxEventSource: OutboxEventSource;
}

export interface ApiServices {
  admin: AdminDomainService;
  authorizationRepository: AuthorizationRepository;
  databaseProbe: DatabaseProbe;
  idempotency: IdempotencyStore;
  intake: IntakeService;
  platform: PlatformPorts;
  publicRead: PublicReadService;
  webhooks: WebhookService;
}
