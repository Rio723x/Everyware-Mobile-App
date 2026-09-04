# T-02-004 — Canonical URLs, robots directives, pagination rel links

**Spec:** 02-technical-seo §3.4 (Canonical, Robots)
**Depends on:** T-02-001
**Estimate:** ~1h

## What to build

`packages/seo-core/src/metadata/canonical.ts`:

1. `buildCanonical(input: PageMetadataInput): AbsoluteUrl` — the route's own path per Spec 01 D6,
   with no trailing slash, no query and no fragment.
2. **Paginated pages are self-canonical.** Page 2 canonicalises to page 2, never back to page 1.
3. A post's Ghost `canonical_url`, when set, overrides everything. That field exists for
   republished content and honouring it is required.
4. `buildPrevNext(input)` returning `{ prev, next }` as `AbsoluteUrl | null`, with page 1's `prev`
   always null and page 1's own href being `/blog`, never `/blog/page/1`.
5. `ROBOTS_DIRECTIVE` — the single constant
   `index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1`, applied to every
   blog page. There is no code path that emits `noindex`.

## Acceptance criteria

- [ ] Canonicals for all five route kinds match the Spec 01 D6 table exactly, character for character.
- [ ] No produced canonical ends in `/`, contains `#`, or contains `?`.
- [ ] `/blog/page/2` canonicalises to itself, asserted explicitly.
- [ ] A post with `canonical_url` set returns that value instead of the computed one.
- [ ] `buildPrevNext` returns null `prev` on page 1, null `next` on the last page, and `/blog`
      (not `/blog/page/1`) as page 2's `prev`.
- [ ] The string `noindex` appears nowhere in `packages/seo-core/src` — grep-asserted.

## Status

Not started
