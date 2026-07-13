# Contact Intake Backend Handoff

_Prepared: 2026-07-13_

## Purpose

This handoff documents why the public Contact page cannot currently accept project enquiries and
defines the backend work required to make `POST /public/contact` production-ready.

This is a backend persistence and notification gap. The public Astro form is already connected to
the deployed Hono API and correctly displays the API's structured failure response.

## Current status

```txt
Frontend form submission:       Connected
API route and validation:       Implemented
CORS:                           Implemented
Public rate limiting:           Implemented
Production database readiness:  Healthy
Contact persistence adapter:    Not implemented
Contact email workflow:         Not wired end to end
Current valid-submit result:     503 DEPENDENCY_UNAVAILABLE
```

### Backend implementation update — 2026-07-13

The repository and canonical database work described by this handoff has now been implemented and
verified locally:

- production service construction now replaces the fail-closed intake and email-delivery ports;
- one Postgres transaction creates the lead, communication thread, durable email messages, and
  transactional-outbox events;
- immediate Queue publication is best effort after the commit, with a one-minute scheduled publisher
  recovering deferred outbox work;
- Queue delivery claims and delivery outcomes are persisted with stable job and idempotency keys;
- the migration `add_durable_email_delivery` is applied to the verified Supabase project, with all
  ten columns, three indexes, and the update trigger confirmed live;
- API tests pass (13), email delivery tests pass (9), the affected packages typecheck, migration and
  Drizzle checks pass, changed files pass lint/format checks, and Wrangler 4.110.0 completes the
  deployment dry run.

Production deployment and end-to-end delivery are deliberately still pending. There is no preview
Worker environment configured, no approved synthetic recipient/cleanup run, and Cloudflare Email
Routing currently has no rule that forwards `projects@kenarhinlabs.com` to the verified destination.
The existing catch-all is disabled, so the internal notification must not be described as delivered
until that rule exists and a smoke test proves it.

The canonical communications records live in Supabase Postgres, not D1. D1 remains the public,
non-sensitive projection. Authenticated admin email-list/reply adapters and inbound Email Routing
Worker ingestion are a separate future slice; the present admin email endpoints still fail closed.

User impact:

- a visitor can complete and submit the Contact form;
- the request reaches the production API and receives a request ID;
- the enquiry is not stored;
- no confirmation or internal notification email is queued;
- the visitor is instructed to use `projects@kenarhinlabs.com` instead.

## Public email-channel responsibility

The Contact form is a project-intake surface, so its direct-email fallback remains
`projects@kenarhinlabs.com`. General business enquiries use `hello@kenarhinlabs.com`, while the
separate `contact@kenarhinlabs.com` address is reserved for privacy, legal, security, rights, and
policy correspondence and must not replace the project-intake fallback.

The web source of truth and complete usage rules are documented in
[`docs/frontend-contact-channels.md`](../../frontend-contact-channels.md). If the backend later
sends mail with an address in the `From` header, that address must remain in Cloudflare Email
Sending's outbound sender allowlist separately from the public routing decision.

## Live evidence

Read-only checks performed against `https://api.kenarhinlabs.com` on 2026-07-13:

| Check                                | Result                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------- |
| `GET /health`                        | `200`; production API reports `status: ok`                                |
| `GET /ready`                         | `200`; Auth, database, and rate limiting all report `ok: true`            |
| `GET /public/navigation`             | `200`; route is operational and currently returns empty navigation arrays |
| Valid browser `POST /public/contact` | `503 DEPENDENCY_UNAVAILABLE` with a public request reference              |

Do not include the visitor's submitted name, email address, subject, or message in issue trackers,
logs, screenshots, or test fixtures.

## Request path and confirmed root cause

1. The browser submits `name`, `email`, `subject`, and `message` to the configured API origin in
   [`apps/web/src/lib/forms/contact.ts`](../../../apps/web/src/lib/forms/contact.ts).
2. The Hono route applies the public rate limiter, parses the JSON body with `contactInputSchema`,
   and calls `services.intake.createContact(...)` in
   [`apps/api/src/routes/public.routes.ts`](../../../apps/api/src/routes/public.routes.ts).
3. Production creates its dependency graph through `createWorkerServices(...)` in
   [`apps/api/src/services/postgres.ts`](../../../apps/api/src/services/postgres.ts).
