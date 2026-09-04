# T-02-006 — OpenGraph and Twitter card builders

**Spec:** 02-technical-seo §3.3, §6.3 (og-*, twitter-*)
**Depends on:** T-02-002, T-02-003, T-02-004, T-02-005
**Estimate:** ~1h

## What to build

`packages/seo-core/src/metadata/social.ts`:

1. `buildOpenGraph(input, title, description, canonical, image): OpenGraphMetadata` producing
   `og:type`, `og:title`, `og:description`, `og:url`, `og:image`, `og:image:width`,
   `og:image:height`, `og:image:alt`, `og:site_name` (`EveryWare`), `og:locale` (`en_IN`).
2. Article pages additionally get `og:type: "article"` plus `article:published_time`,
   `article:modified_time` and `article:author`. All other kinds get `og:type: "website"`.
3. `og:url` is always exactly the canonical — never recomputed by a second code path.
4. `buildTwitter(...)` producing `twitter:card: "summary_large_image"`, `twitter:title`,
   `twitter:description`, `twitter:image`, `twitter:image:alt`, and `twitter:site` /
   `twitter:creator` (`@geteveryware`, matching `apps/site/index.html`).

## Acceptance criteria

- [ ] Every required OG property is present and non-empty for all four page kinds.
- [ ] `og:url` is reference-equal to the canonical passed in, asserted directly.
- [ ] Article inputs produce `og:type: "article"` and all three `article:*` timestamps in ISO-8601;
      non-article inputs produce `og:type: "website"` and **no** `article:*` properties.
- [ ] Twitter title and description equal the page title and description exactly.
- [ ] `twitter:card` is always `summary_large_image`.
- [ ] Deterministic across repeated calls.

## Status

Not started
