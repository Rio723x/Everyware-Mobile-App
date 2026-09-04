# T-02-009 — `CollectionPage` JSON-LD for listing, category and author pages

**Spec:** 02-technical-seo §4.3, §4.4
**Depends on:** T-02-008
**Estimate:** ~0.5h

## What to build

`packages/seo-core/src/schema-org/collection-page.ts` — a `CollectionPage` document with `@id`,
`name`, `description`, `url`, `inLanguage` and `isPartOf` referencing the existing `WebSite` node,
emitted alongside the `BreadcrumbList` on listing, category and author pages.

**No `ItemList` of posts.** It adds crawl surface with no benefit and is one more thing to keep in
sync with the visible page. **No `FAQPage` anywhere** — it requires visible Q&A markup on the page,
and generating it from a suggestion is exactly the "AI invents schema" failure the plan warns about.
Both exclusions are asserted, not merely documented.

## Acceptance criteria

- [ ] Listing, category and author pages each emit exactly one `CollectionPage` and one
      `BreadcrumbList`, and no `BlogPosting`.
- [ ] Article pages emit exactly one `BlogPosting` and one `BreadcrumbList`, and no `CollectionPage`.
- [ ] The document validates against its zod schema.
- [ ] `name` and `description` equal the page title and meta description.
- [ ] The strings `ItemList` and `FAQPage` appear nowhere in `packages/seo-core/src` — grep-asserted.

## Status

Not started
