# Ken Arhin Labs Communication Channels

_Last updated: 2026-07-14_

## Operating model

Ken Arhin Labs uses one administration inbox with separate channel identities. Every incoming
message is stored in Supabase Postgres under its addressed mailbox. Replies are sent from that same
mailbox, so a message to `hello@kenarhinlabs.com` receives a reply from `hello@kenarhinlabs.com`,
while a project conversation remains under `projects@kenarhinlabs.com`.

The canonical backend definitions live in
[`packages/email/src/channels.ts`](../packages/email/src/channels.ts). Frontend constants and copy
must be aligned to that file when the frontend team takes the handoff.

| Address                     | Channel       | Intended use                                                | Inbound | Outbound |
| --------------------------- | ------------- | ----------------------------------------------------------- | ------- | -------- |
| `hello@kenarhinlabs.com`    | General       | Contact page, business and website enquiries                | Yes     | Yes      |
| `projects@kenarhinlabs.com` | Projects      | Start-a-Project intake and project correspondence           | Yes     | Yes      |
| `support@kenarhinlabs.com`  | Support       | Existing-client and technical support                       | Yes     | Yes      |
| `privacy@kenarhinlabs.com`  | Privacy       | Privacy, legal, rights, security, and policy requests       | Yes     | Yes      |
| `contact@kenarhinlabs.com`  | General alias | Compatibility address that enters the General channel       | Yes     | No       |
| `no-reply@kenarhinlabs.com` | System only   | Automated delivery that intentionally has no reply workflow | No      | Yes      |

`contact@` is no longer the legal/privacy identity. It is an inbound compatibility alias for
General. New legal and privacy copy must use `privacy@kenarhinlabs.com`.

## Public form mapping

| Surface                                  | API endpoint                  | Stored channel         | Creates a CRM lead       |
| ---------------------------------------- | ----------------------------- | ---------------------- | ------------------------ |
| Contact — General choice                 | `POST /public/inquiries`      | General / `hello@`     | No                       |
| Contact — Support choice                 | `POST /public/support`        | Support / `support@`   | No automatic client link |
| Start a Project                          | `POST /public/project-intake` | Projects / `projects@` | Yes                      |
| Deprecated compatibility intake contract | `POST /public/contact`        | Projects / `projects@` | Yes                      |

The Contact UI intentionally keeps General and Support in one visible form with a fixed route
choice. The browser maps that choice to one of the two endpoints above; it never submits a mailbox
address or asks the backend to infer routing from a subject line. The legacy endpoint remains
operational during deployment transition, returns `Deprecation: true`, and identifies project
intake as its successor.

## Public-form abuse protection

All three current public message contracts require `turnstileToken`. Astro obtains the token from a
managed Cloudflare Turnstile widget. The API is the security boundary: after its rate limiter runs,
it validates the token with Cloudflare Siteverify, checks the expected action (`contact` or
`project-intake`) and an allowed hostname, and only then calls intake persistence.

- The public site receives only `PUBLIC_TURNSTILE_SITEKEY`; it never receives the secret.
- The API Worker receives `TURNSTILE_SECRET_KEY` as a secret and
  `TURNSTILE_ALLOWED_HOSTNAMES` as non-secret configuration.
- Tokens expire after five minutes and are single-use. The form resets the widget after every
  submission attempt so a fresh token is required.
- Local development uses Cloudflare's published test key pair. Production must use a dedicated
  managed widget restricted to the production hostnames.
- Turnstile failures are not persisted. The API returns `TURNSTILE_VERIFICATION_FAILED`; provider
  outages fail closed as `DEPENDENCY_UNAVAILABLE`.

## Reply and thread rules

- Admin reply requests contain only a plain-text body. The API derives both `From` and `To` from the
  stored thread; a browser cannot choose or spoof either identity.
- Outbound conversation messages use a signed plus-address in `Reply-To`, for example
  `support+<thread>.<signature>@kenarhinlabs.com`.
- Cloudflare Email Routing preserves the plus tag and sends all five inbound addresses to the API
  Worker. The Worker verifies the signature before using a thread hint.
- RFC `Message-ID`, `In-Reply-To`, and `References` are secondary matching signals and are accepted
  only when the envelope sender matches the stored participant.
- `contact@` is normalized to the General mailbox, but replies are sent from `hello@`.
- `no-reply@` has no inbound routing rule. The catch-all remains disabled.

## Storage and delivery meaning

- Private threads, messages, workflow state, and attachment metadata live in Supabase Postgres.
- Attachment bytes live in the private `kenarhinlabs-email-attachments` R2 bucket and are returned
  only through an authenticated `email.read` API route.
- Email bodies and private attachments never enter D1.
- A website submission becomes an inbound inbox message. The unread inbox state replaces the old
  self-addressed “internal notification” email.
- `provider_accepted` means Cloudflare accepted the outbound send request. It does not claim final
  SMTP delivery. `delivered` and `bounced` are reserved for evidence that proves those outcomes.

## Live Cloudflare state

As verified on 2026-07-13:

- Email Routing is enabled and subaddressing is enabled;
- `hello@`, `contact@`, `projects@`, `support@`, and `privacy@` route to `kenarhinlabs-api`;
- the catch-all rule is disabled;
- the Worker may send from `hello@`, `projects@`, `support@`, `privacy@`, and `no-reply@`;
- `EMAIL_REPLY_TOKEN_SECRET` is installed as a non-retrievable Worker secret; and
- the dedicated private attachment R2 bucket exists and is bound to the API Worker.

## Public copy rules

- Use `hello@` for ordinary contact and business correspondence.
- Use `projects@` only when a visitor is starting or discussing a project.
- Use `support@` for support; do not publish response-time promises unless a service agreement
  establishes them.
- Use `privacy@` on privacy, legal, rights, and policy surfaces.
- Do not advertise `contact@` as the primary address; it exists for compatibility.
- Use `no-reply@` only when no monitored reply path is appropriate.

Frontend and deployment details are in
[`docs/tasks/frontend/email-channels-and-inbox-frontend-handoff.md`](tasks/frontend/email-channels-and-inbox-frontend-handoff.md).
