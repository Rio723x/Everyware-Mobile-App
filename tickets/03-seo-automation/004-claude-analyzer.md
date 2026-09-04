# T-03-004 — Claude analyzer implementation

**Spec:** 03-seo-automation §5.1
**Depends on:** T-03-003
**Estimate:** ~2h

## What to build

`src/analyzer/claude-analyzer.ts` — `createClaudeAnalyzer(config)` implementing `SeoAnalyzer` with
the Anthropic SDK (`@anthropic-ai/sdk`).

- Model **`claude-opus-5`**; `thinking: { type: "adaptive" }`; `output_config: { effort: "medium" }`
  — this is a bounded extraction task, not a reasoning marathon.
- **Structured outputs via `client.messages.parse()`** with `seoAnalysisSchema`, so the response is
  schema-valid on arrival. Do **not** use the deprecated `output_format` parameter, and do not
  hand-parse JSON out of a text block.
- `max_tokens: 16000`, non-streaming (output is 1-2 KB).
- **Prompt caching** with `cache_control: { type: "ephemeral" }` on the system prompt and the
  site-context block, which are byte-identical across every article. Only the article body varies,
  and it goes last.
- On schema-validation failure: retry once with the validation error appended; on a second failure,
  return `null` with the error recorded. **A failed analysis must never fail the pipeline.**
- Typed SDK error handling, most-specific-first (`RateLimitError` backs off and retries;
  `BadRequestError` records and stops). No string-matching on error messages.

## Acceptance criteria

- [ ] Against a recorded fixture response, `analyze()` returns a `SeoAnalysis` valid against the schema.
- [ ] A malformed first response triggers **exactly one** retry, and a malformed second response
      yields `null` plus a populated error — not a throw.
- [ ] The request body contains `model: "claude-opus-5"`, adaptive thinking, and
      `output_config.effort: "medium"` — asserted against a mocked client.
- [ ] The string `output_format` appears nowhere in the repository — grep-asserted.
- [ ] `cache_control` is set on the system and site-context blocks, and the article body is the last
      content block.
- [ ] A live two-call test (skipped without `ANTHROPIC_API_KEY`) asserts
      `usage.cache_read_input_tokens > 0` on the second call.
- [ ] A `RateLimitError` is retried once with backoff; a `BadRequestError` is not retried.
- [ ] A post whose `plaintext` exceeds the context window is reported as an error, never silently
      truncated.

## Status

Not started
