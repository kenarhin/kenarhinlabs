# Ken Arhin Labs Frontend Brand Assets

_Last updated: 2026-07-12_

This document defines the approved working direction for the Ken Arhin Labs logo system, brand icons, application icons, social assets, document assets, and motion identity. It complements:

```txt
DESIGN.md
docs/frontend-design-system.md
docs/frontend-motion-and-interaction.md
docs/frontend-architecture.md
```

The identity is designed for a digital systems lab, not a single product. It must work across the public website, admin application, installed PWAs, content, proposals, social channels, and future products.

## 1. Status and decision authority

The direction in this document is approved as the current production foundation:

```txt
Identity type:        Responsive combination mark
Primary identity:     Custom KEN ARHIN LABS wordmark
Compact identity:     System K symbol
Core metaphor:        Separate routes becoming one working system
Primary expression:   Monochrome with selective Signal Orange
Motion expression:    Routes assemble and one signal activates the mark
```

The current SVG files are the first implementation of this direction. Before trademark registration, large physical production, or permanent signage, complete:

```txt
Optical review at all target sizes
Similarity and trademark search
Print-production review
Final legal approval where required
```

Do not replace the identity with a generic AI symbol, robot, brain, sparkle, globe, gradient sphere, or circuit-board badge.

## 2. Brand identity principle

Ken Arhin Labs is a global-facing digital systems lab. The identity must communicate:

```txt
Structure
Connection
Activation
Engineering
Editorial clarity
Human judgment
```

The logo belongs to the same visual language as **The Living System** used by the public website:

```txt
Routes connect related capabilities.
Nodes identify meaningful junctions.
Signals show activity and state.
Separate parts become a coherent operating system.
```

Motion, diagrams, icons, and the logo should feel related without becoming copies of one another.

## 3. Logo architecture

Ken Arhin Labs uses a responsive logo family rather than one asset forced into every context.

### 3.1 System K mark

The standalone symbol is a custom `K` constructed from routes and a junction.

Its conceptual parts are:

```txt
Vertical stem     Stable structure
Upper branch      Expansion and direction
Lower branch      Connection and continuation
Junction          System origin
Orange node       Active signal or state
```

The mark must remain recognisable as a silhouette before its system metaphor is explained. It should not be redrawn as a detailed circuit diagram.

### 3.2 Wordmark

The formal wordmark is:

```txt
KEN ARHIN LABS
```

Use the supplied vector-path wordmark. Do not recreate the production wordmark by typing Bricolage Grotesque or another font. Bricolage Grotesque informs the wider display language, but the logo artwork is an authored asset.

In ordinary writing, metadata, headings, and SEO, use:

```txt
Ken Arhin Labs
```

### 3.3 Combination lockups

The primary brand presentation combines the System K with the wordmark.

Approved arrangements:

```txt
Horizontal lockup   Default navigation, documents, proposals, email signatures
Stacked lockup      Square or portrait compositions, covers, social graphics
Wordmark only       Editorial placements where the mark already appears
Mark only           Favicons, app icons, avatars, collapsed navigation
Micro mark          16–48px digital placements
```

## 4. Approved source files

Store the source SVG assets at:

```txt
packages/design/src/assets/logo/
├── mark.svg
├── wordmark.svg
├── lockup-horizontal.svg
├── lockup-stacked.svg
└── mark-micro.svg
```

### File responsibilities

| File | Purpose | Typical use |
|---|---|---|
| `mark.svg` | Full System K symbol | Medium and large symbol-only placements |
| `wordmark.svg` | Vector wordmark | Editorial and horizontal placements |
| `lockup-horizontal.svg` | Primary combination lockup | Header, proposals, documents, signatures |
| `lockup-stacked.svg` | Portrait/square combination lockup | Covers, social graphics, presentation titles |
| `mark-micro.svg` | Optically simplified small mark | Favicons, small navigation, compact UI branding |

Do not mechanically shrink `lockup-horizontal.svg` into favicon or app-icon contexts.

## 5. Logo colour system

The logo must work in one colour before chromatic treatments are added.

### 5.1 Primary editorial expression

```txt
Mark and wordmark:  Lab Ink      #11130F
Background:         Warm Canvas  #F3F0E8
Alternative surface Clean Paper  #FFFDF7
Signal node:        Signal Orange #FF5A1F
```

### 5.2 Reversed laboratory expression

```txt
Mark and wordmark:  Warm Canvas  #F3F0E8
Background:         Lab Ink      #11130F
Signal node:        Signal Orange #FF5A1F
```

