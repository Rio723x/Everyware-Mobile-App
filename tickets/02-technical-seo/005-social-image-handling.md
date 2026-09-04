# T-02-005 — Social image URLs: Ghost resize, fallback, declared dimensions

**Spec:** 02-technical-seo §3.4 (Social image)
**Depends on:** T-02-001
**Estimate:** ~1h

## What to build

`packages/seo-core/src/metadata/images.ts`:

1. `buildSocialImage(post | null): SocialImage` returning
   `{ url: AbsoluteUrl; width: number; height: number; alt: string }`.
2. Ghost-hosted images are rewritten through Ghost's resize path so the delivered file meets the
   1200px minimum deterministically: insert `/size/w1200` after `/content/images`. An already-sized
   URL is normalised to `w1200` rather than double-inserted.
3. Non-Ghost and already-absolute external images pass through unchanged.
4. Fallback when the post has no feature image, or for listing/category/author pages:
   `siteUrl("/PhoneOnly.png")` — the existing 1200x630 asset referenced by `apps/site/index.html`.
5. `width`/`height` are always declared (1200x630 for the fallback; the w1200 transform for Ghost
   images with the declared aspect preserved).
6. `alt` is `featureImage.alt` for articles and a fixed site string otherwise. It is never empty.

## Acceptance criteria

- [ ] A Ghost URL containing `/content/images/2026/09/x.jpg` becomes `/content/images/size/w1200/2026/09/x.jpg`.
- [ ] A URL already containing `/size/w600/` is normalised to `/size/w1200/`, not nested.
- [ ] A non-Ghost absolute URL is returned unchanged.
- [ ] A post with a null feature image returns the fallback asset, and that file exists in
      `apps/site/public/` — asserted by reading the filesystem.
- [ ] Every returned `url` passes `toAbsoluteUrl`, every `width` is at least 1200 and `height` at
      least 630, and `alt` is non-empty.
- [ ] Deterministic across repeated calls.

## Status

Not started
