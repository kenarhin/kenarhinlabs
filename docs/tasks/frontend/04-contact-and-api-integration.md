# Lane 04 — Contact and Public API Integration

## Owner and scope

Owner: primary agent (senior frontend developer).

Owned scope: the `apps/web` public API client, navigation loading/fallback behavior, contact page,
contact form states, and frontend documentation of missing backend adapters.

## Checklist

- [x] Implement the typed API envelope and error boundary.
- [x] Preserve `X-Request-Id`/response request IDs in user-facing support states.
- [x] Integrate server-rendered navigation reads.
- [x] Build the contact page and accessible form.
- [x] Match the `contactInputSchema` field and length contract.
- [x] Implement pending, accepted, validation, rate-limit, dependency, and transport states.
- [x] Keep a non-JavaScript contact route/fallback where practical.
- [x] Document backend persistence blockers truthfully.

## Live contract evidence

Backend refresh verified 2026-07-13:

- `GET https://api.kenarhinlabs.com/public/navigation` returned `200` with empty `header` and
  `footer` arrays.
- `GET https://api.kenarhinlabs.com/public/homepage` returned `503 DEPENDENCY_UNAVAILABLE`.
- CORS preflight for `POST /public/contact` from `https://kenarhinlabs.com` returned `204` and
  allowed `POST` with `Content-Type`.
- `POST /public/contact` is now durable, deployed legacy Projects intake and returns deprecation
  headers pointing to `/public/project-intake`.
- New Contact work must use `POST /public/inquiries`, which stores a General `hello@` inbox thread
  without creating a CRM lead.
- The new channel contracts and admin-inbox handoff are documented in
  [`email-channels-and-inbox-frontend-handoff.md`](email-channels-and-inbox-frontend-handoff.md).

## Verification evidence

### 2026-07-12 — Implemented and browser-verified

- The public API boundary validates same-origin navigation paths, times out safely, and uses the
  structural route set only when the response is empty, invalid, or unavailable.
- The form matches the backend's name/email/subject/message contract and includes a direct email
  alternative when JavaScript or intake persistence is unavailable.
- A CDP test replaced `fetch` locally with a `503 DEPENDENCY_UNAVAILABLE` response, submitted a
  valid form, and verified the visible fallback plus `Reference: req-browser-qa`. No live POST was
  sent during QA.
- The contact page passed Astro diagnostics with no warnings and had no horizontal overflow or
  duplicate IDs in the 1440×1000 light-theme check.

## Blockers or handoff notes

The persistence and communications backend is deployed. This lane remains frontend-incomplete until
the ordinary Contact page moves to `/public/inquiries`, the separate Start-a-Project surface uses
`/public/project-intake`, and an authorized real submission is browser-tested.
