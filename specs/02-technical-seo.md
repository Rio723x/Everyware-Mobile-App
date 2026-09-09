# Spec 02 — Technical SEO: deterministic metadata, structured data, sitemap, robots

**Covers:** Implementation Plan Phase 4
**Depends on:** Spec 01 (workspace layout, `packages/ghost`, `BlogLayout.astro` with its `<slot name="head" />`, static Astro build merged into `dist/`)
**Status:** Ready for implementation
**Audience:** An engineer with no other context.

---

## 1. Goal

Every blog URL emits a complete, correct, machine-checkable `<head>` and structured-data payload **at build time, from code, with no AI and no human in the loop** — and the build proves it by parsing its own output.

Two hard rules follow from the audit in Spec 01 §2.4 and govern everything here:

1. **Deterministic, not generated.** Given the same Ghost post, the metadata is byte-identical every time. The same input never produces two different titles. (AI *suggestions* exist — that is Spec 03 — but they are advisory input a human accepts into Ghost, never a runtime source of truth.)
2. **Validated against rendered HTML, never against application state.** Every check in §6 parses the actual emitted `.html` file (or the actual HTTP response), the way a crawler sees it. A test that inspects a JavaScript object and concludes "the canonical is correct" would have passed on the current site too — and the current site's canonicals are broken. That class of test is banned here.

Every requirement in this spec is expressed as a rule with an id, a threshold, and a programmatic check. There are **no "should look good" acceptance criteria** anywhere in this document.

---

## 2. Scope

### In scope

- `packages/seo-core`: one deep module that builds all page metadata, all JSON-LD, the sitemap and robots.txt — and contains the rule engine that validates them.
- `SeoHead.astro`: the single component that renders metadata into the `<slot name="head" />` opened by Spec 01. No page ever writes a raw `<meta>` tag.
- `<title>`, `<meta name="description">`, `<link rel="canonical">`, robots directives, full OpenGraph set, full Twitter/X card set — on all five blog route kinds.
- `BlogPosting` + `BreadcrumbList` JSON-LD on articles; `WebSite` + `Organization` + `CollectionPage` on listing/category/author pages.
- Generated `/sitemap.xml` and `/robots.txt`, replacing the hand-maintained files.
- The audit harness: 32 rules, two adapters (built-`dist` and live-HTTP), a machine-readable `PageAudit` / `SiteAudit` result, a deterministic score, and a CI gate.

### Out of scope

- AI-suggested titles, descriptions, topics or links → **Spec 03** (advisory only).
- Ghost webhooks, the worker service, the deploy trigger → **Spec 03**.
- Search Console / Bing / IndexNow submission and verification → **deferred, Plan Phases 9–11.**
- Metadata for the React SPA at `/` (`index.html` keeps its existing hand-written head). This spec only *stops the SPA's stale sitemap/robots from conflicting*; it does not restructure the SPA's own SEO. Migrating `#info` / `#experiences` to real URLs remains a later phase.
- Image generation (OG image composition). Ghost feature images and existing static assets are used as they are.

---

## 3. The metadata model

### 3.1 Branded primitives

Defined in `packages/seo-core/src/brand.ts`, constructed only through validating factories. This is what turns "the canonical must be an absolute https URL" from a comment into a compile-time guarantee at every call site.

```ts
declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

export type Slug = Brand<string, "Slug">;              // /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export type AbsoluteUrl = Brand<string, "AbsoluteUrl">;// https://, no fragment, no trailing slash (except the root "/")
export type IsoDateTime = Brand<string, "IsoDateTime">;// full ISO-8601 with offset

export const toSlug: (value: string) => Slug;                 // throws with the offending value
export const toAbsoluteUrl: (value: string) => AbsoluteUrl;   // throws
export const toIsoDateTime: (value: Date | string) => IsoDateTime;
export const siteUrl: (path: string) => AbsoluteUrl;          // joins PUBLIC_SITE_URL + path, normalises slashes
```

### 3.2 Page kinds

Metadata differs by route, so the input is a discriminated union — not a bag of optional fields.

```ts
export type PageMetadataInput =
  | { kind: "article";  post: BlogPost }
  | { kind: "listing";  page: number; totalPages: number }
  | { kind: "category"; tag: BlogTag; page: number; totalPages: number }
  | { kind: "author";   author: BlogAuthor; page: number; totalPages: number };
```

