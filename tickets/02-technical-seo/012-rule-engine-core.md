# T-02-012 — Rule engine core: types, registry, scoring, `DistPageSource`

**Spec:** 02-technical-seo §6.1, §6.2, §6.5
**Depends on:** T-02-011
**Estimate:** ~2h

## What to build

The framework the 32 rules plug into. No individual rules yet.

1. `packages/seo-core/src/audit/registry.ts` — `RuleId` as a **string-literal union** (never
   `string`), `RuleSeverity`, `RuleStatus`, `RuleResult`, `PageAudit`, `SiteAudit`, `PageContext`,
   and the rule table.
2. Rules are pure functions `(doc: Document, ctx: PageContext) => RuleResult`, with `Document`
   supplied by **`linkedom`** so one rule body runs unchanged over a built file or a fetched response.
3. `packages/seo-core/src/audit/audit.ts` — `auditPage`, `auditSite`, and the scoring function:
   `weight(error) = 3`, `weight(warning) = 1`,
   `score = round(100 * sum(weight of passed) / sum(weight of applicable))`,
   with `not-applicable` excluded from both sums.
4. `packages/seo-core/src/audit/dist-source.ts` — `DistPageSource(distDir)` implementing
   `PageSource`: walks `dist/**/*.html`, deriving each page's public URL from its path via the
   Spec 01 D6 mapping, and reads `sitemap.xml` / `robots.txt` as assets.

## Acceptance criteria

- [ ] `RuleId` is a literal union; adding a rule result with an unregistered id is a compile error.
- [ ] Scoring: all pass returns 100; one failed error rule among 10 passing error rules returns 90;
      an all-`not-applicable` page returns 100 rather than dividing by zero.
- [ ] `DistPageSource` maps `dist/blog/index.html` to `https://everyware.in/blog`,
      `dist/blog/x.html` to `https://everyware.in/blog/x`, and `dist/index.html` to
      `https://everyware.in/` — asserted for all five route kinds.
- [ ] It excludes `404.html` from the indexable page set.
- [ ] `readAsset("sitemap.xml")` returns the file contents and `null` when absent.
- [ ] `auditPage` runs every applicable registered rule exactly once and returns results in
      registry order.

## Status

Not started
