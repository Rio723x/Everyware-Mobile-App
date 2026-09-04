# T-01-010 — Shared blog UI components

**Spec:** 01-foundation §5.3, §5.4, §6.1
**Depends on:** T-01-009
**Estimate:** ~2h

## What to build

The presentational pieces the four route templates compose. All Astro, all static.

- `PostCard.astro` — feature image (with its alt text, explicit `width`/`height`, `loading="lazy"`),
  title as `<h2><a>`, excerpt, author name, `<time datetime>`, tag chips.
  Falls back to a token-styled placeholder block when `featureImage` is null.
- `PostGrid.astro` — responsive card grid using the T-01-008 breakpoints.
- `TagChips.astro` — links to `/blog/category/<slug>`.
- `AuthorByline.astro` — avatar with alt, name linking to `/blog/author/<slug>`, published
  `<time datetime>`, an "Updated" `<time>` shown only when `updatedAt > publishedAt`, reading time.
- `Breadcrumbs.astro` — `<nav aria-label="Breadcrumb">` wrapping an `<ol>`; takes an ordered list of
  `{ label, href }` where the last entry is the current page and is not a link.
- `Pagination.astro` — previous/next links plus "Page n of m", emitting `rel="prev"` / `rel="next"`
  on the anchors. Page 1 links to `/blog`, never `/blog/page/1`.

## Acceptance criteria

- [ ] Every component renders from a fixture `BlogPost` with no runtime error.
- [ ] Every `<img>` a component emits has a non-empty `alt` and explicit `width` and `height`.
- [ ] `PostCard` renders the placeholder, not a broken image, when `featureImage` is null.
- [ ] `AuthorByline` omits the "Updated" element when `updatedAt` equals `publishedAt`.
- [ ] `Breadcrumbs` renders the final crumb as text, not an anchor.
- [ ] `Pagination` emits no `rel="prev"` on page 1 and no `rel="next"` on the last page, and its
      page-1 href is `/blog`.
- [ ] All `<time>` elements carry a `datetime` attribute parseable by `Date.parse`.
- [ ] Components ship no client-side JavaScript.

## Status

Not started
