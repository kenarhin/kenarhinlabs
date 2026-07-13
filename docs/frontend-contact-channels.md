# Ken Arhin Labs Public Contact Channels

_Last updated: 2026-07-13_

## Purpose

Ken Arhin Labs uses separate email identities for general enquiries, project intake, support,
legal correspondence, and automated delivery. Keeping these roles distinct helps visitors choose
the correct route and prevents operational mail from being mixed with privacy or project requests.

| Address                    | Responsibility                                         | Public or system surfaces                             | Outbound sender state          |
| -------------------------- | ------------------------------------------------------ | ----------------------------------------------------- | ------------------------------ |
| `hello@kenarhinlabs.com`   | General business and website enquiries                 | Site footer and ordinary manual correspondence        | Allowed by the API binding     |
| `projects@kenarhinlabs.com` | New project enquiries and project-intake fallback      | Contact page, form-failure messages, lead confirmation | Allowed by the API binding     |
| `support@kenarhinlabs.com` | Existing-client and technical support                  | Support correspondence when a support process exists  | Allowed by the API binding     |
| `no-reply@kenarhinlabs.com` | Automated transactional delivery                       | Auth and system-generated messages                    | Allowed by the API binding     |
| `contact@kenarhinlabs.com` | Privacy, legal, security, rights, and policy requests  | Privacy notice, website terms, legal-page actions      | Inbound only; not allowlisted  |

The web application's source of truth is
[`apps/web/src/data/contact-channels.ts`](../apps/web/src/data/contact-channels.ts). Public web
components and client-side failure messages must import these constants rather than repeat email
address literals. The production outbound allowlist remains in
[`apps/api/wrangler.jsonc`](../apps/api/wrangler.jsonc).

## Usage rules

### General enquiries

Use `hello@kenarhinlabs.com` when a visitor wants to:

- ask a general business question;
- ask about the public website; or
- reach the lab without starting a defined project enquiry.

### Project enquiries

Use `projects@kenarhinlabs.com` when a visitor wants to:

- discuss a possible project;
- use email instead of the project-intake form;
- recover from a contact-form service or network failure.

The backend handoff for `POST /public/contact` therefore keeps this address as the visitor-facing
fallback until durable intake persistence and notification are operational.

### Existing-client support

Use `support@kenarhinlabs.com` for an existing client's technical or operational support request.
Do not publish response-time or availability promises merely because the mailbox exists; any
support hours, service levels, and escalation paths belong in the applicable client agreement or
support documentation.

### Automated transactional delivery

Use `no-reply@kenarhinlabs.com` for automated messages that do not require a direct response, such
as authentication or system-generated notifications. When a useful reply path exists, the email
job should provide a monitored `Reply-To` channel instead of inviting replies to the no-reply
identity.

### Legal and privacy correspondence

Use `contact@kenarhinlabs.com` when a visitor wants to:

- ask about the privacy notice or website terms;
- exercise an applicable privacy right;
- request a correction or deletion;
- report suspected misuse or exposure of information; or
- raise another policy or legal question.

This is currently an inbound contact route. It does not need to be added to Cloudflare Email
Sending's allowed sender list unless the backend later sends mail with `contact@kenarhinlabs.com`
in the `From` header.

## Cloudflare configuration boundary

The `allowed_sender_addresses` array restricts which `From` addresses the API Worker may use. It
does not configure inbound Email Routing or prove which public addresses forward to a monitored
destination. Inbound routing rules and destination verification must be managed separately.

## Maintenance

- Do not use the addresses interchangeably in public copy.
- Do not route legal or privacy requests through the project form as the only option.
- Keep every publicly advertised inbound mailbox monitored.
- If an address changes, update the shared constants first, then review backend sender/recipient
  configuration and operational forwarding separately.
- Never publish a physical or postal address unless Ken Arhin Labs establishes and approves one.
