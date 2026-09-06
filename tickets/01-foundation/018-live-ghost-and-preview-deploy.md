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

**Partly done.** The live build works end to end against `https://cms.everyware.in`.
The remaining items need Ghost content and the Vercel dashboard.

### Done

- [x] Content API key verified against the live CMS; `.env.local` created at the
      monorepo root (gitignored).
- [x] A full local build against live Ghost succeeds and emits real content.
- [x] **The real payload exposed a genuine bug**, which is the point of this
      ticket — see below.
- [x] Test builds are now pinned to fixtures so the suite stays deterministic.

### Remaining

- [ ] `GHOST_CONTENT_API_URL`, `GHOST_CONTENT_API_KEY`, `PUBLIC_SITE_URL` in the
      Vercel project (all environments).
- [ ] Vercel **Framework Preset → Other** (carried over from T-01-016;
      auto-detection guesses wrong now that the repo holds two frameworks).
- [ ] Preview deployment and its verification checks.
- [ ] Refresh fixtures from the real Ghost response once 3 real posts exist.

### The bug real data found

Ghost's default owner slug is **`fixolutions_admin`** — with an underscore. The
`Slug` brand only accepted hyphens, so `getStaticPaths` threw and the build died:

```
Invalid Slug: must be lowercase alphanumerics separated by single hyphens.
Received: "fixolutions_admin"
```

**The regex was wrong, not Ghost.** Underscores are legal in URL path segments,
and Ghost emits a username verbatim as a slug. A brand that rejects legal CMS
data fails the build on content nobody can fix from the code side. Relaxed to
`/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/`, with tests for `fixolutions_admin` and `a_b-c`
accepted, and `a__b` / `_lead` / uppercase still rejected.

Every fixture slug was clean, so no amount of fixture-based testing would have
caught this. That is exactly why this ticket exists.

### Deterministic test builds

`npm run test` now runs `build:fixtures`, which sets `GHOST_FIXTURES=1` and
forces the in-memory adapter. Without it, any developer with live credentials in
`.env.local` would build the real site and then watch the suite fail against
assertions that describe the fixture corpus — and a test that depends on a
network service is not a test.

### Editorial note, not a code issue

`fixolutions_admin` is a poor public author slug: it becomes
`/blog/author/fixolutions_admin` and shows as the byline. Worth renaming in Ghost
to something like `everyware-editorial` before real content ships.
