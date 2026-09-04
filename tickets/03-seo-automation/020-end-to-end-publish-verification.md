# T-03-020 — Configure Ghost webhooks and verify an end-to-end publish

**Spec:** 03-seo-automation §4.1, §9
**Depends on:** T-03-016, T-03-017, T-03-019
**Estimate:** ~1.5h

## What to build

Wire the live system and prove the whole loop with a real article. No new code beyond fixes this
exercise uncovers.

1. In Ghost, add four webhooks on the "Everyware Web" integration, all pointing at
   `https://everyware.in/api/webhooks/ghost` with the shared `GHOST_WEBHOOK_SECRET`:
   `post.published`, `post.published.edited`, `post.unpublished`, `post.deleted`.
2. Set the production env vars: `GHOST_WEBHOOK_SECRET`, `GEMINI_API_KEY`, `SEO_WORKER_TOKEN`,
   `VERCEL_DEPLOY_HOOK_URL`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`,
   `SEO_STORE_DRIVER=redis`.
3. Publish a real article in Ghost and follow it through: webhook `202`, deploy, live page,
   analysis, validation, stored report.
4. Edit and republish the same article; confirm one deploy, a fresh report, and no duplicate
   processing.
5. Unpublish it; confirm a deploy and that the URL stops existing and leaves the sitemap.

## Acceptance criteria

- [ ] Publishing in Ghost produces a `202` in the function logs within 3 seconds.
- [ ] The article is live at `https://everyware.in/blog/<slug>` and returns 200 with no redirect.
- [ ] `npm run seo:report -- --slug <slug>` shows `technicalScore` of at least 95 and exits 0.
- [ ] The report contains a non-null `analysis` and at least one internal-link suggestion.
- [ ] Editing and republishing produces exactly one deploy and one new report; a replayed webhook is
      recorded as a duplicate.
- [ ] Unpublishing removes the URL from the site and from `/sitemap.xml` after the deploy.
- [ ] `curl https://everyware.in/api/seo/report?slug=<slug>` returns `401` without a token.
- [ ] No secret appears in any log line.
- [ ] `npm run seo:audit -- --base-url https://everyware.in` exits 0 against production.

## Status

Not started
