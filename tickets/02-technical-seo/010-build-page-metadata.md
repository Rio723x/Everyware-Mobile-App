# T-02-010 — Assemble `buildPageMetadata`

**Spec:** 02-technical-seo §3.3
**Depends on:** T-02-006, T-02-007, T-02-008, T-02-009
**Estimate:** ~1h

## What to build

Wire the pieces into the single public entry point. This is the depth: one function, four input
shapes, and a caller who cannot construct an inconsistent head because there is nothing else to call.

`buildPageMetadata(input)` composes title, description, canonical, robots, prev/next, OpenGraph,
Twitter and the JSON-LD documents appropriate to `input.kind`, returning a fully populated
`PageMetadata`. It performs no I/O and takes no configuration beyond the input.

## Acceptance criteria

- [x] All four `kind`s return a complete `PageMetadata` with no undefined field.
- [x] Calling it twice with the same input returns deep-equal output.
- [x] `openGraph["og:url"]`, `twitter` URLs and the last `BreadcrumbList` item URL all equal
      `metadata.canonical` — one canonical, referenced everywhere, asserted directly.
- [x] `openGraph["og:title"]` equals `metadata.title` and `openGraph["og:description"]` equals
      `metadata.description`.
- [x] Article inputs yield exactly `[BlogPosting, BreadcrumbList]`; other kinds yield exactly
      `[CollectionPage, BreadcrumbList]`.
- [x] Every `jsonLd` entry has already been validated by its builder — asserted by a test that
      stubs a builder to return an invalid document and expects a throw.
- [x] `npm run typecheck`, `lint`, `test` exit 0; no `any`.

## Status

**Done** — commit on `feat/everyware-blog-platform`.

One canonical value flows to `og:url`, the BlogPosting `@id` and the final breadcrumb item; asserted identical at all three.
