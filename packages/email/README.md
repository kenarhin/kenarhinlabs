# `@labs/email`

Canonical channel identities, signed thread reply addresses, transactional email templates,
queue-safe payloads, Cloudflare Email Service transport, and per-message Queue handling.

Templates always generate HTML and plain text. The shared shell embeds the optimized Ken Arhin Labs
mark as a small inline Content-ID image generated from `packages/design/src/assets/logo/logo.png`.
The mark is compiled into the email package at render time, so Queue payloads remain JSON-only and a
recipient does not need to make a public R2 request to display it.

User- or content-specific binary attachments are different: they should be referenced by an
authorized private R2 key and loaded by application-owned code only when a concrete template needs
them. Do not place private attachments in Queue payloads or expose the private email bucket
publicly.

The package expects a generated `SendEmail` binding and an application-owned
`EmailDeliveryRepository` backed by canonical Postgres email records.

`EMAIL_MAILBOXES` is the backend source of truth for General, Projects, Support, and Privacy.
`createThreadReplyAddress()` and `parseThreadReplyAddress()` use request-scoped Web Crypto HMAC
keys; the secret remains in the API Worker and is never included in Queue payloads or browser
contracts.
