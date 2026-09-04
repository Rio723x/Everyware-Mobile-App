# Spec 03 — SEO automation: AI analyzer, deterministic validator, Ghost webhooks, internal links

**Covers:** Implementation Plan Phases 5–8
**Depends on:** Spec 01 (workspaces, `packages/ghost`, static Astro build) and Spec 02 (`packages/seo-core` — `auditSite`, `HttpPageSource`, the 32-rule engine, the scoring function)
**Status:** Ready for implementation
**Audience:** An engineer with no other context.

---

## 1. Goal

Publishing an article in Ghost triggers, with no engineering involvement:

1. a **deploy** of the site containing that article;
2. an **AI analysis** of the article that produces *suggestions* — SEO title, meta description, primary topic, search intent, content gaps, internal links;
3. a **deterministic validation** of the **live, deployed HTML** against the Spec 02 rule set;
4. a stored, machine-readable **SEO report** an editor can act on.

The division of authority is absolute and structural, not a matter of discipline:

> **AI recommends. Code decides. Humans approve.**

The analyzer's output is data in a store. It never writes to Ghost, never writes to the repository, never influences a rendered page, and is never read by the Astro build. If the analyzer returned garbage, or returned nothing at all, every deployed page would be byte-identical. **That property is the design**, and §9 asserts it.

---

## 2. Scope

### In scope

- `services/seo-worker` — the analyzer, the validator runner, the link-recommendation engine, the store, and the deploy trigger. All logic, no HTTP.
- `api/` — three thin Vercel Functions that adapt HTTP to that logic.
- Ghost webhook wiring for `post.published`, `post.published.edited`, `post.unpublished`, `post.deleted`, with signature verification and idempotency.
- The AI analyzer: Gemini (free tier), structured JSON output, zod-validated, **advisory only**.
- The deterministic validator: fetches the deployed URL and runs the Spec 02 rules over the response body.
- Internal-link recommendations: deterministic candidate generation + AI ranking, surfaced to an editor.
- The SEO report: per-article scores, errors, warnings and suggestions, readable via CLI and a token-protected endpoint.

### Explicitly out of scope — deferred to a later phase

**Plan Phases 9, 10 and 11 are not built here, and nothing in this spec depends on them:**

- **Phase 9 — Search engine integration.** No Google Search Console API integration, no Bing Webmaster Tools, no IndexNow submission, no property verification. `/sitemap.xml` is *generated* (Spec 02); *submitting* it and monitoring index coverage are deferred.
- **Phase 10 — SEO analytics.** No Search Console data ingestion, no impressions/clicks/CTR/position tracking, no dashboard, no per-article performance monitoring.
- **Phase 11 — Automated content optimization.** No performance-driven recommendations (high-impressions-low-CTR, ranking decay, content decay), and no feedback loop from search data back into article updates.

*Why deferred:* every one of those requires weeks of real production search data before it produces a signal worth acting on, and Phase 10/11 depend on Phase 9 credentials that do not exist until the site has been indexed. Building them now would produce untestable code with no data. The seam they will attach to is the `SeoStore` (§5.5) — a future `SearchPerformance` record joins the existing `SeoReport` by article id, requiring no change to anything specified here.

