# T-02-011 — `SeoHead.astro` and wiring every route

**Spec:** 02-technical-seo §7, §9 (Metadata)
**Depends on:** T-02-010
**Estimate:** ~1.5h

## What to build

1. `apps/blog/src/components/SeoHead.astro` taking exactly one prop, `metadata: PageMetadata`, and
   rendering: `<title>`, `<meta name="description">`, `<link rel="canonical">`,
   `<meta name="robots">`, `rel="prev"` / `rel="next"` when present, every OpenGraph property,
   every Twitter property, and one `<script type="application/ld+json">` per JSON-LD document.
2. Update all five route templates from Spec 01 to call `buildPageMetadata(...)` and pass the result
   into `<SeoHead slot="head" />`.
3. **`SeoHead.astro` is the only file in `apps/blog/src` allowed to contain `<meta` or
   `application/ld+json`.** Add a test that greps the tree and fails otherwise. Without that guard,
   the rule engine grades output that some other file can quietly bypass.

## Acceptance criteria

- [x] Every built blog page has exactly one `<title>`, one `<meta name="description">` and one
      `<link rel="canonical">`.
- [x] The grep guard passes, and fails when a raw `<meta>` is planted in another component.
      Remove the plant afterwards.
- [x] JSON-LD script count per page matches `metadata.jsonLd.length`.
- [x] JSON-LD is emitted as valid JSON with no HTML-escaping corruption of `&`, `<` or quotes —
      asserted by `JSON.parse` on the extracted text of every script on every page.
- [x] `SeoHead` renders nothing when a page does not pass it, so `BlogLayout` stays metadata-free.
- [x] Blog pages still ship zero JavaScript.

## Status

**Done** — commit on `feat/everyware-blog-platform`. 259 tests; verify exits 0.

### Notes

- The grep guard allows exactly one exception: `BlogLayout.astro` keeps
  `charset` and `viewport`. Those are document mechanics rather than SEO
  metadata, never vary per page, and every audit rule requires them — so the
  guard permits those two specifically and rejects any other `<meta>` there.
- **"Ships no JavaScript" was refined to "ships no *executable* JavaScript".**
  Adding JSON-LD made three assertions fail, correctly detecting a new
  `<script>` tag. But `application/ld+json` is data the browser parses and never
  runs, so it does not violate the zero-JS promise. The assertions now exclude
  it by type rather than counting tags.
- `SeoHead` annotates `Astro.props` explicitly. `Astro.props` is loosely typed
  inside an `.astro` file, and without the annotation every `Object.entries`
  value arrived as `unknown`.
