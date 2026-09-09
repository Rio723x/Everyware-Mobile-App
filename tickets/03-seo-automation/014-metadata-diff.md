# T-03-014 — `MetadataDiff` builder

**Spec:** 03-seo-automation §5.4
**Depends on:** T-03-004, T-03-009
**Estimate:** ~1h

## What to build

`src/report/diff.ts` — `buildDiffs(live: PageAudit, analysis: SeoAnalysis | null): MetadataDiff[]`,
comparing what is **live** against what the analyzer **suggested**, for title, description and slug.

Each diff carries the field, the live value, the suggested value, and the reason it is worth
surfacing — e.g. *"live title is 71 characters (over the 70 limit); suggested: '...'"*. This is the
useful part of the report for an editor.

**A diff is a comparison, never an action.** Nothing in this module writes to Ghost, to the
repository, or to a rendered page.

## Acceptance criteria

- [x] A live title identical to the suggestion produces no diff.
- [x] A live title over 70 characters produces a diff citing the observed length even when the
      analyzer failed and `analysis` is `null`.
- [x] `analysis: null` produces only rule-derived diffs, never a crash.
- [x] A suggested slug differing from the live slug produces a diff flagged as
      non-actionable-without-a-redirect, since changing a published slug breaks existing links.
- [x] Diffs are ordered deterministically by field.
- [x] The module performs no writes of any kind — grep-asserted for Ghost Admin API usage and
      filesystem writes.

## Status

**Done** — commit on `feat/everyware-blog-platform`.

Rule-derived diffs are produced even when `analysis` is null: a 71-character title is worth flagging whether or not a model had an opinion.
