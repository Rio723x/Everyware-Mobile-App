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

- [x] Every component renders from a fixture `BlogPost` with no runtime error.
- [x] Every `<img>` a component emits has a non-empty `alt` and explicit `width` and `height`.
- [x] `PostCard` renders the placeholder, not a broken image, when `featureImage` is null.
- [x] `AuthorByline` omits the "Updated" element when `updatedAt` equals `publishedAt`.
- [x] `Breadcrumbs` renders the final crumb as text, not an anchor.
- [x] `Pagination` emits no `rel="prev"` on page 1 and no `rel="next"` on the last page, and its
      page-1 href is `/blog`.
- [x] All `<time>` elements carry a `datetime` attribute parseable by `Date.parse`.
- [x] Components ship no client-side JavaScript.

## Status

**Done** — commit on `feat/everyware-blog-platform`. 15 tests here, 27 in the blog
app, 104 across the workspace.

### Notes

- **Breadcrumb trails live in `src/lib/breadcrumbs.ts`, not in the component.**
  Spec 02's `jsonld-matches-page` rule requires the BreadcrumbList JSON-LD to
  agree with the visible trail. Generating both from one value makes
  disagreement impossible rather than merely unlikely; T-02-008 imports the same
  function.
- **`width`/`height` on remote Ghost images are a declared aspect ratio**, not a
  claim about the source file. Real pixel dimensions are unknowable at build
  time without fetching every image, and the attributes' actual job in a browser
  is to reserve the right box before the image loads. 640x360 on cards matches
  the CSS 16:9 container, and with `object-fit: cover` that is what prevents
  layout shift.
- Page 1 is expressed once, in `paginate()`: it always lives at the base path,
  never at `<base>/page/1`. The listing, category and author routes inherit that
  because they all call the same helper.
