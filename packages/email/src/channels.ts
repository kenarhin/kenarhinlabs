/** Canonical human-managed communication channels exposed by the platform. */
export const EMAIL_CHANNELS = ["general", "projects", "support", "privacy"] as const;

export type EmailChannel = (typeof EMAIL_CHANNELS)[number];

/** Stable mailbox identity shared by migrations, API routing, and admin contracts. */
export interface EmailMailboxDefinition {
  id: string;
  channel: EmailChannel;
  address: string;
  displayName: string;
  public: boolean;
  receivesEmail: boolean;
  sendsEmail: boolean;
}

/**
 * Defines the canonical mailbox for each operational channel.
 *
 * Stable UUIDs make database seeds and application plans agree without a
 * request-time lookup. These values are public identifiers, not credentials.
 */
export const EMAIL_MAILBOXES = {
  general: {
    id: "30000000-0000-4000-8000-000000000001",
    channel: "general",
    address: "hello@kenarhinlabs.com",
    displayName: "Ken Arhin Labs",
    public: true,
    receivesEmail: true,
    sendsEmail: true,
  },
  projects: {
    id: "30000000-0000-4000-8000-000000000002",
    channel: "projects",
    address: "projects@kenarhinlabs.com",
    displayName: "Ken Arhin Labs Projects",
    public: true,
    receivesEmail: true,
    sendsEmail: true,
  },
  support: {
    id: "30000000-0000-4000-8000-000000000003",
    channel: "support",
    address: "support@kenarhinlabs.com",
    displayName: "Ken Arhin Labs Support",
    public: false,
    receivesEmail: true,
    sendsEmail: true,
  },
  privacy: {
    id: "30000000-0000-4000-8000-000000000004",
    channel: "privacy",
    address: "privacy@kenarhinlabs.com",
    displayName: "Ken Arhin Labs Privacy",
    public: true,
    receivesEmail: true,
    sendsEmail: true,
  },
} as const satisfies Record<EmailChannel, EmailMailboxDefinition>;

/** Inbound-only compatibility alias that resolves to the General channel. */
export const CONTACT_EMAIL_ALIAS = "contact@kenarhinlabs.com";

/** Outbound-only identity for messages that intentionally do not accept replies. */
export const NO_REPLY_EMAIL = "no-reply@kenarhinlabs.com";

/** Returns the immutable mailbox definition for a validated channel. */
export function mailboxForChannel(channel: EmailChannel): EmailMailboxDefinition {
  return EMAIL_MAILBOXES[channel];
}

/**
 * Resolves an inbound envelope recipient to its canonical operational mailbox.
 *
 * Cloudflare preserves plus-addressing in `message.to`, so the local-part tag
 * is removed only for channel selection. Thread-token validation happens in a
 * separate security boundary.
 */
export function canonicalMailboxForAddress(address: string): EmailMailboxDefinition | null {
  const normalized = address.trim().toLowerCase();
  const atIndex = normalized.lastIndexOf("@");
  if (atIndex <= 0) return null;

  const localPart = normalized.slice(0, atIndex).split("+", 1)[0];
  const baseAddress = `${localPart}@${normalized.slice(atIndex + 1)}`;
  if (baseAddress === CONTACT_EMAIL_ALIAS) return EMAIL_MAILBOXES.general;

  return Object.values(EMAIL_MAILBOXES).find((mailbox) => mailbox.address === baseAddress) ?? null;
}
