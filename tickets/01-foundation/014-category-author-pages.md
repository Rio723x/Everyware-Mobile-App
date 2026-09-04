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

- [ ] One file is emitted per public tag and per author; **no** file is emitted for any `hash-` tag.
- [ ] Each page contains exactly one `<h1>` whose text equals the tag or author name.
- [ ] A category page lists exactly the posts carrying that tag, newest first.
- [ ] An author page lists exactly the posts by that author, newest first.
- [ ] A tag with no description renders without an empty paragraph element.
- [ ] An author with no avatar renders without a broken image.
- [ ] Every tag chip and author link emitted anywhere in the blog resolves to a file the build
      actually emitted — asserted across the whole output.

## Status

Not started
