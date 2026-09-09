# T-03-003 — `SeoAnalysis` schema, prompt, and `StubAnalyzer`

**Spec:** 03-seo-automation §5.1
**Depends on:** T-03-001
**Estimate:** ~1.5h

## What to build

The analyzer's contract and its credential-free implementation, built before the real one so the
rest of the pipeline can be developed and tested with no API key.

1. `src/analyzer/schema.ts` — `seoAnalysisSchema` exactly as in Spec 03 §5.1. The length bounds
   mirror Spec 02's **optimal** thresholds (title 15-60, description 70-160) on purpose: a
   suggestion the deterministic validator would flag is not a useful suggestion, so it is refused at
   the boundary.
2. `src/analyzer/analyzer.ts` — the `SeoAnalyzer` interface (one method, `analyze`).
3. `src/analyzer/prompt.ts` — the cached system prompt (Everyware brand, Indian appliance-repair
   domain, suggestions grounded only in the supplied article text, never invent facts, statistics or
   schema) and the user-message builder carrying title, excerpt, tag names and full `plaintext`.
4. `src/analyzer/stub-analyzer.ts` — a deterministic fixture analyzer returning schema-valid output
   derived from the post, used by every test.

## Acceptance criteria

- [x] `seoAnalysisSchema` rejects a 61-character `suggestedTitle`, a 161-character
      `suggestedDescription`, a `searchIntent` outside the four allowed values, and a
      `suggestedSlug` containing uppercase or underscores.
- [x] `StubAnalyzer` output validates against the schema for every fixture post.
- [x] `StubAnalyzer` is deterministic: identical output across 10 runs for the same post.
- [x] The system instruction is a module-level constant, identical across calls.
- [x] The user message contains the article `plaintext` **untruncated**.
- [x] The prompt text contains explicit instructions not to invent facts or schema — asserted by a
      test so a future edit cannot quietly drop them.

## Status

**Done** — commit on `feat/everyware-blog-platform`.

Schema bounds mirror spec 02's *optimal* thresholds, so a suggestion the validator would flag is refused at the boundary rather than shown to an editor.
