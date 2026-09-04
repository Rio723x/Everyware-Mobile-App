# Spec 01 — Foundation: Ghost CMS + Astro rendering layer + blog templates

**Covers:** Implementation Plan Phases 0–3
**Status:** Ready for implementation
**Audience:** An engineer with no other context. Everything needed is in this document.

---

## 1. Goal

Stand up a production blog at `everyware.in/blog` where:

- **Ghost** is the content source of truth (writing, drafts, scheduling, authors, tags, images).
- **Astro** renders every blog URL to complete, crawlable HTML at build time — the full article text is present in the first byte of the response, with no JavaScript required.
- The **existing React/Vite marketing app is not rewritten, not restructured internally, and keeps working exactly as it does today.**
- The blog is visually part of Everyware — same palette, typography, spacing, header and footer language.

This spec deliberately stops before SEO metadata generation (Spec 02) and the SEO worker (Spec 03). It produces the pages; the next spec makes their `<head>` correct.

---

## 2. Audit of the current repository (as-built facts)

Everything in this section was verified by reading the repository, not assumed. Decisions in §3 depend on it.

### 2.1 Application shape

| Fact | Evidence |
|---|---|
| React 18.3 + Vite 5.4 SPA, **plain JSX, no TypeScript anywhere** | `package.json`; every file under `src/` is `.jsx`/`.js`; no `tsconfig.json` |
| Single HTML entry at repo root, 1607 lines | `index.html` — mounts `<div id="root">` and `<script type="module" src="/src/main.jsx">` at lines 1604–1605 |
| **Routing is hash-based, hand-rolled. There is no router library.** | `src/App.jsx` holds `currentRoute` in `useState` and updates it from a `hashchange` listener. Routes are `#home`, `#experiences`, `#experiences/:id`, `#info` |
| **The SPA therefore occupies exactly one server URL: `/`.** All navigation happens in the URL fragment, which is never sent to the server. | Same as above; `src/components/Navbar.jsx` `navItems` are all `#…` anchors |
| No `react-router`, no path-based routes, no SSR | `package.json` dependencies: `@vercel/analytics`, `@vercel/speed-insights`, `framer-motion`, `lucide-react`, `react`, `react-dom` |
| 18 components, ~1,870 lines total, all presentational + local state | `src/components/*.jsx` |

### 2.2 Deployment

| Fact | Evidence |
|---|---|
| Vercel, **zero-config** (framework auto-detected as Vite) | `@vercel/analytics` + `@vercel/speed-insights` in deps; **no `vercel.json` exists**; no `.github/workflows` |
| Build output is `dist/` (Vite default) | `vite.config.js` does not override `build.outDir` |
| Git remote `origin` → `github.com/Rio723x/Everyware-Mobile-App`, default branch `main`, work happens on `ayushman/dev` | `git remote -v`, `git branch -a` |
| Production domain is `everyware.in` (**not** `.com`, which is what the plan doc writes) | Canonical tags, sitemap, robots.txt, JSON-LD all use `https://everyware.in` |

**Consequence:** any new build pipeline must either keep producing `dist/` or explicitly set Vercel's Output Directory. Adding a second framework changes auto-detection, so `vercel.json` becomes mandatory.

### 2.3 Reusable components, styles, header/footer

| Fact | Evidence |
|---|---|
| One global stylesheet, 2,804 lines. No CSS modules, no Tailwind, no CSS-in-JS | `src/styles/index.css`, imported once in `src/main.jsx` |
| Design tokens are CSS custom properties on `:root` | `src/styles/index.css:13–51` — `--canvas-base #F4F8FA`, `--canvas-deep #081B1E`, `--brand-cyan #00C4CC`, `--brand-sky #38BDF8`, `--accent-coral #FF6A4D`, `--text-dark`, `--text-muted`, `--radius-sm|md|lg|xl|pill`, `--shadow-sm|md|lg|glass`, `--ease-spring|smooth` |
| Typography is the Google font **Oxygen** (300/400/700), loaded by `<link>` in `index.html`, exposed as `--font-display` / `--font-body` | `index.html` fonts.googleapis.com link; CSS vars |
| Reusable utility classes already exist: `.container` (max-width 1240px, 24px gutter), `.heading-xl`, `.heading-lg`, `.text-lead`, button classes | `src/styles/index.css:92–170` |
| **Header (`Navbar.jsx`) is coupled to the home page and cannot be reused as-is.** It hardcodes `#`-anchors, mutates `window.location.hash` on click, and runs an `IntersectionObserver` scroll-spy over home-page section ids. On `/blog/x` those handlers would set a fragment on the blog URL instead of navigating home. | `src/components/Navbar.jsx:12–18, 31–70, 89–167` |
| **Footer (`EditorialFooter.jsx`) has the same problem** — its site links are bare `#home`, `#experiences`, `#info`, plus three dead `href="#"` social links. It also requires an `onOpenQrModal` prop whose modal state lives in `App.jsx`. | `src/components/EditorialFooter.jsx:60–87` |
| Components use framer-motion's `m` component, which **requires a `LazyMotion` ancestor** (provided once in `App.jsx`). Any reuse outside `App` must supply it or crash. | `src/App.jsx:64`, `src/components/Navbar.jsx:2` |
| `ExperienceDetailView.jsx` is a working article-shaped layout (breadcrumb, read-time pill, share button, related items) whose CSS classes are a good visual reference for the blog article template | `src/components/ExperienceDetailView.jsx`; `src/styles/index.css:1867+` |

