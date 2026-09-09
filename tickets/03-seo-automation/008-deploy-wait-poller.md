# T-03-008 — Deploy-awareness poller

**Spec:** 03-seo-automation §5.2 (Deploy awareness)
**Depends on:** T-03-005
**Estimate:** ~1h

## What to build

`src/validator/deploy-wait.ts` — `waitForDeploy(url, expectedModifiedAt): Promise<DeployWaitResult>`.

Poll the article URL until it returns 200 **and** the `dateModified` in its emitted `BlogPosting`
JSON-LD matches the post's `updated_at`. Up to 10 minutes, at 15-second intervals. On timeout,
return `{ status: "timeout" }`.

Matching `dateModified` rather than merely waiting for a 200 is the whole point: a 200 only proves
*a* deploy exists, not that it contains *this* edit. Grading the previous deploy's HTML produces
confidently wrong results, which is worse than reporting none.

## Acceptance criteria

- [x] Against a mocked fetch that returns stale HTML twice then fresh HTML, it resolves `ready` after
      exactly 3 polls.
- [x] With permanently stale HTML it returns `timeout` after the configured window, not a hang and
      not a throw.
- [x] A 404 during the window is treated as not-yet-deployed and retried, not as a fatal error.
- [x] A page with no parseable `BlogPosting` is treated as not ready.
- [x] The poll interval and timeout are injectable so tests run in milliseconds.
- [x] It never sleeps past the timeout.

## Status

**Done** — commit on `feat/everyware-blog-platform`.

Matches the page's own `dateModified` against the post's `updated_at`. A 200 only proves *a* deploy exists, not that it contains *this* edit.
