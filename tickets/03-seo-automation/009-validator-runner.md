# T-03-009 — Deterministic validator runner

**Spec:** 03-seo-automation §5.2
**Depends on:** T-02-020, T-03-008
**Estimate:** ~1.5h

## What to build

`src/validator/validator.ts` — `validateArticle(slug)` and `validateSite()`.

Thin by design: the rules already exist in `packages/seo-core` (Spec 02 §6). **Reimplementing a
single check here would be the bug**, so this module imports the rule registry and `HttpPageSource`
and does nothing but wire them to the live site.

1. `validateArticle` waits for the deploy (T-03-008), then runs `auditPage` over the fetched live
   HTML via `HttpPageSource` against `PUBLIC_SITE_URL`.
2. `validateSite` runs the site-level rules; it is invoked on `post.published` and `post.deleted`,
   the events that change the URL set.
3. A `deploy-timeout` produces a `PageAudit`-shaped result marked as such, rather than grading stale
   HTML.

## Acceptance criteria

- [x] `validateArticle` returns a `PageAudit` produced by `packages/seo-core`, not a locally
      constructed object.
- [x] `services/seo-worker` contains no rule implementations — grep-asserted for rule ids and for
      any second definition of the scoring formula.
- [x] Against a local server serving deliberately broken HTML (missing canonical, `noindex`, two
      `<h1>`s, a 301), the exact expected rule ids fail.
- [x] A `301` on the canonical URL produces an error result naming the redirect target.
- [x] A deploy timeout yields a result marked `deploy-timeout` and does **not** grade the stale page.
- [x] `validateSite` detects a sitemap missing a newly published article.

## Status

**Done** — commit on `feat/everyware-blog-platform`.

Imports spec 02's rule registry rather than reimplementing anything. If the build gate and the production validator could disagree about "correct", neither would be trustworthy.