### 2.4 Existing SEO metadata — and why it is the problem this project exists to fix

| Fact | Evidence |
|---|---|
| Static `<head>` in `index.html`: title, description, keywords, robots, canonical `https://everyware.in/`, hreflang, OG (with `og:image` 1200×630), Twitter `summary_large_image`, and a large `@graph` JSON-LD block (Organization, WebSite, 50 brands, 20 personas) | `index.html:1–1600` |
| **All per-route metadata is applied client-side after hydration.** `SEOMetaManager.jsx` runs in a `useEffect` and mutates `document.title`, existing `<meta>` nodes and `<link rel="canonical">`, and injects `<script id="dynamic-jsonld-schema">`. | `src/components/SEOMetaManager.jsx:6–136` |
| **Canonicals for sub-routes are fragment URLs** — `https://everyware.in/#info`, `https://everyware.in/#experiences/3`. Search engines discard the fragment, so all 22 "pages" collapse into the single URL `https://everyware.in/`. | `SEOMetaManager.jsx:20, 29, 65`; `public/sitemap.xml` |
| `public/sitemap.xml` is hand-maintained and lists 23 URLs, 22 of which are fragment URLs and therefore **invalid sitemap entries** | `public/sitemap.xml` |
| `public/robots.txt` is hand-maintained. It contains meaningless `Allow: /#info` / `Allow: /#experiences` directives (robots.txt matching ignores fragments) but **also contains deliberate, valuable allowances for AI crawlers** — `GPTBot`, `ChatGPT-User`, `PerplexityBot`, `ClaudeBot`, `Google-Extended`, `Bytespider`, `Amazonbot` — and a `Sitemap:` line. | `public/robots.txt` |

**Consequences that bind later specs:**

1. Client-side `<head>` mutation is exactly the failure mode Astro is being introduced to eliminate. The blog must never depend on it. `SEOMetaManager` stays where it is for the SPA and is never imported by Astro.
2. `public/sitemap.xml` and `public/robots.txt` must be **deleted** and replaced by generated equivalents, or two files will fight for the same URL. The AI-crawler allowances must be carried over verbatim into the generator.
3. The hash "pages" cannot go into the generated sitemap. Migrating them to real URLs is out of scope here but is unblocked by this spec's architecture (see D1, "Migration path").

### 2.5 Toolchain

Node v24.18.0, npm 11.16.0. `node_modules/` not installed at audit time. `.gitignore` already covers `node_modules/`, `dist/`, `.env*`.

---

## 3. Decisions

Each decision is binding for Specs 02 and 03. Alternatives are recorded so they are not re-litigated.

### D1 — The React/Astro routing boundary

> **Astro owns the deployed URL space. The React SPA is preserved byte-for-byte and served as a static asset at `/`.**
>
> The split is by **path prefix, resolved by the static file layout**: Astro owns `/blog`, `/blog/**`, `/sitemap.xml` and `/robots.txt`; the SPA's `index.html` and `assets/**` occupy `/` and everything else.
>
> **No router is introduced into React. No existing React route, component, or behaviour changes.**

**Why this, grounded in the audit:**

