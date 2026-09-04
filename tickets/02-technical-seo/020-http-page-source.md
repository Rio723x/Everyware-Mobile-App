# T-02-020 — `HttpPageSource` adapter

**Spec:** 02-technical-seo §6.2
**Depends on:** T-02-019
**Estimate:** ~1h

## What to build

The second adapter over the `PageSource` seam — the one that makes it a real seam rather than a
hypothetical one, and the one Spec 03's validator consumes.

`packages/seo-core/src/audit/http-source.ts` — `HttpPageSource(baseUrl, urls)`:

1. Fetches each URL and returns `{ url, html }` in the same shape `DistPageSource` returns, so
   every rule runs unchanged.
2. Additionally records per URL: HTTP status, the full redirect chain, the `X-Robots-Tag` header,
   and TTFB, exposed on `PageContext` so rules can read them.
3. `robots-not-noindex` extends to check the `X-Robots-Tag` header when this adapter is in use.
4. A `301` or `302` on a canonical URL is an error result — Spec 01 D6 promised 200-with-no-redirect.
5. Retries transient network failures 3 times; a persistent failure produces a `fetch-failed` result
   rather than throwing and aborting the run.

## Acceptance criteria

- [ ] Against a local static server serving `dist/`, `HttpPageSource` and `DistPageSource` produce
      **identical** `PageAudit` results for every page — asserted by deep comparison. Same rules,
      two adapters, one outcome.
- [ ] A URL that 301s produces a failing result naming the redirect target.
- [ ] `X-Robots-Tag: noindex` sent as a header fails `robots-not-noindex` even when the HTML is clean.
- [ ] A URL returning 500 produces `fetch-failed` and does not abort the remaining pages.
- [ ] Redirect chains longer than one hop are recorded in full.

## Status

Not started
