# T-01-006 — `packages/ghost`: `HttpGhostClient` with pagination and retry

**Spec:** 01-foundation §5.1
**Depends on:** T-01-005
**Estimate:** ~2h

## What to build

The live adapter behind the same `GhostClient` interface. Two adapters over one interface is what
makes this a real seam, so `HttpGhostClient` must share the normalisation code from T-01-005
rather than reimplementing it.

1. `src/http-client.ts` — requests the Content API posts endpoint with
   `include=tags,authors&formats=html,plaintext&limit=all`, plus the tag and author endpoints.
2. Pagination: follow `meta.pagination` to exhaustion even when the server caps `limit=all`.
3. Retry 5xx and network errors 3 times with exponential backoff (250ms, 500ms, 1000ms).
   Never retry 4xx. A 404 on a single-post fetch returns `null`.
4. Validate every response with the T-01-005 schemas. A parse failure throws naming the offending
   post slug, or the endpoint when no slug is available.
5. `createGhostClient` selects `HttpGhostClient` when both env vars are present, otherwise
   `InMemoryGhostClient` with a `console.warn`. In a production build, missing credentials is a
   hard throw — a silently empty blog must never deploy.

## Acceptance criteria

- [x] With `fetch` mocked to return two pages of results, `listPosts()` returns the union of both
      and issues exactly two requests.
- [x] A 500, 500, 200 sequence resolves successfully after exactly 3 attempts.
- [x] A 400 response throws immediately, after exactly 1 attempt.
- [x] `getPostBySlug` returns `null` on 404 and throws on 500 after retries.
- [x] A malformed post in the response throws an error whose message contains that post's slug.
- [x] `HttpGhostClient` and `InMemoryGhostClient` return deep-equal domain objects for the same
      underlying payload — asserted by one shared conformance test run against both adapters.
- [x] With no env vars and `NODE_ENV` not `production`, `createGhostClient` returns the in-memory
      adapter and warns; with `NODE_ENV=production` it throws.
- [x] `npm run typecheck`, `lint`, `test` exit 0.

## Status

**Done** — commit on `feat/everyware-blog-platform`. 37 tests in this package,
73 across the workspace.

### Note

`createGhostClient` landed here rather than in T-01-005, since adapter selection
needs two adapters to select between. It lives in `src/create-client.ts`.
