# Ken Arhin Labs Communication Channels

_Last updated: 2026-07-13_

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

| Surface                                | API endpoint                  | Stored channel         | Creates a CRM lead       |
| -------------------------------------- | ----------------------------- | ---------------------- | ------------------------ |
| Contact                                | `POST /public/inquiries`      | General / `hello@`     | No                       |
| Start a Project                        | `POST /public/project-intake` | Projects / `projects@` | Yes                      |
| Support                                | `POST /public/support`        | Support / `support@`   | No automatic client link |
| Currently deployed legacy Contact form | `POST /public/contact`        | Projects / `projects@` | Yes                      |

The legacy endpoint remains operational to avoid breaking the deployed web app. It returns
`Deprecation: true` and a successor link. The frontend team should move the ordinary Contact page to
`/public/inquiries` and reserve `/public/project-intake` for the dedicated Start-a-Project page.

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

Frontend implementation details are in
[`docs/tasks/frontend/email-channels-and-inbox-frontend-handoff.md`](tasks/frontend/email-channels-and-inbox-frontend-handoff.md).