4. That graph starts with `createUnavailableServices()` and does not replace `intake` with a
   Postgres implementation.
5. `createContact` therefore throws `dependencyUnavailable("Backend persistence")` from
   [`apps/api/src/services/unavailable.ts`](../../../apps/api/src/services/unavailable.ts).
6. The global API error boundary serializes the expected failure as HTTP `503` with
   `error.code = "DEPENDENCY_UNAVAILABLE"` and a request ID.

The structured 503 and request reference prove that this is not a frontend networking failure.

## Existing foundations the implementation should reuse

- `crm.leads` already supports public-enquiry fields in
  [`packages/db/src/schema/crm.ts`](../../../packages/db/src/schema/crm.ts).
- The validator contract is already defined in
  [`packages/validators/src/public.ts`](../../../packages/validators/src/public.ts).
- `EMAIL_QUEUE` and the `kenarhinlabs-email` producer/consumer are configured in
  [`apps/api/wrangler.jsonc`](../../../apps/api/wrangler.jsonc).
- `contact-confirmation` and `lead-received` templates already exist in
  [`packages/email/src/templates.ts`](../../../packages/email/src/templates.ts).
- Queue parsing, retry classification, acknowledgement, and delivery handling already exist in
  [`packages/email/src/queue-consumer.ts`](../../../packages/email/src/queue-consumer.ts).
- `comms.email_threads` and `comms.email_messages` provide durable communication records in
  [`packages/db/src/schema/comms.ts`](../../../packages/db/src/schema/comms.ts).
- `sync.outbox_events` provides a transactional outbox foundation in
  [`packages/db/src/schema/sync.ts`](../../../packages/db/src/schema/sync.ts).

The Cloudflare bindings are provisioned. The missing work is application adapter wiring, not basic
API, Hyperdrive, Queue, or email-binding provisioning.

## Required implementation

### 1. Implement a Postgres-backed `IntakeService`

Add a production implementation of both `createContact` and `createLead`, then replace the
unavailable `intake` port inside `createWorkerServices()`.

For a Contact-form submission, persist a new `crm.leads` row rather than a `crm.contacts` row.
`crm.contacts` requires an existing client, while an anonymous project enquiry is not yet a client.

Recommended mapping:

| Contact input       | Lead representation                                                        |
| ------------------- | -------------------------------------------------------------------------- |
| `name`              | `crm.leads.name`                                                           |
| `email`             | `crm.leads.email`                                                          |
| `message`           | `crm.leads.message`                                                        |
| Contact-form origin | `source = "website_contact"`                                               |
| Project subject     | Preserve in reviewed metadata or a dedicated future subject field          |
| Lead category       | A stable value such as `project_enquiry`, not a silently truncated subject |
| API request ID      | Reviewed metadata for support correlation                                  |
| Initial state       | `status = "new"`                                                           |

Do not store raw IP addresses indefinitely or place them in general-purpose metadata without a
documented security purpose, retention period, and privacy review. Request bodies and email
addresses must not be written to application logs.

### 2. Make persistence the acceptance boundary

Return HTTP `202` only after the lead has been committed successfully. The response contract is
already defined by `IntakeService`:

```json
{
  "data": {
    "id": "<lead-uuid>",
    "status": "accepted"
  },
  "ok": true,
  "requestId": "<request-id>"
}
```

Email delivery should be asynchronous. A temporary mail-provider failure must not discard or roll
back an already accepted enquiry.

### 3. Wire durable notification jobs

After the lead is committed, create recoverable email work for:

1. a `contact-confirmation` message to the visitor; and
2. a `lead-received` notification to the approved internal project-intake address.

Prefer a database transaction plus transactional-outbox event so that a Worker or Queue failure
between persistence and enqueue does not lose notification work. The resulting jobs must satisfy
`TransactionalEmailJobV1`, use stable idempotency keys, and reference durable email-message IDs.

The email Queue consumer currently also depends on the fail-closed
`platform.emailDeliveryRepository`. Implement and wire its `claim`, `markSent`, and `markFailed`
methods against the communications schema before claiming end-to-end email delivery.

### 4. Preserve existing public safeguards

