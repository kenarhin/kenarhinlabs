/**
 * Public inbox for ordinary business and website enquiries.
 *
 * Use this address for the general site-footer route. Project intake, support,
 * and legal correspondence each have a more specific channel below.
 */
export const GENERAL_CONTACT_EMAIL = "hello@kenarhinlabs.com";

/**
 * Public inbox for new project enquiries and project-intake fallbacks.
 *
 * Use this address on the Start-a-Project page and when project intake cannot
 * accept a submission. Existing-client support belongs to the support channel.
 */
export const PROJECT_CONTACT_EMAIL = "projects@kenarhinlabs.com";

/**
 * Public inbox for existing-client and technical support correspondence.
 *
 * Publish this address only where the available support process and response
 * expectations are clear; its existence does not imply a round-the-clock SLA.
 */
export const SUPPORT_CONTACT_EMAIL = "support@kenarhinlabs.com";

/**
 * Outbound identity for automated transactional messages.
 *
 * Do not present this address as a public contact route. Automated mail should
 * supply an appropriate monitored Reply-To address whenever replies are useful.
 */
export const TRANSACTIONAL_SENDER_EMAIL = "no-reply@kenarhinlabs.com";

/**
 * Dedicated inbox for privacy, legal, security, and policy correspondence.
 *
 * Use this address on legal pages and for rights, correction, or incident
 * requests. It is an inbound contact route, not the project-intake fallback.
 */
export const PRIVACY_CONTACT_EMAIL = "privacy@kenarhinlabs.com";

/**
 * Compatibility alias that enters the General channel.
 *
 * Do not advertise this address as a primary route. New ordinary enquiries
 * use hello@ and legal or rights requests use privacy@.
 */
export const GENERAL_CONTACT_ALIAS_EMAIL = "contact@kenarhinlabs.com";
