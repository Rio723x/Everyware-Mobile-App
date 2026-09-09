# T-02-001 — Metadata type layer: `PageMetadataInput`, `PageMetadata`, module skeleton

**Spec:** 02-technical-seo §3.2, §3.3, §7
**Depends on:** T-01-004 (brands), T-01-005 (`BlogPost` domain types)
**Estimate:** ~1h

## What to build

The contract the rest of Spec 02 fills in. Types and stubs only — no algorithms yet.

1. `packages/seo-core/src/metadata/types.ts`:
   - `PageKind = "article" | "listing" | "category" | "author"`
   - `PageMetadataInput` — the discriminated union from §3.2, not a bag of optional fields
   - `OpenGraphMetadata`, `TwitterMetadata`, `JsonLdDocument`
   - `PageMetadata` per §3.3, all fields `readonly`
2. `packages/seo-core/src/metadata/build.ts` — `buildPageMetadata(input: PageMetadataInput): PageMetadata`,
   throwing `not implemented` for now, with an explicit exported return type.
3. Export the whole surface from `packages/seo-core/src/index.ts`.

## Acceptance criteria

- [x] `PageMetadataInput` is a discriminated union on `kind`; a `switch` over it with all four arms
      narrows exhaustively, proven by a `satisfies never` default arm that compiles.
- [x] Constructing a `PageMetadata` with a relative canonical is a **compile error** (the field is
      `AbsoluteUrl`) — proven by an expect-error type test.
- [x] `buildPageMetadata` has an explicitly annotated return type.
- [x] No `any` in the new files; `npm run typecheck` and `lint` exit 0.

## Status

**Done** — commit on `feat/everyware-blog-platform`.

39 metadata tests. The union is exhaustive: a `switch` over `kind` with all four arms compiles with no default.