1. **There is nothing to divide.** The SPA occupies exactly one server URL (§2.1). Every in-app "route" is a URL fragment, which the server never sees. The boundary between the two apps is therefore not a routing negotiation at all — it is two disjoint sets of static files. That is an unusually clean situation and it should be exploited, not complicated.
2. **Nothing needs rewriting to make it work.** There is no path router whose ownership must be split, no SSR server to intercept, no route table to merge.
3. **Astro must own `/sitemap.xml` and `/robots.txt` regardless.** Those files are currently hand-maintained and, for the sitemap, invalid (§2.4). Generating them is a Spec 02 requirement and can only be met if a build step owns those paths — which forces Astro to sit at the origin rather than behind the SPA.
4. **One `package.json` is not possible.** The existing app pins `vite@^5.4.11` and `@vitejs/plugin-react@^4.3.3`; Astro 5 requires Vite 6+. Merging the dependency sets means upgrading the marketing site's build toolchain as a side effect of adding a blog — an unforced regression risk on a live production page. Separate workspaces resolve this cleanly (D2).

**Rejected — port the whole site to Astro, React as islands.** The home page depends on `ThreeHeroCanvas`, an `IntersectionObserver` scroll-spy over home section ids, framer-motion `LazyMotion`, and hash-router state held in `App.jsx` (§2.1, §2.3). Porting is a rewrite of the entire marketing site, delivers zero SEO benefit to `/blog`, and directly contradicts the plan's "Do not rewrite the application unnecessarily."

**Rejected — add React Router and render the blog inside the SPA.** Requires converting hash routing to path routing (touching `App.jsx`, `Navbar.jsx`, `EditorialFooter.jsx`, `SEOMetaManager.jsx` and both hand-written SEO files), then adding an SSR server to get crawlable HTML. That reproduces the client-side-metadata problem in §2.4 — the exact defect this project exists to remove.

**Rejected — two Vercel projects joined by a rewrite (multi-zone).** Adds a second project, cross-project deploy coordination for the Ghost webhook, an extra network hop on every blog request, and splits ownership of `/sitemap.xml` across two deployments. Its one benefit — independent deploy cadence — is worthless here, because a Ghost publish triggers one rebuild of one thing.

**Migration path this keeps open:** any SPA page can later become a real Astro route by adding `apps/blog/src/pages/<path>.astro`; it wins the path automatically because Astro's output is merged first (§6.3). That is how `#info` and `#experiences/:id` eventually become indexable URLs. Nothing here blocks it.

### D2 — Repository layout: npm workspaces

Forced by D1 point 4 (incompatible Vite majors) and by Spec 03 needing shared typed code in both the Astro build and the serverless worker.

```
Everyware-Mobile-App/            ← repo root, workspace root
├── apps/site/                   ← the existing React/Vite app, moved with `git mv`, otherwise untouched
├── apps/blog/                   ← new Astro app
├── packages/ghost/              ← typed Ghost Content API client (this spec)
├── packages/seo-core/           ← metadata + schema + sitemap + validation rules (Spec 02)
├── services/seo-worker/         ← analyzer / validator logic (Spec 03)
├── api/                         ← Vercel Functions, thin adapters over services/ (Spec 03)
├── scripts/                     ← build orchestration
├── specs/  tickets/
├── package.json                 ← workspace root; orchestration scripts only, no app deps
└── vercel.json
```

The move of the existing app is `git mv` only — **no file contents change** — so history is preserved and the diff stays reviewable. Import paths inside the app are all relative and keep working.

### D3 — TypeScript scope and conventions

All **new** code (`apps/blog`, `packages/*`, `services/*`, `api/*`, `scripts/*`) is TypeScript with `strict: true` **plus `noUncheckedIndexedAccess: true`**. `apps/site` stays plain JSX and is **not** migrated; it gets no `tsconfig.json`.

Conventions for new code (enforced — see §9):

- **No `any`.** Untrusted input (Ghost responses, webhook bodies, env vars) enters as `unknown` and is parsed with a `zod` schema at the edge. Domain types are derived with `z.infer` — the schema is the single source of truth, never a hand-written twin.
- **No non-null assertions (`!`) and no type assertions (`as`)**, except to apply a brand (below) or immediately after a runtime check whose invariant is stated in a comment.
- **Branded types for values whose validity is the point:** `Slug`, `AbsoluteUrl`, `IsoDateTime`. They are constructed only by validating factory functions in `packages/seo-core`. This makes "the canonical is an absolute https URL" a *compile-time* fact at every call site rather than a hope.
- **Prefer inference.** Do not annotate local variables or the return types of non-exported functions. **Do** annotate the return type of every exported function that forms part of a module's interface — that is the contract, and letting it drift by inference is how interfaces rot.
- **Discriminated unions** over boolean flags and optional-field soup; `as const` object maps over `enum`; `satisfies` for config objects so excess-property checking survives inference.

