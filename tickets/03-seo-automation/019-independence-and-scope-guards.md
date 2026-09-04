# T-03-019 — Independence, isolation and deferred-scope guard tests

**Spec:** 03-seo-automation §1, §2 (out of scope), §9
**Depends on:** T-03-018
**Estimate:** ~1.5h

## What to build

The tests that hold Spec 03's central claim in place: *AI recommends, code decides.* Without them
the separation is a convention, and conventions erode.

1. **The independence test.** Build the site twice — once with the analyzer working, once with it
   forced to throw — and assert the emitted `dist/` is **byte-identical**. If the analyzer's output
   could ever reach a rendered page, this test fails.
2. **Import isolation.** Assert that nothing under `apps/blog` imports anything from
   `services/seo-worker`, so AI output structurally cannot reach the build.
3. **No Ghost writes.** Assert no code path anywhere calls the Ghost Admin API. This is what makes
   webhook loops impossible rather than merely unlikely.
4. **Deferred-scope guard.** Assert the repository contains no Search Console, Bing Webmaster,
   IndexNow or analytics-ingestion code, and no such env vars. Plan Phases 9-11 are deferred, and
   this test is what keeps them deferred deliberately rather than half-started.
5. **Secret scan.** Assert no API key, token or webhook secret literal appears in the repo.

## Acceptance criteria

- [ ] The independence test passes: both builds produce byte-identical `dist/` trees, compared by
      per-file hash.
- [ ] Planting an import of `services/seo-worker` inside `apps/blog` fails the isolation test.
      Remove the plant afterwards.
- [ ] The Admin API guard fails when a call to `/ghost/api/admin/` is planted. Remove it afterwards.
- [ ] The deferred-scope guard fails when a `GOOGLE_SEARCH_CONSOLE_*` env reference is planted.
      Remove it afterwards.
- [ ] The secret scan passes on the clean tree and fails on a planted `sk-ant-` literal.
- [ ] All five guards run in `npm run test` and in CI.

## Status

Not started
