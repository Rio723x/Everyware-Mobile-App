# T-02-016 — Rules: internal links present and resolving

**Spec:** 02-technical-seo §6.3
**Depends on:** T-02-012
**Estimate:** ~1h

## What to build

`packages/seo-core/src/audit/rules/links.ts`:

- `internal-links-present` — at least one in-site link in `<body>` (root-relative, or absolute on
  `everyware.in`). Catches orphan pages.
- `internal-links-resolve` — every in-site link target exists in the emitted output. On the
  `HttpPageSource` adapter it instead asserts a 200.
- `pagination-rel` — on paginated pages, `rel="prev"` / `rel="next"` are present and correct at the
  boundaries; `not-applicable` elsewhere.

Link resolution must handle the Spec 01 D6 URL-to-file mapping (`/blog/x` maps to `blog/x.html`,
`/blog` maps to `blog/index.html`), and must ignore `mailto:`, `tel:`, and off-site links.

## Acceptance criteria

- [ ] A page whose only links are `mailto:` and off-site fails `internal-links-present`.
- [ ] `internal-links-resolve` fails on `/blog/typo-slug` and names the offending href **and** the
      page containing it.
- [ ] `mailto:`, `tel:` and `https://example.com` links are ignored by both rules.
- [ ] A link to `/` resolves against `dist/index.html`.
- [ ] A link with a fragment (`/blog/x#section`) resolves against `/blog/x`.
- [ ] `pagination-rel` returns `not-applicable` on an article and fails when page 2 lacks `rel="prev"`.

## Status

Not started
