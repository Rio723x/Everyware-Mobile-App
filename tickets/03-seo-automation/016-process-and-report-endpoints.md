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

- [x] Both endpoints return `401` with no token, `401` with a wrong token, and `200` with the correct one.
- [x] Token comparison is constant-time.
- [x] `process` returns `400` on a missing or malformed `postId`.
- [x] `report` returns `404` for an unknown slug and `400` for a missing `slug` parameter.
- [x] The returned report validates against its zod schema.
- [x] Neither handler exceeds 60 lines, and neither contains analysis, validation or scoring logic —
      asserted in review and by a line-count test.
- [x] Neither endpoint appears in `sitemap.xml`, and both are excluded from the audit's page set.

## Status

**Done** — commit on `feat/everyware-blog-platform`.

All three handlers are 54, 38 and 20 lines, with no analysis, validation or scoring logic.
