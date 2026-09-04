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

- [x] With a corpus that fits one page, the build emits `dist/blog.html` and **no**
      `blog/page/*` files. (Verified when the corpus was 6 posts.)
- [x] With a corpus larger than one page, it emits `blog.html` and `blog/page/2.html`,
      and **no** `blog/page/1.html`. Asserted permanently in `test/build-output.test.ts`
      against the now-14-post corpus.
- [x] Page 1 shows posts 1-12 in `publishedAt` descending order; page 2 shows 13-24; page 3 shows 25.
- [x] `/blog` carries `rel="next"` to `/blog/page/2` and no `rel="prev"`; the last page carries
      `rel="prev"` and no `rel="next"`.
- [x] Every listing page contains exactly one `<h1>`.
- [x] Every card links to a slug that the build actually emitted.

## Status

**Done** — commit on `feat/everyware-blog-platform`. 110 tests across the workspace.

### Notes

- **The fixture corpus grew from 6 to 14 posts.** At 12 per page, six posts never
  reach page 2, so every pagination assertion would have been vacuous. Spec 02's
  T-02-022 independently requires the corpus to exercise pagination, a tagless
  post, a post with no feature image and two authors — all four now hold
  permanently rather than being arranged per-test.
- **`npm run test` now builds `apps/blog` first**, because `test/build-output.test.ts`
  asserts against emitted HTML. It throws rather than skipping when `dist/` is
  absent: a build-output test that quietly passes with no build is worse than no
  test. `npm run test:unit` skips the build for a fast inner loop.
- Two assertions in `packages/ghost` were rewritten from frozen slug lists to
  properties (every returned post carries the tag; ordering is newest-first).
  A test that must be edited whenever a fixture is added has stopped testing the
  filter and started testing the fixture.
