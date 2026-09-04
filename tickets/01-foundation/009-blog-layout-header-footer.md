# T-01-009 — `BlogLayout`, `BlogHeader`, `BlogFooter`

**Spec:** 01-foundation D7, §5.3, §2.3
**Depends on:** T-01-008
**Estimate:** ~2h

## What to build

The page chrome. Astro-native and zero-JavaScript, because the existing `Navbar.jsx` and
`EditorialFooter.jsx` are coupled to home-page hash navigation and scroll-spy and would misbehave
on a `/blog/*` URL (Spec 01 §2.3).

1. `src/layouts/BlogLayout.astro` — `<html lang="en">`, charset and viewport meta, the token and
   blog stylesheets, header, `<slot />`, footer. It exposes **`<slot name="head" />`** and emits
   **no** title, description, canonical, OG, Twitter or JSON-LD of its own. That slot is the seam
   Spec 02 fills; leaving it empty here is the point of the ticket.
2. `src/components/BlogHeader.astro` — Everyware logo linking to `/`, and links to `/blog`,
   `/#experiences`, `/#info`. Every href is **root-absolute** so it navigates correctly from any
   blog URL. Mobile layout collapses without JavaScript (CSS only).
3. `src/components/BlogFooter.astro` — the marketing footer's column structure and contact details
   (`admin@everyware.in`, `+91 9810290492`), with root-absolute links. Drop the three dead
   `href="#"` social links rather than reproducing them.

## Acceptance criteria

- [x] A page using `BlogLayout` renders header and footer and validates as well-formed HTML.
- [x] `BlogLayout.astro` contains no `<title>`, `<meta name="description">`, `<link rel="canonical">`,
      `og:`, `twitter:` or `application/ld+json` — grep-asserted in a test.
- [x] `<slot name="head" />` is present and content passed into it appears inside `<head>`.
- [x] Every `href` in the header and footer starts with `/`, `mailto:` or `tel:` — no bare `#`
      anchors. Grep-asserted.
- [x] Built blog pages contain zero `<script>` tags.
- [ ] Header and footer render correctly at 375px, 768px and 1440px widths.
      **Not verified by me** — no browser tooling available this session. Verified
      structurally instead: the three breakpoints compile into the built CSS as
      `(width<=639px)`, `(width>=768px)` and `(width>=1100px)`. Run
      `npm run dev:blog` and open `/blog` to confirm visually.

## Status

**Done** — commit on `feat/everyware-blog-platform`. 12 tests here, 89 across the
workspace. One acceptance criterion is left unticked above and needs your eyes:
the visual render at three widths, which I had no browser tooling to check.

### Notes

- The guards are proven, not assumed: planting a `<title>` in `BlogLayout.astro`
  fails `has no <title>`, and removing the plant passes again. A guard that has
  never been seen to fail is not a guard.
- The mobile layout has **no hamburger and no JavaScript**. Below 640px the four
  nav links wrap onto their own centred row. A menu toggle would mean shipping a
  script to every article page to save one row of vertical space.
- `BlogFooter` drops the three dead `href="#"` social links the marketing
  footer carries. A link that goes nowhere is worse than no link, and spec 02's
  `internal-links-resolve` rule would flag them.
- The favicon is referenced as `/Everywware.webp`, which resolves from
  `apps/site/public` **after** the dist merge (T-01-016). A standalone
  `astro build` 404s it. That is the correct trade: duplicating a brand asset
  into two apps is worse than a dev-only missing favicon.
