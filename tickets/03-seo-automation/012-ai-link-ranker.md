# T-03-012 — AI link ranker with hard post-validation

**Spec:** 03-seo-automation §5.3 (AI ranking pass)
**Depends on:** T-03-004, T-03-011
**Estimate:** ~1.5h

## What to build

`src/links/ranker.ts` — sends the top 10 candidates (title, excerpt, URL) plus the source article to
Gemini and returns at most 5 `LinkSuggestion`s (`targetUrl`, `anchorText`, `reason`, `confidence`).

**Both constraints are enforced in code after the response, not requested in the prompt:**

1. `targetUrl` must be one of the supplied candidates.
2. `anchorText` must occur **verbatim** in the source article's `plaintext`.

A suggestion violating either is dropped and counted in `droppedSuggestions`. The model therefore
cannot invent a URL, and cannot propose an anchor the editor would have to write from scratch.

Same model configuration as T-03-004 (`gemini-3.6-flash`, `responseMimeType: "application/json"`,
a `responseJsonSchema`, thinking disabled). Failure returns an empty list, never a throw.

## Acceptance criteria

- [x] A mocked response containing an off-corpus `targetUrl` yields that suggestion dropped and
      `droppedSuggestions` incremented.
- [x] A mocked response whose `anchorText` does not occur in the article body is likewise dropped.
- [x] Anchor matching is case-sensitive on the article text and does not match across element
      boundaries.
- [x] At most 5 suggestions are returned even when the model returns more.
- [x] `confidence` outside 0-1 fails schema validation.
- [x] An API failure returns an empty list and records the error; it does not throw.
- [x] With `GEMINI_API_KEY` absent, the ranker is skipped and the deterministic candidate list is
      still recorded on the report.

## Status

**Done** — commit on `feat/everyware-blog-platform`.

Both constraints are enforced **after** the response, not requested in the prompt. A prompt is a request; this is a guarantee.
