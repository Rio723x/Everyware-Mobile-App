# T-03-005 — Deploy trigger with debounce

**Spec:** 03-seo-automation §4.4
**Depends on:** T-03-001
**Estimate:** ~1h

## What to build

`src/deploy/trigger.ts` — `triggerDeploy(reason): Promise<DeployTriggerResult>`:

1. POSTs to `VERCEL_DEPLOY_HOOK_URL`.
2. A debounce record in the store suppresses repeat triggers within **60 seconds**, so an editor
   publishing five posts in a row causes one build, not five. The record stores the timestamp of the
   last fire; it is not a queue.
3. Returns a discriminated result: `{ status: "triggered" }` | `{ status: "debounced", lastFiredAt }`
   | `{ status: "failed", error }`. A failed deploy hook must not abort the analysis pipeline.

## Acceptance criteria

- [x] The first call POSTs to the hook and returns `triggered`.
- [x] A second call within 60s returns `debounced` and issues **no** HTTP request.
- [x] A call after the window returns `triggered` again.
- [x] Five calls in rapid succession produce exactly one POST.
- [x] A non-2xx hook response returns `failed` without throwing.
- [x] A missing `VERCEL_DEPLOY_HOOK_URL` returns `failed` with a clear configuration message.

## Status

**Done** — commit on `feat/everyware-blog-platform`.

The debounce timestamp is written *before* the HTTP call, so a slow hook cannot let a burst through while the first request is in flight.
