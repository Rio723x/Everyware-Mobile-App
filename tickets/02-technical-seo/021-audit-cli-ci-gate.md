# T-02-021 — `seo:audit` CLI and the CI gate

**Spec:** 02-technical-seo §6.6
**Depends on:** T-02-020
**Estimate:** ~1.5h

## What to build

1. `packages/seo-core/src/audit/cli.ts` — `npm run seo:audit` with:
   - `--dist <dir>` (DistPageSource) or `--base-url <url>` (HttpPageSource)
   - `--format json|text`; `json` writes `seo-audit.json`, `text` prints a readable table
   - **exit code 1 if any `error`-severity rule fails**, 0 otherwise
2. A zod schema for `seo-audit.json` so the artifact is itself validated, and Spec 03 can consume it
   without guessing its shape.
3. Wire it into the root `build` script as a postbuild step, so a metadata regression cannot reach
   production.

## Acceptance criteria

- [ ] `npm run seo:audit -- --dist dist` exits 0 on a clean build.
- [ ] A test that strips the `<link rel="canonical">` from one emitted file makes it exit non-zero
      and name that file and rule. The file is restored afterwards.
- [ ] `--format json` writes `seo-audit.json` that validates against its own schema.
- [ ] `--format text` prints per-page scores and every failing rule with its observed value.
- [ ] `--base-url` produces the same `PageAudit` shape as `--dist`.
- [ ] `npm run build` runs the audit and fails the build on an error-severity failure.
- [ ] The CLI exits non-zero with a clear message when `--dist` points at a missing directory,
      rather than passing vacuously.

## Status

Not started
