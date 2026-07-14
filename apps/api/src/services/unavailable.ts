import { dependencyUnavailable } from "@labs/core";

import type { ApiServices } from "./contracts";

/** Throws for ports that require the database/platform lanes to wire adapters. */
function unavailable(): never {
  throw dependencyUnavailable("Backend persistence");
}

/**
 * Supplies fail-closed adapters for a standalone Worker build. Production must
 * replace these ports with packages/db, R2, Queue, and email implementations.
 */
export function createUnavailableServices(): ApiServices {
  return {
    abuseProtection: {
      verifyTurnstile: async () => unavailable(),
    },
    admin: {
      createClient: async () => unavailable(),
      createContent: async () => unavailable(),
      createMediaUpload: async () => unavailable(),
      createOffer: async () => unavailable(),
      createProject: async () => unavailable(),
      getDashboard: async () => unavailable(),
      listClients: async () => unavailable(),
      listContent: async () => unavailable(),
      listEmails: async () => unavailable(),
      listMedia: async () => unavailable(),
      listOffers: async () => unavailable(),
      listProjects: async () => unavailable(),
      publishContent: async () => unavailable(),
      queueEmail: async () => unavailable(),
      scheduleContent: async () => unavailable(),
      updateContent: async () => unavailable(),
      updateClient: async () => unavailable(),
    },
    authorizationRepository: {
      findByUserId: async () => unavailable(),
    },
    databaseProbe: {
      check: async () => ({ detail: "database adapter not wired", ok: false }),
    },
    communications: {
      getAttachment: async () => unavailable(),
      getThread: async () => unavailable(),
      listThreads: async () => unavailable(),
      replyToThread: async () => unavailable(),
      updateThread: async () => unavailable(),
    },
    idempotency: {
      claim: async () => unavailable(),
      complete: async () => unavailable(),
      release: async () => unavailable(),
    },
    intake: {
      createContact: async () => unavailable(),
      createInquiry: async () => unavailable(),
      createLead: async () => unavailable(),
      createProjectIntake: async () => unavailable(),
      createSupportRequest: async () => unavailable(),
    },
    inboundEmail: {
      receive: async () => unavailable(),
    },
    platform: {
      emailDeliveryRepository: {
        claim: async () => unavailable(),
        markFailed: async () => unavailable(),
        markSent: async () => unavailable(),
      },
      mediaJobProcessor: {
        process: async () => unavailable(),
      },
      outboxEventSource: {
        load: async () => unavailable(),
        markFailed: async () => unavailable(),
        markProcessed: async () => unavailable(),
      },
    },
    publicRead: {
      getContent: async () => unavailable(),
      getHomepage: async () => unavailable(),
      getNavigation: async () => unavailable(),
      listOffers: async () => unavailable(),
      listTools: async () => unavailable(),
    },
    webhooks: {
      handle: async () => unavailable(),
    },
  };
}
