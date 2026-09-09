# T-03-004 — Gemini analyzer implementation

**Spec:** 03-seo-automation §5.1
**Depends on:** T-03-003
**Estimate:** ~2h

## What to build

`src/analyzer/gemini-analyzer.ts` — `createGeminiAnalyzer(config)` implementing `SeoAnalyzer`
with the Google Gen AI SDK (`@google/genai`), on the **free tier**.

```ts
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const response = await ai.models.generateContent({
  model: "gemini-3.6-flash",
  contents: buildArticlePrompt(post),
  config: {
    systemInstruction: SYSTEM_INSTRUCTION,
    responseMimeType: "application/json",
    responseJsonSchema: z.toJSONSchema(seoAnalysisSchema),
    thinkingConfig: { thinkingLevel: "LOW" },
  },
});
```

- Model **`gemini-3.6-flash`** — a bounded extraction task over one article, and the tier the
  free quota is most generous on.
- **Structured output** via `responseMimeType` + `responseJsonSchema` derived from
  `seoAnalysisSchema`. The response is **still** parsed with the zod schema afterwards: a
  schema the provider enforces and a schema this codebase trusts must be verified to be the
  same schema, not assumed to be.
- `thinkingConfig: { thinkingLevel: "LOW" }` — thinking at its floor. Extraction from supplied text needs
  none, and it is the largest avoidable draw on a free quota.
- `systemInstruction` is a module-level constant, identical on every call; the article varies
  in `contents`.
- On schema-validation failure: retry once with the validation error appended; on a second
  failure return `null` with the error recorded. **A failed analysis must never fail the
  pipeline.**
- A `429` (free-tier rate limit) is retried once after a short backoff, then degrades to
  `null`. Exhausted quota is an ordinary Tuesday, not an incident.

## Acceptance criteria

- [x] Against a recorded fixture response, `analyze()` returns a `SeoAnalysis` valid against the schema.
- [x] A malformed first response triggers **exactly one** retry, and a malformed second response
      yields `null` plus a populated error — not a throw.
- [x] The request config contains `model: "gemini-3.6-flash"`, `responseMimeType:
      "application/json"`, a `responseJsonSchema` matching `z.toJSONSchema(seoAnalysisSchema)`,
      and `thinkingConfig.thinkingLevel: "LOW"` — asserted against a mocked client.
- [x] `systemInstruction` is byte-identical across two consecutive calls. `[m]`
- [x] The full article `plaintext` reaches `contents` **untruncated**; a post that would exceed
      the context window is reported as an error rather than silently cut.
- [x] A `429` is retried exactly once, then degrades to `analysis: null` with the reason recorded.
- [x] A live smoke test (skipped without `GEMINI_API_KEY`) returns a schema-valid analysis for
      one fixture post, and logs `usageMetadata` token counts.
- [x] The strings `anthropic` and `claude` appear nowhere in `services/seo-worker` — grep-asserted,
      so the provider swap cannot be half-done.

## Status

**Done** — commit on `feat/everyware-blog-platform`.

The response is parsed with zod even though the provider enforced a schema: provider-side constraint is best-effort, and the parse is what makes it true.

## Amended after live use

Google closed `gemini-2.5-flash` to new API keys. A real call returns 404 with
the replacement named in the message, so the model moved to `gemini-3.6-flash`.

That model also rejects `thinkingBudget: 0` with a bare `INVALID_ARGUMENT`.
Budgets are model-dependent; `thinkingLevel` is the Gemini 3 mechanism. `LOW`
was chosen by measurement — it reports `thoughtsTokenCount: 0`, which is what
the zero budget bought — and now lives in one `GEMINI_THINKING` constant shared
with the link ranker (T-03-012), so the two callers cannot drift apart.
