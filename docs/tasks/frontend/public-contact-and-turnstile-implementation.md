# Public Contact, Project Intake, and Turnstile Implementation

_Updated: 2026-07-14_

## Outcome

The Astro public site now presents two distinct communication surfaces without forcing visitors to
understand internal inboxes:

- `/contact` offers an explicit General or Support choice in one form;
- `/start-a-project` collects a structured project brief; and
- every current public message form is gated by server-verified Cloudflare Turnstile.

The UI preserves the existing warm editorial system, semantic design tokens, keyboard-native form
controls, direct email fallbacks, request references, and the backend's HTTP `202` acceptance
boundary. No attachment upload or response-time promise was added.

## Route and mailbox contract

| Visitor choice  | API route                     | Mailbox                     | CRM effect               | Turnstile action |
| --------------- | ----------------------------- | --------------------------- | ------------------------ | ---------------- |
| General         | `POST /public/inquiries`      | `hello@kenarhinlabs.com`    | None                     | `contact`        |
| Support         | `POST /public/support`        | `support@kenarhinlabs.com`  | No automatic client link | `contact`        |
| Start a Project | `POST /public/project-intake` | `projects@kenarhinlabs.com` | Creates a project lead   | `project-intake` |

The Contact form uses a fixed client-side mapping from its visible choice to these routes. It does
not submit a recipient address, and the API does not infer a channel from free text. Privacy and
policy correspondence remains direct email to `privacy@kenarhinlabs.com`. The inbound-only
`contact@kenarhinlabs.com` alias is not advertised.

## Turnstile security boundary

The public validator contracts require a token of at most 2,048 characters. Each protected API route
follows this order:

1. enforce the existing Cloudflare rate-limit binding;
2. validate and bound the JSON request;
3. call Cloudflare Siteverify from the API Worker;
4. require `success: true`, the route's expected action, and an allowed hostname; and
5. call durable intake persistence only after verification succeeds.

The Astro client loads `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit`
directly, renders a flexible managed widget, locks submission until a token exists, and resets the
widget after every attempt because tokens are short-lived and single-use. The secret never enters
the browser, repository, response body, or logs.

## Configuration

Public Astro build configuration:

```text
PUBLIC_API_BASE_URL=https://api.kenarhinlabs.com
PUBLIC_SITE_URL=https://kenarhinlabs.com
PUBLIC_TURNSTILE_SITEKEY=<production-widget-sitekey>
```

API Worker configuration:

```text
TURNSTILE_ALLOWED_HOSTNAMES=kenarhinlabs.com,www.kenarhinlabs.com
TURNSTILE_SECRET_KEY=<Worker secret matching the production widget>
```

Cloudflare's documented always-pass test sitekey and secret are present only in the committed
example files for local development. Real values must be installed through the hosting and Worker
secret controls without reading, logging, or committing them.

## Copy and legal alignment

- Contact explains that General and Support remain separate inbox channels and do not create a
  speculative project lead.
- Start a Project explains that acceptance creates both a Projects thread and project lead but not a
  contract or marketing subscription.
- The privacy notice now describes durable Postgres threads, queued confirmations, private R2 email
  attachments, Cloudflare Turnstile, routing metadata, and the relevant channel addresses.
- The website terms distinguish General, Support, and Projects submissions and state that
  Turnstile/rate controls may reject untrusted requests.
- All project CTAs and the PWA shortcut now lead to `/start-a-project`.

## Verification and production gate

Repository verification must include:

- Astro check and production build;
- API and validator typechecks/tests;
- Wrangler generated-type check and production dry run; and
- a source audit proving that no old `/public/contact` dependency or advertised `contact@` legal
  route remains in the public site.

Completed repository evidence on 14 July 2026:

- Astro check: 36 files, 0 errors, 0 warnings, 0 hints;
- Astro production build: successful, including the 70-file PWA precache;
- API tests: 4 files and 25 tests passed;
- shared-validator tests: 1 file and 5 tests passed;
- PWA tests: 4 files and 13 tests passed;
- API, validator, web, and PWA typechecks: passed;
- backend ESLint: passed with zero warnings;
- Wrangler generated binding check: up to date; and
- Wrangler production dry run: successful and included the allowed-hostnames binding.

Production is not complete until a managed Turnstile widget is created for the production hostnames,
its public sitekey is configured for the web build, its secret is installed on the API Worker, the
web and API are deployed in a safe sequence, and a real human submission verifies the end-to-end
flow.
