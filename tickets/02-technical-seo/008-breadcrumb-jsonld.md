# T-02-008 — `BreadcrumbList` JSON-LD builder

**Spec:** 02-technical-seo §4.2
**Depends on:** T-02-004
**Estimate:** ~1h

## What to build

`packages/seo-core/src/schema-org/breadcrumb.ts` — `buildBreadcrumbSchema(input, canonical)`
producing the trails in Spec 02 §4.2:

| Route | Trail |
|---|---|
| `/blog` | Home, Blog |
| `/blog/<slug>` | Home, Blog, primary category, post title |
| `/blog/category/<slug>` | Home, Blog, category name |
| `/blog/author/<slug>` | Home, Blog, author name |

Positions are contiguous from 1 and the last item is always the current page. An article with no
public tag **omits** the category level and renumbers, rather than inventing one. The builder
validates its output against a zod schema before returning, and the visible breadcrumb component
(T-01-010) and this schema must be driven by the same trail data — build the trail once and pass it
to both.

## Acceptance criteria

- [x] All four trails match the table exactly, including labels.
- [x] `position` values are contiguous integers starting at 1 with no gaps in every case.
- [x] The last item's `item` URL equals the page canonical exactly.
- [x] Every item URL passes `toAbsoluteUrl`.
- [x] An article with no public tag produces a 3-item list with positions 1, 2, 3.
- [x] The visible breadcrumb and the JSON-LD are generated from one shared trail value — asserted by
      a test comparing rendered crumb labels to the schema item names.

## Status

**Done** — commit on `feat/everyware-blog-platform`.

Positions are contiguous by construction, and the zod refinement rejects a trail shorter than two crumbs.
