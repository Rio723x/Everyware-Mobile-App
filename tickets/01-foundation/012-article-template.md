# T-01-012 — Article template with heading and image guards

**Spec:** 01-foundation §5.3
**Depends on:** T-01-011
**Estimate:** ~2h

## What to build

1. `src/pages/blog/[slug].astro`, `getStaticPaths` over `listPosts()`. Document order per Spec 01 §5.3:
   breadcrumb, `<article>` with a header holding the single `<h1>`, byline, hero image
   (`loading="eager"`, `fetchpriority="high"`, explicit dimensions, its alt text), the excerpt as a
   summary paragraph, the Ghost body via `set:html`, then tag chips.
2. `packages/seo-core/src/html.ts` — a body-HTML post-processor that adds `loading="lazy"` and
   `decoding="async"` to every `<img>` in the Ghost HTML that does not already have them.
   It must not otherwise alter the markup.
3. **Build-time heading guard:** if `post.html` contains an `<h1>`, fail the build with a message
   naming the slug. The template owns the only `<h1>`, and an editorial rule that is not enforced
   in code is not a rule.
4. Breadcrumb trail: Home, Blog, primary category (omitted when the post has no public tag),
   post title.

## Acceptance criteria

- [ ] Every fixture post emits `dist/blog/<slug>.html`; the emitted file count equals
      `listPosts().length`.
- [ ] Each article contains exactly one `<h1>`, and its text equals the post title.
- [ ] Article body HTML contains no `<h1>`, and heading levels never skip (h2 to h4 fails).
- [ ] A fixture post whose body contains `<h1>` fails the build with the slug in the message.
- [ ] Every `<img>` in the rendered article has a non-empty `alt`; every body image has
      `loading="lazy"` and `decoding="async"`; the hero image has `loading="eager"`.
- [ ] The full article text is present in the raw HTML with JavaScript disabled:
      `grep -F "<a sentence from the fixture body>" dist/blog/<slug>.html` succeeds.
- [ ] A post with no public tag renders a 3-level breadcrumb, not a broken 4-level one.
- [ ] The article carries `<time datetime>` for published, and for updated only when it is newer.

## Status

Not started
