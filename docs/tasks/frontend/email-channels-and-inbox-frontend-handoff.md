# Frontend Handoff: Contact Channels and Unified Inbox

_Prepared: 2026-07-13_

_Public-site implementation updated: 2026-07-14_

The Astro public-site portion of this handoff is now implemented in the repository. Contact combines
General and Support as an explicit route choice, Start a Project is a dedicated page, and all
current public message forms require server-verified Cloudflare Turnstile tokens. Production
provisioning and deployment remain separate operational gates; the administration inbox work below
is still pending.

## Scope boundary

The backend and live Cloudflare/Supabase infrastructure are implemented. No `apps/web` or
`apps/admin` source file was changed in this backend slice. This document is the contract for the
frontend team to implement later.

## What is live

- API Worker: `https://api.kenarhinlabs.com`
- Production Worker version: `ea569614-133b-46ef-9440-57843bf5bbd1`
- Health and readiness: both returned HTTP `200` after deployment.
- Canonical private store: Supabase Postgres.
- Private attachments: `kenarhinlabs-email-attachments` R2 bucket.
- Inbound routing: `hello@`, `contact@`, `projects@`, `support@`, and `privacy@` all route to the
  API Worker. Plus-addressing is enabled and the catch-all is disabled.

## Public form work

Implementation record:
[`public-contact-and-turnstile-implementation.md`](public-contact-and-turnstile-implementation.md).

### 1. Ordinary Contact page

Change the ordinary Contact page to:

```http
POST /public/inquiries
Content-Type: application/json
```

```json
{
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "subject": "General enquiry",
  "message": "A message containing at least ten characters."
}
```

This creates a General inbox thread under `hello@kenarhinlabs.com`. It deliberately does not create
a CRM lead.

### 2. Start-a-Project page

Build the future project form against:

```http
POST /public/project-intake
Content-Type: application/json
```

```json
{
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "subject": "New platform project",
  "message": "Project requirements containing at least ten characters.",
  "company": "Example Co",
  "budgetRange": "15k_50k",
  "timeframe": "Q4 2026",
  "services": ["Strategy", "Web platform"]
}
```

Optional `budgetRange` values are `under_5k`, `5k_15k`, `15k_50k`, `50k_plus`, and `not_sure`.
`services` accepts at most eight entries. This endpoint creates both a Projects inbox thread and a
CRM lead.

### 3. Support surface

Build a future support form against:

```http
POST /public/support
Content-Type: application/json
```

It accepts the common fields plus optional `clientReference`. The backend stores the request under
`support@kenarhinlabs.com` with high priority, but does not trust a browser-supplied reference
enough to fabricate a client relationship.

### 4. Legacy endpoint

`POST /public/contact` remains live for the currently deployed form. It is treated as project intake
and returns `Deprecation: true` plus `Link: </public/project-intake>; rel="successor-version"`.
Remove frontend dependence on this route only when Contact and Start-a-Project have been separated.

### Shared public response behavior

Successful form submissions return HTTP `202`:

```json
{
  "data": { "id": "<thread-or-lead-uuid>", "status": "accepted" },
  "ok": true,
  "requestId": "<request-id>"
}
```

Keep the current validation (`422`), rate-limit (`429`), dependency (`503`), transport, pending, and
request-reference UI states. Never treat confirmation-email delivery as the form acceptance
boundary; the Postgres commit is the acceptance boundary.

## Admin inbox work

All admin routes require a Supabase access token in `Authorization: Bearer <access-token>`. Continue
using a modern active `sb_publishable_...` key for the browser Supabase client. Do not add the
legacy JWT-based `anon` key to new configuration. Supabase MCP verification on 2026-07-13 confirmed
that an enabled modern publishable key exists on the connected project.

### Permissions

| Operation                                 | Permission     |
| ----------------------------------------- | -------------- |
| List/detail/download                      | `email.read`   |
| Reply                                     | `email.send`   |
| Change workflow state/priority/read state | `email.manage` |

The existing seeded administrator role contains these permissions. The API remains the security
boundary even if the UI hides an unavailable action.

### List threads

```http
GET /admin/email-threads?page=1&limit=25&channel=general&status=open&search=example
```

