# T-03-010 — Content index and TF-IDF vectors

**Spec:** 03-seo-automation §5.3 (Content index)
**Depends on:** T-03-001
**Estimate:** ~1.5h

## What to build

1. `src/links/tokenize.ts` — lowercase, strip punctuation, split on whitespace, drop a stopword list,
   apply light suffix stripping (plurals, `-ing`, `-ed`). Deterministic and dependency-free.
2. `src/links/index-builder.ts` — `buildContentIndex(posts): IndexedArticle[]`, computing a TF-IDF
   vector over `title + excerpt + plaintext` for every post, plus its slug, url and tag slugs.
3. Persist the index through `SeoStore.saveContentIndex`, rebuilt on every run.

TF-IDF rather than embeddings, deliberately: no vector database, no embedding API, no additional
infrastructure decision — and it is **deterministic**, so the ranking can be unit-tested against a
fixed corpus. Embeddings drop in behind the same interface later if relevance proves insufficient.

## Acceptance criteria

- [ ] Tokenising the same text twice yields identical token arrays.
- [ ] Stopwords are removed; `washing machines` and `washing machine` produce the same stem.
- [ ] A term appearing in every document gets an IDF of 0 and therefore no influence.
- [ ] A term unique to one document gets the highest IDF in the corpus.
- [ ] `buildContentIndex` over a 12-article fixture corpus produces 12 entries with non-empty vectors.
- [ ] The index round-trips through both store adapters deep-equal.
- [ ] Rebuilding from the same corpus produces byte-identical vectors.

## Status

Not started
