# T-03-007 — `POST /api/webhooks/ghost` endpoint

**Spec:** 03-seo-automation §3, §4.1, §4.3
**Depends on:** T-03-005, T-03-006
**Estimate:** ~1.5h

## What to build

`api/webhooks/ghost.ts` — a **thin adapter**: verify, deduplicate, dispatch, return. It does three
cheap things and returns `202`, because Ghost expects a fast response and retries on timeout while
analysis takes tens of seconds.

1. Read the raw body, verify the signature (T-03-006). Failure returns `401` and processes nothing.
2. Parse the payload with a zod schema; determine the event type
   (`post.published`, `post.published.edited`, `post.unpublished`, `post.deleted`).
3. Claim the idempotency key `post.id:post.updated_at`. Already claimed returns
   `200 {"status":"duplicate"}` and dispatches nothing.
4. Trigger a deploy for every event type (the URL set changes on unpublish and delete too).
5. For `post.published` and `post.published.edited` only, dispatch to `/api/seo/process`
   fire-and-forget with the worker bearer token.
6. Return `202` with the event type and post id.

Business logic in an `api/` file is a review-blocking defect — it would be untestable without an
HTTP server and out of reach of the CLI.

## Acceptance criteria

- [x] A valid signed `post.published` returns `202`, triggers a deploy, and dispatches processing.
- [x] An invalid signature, a stale timestamp and a missing header each return `401` with no deploy
      and no dispatch.
- [x] Replaying the same `post.id:updated_at` returns `200 {"status":"duplicate"}` and dispatches nothing.
- [x] `post.unpublished` and `post.deleted` trigger a deploy but **no** analysis dispatch.
- [x] The handler returns in under 3 seconds with a mocked slow downstream — proving dispatch is not
      awaited.
- [x] A malformed JSON body returns `400`, not `500`.
- [x] The handler file is under 60 lines and contains no analysis, validation or scoring logic.

## Status

**Done** — commit on `feat/everyware-blog-platform`.

Payload parsing moved into `services/seo-worker/src/webhook/payload.ts` so the handler is 54 lines and the parsing is testable without an HTTP server.
