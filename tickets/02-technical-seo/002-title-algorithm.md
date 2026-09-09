# T-02-002 — Deterministic title algorithm

**Spec:** 02-technical-seo §3.4 (Title)
**Depends on:** T-02-001
**Estimate:** ~1h

## What to build

`packages/seo-core/src/metadata/title.ts` implementing the six-step algorithm exactly:

1. Ghost `meta_title` when set and non-empty wins verbatim.
2. Article: `post.title` when longer than 45 characters, else `post.title | Everyware Blog`.
3. Listing page 1: `Everyware Blog — Appliance Care, Repair Costs & Buying Guides`;
   page n over 1: `Everyware Blog — Page n`.
4. Category page 1: `<tag.name> | Everyware Blog`; page n over 1 inserts `— Page n`.
5. Author page 1: `Articles by <author.name> | Everyware Blog`; page n over 1 inserts `— Page n`.
6. If the result exceeds 70 characters, truncate at the last word boundary before 69 and append an
   ellipsis.

Pure function, no I/O, no randomness.

## Acceptance criteria

- [x] Unit tests cover every branch: `meta_title` override; a 46-character title (no suffix);
      a 45-character title (suffix applied); listing pages 1 and 2; category pages 1 and 2;
      author pages 1 and 2; and the over-70 truncation.
- [x] Truncation never splits a word and the result is at most 70 characters.
- [x] Called twice with the same input, it returns the identical string.
- [x] Every produced title is at least 10 characters (Spec 02 rule `title-length` lower bound).
- [x] A title consisting only of whitespace in `meta_title` falls through to step 2 rather than
      being used.

## Status

**Done** — commit on `feat/everyware-blog-platform`.

Every branch covered, including the 45/46-character boundary either side of the suffix threshold.
