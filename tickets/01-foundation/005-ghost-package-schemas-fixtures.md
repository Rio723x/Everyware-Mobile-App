# T-01-005 — `packages/ghost`: zod schemas, domain types, fixtures, `InMemoryGhostClient`

**Spec:** 01-foundation §5.1, D8
**Depends on:** T-01-004
**Estimate:** ~2h

## What to build

The `packages/ghost` workspace, its type layer, and the fixture adapter — everything except the
live HTTP client (T-01-006). Building the in-memory adapter first is deliberate: it is what lets
every later ticket be developed and tested with no Ghost credentials.

1. `src/schema.ts` — zod schemas for the Ghost Content API wire shapes (post, tag, author,
   pagination meta). Domain types are derived with `z.infer`; **no hand-written twin interfaces**.
2. Domain types per Spec 01 §5.1: `BlogPost`, `BlogTag`, `BlogAuthor`, `FeatureImage`, all
   `readonly`, using `Slug` / `IsoDateTime` from `seo-core`.
3. Normalisation, applied identically by both adapters:
   - `excerpt` = `custom_excerpt` ?? `excerpt`
   - `tags` and `listTags()` exclude internal tags (slug starting `hash-`)
   - `readingTimeMinutes` = ceil(words(plaintext) / 200), minimum 1
   - dates via `toIsoDateTime`
4. `src/index.ts` — the `GhostClient` interface (six methods, Spec 01 §5.1) and `createGhostClient`,
   which selects an adapter from config.
5. `src/fixtures/*.json` — a captured, anonymised Ghost response set: at least 5 posts across 3 tags
   and 2 authors, including one post with an internal `hash-` tag, one with no tag, and one with
   a null `feature_image`.
6. `src/memory-client.ts` — `InMemoryGhostClient` implementing all six methods over the fixtures,
   sorting newest-first.

## Acceptance criteria

- [x] All six `GhostClient` methods are implemented by `InMemoryGhostClient` and return domain types.
- [x] `listTags()` excludes `hash-` tags; a fixture post carrying one exposes it in neither
      `post.tags` nor `listTags()`.
- [x] `getPostBySlug("does-not-exist")` resolves to `null` — it does not throw.
- [x] `listPosts()` is sorted by `publishedAt` descending.
- [x] Excerpt falls back correctly: a fixture with `custom_excerpt` uses it; one without uses `excerpt`.
- [x] `readingTimeMinutes` is at least 1 for a 10-word fixture post.
- [x] A fixture mutated to drop a required field makes the schema parse throw an error naming that
      post's slug.
- [x] No `any` anywhere in the package; `npm run typecheck`, `lint`, `test` exit 0.

## Status

**Done** — commit on `feat/everyware-blog-platform`. 18 tests in this package,
54 across the workspace.

### Notes

- `createGhostClient` is **not** in this ticket after all: adapter selection needs
  the HTTP adapter to select between, so it lands with T-01-006. `InMemoryGhostClient`
  is constructed directly for now, which is all any consumer needs at this point.
- The domain `BlogPost` carries three fields spec 01 §5.1 did not list —
  `metaTitle`, `metaDescription`, `canonicalUrl` — because spec 02 §3.4 requires
  all three (editor overrides for title and description, and the republished-content
  canonical). Adding them now avoids reopening the schema in the next spec.
- `wordCount` is likewise carried, for the `BlogPosting` JSON-LD in T-02-007.
