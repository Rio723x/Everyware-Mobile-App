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

- [ ] Every built blog page has exactly one `<title>`, one `<meta name="description">` and one
      `<link rel="canonical">`.
- [ ] The grep guard passes, and fails when a raw `<meta>` is planted in another component.
      Remove the plant afterwards.
- [ ] JSON-LD script count per page matches `metadata.jsonLd.length`.
- [ ] JSON-LD is emitted as valid JSON with no HTML-escaping corruption of `&`, `<` or quotes —
      asserted by `JSON.parse` on the extracted text of every script on every page.
- [ ] `SeoHead` renders nothing when a page does not pass it, so `BlogLayout` stays metadata-free.
- [ ] Blog pages still ship zero JavaScript.

## Status

Not started