### 5.3 Monochrome expression

Use a fully monochrome version when colour reproduction is unavailable, when embossing, or when a single-ink process requires it. The node may use the same colour as the mark.

### 5.4 Colour restrictions

System Blue and Field Green are supporting system colours, not routine logo colourways.

Do not:

```txt
Apply purple, blue, or multicolour gradients
Use glow as part of the static identity
Change the signal node to an arbitrary colour
Place the mark on a background with insufficient contrast
Add shadows, bevels, glass effects, or texture to the core SVG
```

## 6. Clear space and minimum size

Use the signal-node diameter as the provisional clear-space unit, `x`.

```txt
Minimum clear space around mark:       1x
Minimum clear space around lockups:    1x
Preferred clear space in hero/cover:   2x or more
```

Provisional digital minimums:

```txt
mark-micro.svg          16px
mark.svg                24px
horizontal lockup       140px wide
stacked lockup          120px wide
```

These values are starting constraints. Confirm them through optical testing on actual devices before treating them as permanent production minimums.

## 7. Incorrect usage

Never:

```txt
Stretch or compress the artwork
Rotate or skew the mark
Move the orange node
Change the proportions between mark and wordmark
Re-typeset the wordmark
Place the full wordmark at favicon size
Add unapproved taglines inside the lockup
Outline a filled version or fill a stroked version without redesign review
Place the logo inside a generic rounded badge by default
Animate the mark continuously without a communication purpose
```

The logo may appear inside an app-icon background because the icon is a separate authored asset, not because the core logo requires a badge.

## 8. SVG implementation rules

Production SVGs must remain small, safe, responsive, and editable.

### Required characteristics

```txt
Valid SVG markup
A stable viewBox
Explicit width and height for intrinsic aspect ratio
No scripts
No external images or fonts
No embedded raster data
No filters unless a reviewed asset specifically requires one
No unnecessary editor metadata
No raw application secrets or URLs
```

Use `currentColor` for the principal monochrome artwork where theme inheritance is useful. Keep the Signal Orange node explicit unless a monochrome export is required.

### Inline informative SVG

For an inline logo that is the only accessible brand label:

```html
<svg role="img" aria-labelledby="logo-title" viewBox="…">
  <title id="logo-title">Ken Arhin Labs</title>
  <!-- artwork -->
</svg>
```

When a longer explanation is genuinely needed, add `<desc>` and reference it through `aria-describedby`.

### Inline decorative SVG

When visible text already provides the brand name:

```html
<svg aria-hidden="true" focusable="false" viewBox="…">
  <!-- artwork -->
</svg>
```

### External image use

Informative:

```html
<img
  src="/brand/lockup-horizontal.svg"
  width="760"
  height="112"
  alt="Ken Arhin Labs"
/>
```

Decorative or duplicated by adjacent text:

```html
<img
  src="/brand/mark.svg"
  width="48"
  height="48"
  alt=""
/>
```

### Unique ID rule

The source SVGs may include IDs for titles or animation hooks. When the same SVG is inlined more than once on one page, IDs must remain unique in the final document.

Use one of these approaches:

```txt
Generate unique IDs in the component wrapper
Label the SVG from surrounding HTML
Remove internal title IDs and use aria-label at the host level
Use the file through <img> when internal DOM access is unnecessary
```

Do not ship duplicate `id` values across several inline copies.

### Optimisation

Optimisation tools may remove unnecessary metadata, but they must preserve:

```txt
viewBox
data-part attributes used by GSAP
pathLength values used by route drawing
accessibility labels where the asset is informative
intentional stroke geometry
```

Review the rendered result after every automated optimisation pass.

## 9. Motion identity

The logo animation is a concise identity explanation, not a loading barrier.

Recommended sequence:

```txt
1. Draw the vertical route.
2. Extend the two branches from the junction.
3. Move one Signal Orange event through a branch.
4. Settle the node at the junction.
5. Reveal the wordmark.
```

Target duration:

```txt
Approximately 1.4–2.0 seconds for a full ident
Shorter variants for route transitions and compact UI use
```

Implementation:

```txt
SVG + GSAP
No required video
No autoplay sound
No endless logo loop
No delayed access to navigation or content
```

Reduced-motion mode shows the final static state immediately or uses a short opacity transition.

The mark's `data-part` and `pathLength` attributes may be used for scoped GSAP animation. Application timelines belong in the consuming app, not inside `packages/design`.

## 10. Favicon system