All query fields are optional except their defaults. `channel` is one of `general`, `projects`,
`support`, `privacy`; `status` is one of `open`, `waiting`, `closed`, `archived`. Search requires at
least two characters.

The response `data` contains:

```json
{
  "items": [
    {
      "id": "<uuid>",
      "channel": "general",
      "mailboxAddress": "hello@kenarhinlabs.com",
      "participantEmail": "visitor@example.com",
      "participantName": "Visitor",
      "subject": "General enquiry",
      "status": "open",
      "priority": "normal",
      "unreadCount": 1,
      "source": "direct_email",
      "leadId": null,
      "clientId": null,
      "assignedTo": null,
      "lastMessageAt": "<ISO timestamp>",
      "lastDirection": "inbound",
      "preview": "Bounded plain-text preview"
    }
  ],
  "pagination": { "page": 1, "limit": 25, "pages": 1, "total": 1 }
}
```

### Thread detail

```http
GET /admin/email-threads/:id
```

The response includes mailbox/channel data and chronological `messages`. Each message includes its
delivery state, text/HTML bodies, RFC threading fields, timestamps, and `attachments` metadata.
Prefer `textBody` for rendering. If HTML is ever rendered, sanitize it with a reviewed allowlist;
never insert stored email HTML directly into the DOM.

Do not show `provider_accepted` as “Delivered.” Suggested label: “Accepted by email provider.” Only
the explicit `delivered` state may use “Delivered,” and `bounced` must be shown as a delivery
failure.

### Reply

```http
POST /admin/email-threads/:id/replies
Content-Type: application/json

{ "body": "Plain-text reply" }
```

The API returns HTTP `202` with the queued message ID. Do not add sender, recipient, subject, HTML,
CC, or BCC controls: the backend intentionally rejects that authority. It replies from the mailbox
that owns the thread and sends to the stored participant.

### Workflow update

```http
PATCH /admin/email-threads/:id
Content-Type: application/json

{ "markRead": true, "priority": "high", "status": "waiting" }
```

At least one field is required. Priority values are `low`, `normal`, `high`, `urgent`.

### Private attachment download

```http
GET /admin/email-attachments/:id
```

The route returns the file stream with `Cache-Control: private, no-store`, an attachment content
disposition, `nosniff`, and no public R2 URL. Use the authenticated API request, convert the
response to a `Blob`, and initiate the download without persisting the bearer token or object URL.

## Suggested admin screens

1. Inbox list with channel tabs, unread badge, status/priority filters, search, pagination, and safe
   message previews.
2. Thread detail with participant header, chronological message timeline, attachment list, delivery
   status labels, and plain-text reply composer.
3. Workflow controls for read state, priority, and open/waiting/closed/archive state.
4. Explicit empty, loading, permission-denied, not-found, rate-limit, dependency, and retry states
   that preserve `requestId` for support.

## Security requirements

- Never allow an arbitrary From or recipient field in the admin reply UI.
- Never log or place message bodies, participant addresses, bearer tokens, or attachment contents in
  analytics/error metadata.
- Do not cache inbox or attachment responses in a service worker, IndexedDB, or shared browser
  cache.
- Clear communications state and object URLs on logout/account change.
- Treat participant names, subjects, bodies, filenames, and HTML as untrusted input.
- Do not expose the Worker reply-token secret. Production secrets cannot be retrieved; local
  development should use a separate value in `.dev.vars`.

## Frontend acceptance checklist

- [x] Contact maps General to `/public/inquiries` and advertises `hello@`.
- [x] Contact maps Support to `/public/support` and advertises `support@`.
- [x] Start-a-Project uses `/public/project-intake` and advertises `projects@`.
- [x] Privacy/legal surfaces advertise `privacy@`, not `contact@`.
- [x] All current public message forms submit Turnstile tokens that the API verifies before
      persistence.
- [ ] Admin list/detail/reply/update/attachment flows use the routes and permissions above.
- [ ] Provider acceptance is not mislabeled as final delivery.
- [ ] Stored HTML and filenames are handled as untrusted.
- [ ] No private inbox data is cached by the PWA.
- [ ] Mobile, keyboard, screen-reader, logout, empty, and failure states are tested across public
      and admin surfaces.
