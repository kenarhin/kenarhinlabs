# Lane 06 — Remaining Public Page Families

## Status

Status: in progress. Static legal-page drafts are implemented; other public page families remain
planned after the foundation scope requested in the current program.

## Scope

Services, Work/case studies, Stacks/tools/offers, Field Notes, Labs, Start a Project, legal pages,
and their data-backed detail routes.

## Checklist

- [ ] Build Services index and detail routes.
- [ ] Build Work index and case-study routes.
- [ ] Build Stacks, tools, and offers routes with freshness disclosure.
- [ ] Build Field Notes index and article routes with Typeset.
- [ ] Build Labs index and detail routes.
- [ ] Build Start a Project route.
- [x] Build static privacy and website-terms routes.
- [ ] Integrate only published public API/D1 records.
- [ ] Add loading, empty, error, and not-found states.
- [ ] Add SEO, structured data, PWA freshness, accessibility, and performance validation.

## Blockers or handoff notes

The end-to-end Supabase-to-D1 projection adapter is incomplete and the live database does not yet
provide representative published records. This lane must not be populated with fabricated CMS data.

## 2026-07-13 — Legal-page implementation evidence

- Added `/legal/privacy` and `/legal/terms` as prerendered Astro routes using the shared public
  layout, semantic design tokens, the editorial Typeset layer, anchored tables of contents, and
  explicit implementation-draft metadata.
- Audited the current contact form, API intake contract, request metadata, theme local storage, PWA
  runtime caching, provider architecture, and social destinations. The notices describe only those
  evidenced behaviors and explicitly note that contact persistence remains fail-closed.
- Drafting was informed by current authoritative data-protection and electronic-transactions
  materials. Public copy remains global-facing and location-neutral while preserving mandatory
  rights that may apply to a visitor. The pages avoid invented registration details, retention
  periods, payment/refund terms, service levels, dispute venues, analytics, cookies, or compliance
  certifications.
- Publication remains blocked on a qualified legal review. The privacy notice must be reviewed again
  before persistent contact intake, analytics, marketing, payments, accounts, or client-portal
  processing is enabled.

Authoritative drafting references:

- Ghana Data Protection Commission — Data Protection Act, 2012 (Act 843):
  <https://dataprotection.org.gh/wp-content/uploads/2025/05/Data-Protection-Act-2012-Act-843.pdf>
- Ghana Data Protection Commission — privacy notice guidance:
  <https://dataprotection.org.gh/privacy-policy/>
- GhaLII — Electronic Transactions Act, 2008 (Act 772):
  <https://ghalii.org/akn/gh/act/2008/772/eng@2020-12-29>
