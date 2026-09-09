# T-03-013 — Inbound link suggestions

**Spec:** 03-seo-automation §5.3 (reverse direction)
**Depends on:** T-03-012
**Estimate:** ~1h

## What to build

`src/links/inbound.ts` — the reverse pass: which **existing** articles should link **to** the new
one. A new post starts with zero inbound internal links, and that is the gap actually worth closing;
outbound links alone leave it an orphan in the link graph.

Reuse `scoreCandidates` with the source and candidate roles swapped, then run the same AI ranking
and the same two hard constraints — except `anchorText` must now occur verbatim in the **existing**
article's plaintext, since that is where the link would be inserted.

## Acceptance criteria

- [x] Inbound suggestions never include the new article itself.
- [x] An existing article that already links to the new article is excluded.
- [x] `anchorText` is validated against the **existing** article's text, not the new one's —
      asserted by a test where the anchor appears only in the new article and is therefore dropped.
- [x] Each suggestion identifies the source article to edit as well as the target URL.
- [x] Deterministic candidate ordering, as in T-03-011.
- [x] With a corpus of 1 article, inbound suggestions are empty rather than throwing.

## Status

**Done** — commit on `feat/everyware-blog-platform`.

Anchor text is validated against the **existing** article that would carry the link, not the new one.
