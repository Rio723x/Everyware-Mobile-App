# T-03-011 — Deterministic internal-link candidate scoring

**Spec:** 03-seo-automation §5.3 (Candidate scoring)
**Depends on:** T-03-010
**Estimate:** ~1.5h

## What to build

`src/links/candidates.ts` — `scoreCandidates(source, index): ScoredCandidate[]`, implementing
exactly:

```
score = 0.5 * cosine(tfidf(source), tfidf(candidate))
      + 0.3 * jaccard(tags(source), tags(candidate))
      + 0.2 * recencyBoost(candidate.publishedAt)     // 1.0 at 0 days, 0.0 at 365 days, linear
```

Excludes the source article itself and any article already linked from its body. Returns the top 10,
sorted by score descending with a stable tie-break on slug so the ordering is fully determined.

This half does the real work; the model in T-03-012 only ranks and explains what this produces.

## Acceptance criteria

- [ ] Identical rankings across 10 runs on the same corpus — asserted explicitly.
- [ ] The source article never appears in its own candidate list.
- [ ] An article already linked from the source body is excluded.
- [ ] Two articles with identical scores are ordered by slug, not by input order.
- [ ] Hand-computed expected scores for a small fixture corpus match to 6 decimal places.
- [ ] `recencyBoost` returns 1.0 for today, 0.5 at ~182 days, and clamps to 0.0 beyond 365 days.
- [ ] A corpus of 1 article returns an empty candidate list rather than throwing.
- [ ] At most 10 candidates are returned.

## Status

Not started
