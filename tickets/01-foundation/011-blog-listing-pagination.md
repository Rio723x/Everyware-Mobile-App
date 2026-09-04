# T-01-011 — Blog listing and pagination routes

**Spec:** 01-foundation D6, §5.3
**Depends on:** T-01-010
**Estimate:** ~1.5h

## What to build

1. `src/pages/blog/index.astro` — replaces the temporary page from T-01-007. Renders
   `<h1>Everyware Blog</h1>`, an intro paragraph, and the first `POSTS_PER_PAGE` (12) posts via
   `PostGrid`, plus `Breadcrumbs` (Home to Blog) and `Pagination`.
2. `src/pages/blog/page/[page].astro` — `getStaticPaths` generating pages 2..n only.
   **Page 1 must not be emitted at `/blog/page/1`**; it lives at `/blog`.
3. A shared `src/lib/pagination.ts` helper returning `{ items, page, totalPages, prevHref, nextHref }`
   so the listing, category and author routes all paginate identically.

## Acceptance criteria

- [ ] With 5 fixture posts, the build emits `dist/blog/index.html` and **no** `blog/page/*` files.
- [ ] With 25 fixture posts, it emits `blog/index.html`, `blog/page/2.html`, `blog/page/3.html`,
      and no `blog/page/1.html`.
- [ ] Page 1 shows posts 1-12 in `publishedAt` descending order; page 2 shows 13-24; page 3 shows 25.
- [ ] `/blog` carries `rel="next"` to `/blog/page/2` and no `rel="prev"`; the last page carries
      `rel="prev"` and no `rel="next"`.
- [ ] Every listing page contains exactly one `<h1>`.
- [ ] Every card links to a slug that the build actually emitted.

## Status

Not started
