# T-03-002 — `UpstashRedisStore` adapter

**Spec:** 03-seo-automation §5.5
**Depends on:** T-03-001
**Estimate:** ~1.5h

## What to build

The production adapter behind the same interface — the second adapter that makes this seam real.

1. `src/store/redis-store.ts` using Upstash Redis over its HTTP client (no connection pooling, which
   is what makes it work from a Vercel Function).
2. `claimIdempotencyKey` uses `SET key value NX EX ttl` — atomicity comes from Redis, not from
   application logic.
3. Key namespacing: `seo:idem:*`, `seo:report:*`, `seo:index`, `seo:debounce:*`.
4. `SEO_STORE_DRIVER` (`file` | `redis`) selects the adapter, defaulting to `file` outside production.
5. A shared conformance test suite runs against **both** adapters, so they cannot drift.

## Acceptance criteria

- [x] The conformance suite passes against `FileSeoStore` and, when Upstash credentials are present,
      against `UpstashRedisStore`. It skips (not fails) the Redis run when credentials are absent.
- [x] `claimIdempotencyKey` uses `NX EX` in a single command — asserted against a mocked client.
- [x] Reports round-trip through Redis deep-equal.
- [x] `SEO_STORE_DRIVER=redis` without credentials throws a clear configuration error at startup,
      not at first use.
- [x] Default outside production is `file`.

## Status

**Done** — commit on `feat/everyware-blog-platform`.

One conformance suite runs against both adapters. `claimIdempotencyKey` is asserted to issue a single `SET key 1 NX EX ttl`.
