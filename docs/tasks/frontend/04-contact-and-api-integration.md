# Lane 04 — Contact and Public API Integration

## Owner and scope

Owner: primary agent (senior frontend developer).

Owned scope: the `apps/web` public API client, navigation loading/fallback behavior, contact page,
contact form states, and frontend documentation of missing backend adapters.

## Checklist

- [ ] Implement the typed API envelope and error boundary.
- [ ] Preserve `X-Request-Id`/response request IDs in user-facing support states.
- [ ] Integrate server-rendered navigation reads.
- [ ] Build the contact page and accessible form.
- [ ] Match the `contactInputSchema` field and length contract.
- [ ] Implement pending, accepted, validation, rate-limit, dependency, and transport states.
- [ ] Keep a non-JavaScript contact route/fallback where practical.
- [ ] Document backend persistence blockers truthfully.

## Live contract evidence

Checked 2026-07-12 without remote mutation:

- `GET https://api.kenarhinlabs.com/public/navigation` returned `200` with empty `header` and
  `footer` arrays.
- `GET https://api.kenarhinlabs.com/public/homepage` returned `503 DEPENDENCY_UNAVAILABLE`.
- CORS preflight for `POST /public/contact` from `https://kenarhinlabs.com` returned `204` and
  allowed `POST` with `Content-Type`.
- Repository inspection proves `POST /public/contact` validates `name`, `email`, `subject`, and
  `message`, but the production `IntakeService.createContact` port is still fail-closed.

## Verification evidence

Not yet run for the implementation.

## Blockers or handoff notes

The frontend can integrate and display exact failure states, but successful contact intake requires
backend persistence and notification adapters. This lane must not claim an end-to-end successful
submission until live evidence proves it.