The favicon uses `mark-micro.svg`, not the full wordmark.

Required outputs:

```txt
favicon.svg
favicon.ico
favicon-48.png
```

Rules:

```txt
Square 1:1 canvas
Stable public URL
High contrast in light and dark browser surfaces
No fine details that disappear below 32px
Test at 16px, 24px, 32px, and 48px
```

Google Search accepts square favicons and recommends providing an asset larger than 48×48px for quality across surfaces. The source URL should remain stable.

## 11. PWA application icons

The public and admin applications use related but distinguishable icons.

### 11.1 Public PWA

```txt
Background:  Signal Orange
Symbol:      Lab Ink
Character:   Outward-facing, active, energetic
```

### 11.2 Admin PWA

```txt
Background:  Lab Ink
Symbol:      Signal Orange or Warm Canvas
Character:   Operational, controlled, internal
```

### Required raster outputs

```txt
Public
  pwa-192.png
  pwa-512.png
  pwa-maskable-192.png
  pwa-maskable-512.png

Admin
  admin-pwa-192.png
  admin-pwa-512.png
  admin-pwa-maskable-192.png
  admin-pwa-maskable-512.png
```

Also create:

```txt
apple-touch-icon.png
admin-apple-touch-icon.png
```

### Maskable icon rule

Maskable icons require an authored safe area. Important parts of the System K must remain inside the mask-safe region because operating systems may crop the outer canvas into circles, squircles, or other shapes.

Do not produce a maskable icon merely by adding `purpose: "maskable"` to an ordinary square image.

Example manifest direction:

```json
{
  "icons": [
    {
      "src": "/icons/pwa-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/pwa-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/pwa-maskable-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

## 12. Iconography system

The project distinguishes brand symbols, public system glyphs, and operational UI icons.

### 12.1 Brand symbol

The System K represents Ken Arhin Labs itself. Do not use it as a generic action icon.

### 12.2 Public system glyphs

Create a limited custom glyph family for concepts such as:

```txt
Strategy
Interface
Engineering
AI + automation
Infrastructure
Operations
Publishing
Connection
```

Visual rules:

```txt
Related stroke weight
Open route endings
Controlled use of nodes
Mostly geometric construction
Signal Orange only for active state
Recognisable without relying only on colour
```

These glyphs support diagrams and authored storytelling. They should not decorate every heading.

### 12.3 Admin operational icons

The admin uses the icon family configured through app-local shadcn components. Operational icons must remain consistent in:

```txt
Size
Stroke weight
Level of detail
Alignment
Meaning
```

Do not mix public system glyphs into ordinary admin controls unless the glyph has a clear operational meaning.

## 13. Social and content assets

Create reusable templates rather than one-off gradient cards.

### Project-standard Open Graph canvas

```txt
1200 × 630px
```

Templates:

```txt
Default site share card
Field Note share card
Case-study share card
Stack-guide share card
Tool or offer share card
Labs share card
Announcement card
```

Each template should support:

```txt
Title
Content type
Optional project number
Optional author or date
System route or annotation
Real screenshot or authored diagram where appropriate
Ken Arhin Labs mark or lockup
```

Avoid generic gradient meshes, floating glass cards, and stock AI imagery.

### Social profile assets

```txt
Square profile avatar using the System K
Platform-specific cover/banner compositions
Light and dark avatar variants where platform support requires them
```

Keep the profile avatar visually simple enough to remain recognisable when displayed as a small circle.

## 14. Project evidence assets

The brand relies on proof, not only claims. Establish a consistent evidence system for:

```txt
Project screenshots
Mobile and desktop interface captures
Architecture diagrams
Process maps
Before/after comparisons
Stack labels
Outcome markers
Figure captions
Project identifiers
```

Do not place every screenshot inside a tilted laptop or floating device mockup. Use direct, annotated evidence wherever possible.

## 15. Business and document assets

Create templates for:

```txt
Proposal cover
Statement-of-work cover
Invoice header
Presentation title slide
Email signature
Letterhead
Document footer
Watermark
Case-study PDF cover
```

Use the horizontal lockup for most document headers and the stacked lockup for covers. Maintain the same typography, colour, and spacing rules as the digital product.

## 16. Repository structure

Shared source assets:

```txt
packages/design/
└── src/
    └── assets/
        ├── logo/
        │   ├── mark.svg
        │   ├── wordmark.svg
        │   ├── lockup-horizontal.svg
        │   ├── lockup-stacked.svg
        │   ├── mark-micro.svg
        │   └── monochrome/
        ├── icons/
        │   └── system/
        ├── patterns/
        └── templates/
