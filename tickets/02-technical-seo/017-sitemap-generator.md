# T-02-017 — `/sitemap.xml` generator and endpoint

**Spec:** 02-technical-seo §5.1
**Depends on:** T-02-010
**Estimate:** ~1.5h

## What to build

1. `packages/seo-core/src/sitemap.ts` — `buildSitemapXml(entries): string`, emitting a valid
   `urlset` in the sitemaps.org 0.9 namespace with `loc`, `lastmod`, `changefreq` and `priority`.
2. `apps/blog/src/pages/sitemap.xml.ts` — an Astro endpoint prerendered to `dist/sitemap.xml`,
   building the entry set per the Spec 02 §5.1 table: the site root, `/blog`, every `/blog/page/n`,
   every article, every category, every author.
3. **Every `loc` is the page's canonical**, taken from `buildPageMetadata` — not rebuilt by a second
   code path, or the sitemap and the pages will disagree the moment one changes.
4. Fragment URLs from the old hand-written sitemap are excluded. The 22 `#`-URLs it listed were not
   distinct URLs to any crawler; they were 22 duplicates of the home page.

## Acceptance criteria

- [x] `dist/sitemap.xml` parses as XML with the correct root element and namespace.
- [x] Every `loc` is absolute `https://everyware.in`, unique, with no `#` and no `?`.
- [x] Every `lastmod` is a valid W3C datetime.
- [x] The `loc` set equals the set of canonicals produced by `buildPageMetadata` for all indexable
      pages — compared as sets, in both directions.
- [x] `404.html` is not listed.
- [x] `changefreq` and `priority` match the Spec 02 §5.1 table per entry type.
- [x] Rebuilding with unchanged content produces a byte-identical sitemap.

## Status

**Done** — commit on `feat/everyware-blog-platform`.

Entries are sorted by `loc` so an unchanged rebuild produces a byte-identical file. Every `loc` comes from `buildCanonical`, the same function the page itself uses.
