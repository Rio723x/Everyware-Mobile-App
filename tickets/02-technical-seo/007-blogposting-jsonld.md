# T-02-007 — `BlogPosting` JSON-LD builder

**Spec:** 02-technical-seo §4.1
**Depends on:** T-02-002, T-02-003, T-02-004, T-02-005
**Estimate:** ~1.5h

## What to build

1. `packages/seo-core/src/schema-org/blog-posting.ts` — `buildBlogPostingSchema(post, metadata)`
   emitting exactly the document in Spec 02 §4.1, including `@id` (`<canonical>#article`),
   `mainEntityOfPage`, `wordCount`, `keywords` from public tag names, `articleSection` from the
   primary tag, `inLanguage: "en-IN"`, and `publisher` / `isPartOf` as `@id` references to the
   `Organization` and `WebSite` nodes that already exist in `apps/site/index.html`.
   Referencing the existing nodes rather than declaring a second Organization is the point.
2. `headline` capped at 110 characters by word-boundary truncation.
3. `description` is the **same string** as the meta description — passed in, never recomputed.
4. `packages/seo-core/src/schema-org/validate.ts` — a zod schema for the document. The builder
   validates its own output before returning, so an invalid document cannot escape the module.

## Acceptance criteria

- [x] The emitted document validates against the zod schema; a builder mutated to drop `datePublished`
      throws rather than returning.
- [x] `@id` is `<canonical>#article` and `mainEntityOfPage.@id` is the bare canonical.
- [x] `publisher.@id` is `https://everyware.in/#org` and `isPartOf.@id` is
      `https://everyware.in/#website`, matching the ids in `apps/site/index.html` — asserted by
      reading that file.
- [x] `headline` never exceeds 110 characters and never splits a word.
- [x] `datePublished` and `dateModified` are full ISO-8601 with offset; `image` entries and
      `author.url` all pass `toAbsoluteUrl`.
- [x] `wordCount` matches a hand-counted fixture body.
- [x] A post with no public tags omits `articleSection` and emits an empty `keywords` array rather
      than inventing a section.

## Status

**Done** — commit on `feat/everyware-blog-platform`.

A test reads `apps/site/index.html` and asserts the `@id`s this schema references actually exist there, so the blog cannot drift into declaring a second Organization.