### 3.3 The output

```ts
export interface PageMetadata {
  readonly title: string;
  readonly description: string;
  readonly canonical: AbsoluteUrl;
  readonly robots: string;                       // e.g. "index, follow, max-image-preview:large, max-snippet:-1"
  readonly openGraph: OpenGraphMetadata;
  readonly twitter: TwitterMetadata;
  readonly jsonLd: readonly JsonLdDocument[];    // already validated
  readonly prev: AbsoluteUrl | null;
  readonly next: AbsoluteUrl | null;
}

export const buildPageMetadata: (input: PageMetadataInput) => PageMetadata;
```

**This is the whole interface for metadata.** One function, four input shapes. Behind it sit the title algorithm, the description fallback chain, canonical construction, OG/Twitter derivation, JSON-LD assembly and image-URL transformation. An Astro page learns one function and cannot construct an inconsistent head, because the only other thing it can do is pass the result to `SeoHead`.

### 3.4 Deterministic derivation rules

These are the algorithms. They are pure, total, and unit-tested against fixed inputs.

**Title** (`≤ 60` characters is the target; the algorithm never truncates mid-word and never exceeds 70):

1. If Ghost `meta_title` is set and non-empty → use it verbatim. The editor's explicit choice always wins.
2. Else for an article: `post.title` if `post.title.length > 45`, otherwise `` `${post.title} | Everyware Blog` ``.
3. Listing page 1 → `Everyware Blog — Appliance Care, Repair Costs & Buying Guides`; page *n* > 1 → `Everyware Blog — Page ${n}`.
4. Category page 1 → `` `${tag.name} | Everyware Blog` ``; page *n* > 1 → `` `${tag.name} — Page ${n} | Everyware Blog` ``.
5. Author page 1 → `` `Articles by ${author.name} | Everyware Blog` ``; page *n* > 1 adds `— Page ${n}`.
6. If the result still exceeds 70 characters, truncate at the last word boundary before 69 and append `…`.

**Description** (target `70–160`; the algorithm never emits < 50 or > 170):

1. Ghost `meta_description` if set and non-empty.
2. Else `custom_excerpt`.
3. Else `excerpt`.
4. Else the first 155 characters of `plaintext`, cut at the last word boundary, `…` appended.
5. Whitespace collapsed, newlines removed, trimmed. If the result is shorter than 50 characters the **build fails** naming the slug — a 20-character description is a content defect, not something to paper over.

**Canonical** — always `siteUrl(path)` where `path` is the route's own path from Spec 01 D6, with no trailing slash, no query and no fragment. Paginated pages are self-canonical (page 2 canonicalises to page 2, **not** to page 1) and carry `rel="prev"` / `rel="next"`. A Ghost `canonical_url` set on the post overrides it — that field exists precisely for republished content, and honouring it is required.

**Robots** — `index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1` on every blog page. There is no path that emits `noindex`; §6 asserts its absence.

**Social image** — `post.featureImage.url` for articles; `siteUrl("/PhoneOnly.png")` (the existing 1200×630 asset referenced by `index.html`) as the site-wide fallback. Ghost-hosted images are rewritten through Ghost's resize path to `.../content/images/size/w1200/...` so the delivered image meets the 1200px minimum deterministically. `og:image:alt` is `featureImage.alt` for articles and a fixed site string otherwise; it is never empty.

---

## 4. Structured data

Generated by code from validated Ghost data. Nothing here is model-written, and nothing describes content that is not visible on the page.

### 4.1 `BlogPosting` — every article

```jsonc
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "@id": "https://everyware.in/blog/<slug>#article",
  "mainEntityOfPage": { "@type": "WebPage", "@id": "https://everyware.in/blog/<slug>" },
  "headline": "<= 110 chars, from post.title",
  "description": "<the same string as meta description>",
  "image": ["https://.../size/w1200/..."],
  "datePublished": "<ISO-8601 with offset>",
  "dateModified": "<ISO-8601 with offset>",
  "wordCount": 1234,
  "keywords": ["<public tag names>"],
  "articleSection": "<primary tag name>",
  "inLanguage": "en-IN",
  "author":    { "@type": "Person", "name": "...", "url": "https://everyware.in/blog/author/<slug>" },
  "publisher": { "@id": "https://everyware.in/#org" },
  "isPartOf":  { "@id": "https://everyware.in/#website" }
}
```

