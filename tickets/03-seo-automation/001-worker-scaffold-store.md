# T-03-001 — `services/seo-worker` scaffold, `SeoStore` interface, `FileSeoStore`

**Spec:** 03-seo-automation §5.5, §6
**Depends on:** T-02-022
**Estimate:** ~1.5h

## What to build

1. The `services/seo-worker` workspace, extending `tsconfig.base.json`, depending on
   `packages/ghost` and `packages/seo-core`.
2. `src/store/store.ts` — the `SeoStore` interface exactly as in Spec 03 §5.5 (idempotency claim,
   report save/get/list, content index save/get, debounce get/set).
3. `src/store/file-store.ts` — `FileSeoStore` writing JSON under `.seo-store/` (gitignored).
   This is what every test and all local development use, so the suite needs no credentials.
4. `claimIdempotencyKey` must be atomic and honour a TTL: a second claim of a live key returns
   `false`; a claim of an expired key returns `true`.

## Acceptance criteria

- [ ] Every `SeoStore` method is implemented by `FileSeoStore`.
- [ ] `claimIdempotencyKey("k", 60)` returns `true` then `false` on an immediate second call.
- [ ] With the clock advanced past the TTL, the same key claims `true` again.
- [ ] Concurrent claims of the same key from 10 parallel calls yield exactly one `true`.
- [ ] `getReport` returns `null` for an unknown slug rather than throwing.
- [ ] Saved and reloaded reports are deep-equal, with dates surviving the JSON round trip as
      `IsoDateTime`.
- [ ] `.seo-store/` is gitignored.
- [ ] `npm run typecheck`, `lint`, `test` exit 0; no `any`.

## Status

Not started
