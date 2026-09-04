# T-03-016 — `/api/seo/process` and `/api/seo/report` endpoints

**Spec:** 03-seo-automation §4.2, §5.4, §6
**Depends on:** T-03-015
**Estimate:** ~1h

## What to build

Two thin adapters. Parse, authenticate, delegate, serialise — nothing else.

1. `api/seo/process.ts` — `POST`, requires `Authorization: Bearer $SEO_WORKER_TOKEN`, body
   `{ postId }`, calls `processPost`, returns the report summary. Not public.
2. `api/seo/report.ts` — `GET ?slug=...`, same bearer auth, returns the stored `SeoReport` as JSON,
   `404` when absent.

## Acceptance criteria

- [ ] Both endpoints return `401` with no token, `401` with a wrong token, and `200` with the correct one.
- [ ] Token comparison is constant-time.
- [ ] `process` returns `400` on a missing or malformed `postId`.
- [ ] `report` returns `404` for an unknown slug and `400` for a missing `slug` parameter.
- [ ] The returned report validates against its zod schema.
- [ ] Neither handler exceeds 60 lines, and neither contains analysis, validation or scoring logic —
      asserted in review and by a line-count test.
- [ ] Neither endpoint appears in `sitemap.xml`, and both are excluded from the audit's page set.

## Status

Not started