```

Public application outputs:

```txt
apps/web/public/
├── favicon.svg
├── favicon.ico
├── favicon-48.png
├── apple-touch-icon.png
├── icons/
│   ├── pwa-192.png
│   ├── pwa-512.png
│   ├── pwa-maskable-192.png
│   └── pwa-maskable-512.png
└── social/
```

Admin application outputs:

```txt
apps/admin/public/
├── favicon.svg
├── favicon.ico
├── apple-touch-icon.png
└── icons/
    ├── admin-pwa-192.png
    ├── admin-pwa-512.png
    ├── admin-pwa-maskable-192.png
    └── admin-pwa-maskable-512.png
```

Editable design-source files may live in the approved design workspace or a clearly named repository source directory. Runtime applications receive optimised exports, not tool-specific working files.

## 17. Naming and version control

Use stable, descriptive names:

```txt
mark.svg
mark-micro.svg
lockup-horizontal.svg
lockup-stacked.svg
```

Do not use:

```txt
logo-final.svg
logo-final-2.svg
new-logo.svg
latest-logo.svg
```

When the identity changes, use Git history and release notes rather than filenames to represent versions.

Changing a public favicon or application-icon path may affect caches and search surfaces. Prefer stable paths and deliberate cache invalidation.

## 18. Asset export and quality requirements

Before accepting an asset:

```txt
SVG parses successfully
ViewBox is correct
No clipping at target dimensions
No unintended transparent padding
No embedded font dependency
No duplicate IDs after inline rendering
No unnecessary metadata or hidden layers
PNG exports use the correct colour profile
Raster icons are sharp at their target sizes
Maskable icons survive common masks
Light and dark variants meet contrast requirements
```

Test assets on:

```txt
Warm Canvas
Clean Paper
Lab Ink
Browser tabs
Installed PWA launcher
Mobile home screen
Admin collapsed sidebar
Social avatar crop
Printed grayscale page
```

## 19. Accessibility requirements

Logo and asset meaning must not rely only on colour.

Rules:

```txt
Use meaningful alt text when the logo communicates the brand name
Use empty alt or aria-hidden when adjacent text already names the brand
Preserve visible focus on linked logos
Do not animate indefinitely
Respect prefers-reduced-motion
Do not put essential text only inside social images or decorative SVG
Provide captions and alt text for project evidence
```

A logo link to the homepage should have an accessible name such as `Ken Arhin Labs — Home`, whether that name comes from visible text, an image alternative, or an ARIA label.

## 20. Acceptance checklist

The logo and asset system is ready for a release when:

```txt
The mark is recognisable in one colour.
The micro mark remains clear at 16–48px.
The horizontal lockup works in the public navigation.
The stacked lockup works in square and portrait layouts.
Light and dark variants are deliberate.
Public and admin PWA icons are distinguishable but related.
Maskable icons retain all important geometry.
Inline SVG IDs do not collide.
Decorative and informative uses have correct accessible names.
Motion has a complete reduced-motion alternative.
No asset introduces generic AI visual language.
The identity has passed similarity and trademark review before formal registration.
```

## 21. Remaining asset work

The following items are still implementation tasks:

```txt
Optically review and finalise the five source SVGs
Create monochrome SVG variants
Create favicon raster and ICO outputs
Create public PWA icon family
Create admin PWA icon family
Create Apple touch icons
Create Open Graph templates
Create social avatar and banner exports
Create public system glyphs
Create proposal, presentation, and email-signature templates
Prototype and approve the GSAP motion ident
Complete trademark and similarity review
```

## 22. Official references

- MDN — SVG in HTML and accessible labelling: https://developer.mozilla.org/en-US/docs/Web/SVG/Guides/SVG_in_HTML
- MDN — SVG `<title>`: https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/title
- MDN — SVG `<desc>`: https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/desc
- MDN — ARIA `img` role and embedded SVG: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/img_role
- MDN — Web app manifest icons: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/icons
- MDN — Defining PWA app icons and maskable icons: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Define_app_icons
- Google Search — Favicon requirements: https://developers.google.com/search/docs/appearance/favicon-in-search
- Apple Human Interface Guidelines — App icons: https://developer.apple.com/design/human-interface-guidelines/app-icons
- Apple Human Interface Guidelines — Icons: https://developer.apple.com/design/human-interface-guidelines/icons
- GSAP documentation: https://gsap.com/docs/v3/