### D4 — Ghost hosting

**Ghost(Pro) Starter at `cms.everyware.in`, used strictly headless.** Zero ops, managed upgrades and backups, native webhooks and Content API — everything Spec 03 needs — versus a droplet somebody has to patch. Cost is the trade-off; it is the right one for a team with no platform engineer.

**Ghost's own public frontend must be de-indexed**, or it becomes a duplicate-content competitor to `everyware.in/blog`: enable *Settings → Advanced → Make this site private*, or serve `Disallow: /` from that host's robots.txt and set `X-Robots-Tag: noindex` on it. This is a required, verifiable step (§9).

### D5 — Astro rendering mode: fully static, **no adapter**

`output: 'static'`, no `@astrojs/vercel` adapter. Every blog URL is prerendered at build time; Vercel serves the merged `dist/` as plain static files.

- Fastest possible response, no cold starts, no server surface to secure.
- Content freshness comes from rebuilds, which the architecture already requires (Ghost webhook → build → deploy; Plan Phase 7 / Spec 03).
- **Skipping the adapter is deliberate:** with an adapter, Astro writes to `.vercel/output/` instead of `dist/`, which would fight the output-merging step in §6.3. Spec 03's webhook endpoints instead live in the repo-root `api/` directory as native Vercel Functions, which work alongside a static output directory.
- Upgrade path if publish→live latency ever becomes unacceptable: add the adapter and mark only `/blog/[slug]` as `prerender = false` with ISR. Not needed now.

### D6 — URL shape: no trailing slash, `.html` hidden by Vercel

Astro `trailingSlash: 'never'`, `build.format: 'file'`; `vercel.json` sets `"cleanUrls": true, "trailingSlash": false`. Canonical URLs are therefore `https://everyware.in/blog/my-post` with **no** trailing slash, and requesting that URL returns **200 with no redirect** — which Spec 02 asserts automatically.

| Route | Source file | Emitted file | Public URL |
|---|---|---|---|
| Blog index | `pages/blog/index.astro` | `dist/blog.html` | `/blog` |
| Article | `pages/blog/[slug].astro` | `dist/blog/<slug>.html` | `/blog/<slug>` |
| Category | `pages/blog/category/[slug].astro` | `dist/blog/category/<slug>.html` | `/blog/category/<slug>` |
| Author | `pages/blog/author/[slug].astro` | `dist/blog/author/<slug>.html` | `/blog/author/<slug>` |
| Pagination | `pages/blog/page/[page].astro` | `dist/blog/page/<n>.html` | `/blog/page/<n>` |

### D7 — Styling: shared token layer, Astro-native chrome

The blog does **not** import `apps/site/src/styles/index.css` (2,804 lines, overwhelmingly home-page-specific) and does **not** reuse `Navbar.jsx` / `EditorialFooter.jsx` — both are coupled to home-page hash navigation and would be broken on `/blog/*` (§2.3).

Instead:

1. Extract the `:root` custom-property block (`index.css:13–51`) verbatim into **`packages/tokens/tokens.css`**, and have both `apps/site` and `apps/blog` `@import` it so the two can never drift. One file, two consumers — that is the actual shared surface. It sits in a package rather than inside either app so that neither app reaches into the other, and so package resolution works identically under Vite and Astro with no dev-server filesystem allowances.
2. Build `BlogHeader.astro` / `BlogFooter.astro` reproducing the Everyware visual language from those tokens, with **real absolute links** (`/`, `/#experiences`, `/#info`, `/blog`) that work from any URL. They ship zero JavaScript, which is also the right answer for article-page CLS and Core Web Vitals.
3. React islands are used only where interactivity is genuinely required. For the templates in this spec that is **nowhere** — every blog page is static HTML. `@astrojs/react` is still installed and configured so future islands (and reuse of existing components under a `LazyMotion` wrapper) are one `client:visible` away.

### D8 — Ghost content model mapping

| Everyware concept | Ghost primitive | Rule |
|---|---|---|
| Article | Post | Only `status: published` (the Content API enforces this) |
| Category | Public tag | Ghost tags whose slug does **not** start with `hash-` (internal `#tags`) |
| Author | Author | Ghost author; the primary author drives the byline |
| Excerpt | `custom_excerpt` → fallback `excerpt` | Feeds the description in Spec 02 |
| Hero image | `feature_image` + `feature_image_alt` | Alt text is **required**; a post without it fails validation in Spec 02 |

