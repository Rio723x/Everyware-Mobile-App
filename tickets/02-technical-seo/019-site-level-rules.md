# T-02-019 — Site-level rules

**Spec:** 02-technical-seo §6.4
**Depends on:** T-02-018
**Estimate:** ~1.5h

## What to build

`packages/seo-core/src/audit/rules/site.ts` — the twelve checks that need the whole output, not one page:

`sitemap-exists`, `sitemap-wellformed`, `sitemap-locs-valid`, `sitemap-no-fragments`,
`sitemap-lastmod-valid`, `sitemap-complete`, `robots-exists`, `robots-sitemap-line`,
`robots-no-blanket-disallow`, `robots-ai-agents-preserved`, `canonical-uniqueness`,
`no-noindex-anywhere`.

`sitemap-complete` is the load-bearing one: **the set of `loc` values must equal the set of canonicals
of all indexable emitted pages, in both directions.** One assertion catches both missing entries and
orphan entries, which is why it is written as set equality rather than two containment checks.

## Acceptance criteria

- [x] Each rule has a passing and a failing fixture.
- [x] `sitemap-complete` fails when a page is missing from the sitemap **and** when the sitemap
      lists a URL no page emitted, with the offending URLs named in both directions.
- [x] `sitemap-no-fragments` fails on a `loc` containing `#`, reproducing the defect in the old file.
- [x] `canonical-uniqueness` fails when two emitted pages declare the same canonical, naming both.
- [x] `no-noindex-anywhere` scans every emitted blog page, not just a sample.
- [x] `robots-ai-agents-preserved` fails when any one of the seven user-agents is removed.
- [x] All twelve pass against a clean build.

## Status

**Done** — commit on `feat/everyware-blog-platform`.

`sitemap-complete` is set equality in both directions. A negative test caught a real bug in `robots-no-blanket-disallow`: it used `\Z` for end-of-string, which JavaScript regex treats as a literal "Z", so the rule silently passed everything.
