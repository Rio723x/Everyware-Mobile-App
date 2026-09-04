# T-03-018 — Rate limits and cost guardrails

**Spec:** 03-seo-automation §7
**Depends on:** T-03-015
**Estimate:** ~1h

## What to build

Two Claude calls per publish is negligible at this volume; the expensive failure mode is a runaway
loop, so guard that specifically.

1. `MAX_ANALYSES_PER_HOUR = 20`, enforced with a rolling counter in the store. Exceeding it **skips
   analysis, records the reason on the report, and still validates and deploys** — the deterministic
   path must never be gated on the advisory one.
2. Retry once on `RateLimitError` with the SDK's backoff, then degrade to `analysis: null`.
3. Back-catalogue re-analysis is a deliberate CLI invocation (`--all`), never automatic.
4. Log token usage per call (`usage.input_tokens`, `output_tokens`, `cache_read_input_tokens`) so
   spend is observable.

## Acceptance criteria

- [ ] The 21st analysis within an hour is skipped, with the reason recorded on the report.
- [ ] A skipped analysis still produces a complete technical audit and a deploy.
- [ ] The counter rolls over correctly after the hour with a mocked clock.
- [ ] A `RateLimitError` is retried exactly once, then degrades to `null`.
- [ ] Token usage is logged for every model call.
- [ ] No scheduled or automatic re-analysis of existing posts exists — grep-asserted for cron or
      timer configuration.

## Status

Not started