Internal tags (`#`-prefixed, slug `hash-*`) are **never** rendered and never generate category pages — they are reserved for editorial workflow.

---

## 4. Scope

### In scope

- npm workspace restructure; existing app moved intact to `apps/site`.
- Ghost(Pro) provisioning: branding, users, tags, Content API key, webhook-capable configuration, and **at least 3 real published posts** with distinct authors and tags for the templates to be built against.
- Astro app with `@astrojs/react`, shared design tokens, `BlogHeader` / `BlogFooter`.
- `packages/ghost` — a typed, validated, deep Content API client.
- Five templates: listing (paginated), article, category, author, and a branded 404.
- Build orchestration producing a single merged `dist/`, plus `vercel.json`.
- Semantic, accessible, responsive HTML: one `<h1>` per page, `<article>`, `<time datetime>`, breadcrumb `<nav>`, alt text on every image.

### Out of scope (owned elsewhere)

- **Any `<head>` metadata, JSON-LD, canonical, OG/Twitter tags, `sitemap.xml`, `robots.txt`** → **Spec 02**. This spec's layout exposes a `<slot name="head">`; it does not fill it.
- **The SEO worker, AI analysis, Ghost webhooks, internal-link recommendations** → **Spec 03**.
- Search Console, Bing, IndexNow, analytics feedback loop → deferred (Plan Phases 9–11).
- Migrating `#experiences` / `#info` to real URLs. Unblocked, not done.
- Any change to the visual design, content, or behaviour of the existing marketing pages.
- Comments, search, newsletter/members, RSS.

---

## 5. Technical approach

### 5.1 `packages/ghost` — the Content API client (a deep module)

The interface is six methods. Behind them sit pagination, `include=` parameters, retry/backoff, internal-tag filtering, wire-format validation and normalisation into domain types. Callers — the Astro pages now, the SEO worker later — learn six functions and never see a Ghost wire object, a page cursor or a raw date string.

```ts
// packages/ghost/src/index.ts
export interface GhostClient {
  /** Every published post, newest first. Pagination is handled internally. */
  listPosts(): Promise<readonly BlogPost[]>;
  getPostBySlug(slug: Slug): Promise<BlogPost | null>;
  listPostsByTag(tagSlug: Slug): Promise<readonly BlogPost[]>;
  listPostsByAuthor(authorSlug: Slug): Promise<readonly BlogPost[]>;
  /** Public tags only — internal `#tags` are filtered out. */
  listTags(): Promise<readonly BlogTag[]>;
  listAuthors(): Promise<readonly BlogAuthor[]>;
}

export const createGhostClient: (config: GhostConfig) => GhostClient;
```

Domain types are `z.infer`red from schemas in `packages/ghost/src/schema.ts`:

```ts
export interface BlogPost {
  readonly id: string;
  readonly slug: Slug;
  readonly title: string;
  readonly html: string;            // Ghost-rendered article body
  readonly plaintext: string;       // reading time + Spec 03 analysis
  readonly excerpt: string;         // custom_excerpt ?? excerpt
  readonly featureImage: FeatureImage | null;  // { url, alt }
  readonly primaryAuthor: BlogAuthor;
  readonly authors: readonly BlogAuthor[];
  readonly tags: readonly BlogTag[];           // public tags only
  readonly publishedAt: IsoDateTime;
  readonly updatedAt: IsoDateTime;
  readonly readingTimeMinutes: number;
}
```

Rules the implementation must honour:

- Fetch with `?include=tags,authors&formats=html,plaintext&limit=all`.
- Validate every response with zod. A schema failure is a **build failure naming the offending post's slug** — never a silently dropped post, and never `any`.
- Two adapters exist at this seam, which is what makes it a real seam rather than a hypothetical one: the live `HttpGhostClient`, and an `InMemoryGhostClient` built from fixture JSON, used by tests and by `npm run dev` when `GHOST_CONTENT_API_KEY` is absent. **Local development must not require a Ghost instance.**
- Retry `5xx` and network errors 3× with exponential backoff; never retry `4xx`.

### 5.2 Astro configuration

```ts
// apps/blog/astro.config.ts
import { defineConfig } from "astro/config";
import react from "@astrojs/react";

