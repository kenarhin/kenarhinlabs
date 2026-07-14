# Communications Backend Completion Record

_Updated: 2026-07-13_

> Public-site follow-up (2026-07-14): the frontend handoff is implemented locally, and the API now
> verifies required Cloudflare Turnstile tokens before public message persistence. See
> [`../frontend/public-contact-and-turnstile-implementation.md`](../frontend/public-contact-and-turnstile-implementation.md)
> for verification and the remaining production provisioning gate.

## Outcome

The contact-intake gap is resolved and expanded into a channel-aware unified inbox backend. Public
forms and direct email now enter the same durable Postgres conversation model, admin replies are
Queue-backed and server-addressed, and inbound attachments are private in R2.

This record covers backend and live infrastructure only. No frontend implementation was performed.
The frontend team handoff is
[`../frontend/email-channels-and-inbox-frontend-handoff.md`](../frontend/email-channels-and-inbox-frontend-handoff.md).

## Channel model

| Channel  | Canonical mailbox           | Public form                   | CRM behavior             |
| -------- | --------------------------- | ----------------------------- | ------------------------ |
| General  | `hello@kenarhinlabs.com`    | `POST /public/inquiries`      | No lead                  |
| Projects | `projects@kenarhinlabs.com` | `POST /public/project-intake` | Creates lead             |
| Support  | `support@kenarhinlabs.com`  | `POST /public/support`        | No untrusted client link |
| Privacy  | `privacy@kenarhinlabs.com`  | Direct email for now          | No lead                  |

`contact@kenarhinlabs.com` is an inbound General alias. `no-reply@kenarhinlabs.com` is outbound
only. The deployed legacy `POST /public/contact` contract remains available and maps to Projects so
the current web app does not break before the frontend handoff is implemented.

## Implemented backend

### Durable public intake

- A form submission becomes an inbound `comms.email_messages` row and an unread
  `comms.email_threads` conversation.
- The original submission, visitor confirmation, and transactional outbox event commit together.
- General and Support do not create speculative CRM leads. Projects creates one lead in the same
  transaction.
- The old internal email from `projects@` to `projects@` was removed. Inbox unread state is the
  internal notification and does not depend on an inbound forwarding destination.
- The `202 accepted` boundary is the successful Postgres commit. Immediate Queue publication is best
  effort, with the scheduled publisher recovering deferred outbox work every minute.

### Inbound Email Routing Worker

- `email()` is implemented on `kenarhinlabs-api` and awaits the full ingestion operation.
- PostalMime 2.7.5 parses a bounded raw message. The Worker rejects invalid senders, oversized
  messages, unknown recipients, and forged reserved plus-addresses.
- Signed HMAC plus-addresses are the primary reply-thread hint. RFC message identifiers are a
  secondary match and require the same participant and mailbox.
- Message retries deduplicate through a raw SHA-256 idempotency key plus provider/RFC identifiers.
- Attachment bytes are written to the private `kenarhinlabs-email-attachments` R2 bucket. Object
  keys contain only generated IDs; database failures and duplicate messages clean up uploaded
  objects.
- Raw MIME is not stored and private content is not written to logs or D1.

### Authenticated administration API

| Route                                   | Permission     | Behavior                              |
| --------------------------------------- | -------------- | ------------------------------------- |
| `GET /admin/email-threads`              | `email.read`   | Filtered/paginated inbox              |
| `GET /admin/email-threads/:id`          | `email.read`   | Thread, messages, attachment metadata |
| `PATCH /admin/email-threads/:id`        | `email.manage` | Read state, priority, workflow status |
| `POST /admin/email-threads/:id/replies` | `email.send`   | Audited durable reply                 |
| `GET /admin/email-attachments/:id`      | `email.read`   | Authenticated private R2 stream       |

Reply requests accept only plain text. The service loads the thread, chooses the stored mailbox as
`From`, chooses the participant as `To`, generates a signed `Reply-To`, and preserves RFC threading
headers. Every reply/status change has an append-only audit row.

The older generic `/admin/emails` scaffold remains fail-closed. New frontend work must use the
thread routes above rather than revive arbitrary browser-controlled send fields.

