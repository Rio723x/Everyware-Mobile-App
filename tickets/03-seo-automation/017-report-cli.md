# T-03-017 — `seo:report` CLI

**Spec:** 03-seo-automation §5.4 (Delivery)
**Depends on:** T-03-015
**Estimate:** ~1h

## What to build

`src/report/cli.ts` — `npm run seo:report -- --slug <slug>`, printing a readable report: the
technical score, every failing rule with its observed value, the AI suggestions, the metadata diffs,
and both link-suggestion lists.

**Exits non-zero when the technical audit has error-severity failures**, so it is usable as a CI or
pre-publish gate rather than only as a human read-out.

Also supports `--all` (summary table of every stored report) and `--json` (raw report to stdout).

## Acceptance criteria

- [ ] `--slug` on a clean report prints the report and exits 0.
- [ ] `--slug` on a report with error failures exits non-zero and lists each failing rule with its
      observed value.
- [ ] `--slug` on an unknown slug exits non-zero with a clear message, not a stack trace.
- [ ] `--all` prints one row per stored report, sorted by score ascending so the worst is first.
- [ ] `--json` output parses as JSON and validates against the report schema.
- [ ] The CLI runs against `FileSeoStore` with no credentials.

## Status

Not started
