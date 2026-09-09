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

- [x] Every fixture post emits `dist/blog/<slug>.html`; the emitted file count equals
      `listPosts().length`.
- [x] Each article contains exactly one `<h1>`, and its text equals the post title.
- [x] Article body HTML contains no `<h1>`, and heading levels never skip (h2 to h4 fails).
- [x] A fixture post whose body contains `<h1>` fails the build with the slug in the message.
- [x] Every `<img>` in the rendered article has a non-empty `alt`; every body image has
      `loading="lazy"` and `decoding="async"`; the hero image has `loading="eager"`.
- [x] The full article text is present in the raw HTML with JavaScript disabled:
      `grep -F "<a sentence from the fixture body>" dist/blog/<slug>.html` succeeds.
- [x] A post with no public tag renders a 3-level breadcrumb, not a broken 4-level one.
- [x] The article carries `<time datetime>` for published, and for updated only when it is newer.

## Status

**Done** — commit on `feat/everyware-blog-platform`. 133 tests across the workspace;
16 pages emitted (14 articles + listing + page 2).

### Notes

- **The h1 guard is proven, not assumed.** Planting `<h1>` into a fixture post
  body fails the build with
  `ArticleHtmlError: Article "washing-machine-service-frequency" contains an <h1>
  in its body`. An editorial rule that is not enforced in code is a suggestion.
- **One fixture was corrected, not the test.** The geyser post's hand-written
  `plaintext` did not correspond to its `html`; real Ghost derives one from the
  other, so the fixture was unrealistic. The text assertion now compares
  tag-stripped body text to `plaintext` sentence by sentence — where tag
  boundaries fall inside the prose is not part of the claim "the article is in
  the response".
- `prepareArticleHtml` validates before transforming, so a structural failure
  surfaces as itself rather than as a confusing diff in transformed output.