`@id` values for publisher and website deliberately reference the `Organization` / `WebSite` nodes that already exist in the SPA's `index.html` `@graph`, so the entity graph stays consistent across the site rather than declaring a second, competing Organization.

`headline` is capped at 110 characters (Google's documented limit) by word-boundary truncation.

### 4.2 `BreadcrumbList` — every blog page

Positions are contiguous from 1, and the last item is always the current page.

| Route | Trail |
|---|---|
| `/blog` | Home → Blog |
| `/blog/<slug>` | Home → Blog → *primary category* → *post title* |
| `/blog/category/<slug>` | Home → Blog → *category name* |
| `/blog/author/<slug>` | Home → Blog → *author name* |

An article with no public tag omits the category level rather than inventing one; positions renumber so they stay contiguous.

### 4.3 Listing, category and author pages

`CollectionPage` with `isPartOf` → the `WebSite` node, plus the `BreadcrumbList`. **No `ItemList` of posts** — it adds crawl surface with no benefit and is one more thing to keep in sync with the visible page.

### 4.4 Schema types deliberately not emitted

`FAQPage` is **not** generated in this spec. It requires visible Q&A markup on the page, and inventing it from an AI suggestion is exactly the "AI freely invents schema JSON" failure the plan warns against (§12). It becomes available only once Ghost posts carry a real, rendered FAQ block, which is a later phase.

---

## 5. Sitemap and robots.txt

### 5.1 `/sitemap.xml`

Generated by `apps/blog/src/pages/sitemap.xml.ts` (an Astro endpoint, prerendered to `dist/sitemap.xml`).

Contents — exactly the canonical URL of every indexable page, and nothing else:

| Entry | `lastmod` | `changefreq` | `priority` |
|---|---|---|---|
| `https://everyware.in/` | build date | `weekly` | `1.0` |
| `https://everyware.in/blog` | newest post's `updatedAt` | `daily` | `0.9` |
| `https://everyware.in/blog/page/<n>` | newest post on that page | `weekly` | `0.5` |
| `https://everyware.in/blog/<slug>` | post `updatedAt` | `monthly` | `0.8` |
| `https://everyware.in/blog/category/<slug>` | newest post in tag | `weekly` | `0.6` |
| `https://everyware.in/blog/author/<slug>` | newest post by author | `weekly` | `0.5` |

**Explicitly excluded**, and asserted absent by rule S05: every `#`-fragment URL from the old hand-written sitemap. `https://everyware.in/#info` and the 20 `#experiences/N` URLs are not distinct URLs to any crawler; listing them was inflating the sitemap with 22 duplicates of the home page. They return when those views become real routes, not before.

### 5.2 `/robots.txt`

Generated by `apps/blog/src/pages/robots.txt.ts`. It **preserves the deliberate AI-crawler allowances found in the current file** (Spec 01 §2.4) and drops the meaningless fragment `Allow:` lines:

```
User-agent: *
Allow: /

User-agent: GPTBot
Allow: /
User-agent: ChatGPT-User
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: Google-Extended
Allow: /
User-agent: Bytespider
Allow: /
User-agent: Amazonbot
Allow: /

Sitemap: https://everyware.in/sitemap.xml
```

The list of preserved user-agents lives in one exported constant, and rule S10 asserts every one of them is still present — so a future edit cannot silently drop AI-search access.

### 5.3 Retiring the old files

`apps/site/public/sitemap.xml` and `apps/site/public/robots.txt` are **deleted** in the same commit that adds the generators. Leaving them causes a `dist` merge collision, which the merge script (Spec 01 §6.3) turns into a hard build failure — so the two cannot coexist even by accident. That collision is the safety net; the deletion is the fix.

---

## 6. The rule engine

### 6.1 Shape

```ts
export type RuleSeverity = "error" | "warning";
export type RuleStatus = "pass" | "fail" | "not-applicable";

export interface RuleResult {
  readonly id: RuleId;              // a string-literal union, not `string`
  readonly severity: RuleSeverity;
  readonly status: RuleStatus;
  readonly message: string;         // states the observed value on failure
}

export interface PageAudit {
  readonly url: AbsoluteUrl;
  readonly kind: PageKind;
  readonly results: readonly RuleResult[];
  readonly score: number;           // 0–100, deterministic (§6.5)
}

export interface SiteAudit {
  readonly pages: readonly PageAudit[];
  readonly siteResults: readonly RuleResult[];
  readonly score: number;
}
```

Each rule is a pure function `(doc: Document, ctx: PageContext) => RuleResult`. `Document` comes from **`linkedom`** — a real DOM over the emitted HTML string, so a rule is written once and runs unchanged over a built file or a fetched response.

### 6.2 Two adapters over one rule set

```ts
export interface PageSource {
  listPages(): Promise<readonly { url: AbsoluteUrl; html: string }[]>;
  readAsset(path: string): Promise<string | null>;   // sitemap.xml, robots.txt
}
```

- `DistPageSource(distDir)` — walks `dist/**/*.html`, deriving each page's public URL from its path via the D6 mapping. Used by the CI gate.
- `HttpPageSource(baseUrl, urls)` — fetches live URLs, and additionally records status code and redirect chain. Used by Spec 03's post-deploy validator.

Two real adapters, one rule set. This seam is why Spec 03 does not reimplement a single check.

### 6.3 Page rules

Applies to every emitted blog page unless noted. Severity `E` = error (fails the build), `W` = warning (reported, does not fail).

| id | sev | Check |
|---|---|---|
| `title-present` | E | Exactly one `<title>`, trimmed length > 0 |
| `title-length` | E | 10 ≤ length ≤ 70 |
| `title-optimal` | W | 15 ≤ length ≤ 60 |
| `title-unique` | E | No other emitted page has the same title (site-wide cross-check) |
| `description-present` | E | Exactly one `<meta name="description">`, trimmed length > 0 |
| `description-length` | E | 50 ≤ length ≤ 170 |
| `description-optimal` | W | 70 ≤ length ≤ 160 |
| `description-unique` | E | No other emitted page has the same description |
| `canonical-present` | E | Exactly one `<link rel="canonical">` |
| `canonical-absolute` | E | Parses as an absolute `https://` URL with no fragment and no query |
| `canonical-self` | E | Equals the page's own public URL, character for character |
| `canonical-no-trailing-slash` | E | Does not end in `/` (except the root) |
| `robots-not-noindex` | E | No `noindex` in `<meta name="robots">` or in an `X-Robots-Tag` (HTTP adapter only) |
| `robots-directives` | W | Contains `max-image-preview:large` and `max-snippet:-1` |
| `html-lang` | E | `<html lang="en">` present |
| `charset-viewport` | E | `<meta charset>` and `<meta name="viewport">` both present |
| `h1-single` | E | Exactly one `<h1>` |
| `h1-non-empty` | E | The `<h1>` has non-whitespace text |
| `heading-order` | E | Heading levels never skip a level in document order |
| `img-alt` | E | Every `<img>` has an `alt` attribute; non-empty unless `role="presentation"` |
| `og-required` | E | `og:type`, `og:title`, `og:description`, `og:url`, `og:image`, `og:site_name`, `og:locale` all present and non-empty |
| `og-image-dimensions` | E | `og:image:width` ≥ 1200 and `og:image:height` ≥ 630 declared |
| `og-image-absolute` | E | `og:image` is an absolute `https://` URL |
| `og-image-alt` | E | `og:image:alt` present and non-empty |
| `og-url-canonical` | E | `og:url` === canonical |
| `og-article-fields` | E | *(articles only)* `og:type` === `article`, plus `article:published_time`, `article:modified_time`, `article:author` |
| `twitter-required` | E | `twitter:card` === `summary_large_image`, plus `twitter:title`, `twitter:description`, `twitter:image`, `twitter:image:alt` |
| `jsonld-parses` | E | Every `<script type="application/ld+json">` body is valid JSON |
| `jsonld-blogposting` | E | *(articles only)* Exactly one `BlogPosting`, valid against the zod schema; `datePublished`/`dateModified` parse as ISO-8601; `image` and `author.url` absolute |
| `jsonld-breadcrumb` | E | Exactly one `BreadcrumbList`; positions contiguous from 1; the last item's URL === canonical; every item URL absolute |
| `jsonld-matches-page` | E | `BlogPosting.headline` matches the visible `<h1>` text, and `.description` matches the meta description — schema cannot describe content the page does not show |
| `internal-links-present` | E | ≥ 1 in-site link (`/` or `https://everyware.in/…`) in `<body>` |
| `internal-links-resolve` | E | Every in-site link target exists in the emitted output (or, on the HTTP adapter, returns 200) — catches broken links and typo'd slugs |
| `pagination-rel` | E | *(paginated pages)* `rel="prev"` / `rel="next"` present and correct at the boundaries |

### 6.4 Site rules

| id | sev | Check |
|---|---|---|
| `sitemap-exists` | E | `dist/sitemap.xml` exists (HTTP adapter: `/sitemap.xml` returns 200 with an XML content type) |
| `sitemap-wellformed` | E | Parses as XML; root is `<urlset>` in the `sitemaps.org/schemas/sitemap/0.9` namespace |
| `sitemap-locs-valid` | E | Every `<loc>` is an absolute `https://everyware.in` URL, unique, with no fragment and no query |
| `sitemap-no-fragments` | E | No `<loc>` contains `#` |
| `sitemap-lastmod-valid` | E | Every `<lastmod>` is a valid W3C datetime |
| `sitemap-complete` | E | **The set of `<loc>` values equals the set of canonicals of all indexable emitted pages — in both directions.** Catches missing entries *and* orphan entries in one assertion |
| `robots-exists` | E | `dist/robots.txt` exists |
| `robots-sitemap-line` | E | Contains exactly `Sitemap: https://everyware.in/sitemap.xml` |
| `robots-no-blanket-disallow` | E | The `User-agent: *` group does not `Disallow: /` |
| `robots-ai-agents-preserved` | E | All seven preserved user-agents (§5.2) are present with `Allow: /` |
| `canonical-uniqueness` | E | No two emitted pages declare the same canonical |
| `no-noindex-anywhere` | E | No blog page carries `noindex` |

### 6.5 Score

Deterministic, from the results alone — no judgement, no model:

```
weight(error) = 3, weight(warning) = 1
score = round(100 * Σ weight(passed) / Σ weight(applicable))
```

`not-applicable` rules are excluded from both sums. The same HTML always yields the same score. Spec 03 reports this number; it does not recompute it differently.

### 6.6 CI gate

`npm run seo:audit -- --dist dist --format json` writes `seo-audit.json` and **exits non-zero if any `error` rule fails**. It runs in `npm run build`'s postbuild step, so a metadata regression cannot reach production. `--format text` prints a human-readable table for local use. `--base-url https://…` swaps in the HTTP adapter.

---

## 7. File and module structure

```
packages/seo-core/
├── package.json  tsconfig.json
└── src/
    ├── index.ts                 # public interface: buildPageMetadata, auditSite, buildSitemapXml, buildRobotsTxt, brands
    ├── brand.ts                 # Slug / AbsoluteUrl / IsoDateTime + factories
    ├── config.ts                # SITE_URL, ORG_ID, WEBSITE_ID, LOCALE, AI_USER_AGENTS, POSTS_PER_PAGE
    ├── metadata/
    │   ├── build.ts             # buildPageMetadata — the single entry point
    │   ├── title.ts             # §3.4 title algorithm
    │   ├── description.ts       # §3.4 description fallback chain
    │   ├── images.ts            # Ghost resize-path rewriting, fallback image
    │   └── types.ts
    ├── schema-org/
    │   ├── blog-posting.ts  breadcrumb.ts  collection-page.ts
    │   └── validate.ts          # zod schemas; every builder validates its own output before returning
    ├── sitemap.ts               # buildSitemapXml(entries): string
    ├── robots.ts                # buildRobotsTxt(config): string
    ├── html.ts                  # lazy-load/decoding injection into Ghost body HTML (shared with Spec 01 §5.3)
    ├── audit/
    │   ├── rules/               # one file per rule group; each rule a pure (doc, ctx) => RuleResult
    │   ├── registry.ts          # RuleId union + the rule table
    │   ├── audit.ts             # auditPage, auditSite, scoring
    │   ├── dist-source.ts       # DistPageSource
    │   ├── http-source.ts       # HttpPageSource  (Spec 03 reuses this)
    │   └── cli.ts               # `seo:audit`
    └── **/*.test.ts

apps/blog/src/
├── components/SeoHead.astro     # renders a PageMetadata into <slot name="head">. The ONLY place meta tags are written.
├── pages/sitemap.xml.ts
└── pages/robots.txt.ts
```

`SeoHead.astro` takes exactly one prop — `metadata: PageMetadata` — and every page passes the result of `buildPageMetadata(...)`. There is no other way to put a tag in the head, which is what makes the rule set enforceable rather than aspirational.

---

## 8. Testing strategy

Three layers, all automated:

1. **Unit (pure functions).** Fixed inputs → exact expected strings for the title algorithm at every branch (including the 45- and 70-character boundaries), the description fallback chain at all five steps, canonical construction, image-URL rewriting, sitemap XML, robots.txt, and each JSON-LD builder. Snapshot tests are acceptable here **only** for the full JSON-LD documents; every threshold gets an explicit assertion, not a snapshot.
2. **Rule tests.** Each of the 32 rules gets a passing HTML fixture and at least one failing fixture, asserting both the status and that the failure message names the observed value.
3. **Build integration.** `npm run build` on the fixture-backed Ghost client, then `auditSite(DistPageSource("dist"))` over the real output. **Zero error-severity failures across every emitted page is the gate.** This is the test that would have caught the current site's fragment canonicals, and it is the one that matters.

---

## 9. Definition of done

`[m]` = machine-verifiable; every item here is.

**Metadata**

- [ ] `buildPageMetadata` handles all four `kind`s; calling it twice with the same input returns deep-equal output. `[m]`
- [ ] Title algorithm: unit tests cover `meta_title` override, the > 45-char branch, the ≤ 45-char suffix branch, listing/category/author variants, and the 70-char truncation. `[m]`
- [ ] Description chain: unit tests cover all five steps in order, whitespace collapsing, and the build failure when the result is < 50 characters. `[m]`
- [ ] `SeoHead.astro` is the only file in `apps/blog/src` containing the strings `<meta` or `application/ld+json` — grep-asserted in CI. `[m]`

**Emitted HTML**

- [ ] Every emitted blog page passes all `error` rules in §6.3. `[m]`
- [ ] `canonical-self` passes on every page — including `/blog/page/2`, which self-canonicalises rather than pointing at `/blog`. `[m]`
- [ ] Article pages carry `og:type=article`, `article:published_time`, `article:modified_time`, `article:author`. `[m]`
- [ ] `jsonld-matches-page` passes: schema `headline` === the visible `<h1>`, schema `description` === the meta description. `[m]`
- [ ] Every emitted `BlogPosting` and `BreadcrumbList` validates against its zod schema, with contiguous breadcrumb positions ending at the current page. `[m]`
- [ ] Zero `noindex` across the blog. `[m]`
- [ ] `internal-links-resolve` passes: no blog page links to a URL the build did not emit. `[m]`

**Sitemap / robots**

- [ ] `dist/sitemap.xml` exists, is well-formed, and `sitemap-complete` passes in **both** directions. `[m]`
- [ ] `sitemap-no-fragments` passes — no `#` URL survives from the old file. `[m]`
- [ ] `dist/robots.txt` contains the `Sitemap:` line and all seven preserved AI user-agents. `[m]`
- [ ] `apps/site/public/sitemap.xml` and `apps/site/public/robots.txt` are deleted from the repo, and the `dist` merge reports zero collisions. `[m]`

**Harness**

- [ ] `npm run seo:audit -- --dist dist` exits 0 on a clean build and non-zero when any error rule fails — proven by a test that mutates one emitted file (e.g. strips the canonical) and asserts the non-zero exit. `[m]`
- [ ] The same rule set runs against a live URL via `--base-url`, producing the same `PageAudit` shape. `[m]`
- [ ] `seo-audit.json` is written on every build and is valid against its own zod schema. `[m]`
- [ ] Every one of the 32 rules has at least one passing and one failing fixture test. `[m]`
- [ ] `npm run typecheck` and `npm run test` exit 0; no `any` in `packages/seo-core`. `[m]`

**Handoff to Spec 03**

- [ ] `HttpPageSource` and `auditSite` are exported from `packages/seo-core` and usable from a Node serverless function with no Astro dependency — asserted by a test that imports them in a bare Node context. `[m]`