export default defineConfig({
  site: "https://everyware.in",
  output: "static",
  trailingSlash: "never",
  build: { format: "file" },
  integrations: [react()],
});
```

`site` is what makes `Astro.site` available for absolute-URL construction in Spec 02; it is not optional.

### 5.3 Layout and templates

`BlogLayout.astro` provides `<html lang="en">`, the token stylesheet, header, `<slot />`, footer, and **`<slot name="head" />` — the empty seam Spec 02 fills.** It hardcodes no metadata.

**Article (`/blog/[slug]`)** — semantic order:

```
<BlogLayout>
  <nav aria-label="Breadcrumb">  Home › Blog › <category> › <title>
  <article>
    <header>
      <h1>{title}</h1>                       ← the only h1 on the page
      byline: author name → /blog/author/<slug>
      <time datetime={publishedAt}> · Updated <time datetime={updatedAt}> (only when newer)
      reading time
    </header>
    <img src={featureImage.url} alt={featureImage.alt} width height loading="eager" fetchpriority="high">
    <p class="article-summary">{excerpt}</p>
    <div class="article-body" set:html={post.html} />   ← Ghost HTML; h2/h3 only
    <footer> tag chips → /blog/category/<slug> </footer>
  </article>
  <aside aria-label="Related articles">  up to 3 — same-tag first, then most recent
  <CTA band → app download / services>
