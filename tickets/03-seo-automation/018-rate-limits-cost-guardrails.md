# T-03-018 — Rate limits and cost guardrails

**Spec:** 03-seo-automation §7
**Depends on:** T-03-015
**Estimate:** ~1h

## What to build

Two Gemini calls per publish sit well inside the free tier; the failure mode worth guarding is a runaway
loop, so guard that specifically.

1. `MAX_ANALYSES_PER_HOUR = 20`, enforced with a rolling counter in the store. Exceeding it **skips
   analysis, records the reason on the report, and still validates and deploys** — the deterministic
   path must never be gated on the advisory one.
2. Retry once on `RateLimitError` with the SDK's backoff, then degrade to `analysis: null`.
3. Back-catalogue re-analysis is a deliberate CLI invocation (`--all`), never automatic.
4. Log token usage per call (`usage.input_tokens`, `output_tokens`, `cache_read_input_tokens`) so
   spend is observable.

## Acceptance criteria

- [x] The 21st analysis within an hour is skipped, with the reason recorded on the report.
- [x] A skipped analysis still produces a complete technical audit and a deploy.
- [x] The counter rolls over correctly after the hour with a mocked clock.
- [x] A `RateLimitError` is retried exactly once, then degrades to `null`.
- [x] Token usage is logged for every model call.
- [x] No scheduled or automatic re-analysis of existing posts exists — grep-asserted for cron or
      timer configuration.

## Status

**Done** — commit on `feat/everyware-blog-platform`.

Exceeding the hourly guard skips the advisory layer and still validates and reports. The guard protects a free-tier quota, not a bill.
