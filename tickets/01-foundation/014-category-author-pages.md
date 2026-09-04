# T-01-014 — Category and author routes

**Spec:** 01-foundation D6, D8, §5.3
**Depends on:** T-01-013
**Estimate:** ~1.5h

## What to build

1. `src/pages/blog/category/[slug].astro` — `getStaticPaths` from `listTags()` (public tags only).
   Renders `<h1>{tag.name}</h1>`, the tag description when present, `PostGrid` of that tag's posts,
   breadcrumbs (Home, Blog, category), and pagination using the T-01-011 helper.
2. `src/pages/blog/author/[slug].astro` — `getStaticPaths` from `listAuthors()`. Renders
   `<h1>{author.name}</h1>`, avatar with alt, bio, `PostGrid` of that author's posts, breadcrumbs
   and pagination.
3. Both paginate at `/blog/category/<slug>/page/<n>` and `/blog/author/<slug>/page/<n>` with the
   same page-1-is-not-emitted rule.

## Acceptance criteria

- [x] One file is emitted per public tag and per author; **no** file is emitted for any `hash-` tag.
- [x] Each page contains exactly one `<h1>` whose text equals the tag or author name.
- [x] A category page lists exactly the posts carrying that tag, newest first.
- [x] An author page lists exactly the posts by that author, newest first.
- [x] A tag with no description renders without an empty paragraph element.
- [x] An author with no avatar renders without a broken image.
- [x] Every tag chip and author link emitted anywhere in the blog resolves to a file the build
      actually emitted — asserted across the whole output.

## Status

**Done** — commit on `feat/everyware-blog-platform`. 148 tests; 21 pages emitted
(14 articles, listing + page 2, 3 categories, 2 authors).

### Notes

- **The internal-tag exclusion is now proven end to end.** `listTags()` filters
  `hash-` tags, so `getStaticPaths` never sees `#featured` and no URL exists for
  it. Asserted directly against the emitted file list rather than against the
  client's return value.
- **Category and author pagination routes exist but currently emit nothing**,
  because no tag or author has more than 12 posts in the fixture corpus. That is
  correct behaviour, not a gap: `extraPageNumbers` returns an empty list, and the
  same helper is already proven at the `/blog` level where the corpus does
  overflow.
- A cross-cutting assertion was added while here: **every `/blog…` href emitted
  anywhere in the output must resolve to a file the build produced.** That is a
  preview of spec 02's `internal-links-resolve` rule, and it now covers tag
  chips, author bylines, breadcrumbs, related posts and the footer at once.