</BlogLayout>
```

- **Heading discipline:** the template owns the single `<h1>`, so Ghost body HTML must start at `<h2>`. This is an editorial rule *and* a build-time check — the build fails if `post.html` contains an `<h1>`. Enforcing it in code is what keeps it true.
- Images inside `post.html` get `loading="lazy"` and `decoding="async"` injected by a small HTML post-processor in `packages/seo-core`, shared with Spec 02's alt-text rule.
- `set:html` renders Ghost's own sanitised output. Ghost is the trusted authoring surface; no additional sanitiser is introduced.

**Listing (`/blog`, `/blog/page/[n]`)** — `<h1>Everyware Blog</h1>`, 12 posts per page as cards (feature image with alt, title as `<h2><a>`, excerpt, author, date, tag chips), `rel="prev"`/`rel="next"` pagination links. Page 1 lives at `/blog`; `/blog/page/1` is not generated.

**Category (`/blog/category/[slug]`)** — `getStaticPaths` from `listTags()`; `<h1>{tag.name}</h1>`, tag description when present, same card grid.

**Author (`/blog/author/[slug]`)** — `getStaticPaths` from `listAuthors()`; `<h1>{author.name}</h1>`, avatar with alt, bio, same card grid.

**404** — an unknown slug is never generated, so Vercel serves `404.html`. `apps/blog/src/pages/404.astro` provides a branded one linking back to `/blog` and `/`.

### 5.4 Responsiveness and accessibility

Single column ≤ 767px; cards 2-up ≥ 768px, 3-up ≥ 1100px; article body `max-width: 72ch`, centred. Reuse the `.container` semantics (1240px / 24px gutter) from the token layer. Every interactive element reachable by keyboard with a visible focus ring. The breadcrumb is a real `<nav aria-label="Breadcrumb">` wrapping an `<ol>`.

---

## 6. File and module structure

### 6.1 New and moved files

```
Everyware-Mobile-App/
├── package.json                       # workspaces: ["apps/*","packages/*","services/*"]; scripts only
├── tsconfig.base.json                 # strict + noUncheckedIndexedAccess; extended by every TS package
├── vercel.json                        # buildCommand, outputDirectory: "dist", cleanUrls, trailingSlash
├── .env.example
├── scripts/
│   └── merge-dist.mjs                 # merges app outputs into ./dist, fails on collision
│
├── apps/site/                         # ← `git mv` of the current app. Contents unchanged.
│   ├── index.html  package.json  vite.config.js  public/  src/
│   └── (src/styles/index.css gains one line: @import of tokens.css)
│
├── apps/blog/
│   ├── astro.config.ts
│   ├── package.json                   # astro, @astrojs/react, react, react-dom
│   ├── tsconfig.json
│   └── src/
│       ├── layouts/BlogLayout.astro           # <slot name="head"/> for Spec 02
│       ├── components/
│       │   ├── BlogHeader.astro   BlogFooter.astro
│       │   ├── PostCard.astro     PostGrid.astro
│       │   ├── Breadcrumbs.astro  Pagination.astro
│       │   ├── AuthorByline.astro TagChips.astro
│       │   └── RelatedPosts.astro DownloadCtaBand.astro
│       ├── pages/
│       │   ├── blog/index.astro
│       │   ├── blog/[slug].astro
│       │   ├── blog/page/[page].astro
│       │   ├── blog/category/[slug].astro
│       │   ├── blog/author/[slug].astro
│       │   └── 404.astro
│       ├── lib/content.ts             # the single Ghost client instance used by the build
│       └── styles/
│           ├── tokens.css             # extracted :root block — shared with apps/site
│           └── blog.css               # blog-only rules, built from tokens
│
└── packages/ghost/
    ├── package.json  tsconfig.json
    └── src/
        ├── index.ts        # GhostClient interface + createGhostClient
        ├── schema.ts       # zod schemas; domain types via z.infer
        ├── http-client.ts  # HttpGhostClient — pagination, retry, normalisation
        ├── memory-client.ts# InMemoryGhostClient — fixtures
        ├── fixtures/*.json
        └── *.test.ts
```

### 6.2 Environment variables

| Name | Where | Purpose |
|---|---|---|
| `GHOST_CONTENT_API_URL` | build (Vercel + `.env.local`) | e.g. `https://cms.everyware.in` |
| `GHOST_CONTENT_API_KEY` | build | Content API key (read-only; safe in a build, still never committed) |
| `PUBLIC_SITE_URL` | build | `https://everyware.in` — consumed by Spec 02 |

Absent Ghost vars in local dev ⇒ `InMemoryGhostClient` fixtures plus a console warning. Absent in a **production** build ⇒ hard failure; a silently empty blog must never deploy.

### 6.3 Build pipeline

Root `package.json`:

```json
{
  "scripts": {
    "build": "npm run build -w apps/site && npm run build -w apps/blog && node scripts/merge-dist.mjs",
    "dev:site": "npm run dev -w apps/site",
    "dev:blog": "npm run dev -w apps/blog",
    "typecheck": "tsc -b && npm run astro-check -w apps/blog",
    "test": "vitest run"
  }
}
```

`scripts/merge-dist.mjs`:

1. Empty `./dist`.
2. Copy `apps/blog/dist/**` → `dist/` **first** — Astro wins any contested path, which is what implements D1's migration path.
3. Copy `apps/site/dist/**` → `dist/`, **skipping** any path that already exists, and **exit non-zero listing every skipped path**. A collision means the two apps are fighting for a URL: that must be a loud build failure, never a silent overwrite.
4. Assert `dist/index.html`, `dist/blog.html` and at least one `dist/blog/*.html` exist.

`vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "cleanUrls": true,
  "trailingSlash": false
}
```

Vercel project settings: Framework Preset → **Other** (auto-detection now guesses wrong); Install Command → `npm install`.

**Local dev:** the two apps run separately — `npm run dev:site` (port 3000) and `npm run dev:blog` (port 4321). They are only merged at build time. `npm run build && npx serve dist` is the way to verify the joined site locally, and it is part of the DoD.

---

## 7. Ghost setup runbook (Plan Phase 1)

1. Create the Ghost(Pro) site; set the site URL to `https://cms.everyware.in` and point the DNS CNAME.
2. Publication settings: title `Everyware Blog`, description, icon + logo from `apps/site/public/Everywware.webp`, accent `#00C4CC`, timezone `Asia/Kolkata`.
3. Invite admin + editor users; create at least one author with name, bio and avatar.
4. Create the initial public tags (e.g. `appliance-maintenance`, `buying-guides`, `service-costs`, `smart-home`) with names **and descriptions** — the description renders on the category page.
5. **Integrations → Add custom integration "Everyware Web"** → copy the **Content API key** and API URL into Vercel env vars and `.env.local`. (The Admin API key from the same integration is used in Spec 03 — store it now, use it later.)
6. **De-index the Ghost frontend** per D4, then verify: `curl -I https://cms.everyware.in/` shows `X-Robots-Tag: noindex`, and `curl https://cms.everyware.in/robots.txt` contains `Disallow: /`.
7. Publish **3 real posts**, each with a feature image *with alt text*, a `custom_excerpt`, at least one public tag, an author, and body headings starting at H2.

---

## 8. Risks

| Risk | Mitigation |
|---|---|
| `git mv` to `apps/site` breaks the Vercel build (auto-detection, root dir) | `vercel.json` pins build command and output dir; deploy to a preview URL and verify `/` before merging |
| An editor leaves feature-image alt text empty | Build-time warning here; hard validation failure in Spec 02; documented in the editorial runbook |
| A Ghost post body contains an `<h1>` | Build fails with the slug named (§5.3) |
| `dist` merge collision as the site grows | Merge script exits non-zero and lists the paths |
| Ghost API outage at build time ⇒ empty blog deploys | Retry with backoff; a production build with zero posts is a hard failure |

---

## 9. Definition of done

Every line is objectively checkable. `[m]` = machine-verifiable in CI.

**Ghost**

- [ ] Ghost(Pro) reachable at `https://cms.everyware.in`; Content API key issued and stored in Vercel env.
- [ ] `curl -sI https://cms.everyware.in/ | grep -i x-robots-tag` shows `noindex`, **and** `curl -s https://cms.everyware.in/robots.txt` contains `Disallow: /`.
- [ ] ≥ 3 published posts, ≥ 2 distinct public tags, ≥ 1 author with bio + avatar; every post has a feature image **with non-empty alt text** and a `custom_excerpt`.

**Repo / toolchain**

- [ ] `npm install` at the root installs all workspaces. `[m]`
- [ ] `git log --follow apps/site/src/App.jsx` shows history preserved through the move. `[m]`
- [ ] `npm run typecheck` exits 0. No `any`, no `!` assertions, no `as` outside branded-type factories in new code — enforced by `@typescript-eslint/no-explicit-any`, `no-non-null-assertion` and `consistent-type-assertions` at **error** level. `[m]`
- [ ] `npm run test` exits 0. `[m]`

**Ghost client**

- [ ] All six `GhostClient` methods implemented, returning normalised domain types. `[m]`
- [ ] Unit tests cover: multi-page pagination exhausted; internal `hash-*` tags excluded from `listTags()` and from `post.tags`; a malformed response throws naming the offending slug; `5xx` retried 3× then throws; `404` from `getPostBySlug` returns `null` rather than throwing. `[m]`
- [ ] `npm run dev:blog` renders the blog from fixtures with no Ghost credentials present. `[m]`

**Rendering**

- [ ] `npm run build` produces `dist/index.html` (SPA), `dist/blog.html`, one `dist/blog/<slug>.html` per published post, plus one file per public tag and per author. Emitted article count === `listPosts()` count. `[m]`
- [ ] Every generated blog page contains **exactly one** `<h1>`. `[m]`
- [ ] Every generated blog page contains `<article>` or `<main>`, a `<nav aria-label="Breadcrumb">`, and `<time datetime="…">` parseable as ISO-8601. `[m]`
- [ ] Every `<img>` on every generated blog page has a non-empty `alt`. `[m]`
- [ ] Full article text is present in the raw HTML: `curl -s <article-url> | grep -F "<a sentence from the body>"` succeeds with JavaScript disabled. `[m]`
- [ ] Article body contains no `<h1>`, and heading levels never skip (h2 → h4 fails). `[m]`
- [ ] Every article links to at least one other internal Everyware URL (its category, author, or a related post) — no orphan pages. `[m]`
- [ ] Pagination: with > 12 posts, `/blog/page/2` exists and `/blog` carries `rel="next"`; `/blog/page/1` is **not** emitted. `[m]`
- [ ] `404.astro` is emitted as `dist/404.html`. `[m]`

**Integration with the existing app**

- [ ] `git diff` for the whole change shows **zero content changes** under `apps/site/src/` other than the single `@import` of `tokens.css`. `[m]`
- [ ] After `npm run build && npx serve dist`: `/` loads the SPA; `#experiences/3` and `#info` still work; `/blog` and `/blog/<slug>` load the blog; Vercel Analytics and Speed Insights still initialise on `/`.
- [ ] The `dist` merge reports zero collisions. `[m]`
- [ ] `/blog/<slug>` returns HTTP **200 with no redirect** on the preview deployment (no trailing-slash bounce). `[m]`
- [ ] Blog header/footer are visually consistent with the marketing site, and every link navigates correctly **from a `/blog/*` URL**.
- [ ] Blog pages ship no JavaScript bundle (no `<script>` beyond analytics). `[m]`

**Handoff to Spec 02**

- [ ] `BlogLayout.astro` exposes `<slot name="head" />` and emits **no** `<title>`, `<meta name="description">`, `<link rel="canonical">`, OG/Twitter tags or JSON-LD of its own. `[m]`
- [ ] `apps/site/public/sitemap.xml` and `apps/site/public/robots.txt` still exist and are untouched — Spec 02 deletes them as part of replacing them. Their current contents (especially the AI-crawler allowances) are quoted in Spec 02 §5.4.
