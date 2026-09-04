# T-01-018 — Wire live Ghost content and verify the preview deployment

**Spec:** 01-foundation §9 (Ghost, Integration)
**Depends on:** T-01-002, T-01-017
**Estimate:** ~1.5h

## What to build

Switch from fixtures to the real CMS and prove the joined site works on Vercel. No new features.

1. Set `GHOST_CONTENT_API_URL`, `GHOST_CONTENT_API_KEY` and `PUBLIC_SITE_URL` in the Vercel project
   (all environments) and in a local `.env.local`.
2. Run a full local build against live Ghost; fix any normalisation mismatch the real payload
   exposes that the fixtures did not (this is the point of the ticket — real data always differs).
3. Deploy a preview and verify the boundary end to end.
4. Record any fixture drift by updating `packages/ghost/src/fixtures/` from the real response, so
   the offline tests keep matching reality.

## Acceptance criteria

- [ ] A local build with live credentials emits one article file per published Ghost post.
- [ ] The preview deployment serves `/` as the SPA, with `#experiences` and `#info` still working.
- [ ] `curl -sI <preview>/blog/<slug>` returns **200 with no redirect** — no trailing-slash bounce.
- [ ] `curl -s <preview>/blog/<slug> | grep -F "<a sentence from the live article>"` succeeds.
- [ ] Vercel Analytics and Speed Insights still initialise on `/`.
- [ ] Blog header and footer links all navigate correctly **from a `/blog/*` URL** — every link
      clicked and confirmed.
- [ ] A production build with the Ghost env vars removed fails loudly rather than deploying an
      empty blog.
- [ ] `npm run test` still passes against the refreshed fixtures.

## Status

Not started
