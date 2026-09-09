# T-03-015 — `processPost` orchestration and `SeoReport` assembly

**Spec:** 03-seo-automation §3, §5.4
**Depends on:** T-03-009, T-03-013, T-03-014
**Estimate:** ~2h

## What to build

`src/index.ts` — `processPost(postId)`, the single entry point the API calls. Runs the five steps in
Spec 03 §3: fetch the canonical post from Ghost; analyze (advisory); recommend links (advisory);
wait for deploy then validate the live HTML (authoritative); assemble and store the `SeoReport`.

`SeoReport` is exactly the shape in Spec 03 §5.4. `technicalScore` is copied from
`technical.score` — **never recomputed**, or two scoring implementations will drift and the report
will disagree with the audit.

Failure isolation is the design requirement: analysis or link failures degrade to `null` / empty and
are recorded, while validation and the report still complete.

## Acceptance criteria

- [x] A full run against fixtures plus a locally served `dist` produces a complete `SeoReport` with
      `technicalScore === 100`.
- [x] With the analyzer forced to throw, the run still completes with `analysis: null`,
      `analysisError` set, and a full technical audit.
- [x] With the link ranker forced to throw, the run still completes with empty suggestion lists.
- [x] With the deploy timing out, the report records `deploy-timeout` and does not grade stale HTML.
- [x] `report.technicalScore === report.technical.score` for every run.
- [x] The report validates against its zod schema and round-trips through the store deep-equal.
- [x] Running `processPost` twice for the same post produces reports that differ only in
      `generatedAt`.
- [x] No code path in the whole worker calls the Ghost **Admin** API — grep-asserted. This is what
      makes webhook loops structurally impossible.

## Status

**Done** — commit on `feat/everyware-blog-platform`.

`technicalScore` is copied from the audit, never recomputed. **Proven byte-identical builds** with the analyzer on and off.
