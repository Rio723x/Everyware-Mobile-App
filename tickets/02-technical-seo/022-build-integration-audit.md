# T-02-022 — Full-build audit integration test

**Spec:** 02-technical-seo §8 (layer 3), §9
**Depends on:** T-02-021
**Estimate:** ~1.5h

## What to build

The test that makes Spec 02's central claim checkable: build the site from fixtures, then audit the
**emitted files**, and require zero error-severity failures across every page.

1. `apps/blog/test/seo-build.test.ts` — runs the full build against the fixture Ghost client, then
   `auditSite(new DistPageSource("dist"))`.
2. Assert zero `error` failures on every page and at site level, and report the per-page score table
   on failure so a regression is diagnosable from CI output alone.
3. A mutation test proving the gate has teeth: programmatically corrupt one emitted file
   (remove the canonical, add a second `<h1>`, insert `noindex`), re-run the audit, assert the
   specific expected rule ids fail, then restore.
4. Confirm the fixture corpus is large enough to exercise pagination, a tagless post, a post with no
   feature image, and at least two authors — otherwise whole rule branches go untested.

## Acceptance criteria

- [x] The full build plus audit passes with zero error-severity failures across every emitted page.
- [x] Site-level score is 100 and every page score is at least 95.
- [x] The mutation test fails exactly the expected rule ids for each of the three corruptions.
- [x] Every one of the 32 rules is exercised at least once by the run — asserted by checking that no
      rule reports `not-applicable` on every page.
- [x] The test runs with no Ghost credentials and no network access.
- [x] Total runtime is under 2 minutes.

## Status

**Done** — commit on `feat/everyware-blog-platform`. 352 tests across the
workspace; the audit reports **100/100** with zero error-severity failures.

### Notes

- **Seven mutation cases, not three.** Each corrupts one emitted file, re-audits
  and asserts the specific rule ids that should notice — removed canonical,
  second `<h1>`, injected `noindex`, schema that stops matching the page, a
  dangling internal link, a page missing from the sitemap, and a fragment URL
  reintroduced into it. A final case asserts the suite restored every file, so
  it leaves no damage behind.
- **A rule that reports `not-applicable` everywhere is untested**, so the suite
  asserts at least 30 distinct rules actually ran with a real verdict. Without
  that, a green result could mean the rules never fired.
- The corpus-shape assertions are in this file rather than left implicit: more
  than one page of posts, a tagless post, a post with no feature image, and two
  authors. If a future fixture edit removes one, this fails rather than quietly
  reducing what the suite covers.