### Delivery state

Cloudflare Email Sending binding success is stored as `provider_accepted`, not `delivered`. The
schema reserves separate `delivered` and `bounced` timestamps/statuses for final outcome evidence.
This prevents the dashboard failure shown for the former self-addressed internal notification from
being confused with the visitor confirmation that Cloudflare accepted and delivered separately.

## Database migrations

Applied through the connected Supabase MCP to project `mbscfzccmomwqdybnlbq`:

1. `add_unified_email_inbox`
   - four canonical mailboxes;
   - mailbox/participant/source/priority/unread/timeline fields on threads;
   - RFC, reply, actor, receive, provider-acceptance, delivery, and bounce fields on messages;
   - private attachment metadata and RLS policies;
   - legacy `sent` rows migrated to `provider_accepted`.
2. `add_email_message_actor_index`
   - covering index for the admin-reply actor foreign key identified by the Supabase advisor.

Post-apply verification reported four mailboxes, zero threads without a mailbox, no security advisor
findings, and no remaining unindexed foreign key introduced by this slice. Existing unused index
notices are expected in a nearly empty production database and were not removed prematurely.

## Cloudflare production state

- Worker version: `ea569614-133b-46ef-9440-57843bf5bbd1`
- Custom domain: `api.kenarhinlabs.com`
- Private attachment binding: `R2_EMAIL_ATTACHMENTS`
- Reply-token secret: installed as `EMAIL_REPLY_TOKEN_SECRET`; its value is non-retrievable.
- Allowed outbound identities: `hello@`, `projects@`, `support@`, `privacy@`, `no-reply@`.
- Routing rules to the Worker: `hello@`, `contact@`, `projects@`, `support@`, `privacy@`.
- Subaddressing: enabled.
- Catch-all: disabled.
- Existing unrelated `admin@` forwarding rule: preserved.

Production HTTP verification after deployment:

| Check                                     | Result                                                |
| ----------------------------------------- | ----------------------------------------------------- |
| `GET https://api.kenarhinlabs.com/health` | HTTP `200`, production `status: ok`                   |
| `GET https://api.kenarhinlabs.com/ready`  | HTTP `200`; Auth, database, and rate limiting healthy |

No synthetic production form or inbound-email message was sent because no test recipient/cleanup
identity was authorized. The route, Queue, MIME, signed-thread, R2 cleanup, and server-addressing
behavior are covered by automated tests; the next authorized real email can be used as the final
human smoke test.

## Verification gates completed

- Drizzle schema check and migration validator pass.
- All backend workspaces typecheck.
- Backend tests pass, including API (19), Email (13), PWA (13), Storage (8), Sync (4), Validators
  (4), and Auth (4).
- Targeted backend lint passes with zero warnings. The repository-wide backend lint command still
  has the pre-existing `console.log` warning in `packages/pwa/examples/web/register-pwa.example.ts`,
  which this backend slice did not alter.
- Wrangler 4.110.0 production dry-run and deployment pass with the new Email/R2 bindings.
- Live Cloudflare API re-read confirms the bucket, secret binding, privacy sender, subaddressing,
  five routing rules, and disabled catch-all.

## Remaining backend status outside communications

The communications backend described here is implemented and deployed. The entire platform backend
is not yet complete: several unrelated admin domain adapters, homepage/tools reads, generic
webhook/idempotency persistence, media processing, and public projection workflows remain
fail-closed or incomplete. Those gaps should stay tracked independently and must not be hidden by
the email-system completion.

## Operational notes

- Production secrets cannot be retrieved from Cloudflare. Local development must use a different 32+
  character `EMAIL_REPLY_TOKEN_SECRET` in `.dev.vars`; never copy it into source control.
- Rotating the production reply-token secret invalidates outstanding signed plus-addresses. RFC
  threading may still match replies, but rotation should be scheduled and documented.
- Do not delete the legacy `/public/contact` endpoint until the deployed Contact and Start-a-Project
  surfaces have migrated.
- Do not expose R2 publicly or copy email data into D1.
