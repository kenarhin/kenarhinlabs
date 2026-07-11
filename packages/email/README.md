# `@labs/email`

Transactional email templates, queue-safe payloads, Cloudflare Email Service transport, and
per-message Queue handling.

Templates always generate HTML and plain text. Queue payloads contain JSON data only; binary
attachments should be referenced by an authorized R2 key and loaded by application-owned code when a
concrete template requires them.

The package expects a generated `SendEmail` binding and an application-owned
`EmailDeliveryRepository` backed by canonical Postgres email records.
