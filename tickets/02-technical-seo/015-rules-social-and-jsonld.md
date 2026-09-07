# T-02-015 — Rules: OpenGraph, Twitter, and JSON-LD

**Spec:** 02-technical-seo §6.3
**Depends on:** T-02-013
**Estimate:** ~2h

## What to build

`packages/seo-core/src/audit/rules/social.ts`:
`og-required`, `og-image-dimensions`, `og-image-absolute`, `og-image-alt`, `og-url-canonical`,
`og-article-fields` (articles only, `not-applicable` elsewhere), `twitter-required`.

`packages/seo-core/src/audit/rules/jsonld.ts`:
`jsonld-parses`, `jsonld-blogposting` (articles only), `jsonld-breadcrumb`, `jsonld-matches-page`.

`jsonld-matches-page` is the important one: `BlogPosting.headline` must match the visible `<h1>`
text and `.description` must match the meta description. Schema that describes content the page does
not show is the failure mode this rule exists to catch, and it is the reason the whole rule set
parses rendered HTML rather than trusting the builders.

## Acceptance criteria

- [x] Each of the 11 rules has a passing and a failing fixture.
- [x] `og-required` names **which** property is missing in its message.
- [x] `og-url-canonical` fails when `og:url` and the canonical differ by a trailing slash alone.
- [x] `og-article-fields` returns `not-applicable` (not `pass`) on a listing page.
- [x] `jsonld-parses` fails on a script containing trailing-comma JSON, and the message names the
      script index.
- [x] `jsonld-blogposting` fails a document with a non-ISO `datePublished` and one with a relative
      `image` URL.
- [x] `jsonld-breadcrumb` fails positions `1,2,4`, and fails when the last item URL is not the canonical.
- [x] `jsonld-matches-page` fails when the headline differs from the `<h1>` by more than whitespace
      normalisation.

## Status

**Done** — commit on `feat/everyware-blog-platform`.

`jsonld-matches-page` allows a headline truncated at Google's documented 110-character cap, since the visible h1 stays whole — a truncated headline must still be a prefix of what the page shows.