Also out of scope: automatic insertion of links into article bodies (the plan's "later" step — recommendations only, always human-approved); AI-authored content; auto-publishing; scheduled re-analysis of the back catalogue.

---

## 3. Architecture

```
Ghost (cms.everyware.in)
  │  post.published / .published.edited / .unpublished / .deleted
  ▼
POST /api/webhooks/ghost          ← verify HMAC signature, check idempotency key, ACK in < 3s
  │
  ├─► trigger deploy (Vercel Deploy Hook, debounced)  ─────────────► Astro build ─► live site
  │
  └─► enqueue analysis job ──► POST /api/seo/process (internal, token-auth)
                                 │
                                 ├─ 1. fetch canonical post from Ghost (packages/ghost)
                                 ├─ 2. AI analyzer      → SeoAnalysis      (advisory)
                                 ├─ 3. link recommender → LinkSuggestion[] (advisory)
                                 ├─ 4. wait for deploy, then validate live HTML
                                 │       via seo-core HttpPageSource + auditSite   (authoritative)
                                 └─ 5. write SeoReport to SeoStore
                                          │
                                          ▼
                            GET /api/seo/report?slug=…   (token-auth)
                            npm run seo:report -- --slug …
```

**Why the webhook does not do the work inline:** Ghost expects a fast response and retries on timeout. Analysis takes tens of seconds, and validation must wait for a deploy that takes minutes. The webhook therefore does three cheap things — verify, deduplicate, dispatch — and returns `202`. The processing function does everything slow.

**Why infinite webhook loops are impossible here, structurally:** the worker never writes to Ghost. There is no Admin API write path in this spec, so no worker action can generate a `post.edited` event. This is a stronger guarantee than loop detection, and it is the reason suggestions are delivered as a report rather than written back into Ghost fields.

---

## 4. Ghost webhook wiring

### 4.1 Configuration (in Ghost admin)

Under the "Everyware Web" custom integration from Spec 01 §7, add four webhooks, all pointing at `https://everyware.in/api/webhooks/ghost`, each with the shared secret `GHOST_WEBHOOK_SECRET`:

| Event | Effect |
|---|---|
| `post.published` | deploy + analyze |
| `post.published.edited` | deploy + analyze |
| `post.unpublished` | deploy only (the URL must stop existing) |
| `post.deleted` | deploy only, and mark the report archived |

### 4.2 Security

- **Signature verification is mandatory.** Ghost signs the request with the configured secret; the handler recomputes an HMAC-SHA256 over the **raw** request body (before JSON parsing — Vercel Functions must read the raw body for this) and compares in constant time. A request that fails verification gets `401` and is not processed.
- The signature header carries a timestamp; requests with more than **5 minutes** of clock skew are rejected as replays.
- *Implementation note:* the exact header name and encoding (`X-Ghost-Signature: sha256=<hmac>, t=<ms>`) must be confirmed against the running Ghost version's docs during implementation, and the verifier's unit tests must be built from a **real captured request**, not from an assumed format. A verifier that "passes" against a fixture you invented proves nothing.
- `/api/seo/process` and `/api/seo/report` require `Authorization: Bearer $SEO_WORKER_TOKEN`. They are not public.

### 4.3 Idempotency

Key: `` `${post.id}:${post.updated_at}` ``. Before processing, the worker does a set-if-absent on that key in the store with a 24-hour TTL. If it already exists, the handler returns `200 {"status":"duplicate"}` and stops. Ghost retries and double-fires are therefore free.

### 4.4 Deploy trigger and debounce

`VERCEL_DEPLOY_HOOK_URL` is POSTed to. A debounce key in the store suppresses repeat triggers within **60 seconds**, so an editor publishing five posts in a row causes one build, not five. The debounce record stores the timestamp of the last fire; it is not a queue.

---

## 5. Components

### 5.1 The AI analyzer

**Interface — one function:**

```ts
export interface SeoAnalyzer {
  analyze(post: BlogPost, context: SiteContext): Promise<SeoAnalysis>;
}
export const createGeminiAnalyzer: (config: AnalyzerConfig) => SeoAnalyzer;
```

**Output — validated, never trusted raw:**

```ts
export const seoAnalysisSchema = z.object({
  primaryTopic: z.string().min(3).max(80),
  searchIntent: z.enum(["informational", "commercial", "transactional", "navigational"]),
  secondaryTopics: z.array(z.string().min(3).max(80)).max(8),
  entities: z.array(z.string()).max(15),
  suggestedTitle: z.string().min(15).max(60),
  suggestedDescription: z.string().min(70).max(160),
  suggestedSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(70),
  summary: z.string().min(40).max(400),
  likelyQuestions: z.array(z.string()).max(8),
  contentGaps: z.array(z.string()).max(8),
  faqOpportunities: z.array(z.object({ question: z.string(), why: z.string() })).max(6),
});
export type SeoAnalysis = z.infer<typeof seoAnalysisSchema>;
```

Note that the length bounds mirror Spec 02's *optimal* thresholds. A suggestion the deterministic validator would flag is not a useful suggestion, so the schema refuses it at the boundary.

**Model call — Gemini, free tier:**

- SDK **`@google/genai`**; client `new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })`.
- Model **`gemini-2.5-flash`**. This is a bounded extraction task over one article, not a reasoning marathon, and Flash is the tier the free quota is generous on.
- Call shape: `ai.models.generateContent({ model, contents, config })`.
- **Structured output** via `config.responseMimeType: "application/json"` plus `config.responseJsonSchema`, derived from `seoAnalysisSchema` with `z.toJSONSchema()`. The model is constrained to the schema at generation time; the response is then parsed with the zod schema anyway, because a schema the provider enforces and a schema this codebase trusts must be verified to be the same schema, not assumed to be.
- `config.thinkingConfig: { thinkingBudget: 0 }` — thinking is off. Extraction from supplied text needs none, and it is the largest avoidable draw on a free quota.
- `config.systemInstruction` carries the stable brand and grounding rules; the article goes in `contents`.
- On a schema-validation failure: retry once with the validation error appended; on a second failure, record `analysis: null` with the error in the report and continue. **A failed analysis must never fail the pipeline** — validation and deployment are independent of it.
- Free-tier rate limits are per-minute and per-day. A `429` is retried once after a short backoff, then degrades to `analysis: null`. The pipeline treats exhausted quota as an ordinary Tuesday, not an incident.

*Why Gemini and not Claude:* the free tier. Nothing else in this spec depends on the provider — the analyzer sits behind the one-method `SeoAnalyzer` interface, so swapping it is one adapter. That is what the interface is for.

**Prompt shape** (`systemInstruction`, stable across every call): the Everyware brand and audience, the India appliance-repair domain, the rule that suggestions must be grounded in the supplied article text only, and an explicit instruction never to invent facts, statistics or schema. `contents` carries the title, excerpt, tag names and `plaintext` body. The article's own `plaintext` is passed **untruncated**; if a post ever exceeds the context window, that is reported as an error, not silently cut.

### 5.2 The deterministic validator

Thin by design — it is a runner, because the rules already exist in `packages/seo-core` (Spec 02 §6). Reimplementing a single check here would be the bug.

```ts
export interface Validator {
  validateArticle(slug: Slug): Promise<PageAudit>;
  validateSite(): Promise<SiteAudit>;
}
```

- Uses `HttpPageSource` against `PUBLIC_SITE_URL` — the **live deployed HTML**, fetched over HTTP, parsed with `linkedom`. It never inspects the Astro build's internals, never reads component props, never touches React state. What the crawler receives is what is graded.
- Additionally records, per URL: HTTP status, the full redirect chain, `X-Robots-Tag`, and TTFB. A `301` on the canonical URL is an error (Spec 02 D6 promised 200-no-redirect).
- **Deploy awareness:** before validating, poll the article URL until it returns 200 *and* its `dateModified` in the emitted `BlogPosting` matches the post's `updated_at` — up to 10 minutes, 15-second interval. Timing out records `validation: "deploy-timeout"` rather than grading a stale page. Grading the previous deploy's HTML would produce confidently wrong results, which is worse than none.
- Site-level rules (sitemap completeness, canonical uniqueness, orphan detection) run on `post.published` and `post.deleted`, since those are the events that change the URL set.

### 5.3 Internal-link recommendations

Deterministic first, AI second. The deterministic half is fully unit-testable and does the real work; the model only ranks and explains.

**Content index** — built from `listPosts()` on every run and cached in the store:

```ts
interface IndexedArticle {
  readonly id: string;
  readonly slug: Slug;
  readonly url: AbsoluteUrl;
  readonly title: string;
  readonly tagSlugs: readonly Slug[];
  readonly terms: ReadonlyMap<string, number>;  // TF-IDF vector over title + excerpt + plaintext
}
```

**Candidate scoring** (pure, deterministic, no model):

```
score = 0.5 * cosine(tfidf(source), tfidf(candidate))
      + 0.3 * jaccard(tags(source), tags(candidate))
      + 0.2 * recencyBoost(candidate.publishedAt)     // 1.0 at 0 days → 0.0 at 365 days, linear
```

Excludes the source article itself and anything already linked from its body. Top 10 candidates go forward.

*Why TF-IDF and not embeddings:* it needs no vector database, no embedding API, no extra infrastructure decision, and it is deterministic — the same corpus always yields the same ranking, which means it can be unit-tested against a fixed fixture corpus. Embeddings are a drop-in replacement behind the same `LinkRecommender` interface if relevance proves insufficient; nothing else changes.

**AI ranking pass:** the top 10 candidates (title + excerpt + URL) plus the source article go to Gemini, which returns at most 5 `LinkSuggestion`s:

```ts
interface LinkSuggestion {
  readonly targetUrl: AbsoluteUrl;      // must be one of the supplied candidates — enforced, not requested
  readonly anchorText: string;          // must appear verbatim in the source article's plaintext — enforced
  readonly reason: string;
  readonly confidence: number;          // 0–1
}
```

Both constraints are **validated in code after the response**. A suggestion whose `targetUrl` is not in the candidate set, or whose `anchorText` does not literally occur in the article, is dropped and counted in `report.droppedSuggestions`. The model cannot invent a URL, and it cannot propose an anchor the editor would have to write from scratch.

Suggestions are also produced in the **reverse** direction — existing articles that should link *to* the new one — because a new post starts with zero inbound internal links and that is the gap worth closing.

### 5.4 The report

```ts
export interface SeoReport {
  readonly postId: string;
  readonly slug: Slug;
  readonly url: AbsoluteUrl;
  readonly generatedAt: IsoDateTime;
  readonly ghostUpdatedAt: IsoDateTime;
  readonly technical: PageAudit;                       // from seo-core — authoritative
  readonly technicalScore: number;                     // == technical.score; never recomputed differently
  readonly analysis: SeoAnalysis | null;               // advisory; null when the analyzer failed
  readonly analysisError: string | null;
  readonly outboundLinkSuggestions: readonly LinkSuggestion[];
  readonly inboundLinkSuggestions: readonly LinkSuggestion[];
  readonly droppedSuggestions: number;
  readonly diffs: readonly MetadataDiff[];             // where AI suggestion ≠ what is live
}
```

`MetadataDiff` is the useful part for an editor: *"live title is 71 chars (over the limit); suggested: '…'"*. It is a comparison, never an action.

**Delivery:** `GET /api/seo/report?slug=…` (token-auth, JSON) and `npm run seo:report -- --slug …` (formatted table, exits non-zero when the technical audit has errors, so it is CI-usable). Notification channels (Slack, email) are out of scope.

### 5.5 The store

```ts
export interface SeoStore {
  claimIdempotencyKey(key: string, ttlSeconds: number): Promise<boolean>;  // false = already claimed
  saveReport(report: SeoReport): Promise<void>;
  getReport(slug: Slug): Promise<SeoReport | null>;
  listReports(): Promise<readonly SeoReportSummary[]>;
  saveContentIndex(index: readonly IndexedArticle[]): Promise<void>;
  getContentIndex(): Promise<readonly IndexedArticle[] | null>;
  getDebounce(key: string): Promise<IsoDateTime | null>;
  setDebounce(key: string, at: IsoDateTime): Promise<void>;
}
```

Two adapters — a real seam, not a hypothetical one:

- **`FileSeoStore`** — JSON under `.seo-store/`, gitignored. Used by every test and by local development. No credentials, no network.
- **`UpstashRedisStore`** — Upstash Redis via the Vercel Marketplace integration. Chosen because the access pattern is pure key/value with TTLs (idempotency keys, debounce timestamps, report blobs, one index blob); it is serverless-native with an HTTP client that works from a Vercel Function with no connection pooling; and the free tier covers this volume comfortably. A relational database would be strictly more operational surface for no gain.

This is the seam Phase 10's search-performance records will attach to later.

---

## 6. File and module structure

```
services/seo-worker/
├── package.json  tsconfig.json
└── src/
    ├── index.ts                  # processPost(postId) — the single entry point the API calls
    ├── analyzer/
    │   ├── analyzer.ts           # SeoAnalyzer interface + createGeminiAnalyzer
    │   ├── schema.ts             # seoAnalysisSchema
    │   ├── prompt.ts             # cached system prompt + site context
    │   └── stub-analyzer.ts      # deterministic fixture analyzer for tests / no-API-key dev
    ├── validator/
    │   ├── validator.ts          # wraps seo-core auditSite/HttpPageSource
    │   └── deploy-wait.ts        # poll until the deployed page reflects ghostUpdatedAt
    ├── links/
    │   ├── index-builder.ts      # TF-IDF content index
    │   ├── candidates.ts         # deterministic scoring (§5.3)
    │   ├── ranker.ts             # AI pass + hard post-validation of every suggestion
    │   └── tokenize.ts
    ├── store/
    │   ├── store.ts              # SeoStore interface
    │   ├── file-store.ts   redis-store.ts
    ├── deploy/trigger.ts         # deploy hook + debounce
    ├── report/
    │   ├── build-report.ts   diff.ts   cli.ts
    └── **/*.test.ts

api/
├── webhooks/ghost.ts             # verify → dedupe → trigger deploy → dispatch → 202
├── seo/process.ts                # token-auth → services/seo-worker processPost
└── seo/report.ts                 # token-auth → store.getReport
```

Each file in `api/` is a **thin adapter**: parse, authenticate, delegate, serialise. Business logic in an `api/` file is a review-blocking defect — it would be untestable without an HTTP server, and it would put the worker's logic out of reach of the CLI.

### Environment variables

| Name | Used by | Purpose |
|---|---|---|
| `GHOST_CONTENT_API_URL` / `GHOST_CONTENT_API_KEY` | worker + build | Spec 01 |
| `GHOST_WEBHOOK_SECRET` | `api/webhooks/ghost` | HMAC verification |
| `GEMINI_API_KEY` | analyzer, ranker | Google AI Studio key (free tier) |
| `SEO_WORKER_TOKEN` | `api/seo/*` | bearer auth for internal endpoints |
| `VERCEL_DEPLOY_HOOK_URL` | deploy trigger | rebuild |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | prod store | Redis |
| `SEO_STORE_DRIVER` | worker | `file` \| `redis` (default `file` outside production) |
| `PUBLIC_SITE_URL` | validator | `https://everyware.in` |

A missing `GEMINI_API_KEY` selects `StubAnalyzer` and disables the AI ranking pass — **the validator and the deploy trigger keep working**. Missing Ghost or site variables are a hard failure.

---

## 7. Cost and rate limits

Two Gemini calls per publish (analysis + link ranking), on the free tier. At even 40 posts a month that is 80 calls — far inside the free allowance. The binding constraint is therefore the free tier's **requests-per-minute and requests-per-day** limits, not money, so the guardrails target burst rate rather than spend:

- `MAX_ANALYSES_PER_HOUR = 20`, enforced with a store counter. Exceeding it skips analysis, records the reason in the report, and **still validates and deploys**.
- A `429` is retried once after a short backoff, then degrades to `analysis: null`. Exhausted free quota degrades the advisory layer and touches nothing else.
- Back-catalogue re-analysis is not automatic; it is a deliberate CLI invocation, and it is the one operation that can plausibly hit a daily cap — so it processes serially with a delay between articles and resumes from where it stopped.
- Log `usageMetadata` token counts per call so consumption against the quota is observable.

---

## 8. Testing strategy

- **Analyzer:** run against recorded fixture responses; assert schema validation, that a malformed response triggers exactly one retry then degrades to `null`, and that the request carries `responseMimeType: "application/json"` with the JSON Schema derived from `seoAnalysisSchema`. The stub analyzer covers every other test so the suite needs no API key.
- **Webhook:** signature verification against a **real captured Ghost request**; assert `401` on a bad signature, on a stale timestamp, and on a missing header; assert the duplicate key path returns `200 duplicate` without dispatching.
- **Link recommender:** a fixed 12-article fixture corpus with hand-computed expected rankings; assert determinism across runs; assert that a suggestion with an off-corpus URL or a non-occurring anchor is dropped and counted.
- **Validator:** a local static server serving deliberately broken HTML (missing canonical, `noindex`, two `<h1>`s, a 301) and asserting the exact rule ids that fail.
- **End-to-end:** fixture Ghost → build → serve `dist` → run `processPost` against `FileSeoStore` → assert a complete `SeoReport` with `technicalScore === 100`.
- **The independence test** (§9): assert that a deployed page's bytes are identical whether the analyzer succeeds, fails, or is disabled.

---

## 9. Definition of done

`[m]` = machine-verifiable.

**Webhook**

- [ ] All four Ghost webhooks configured and firing at `/api/webhooks/ghost`.
- [ ] Valid signature → `202`; invalid signature, stale timestamp, or missing header → `401` and no processing. `[m]`
- [ ] Replaying the same `post.id:updated_at` returns `200 {"status":"duplicate"}` and dispatches nothing. `[m]`
- [ ] The handler responds in < 3 s (all slow work is dispatched). `[m]`
- [ ] Five publishes within 60 s trigger exactly one deploy. `[m]`

**Analyzer (advisory)**

- [ ] `analyze()` returns a `SeoAnalysis` valid against `seoAnalysisSchema` for every fixture post. `[m]`
- [ ] Uses `@google/genai` with `gemini-2.5-flash`, `responseMimeType: "application/json"`, a `responseJsonSchema` derived from `seoAnalysisSchema`, and `thinkingConfig.thinkingBudget: 0`. `[m]`
- [ ] Malformed model output → one retry → `analysis: null` + `analysisError` set, **and the pipeline still completes**. `[m]`
- [ ] **The independence test passes:** with the analyzer forced to throw, `npm run build` output is byte-identical to a successful run. `[m]`
- [ ] `services/seo-worker` is imported by nothing under `apps/blog` — grep-asserted, so AI output structurally cannot reach a rendered page. `[m]`
- [ ] No code path calls the Ghost **Admin** API. `[m]`

**Validator (authoritative)**

- [ ] `validateArticle(slug)` returns a `PageAudit` produced by `packages/seo-core` against the **fetched live HTML**. `[m]`
- [ ] `services/seo-worker` re-implements zero Spec 02 rules — the rule registry is imported, not copied. `[m]`
- [ ] Records status code, redirect chain and `X-Robots-Tag`; a `301` on a canonical URL is an error result. `[m]`
- [ ] Deploy-wait polls until `dateModified` matches `ghostUpdatedAt`, and records `deploy-timeout` rather than grading stale HTML after 10 minutes. `[m]`
- [ ] Broken-HTML fixtures produce exactly the expected failing rule ids. `[m]`

**Internal links**

- [ ] Candidate scoring is deterministic: the same corpus produces identical rankings across 10 runs. `[m]`
- [ ] Every returned suggestion's `targetUrl` is in the candidate set and its `anchorText` occurs verbatim in the source article; violations are dropped and counted. `[m]`
- [ ] Both outbound and inbound suggestions are produced for a new article. `[m]`
- [ ] No code path modifies article HTML or writes to Ghost. `[m]`

**Report / store**

- [ ] `SeoReport` validates against its zod schema and is retrievable by slug from both store adapters. `[m]`
- [ ] `GET /api/seo/report?slug=…` returns `401` without a bearer token, `200` with one, `404` for an unknown slug. `[m]`
- [ ] `npm run seo:report -- --slug …` prints the report and exits non-zero when the technical audit has errors. `[m]`
- [ ] `report.technicalScore === report.technical.score` — one scoring function, no second implementation. `[m]`
- [ ] The full suite runs with no `GEMINI_API_KEY`, no Redis credentials and no Ghost instance. `[m]`

**Cross-cutting**

- [ ] `npm run typecheck` and `npm run test` exit 0; no `any` in `services/seo-worker` or `api/`. `[m]`
- [ ] Every `api/` handler is under 60 lines and contains no business logic. `[m]`
- [ ] Secrets are read from env only — no key, token or secret appears in the repo (secret-scan asserted). `[m]`
- [ ] An end-to-end publish of a real Ghost post produces a deployed article, a report with `technicalScore` ≥ 95, and at least one internal-link suggestion.

**Deferred-scope guard**

- [ ] The repository contains no Search Console, Bing, IndexNow or analytics-ingestion code, and no such env vars. Phases 9–11 are documented as deferred in this spec and are not started. `[m]`
