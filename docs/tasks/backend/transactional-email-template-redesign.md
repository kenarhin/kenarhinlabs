# Transactional Email Template Redesign

_Updated: 2026-07-14_

## Outcome

The shared `@labs/email` renderer now gives every first-party transactional message a restrained,
brand-specific email shell instead of the previous generic white card. The implementation uses the
approved Ken Arhin Labs visual system:

- Warm Canvas (`#F3F0E8`) outer field;
- Clean Paper (`#FFFDF7`) reading surface;
- Lab Ink (`#11130F`) text and footer;
- Signal Orange (`#FF5A1F`) status and reference accents;
- system-safe sans-serif body copy and monospaced operational labels; and
- the square System K raster confirmed in `packages/design/src/assets/logo/logo.png`.

The contact receipt is channel-aware. General, Projects, Support, and Privacy each receive an honest
heading and route label. The Projects receipt says that a brief was received; Support says that a
support request was received. The UUID remains inside the reference panel instead of making the
inbox subject difficult to scan.

## Logo delivery decision

Cloudflare Email Service supports inline images through Content-ID attachments. The production
template therefore uses an optimized 144×144px PNG derivative as an inline attachment and references
it with `cid:ken-arhin-labs-mark`.

This is deliberately preferable to placing the logo in the public media R2 bucket for email:

- the message does not depend on a separate public request;
- the logo does not create a remote-image request that resembles tracking;
- the image remains part of the MIME message when external images are blocked; and
- the private email-attachment R2 bucket remains private.

The Queue payload remains JSON-only. Brand bytes are introduced only when `renderEmailJob()` creates
the provider-ready message, and the Cloudflare transport passes the attachment to the Email Service
binding.

## Content and accessibility rules

- Every template retains a matching plain-text body.
- The logo has an empty alternative because adjacent live text already says “Ken Arhin Labs”.
- Important copy remains live HTML text rather than rasterised text.
- Core layout and colour are inline; a small responsive style block only improves narrow screens.
- Contact receipts no longer promise a reply “as soon as possible” or imply an unstated SLA.
- Replies ask the recipient to use the email thread so context remains attached to the same
  conversation.

## Verification

Required checks:

- `pnpm --filter @labs/email typecheck`
- `pnpm --filter @labs/email test`
- API typecheck and tests, because the queue consumer owns the transport at runtime
- Wrangler production dry run, proving that the compiled attachment remains inside Worker limits

The email tests assert the channel-specific subject and eyebrow, CID reference, inline PNG metadata,
logo byte payload, lack of response-time wording, and the attachment passed to Cloudflare Email
Service.
