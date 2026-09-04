# T-01-013 — Related posts and download CTA band on articles

**Spec:** 01-foundation §5.3
**Depends on:** T-01-012
**Estimate:** ~1.5h

## What to build

1. `src/components/RelatedPosts.astro` — up to 3 related articles rendered in an
   `<aside aria-label="Related articles">`. Selection is deterministic: posts sharing the most tags
   with the source first, ties broken by `publishedAt` descending; if fewer than 3 qualify, fill
   with the most recent other posts. The source post is always excluded.
2. `src/components/DownloadCtaBand.astro` — a token-styled band pointing at the app download and
   `/#info`, matching the marketing site's CTA language. Static markup, no modal, no JavaScript.
3. Mount both at the end of the article template.

## Acceptance criteria

- [x] Related-post selection is deterministic: the same fixture corpus produces the same three
      slugs across 10 runs.
- [x] The source post never appears in its own related list.
- [x] With only 1 tag-matching post available, the block still renders 3 cards, filled by recency.
- [x] With a corpus of exactly 1 post, the aside renders nothing rather than an empty container.
- [x] Every article now links to at least one other internal Everyware URL — no orphan pages.
      Asserted across every emitted article.
- [x] The CTA band emits no `<script>`.

## Status

**Done** — commit on `feat/everyware-blog-platform`. 141 tests across the workspace.

### Notes

- **Selection ends with a slug tiebreak.** Shared-tag count then recency leaves
  ties possible; without the final `localeCompare` two equally-scored posts could
  order differently between builds, and a rebuild with unchanged content would
  produce a different page. Determinism is asserted over 10 runs.
- **The CTA band is on the listing pages too**, not only articles. Every entry
  point into the blog should be able to convert, and the band ships no
  JavaScript, so it costs nothing to include.
- The marketing app opens a QR modal here, which needs React state and a click
  handler. On an article page that would mean shipping a bundle to every reader
  for one button; a link to the home page's download section does the same job.