- keep the strict Zod body contract and `256 KiB` API body limit;
- preserve `422` validation responses and `429` rate-limit responses;
- preserve CORS restrictions to approved production origins;
- keep request IDs in the response body and `X-Request-Id` header;
- do not add the submitter to a marketing list;
- do not expose database, Queue, provider, or internal error details publicly;
- decide separately whether production Contact submissions require Turnstile. The validator permits
  a token, but the current form does not send one.

## Tests required

### Service and database tests

- valid contact input creates exactly one `crm.leads` record;
- database failure does not return an accepted result;
- subject and request correlation are preserved without leaking private data into logs;
- a durable notification/outbox record is committed with the lead;
- retries do not create duplicate email jobs or delivery records;
- email status transitions cover queued, sent, retryable failure, and terminal failure.

### API tests

- valid Contact request returns `202`, lead ID, `status: accepted`, and request ID;
- invalid input still returns `422` before persistence;
- rate-limited input still returns `429`;
- persistence unavailability still returns an exposed, structured `503`;
- an email-provider failure after persistence does not turn an accepted lead into a failed Contact
  response;
- response and logs never echo the submitted message or email address.

### Preview and production verification

1. Apply and validate repository migrations through the approved Supabase MCP workflow; do not use
   the Supabase CLI.
2. Run API typecheck, lint, and tests.
3. Run a Cloudflare deployment dry run using the repository's required Wrangler command prefix.
4. Deploy to a preview environment and submit a synthetic enquiry.
5. Confirm the lead, outbox/email records, Queue processing, and both expected deliveries.
6. Deploy production only after preview evidence passes.
7. Perform one authorized production smoke submission and retain only its request/lead IDs in the
   verification log.

Example request for preview or an explicitly authorized production smoke test:

```bash
curl --request POST "https://<api-origin>/public/contact" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data '{
    "name": "Backend QA",
    "email": "approved-test-address@example.com",
    "subject": "Contact intake verification",
    "message": "Synthetic verification submission; safe to remove after the test."
  }'
```

Do not run this example against production until the test recipient and cleanup procedure are
approved.

## Acceptance criteria

- [ ] A valid public Contact submission returns HTTP `202`.
- [ ] The response includes a real lead UUID, `status: accepted`, and request ID.
- [ ] The corresponding `crm.leads` record exists exactly once.
- [ ] The enquiry remains stored if email delivery is delayed or fails.
- [ ] Confirmation and internal-notification jobs are durably recorded and processed.
- [ ] Email delivery outcomes are persisted and retry-safe.
- [ ] Validation, rate limiting, CORS, body limits, and safe error envelopes still pass.
- [ ] No submitted message, email address, or unnecessary IP data appears in logs.
- [ ] The real Contact page shows its success state in desktop and mobile browser checks.
- [ ] The direct-email fallback remains available for future dependency outages.
- [ ] Task documentation records preview and production request/lead IDs without personal data.

## Out of scope

- redesigning the Contact page;
- changing the frontend field contract without a coordinated API update;
- building the full admin CRM interface;
- treating a Queue send as a substitute for durable lead persistence;
- weakening failure handling merely to return a successful status.

## Definition of done

This issue is complete only when a real browser submission is accepted by the deployed API, stored
as a durable lead, and produces observable retry-safe notification work. A route-level unit test or
a healthy `/ready` response alone is not sufficient.

## Verification log

### 2026-07-13 — Repository and database implementation

- [x] Implemented Postgres-backed `createContact` and `createLead` adapters.
- [x] Made the lead/message/outbox database transaction the `202` acceptance boundary.
- [x] Implemented the durable Queue publisher and one-minute recovery trigger.
- [x] Implemented idempotent email delivery claim, sent, retryable-failure, and terminal-failure
      persistence.
- [x] Applied and catalog-verified `add_durable_email_delivery` using Supabase MCP on the expected
      `mbscfzccmomwqdybnlbq` project.
- [x] Passed targeted typecheck, tests, schema validation, Drizzle check, lint, formatting, and
      Wrangler dry-run gates.
- [ ] Configure a `projects@kenarhinlabs.com` Email Routing destination rule.
- [ ] Provision/use a preview Worker environment and complete the approved synthetic test.
- [ ] Deploy the reviewed Worker to production.
- [ ] Complete an authorized production browser smoke test and record only request/lead IDs.
