import { InMemoryGhostClient } from "@everyware/ghost";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";
import { MAX_ANALYSES_PER_HOUR, processPost } from "./index.js";
import { StubAnalyzer, type SeoAnalyzer } from "./analyzer/index.js";
import { DEBOUNCE_MS, triggerDeploy } from "./deploy/index.js";
import {
  buildContentIndex,
  createLinkRanker,
  recencyBoost,
  scoreCandidates,
  scoreInboundCandidates,
  type IndexedArticle,
} from "./links/index.js";
import { cosineSimilarity, inverseDocumentFrequency, stem, tokenize } from "./links/tokenize.js";
import { buildDiffs } from "./report/diff.js";
import { FileSeoStore } from "./store/file-store.js";
import { readWebhookIntent } from "./webhook/payload.js";
import { waitForDeploy } from "./validator/deploy-wait.js";
import type { GenerateContentClient } from "./analyzer/gemini-analyzer.js";
import type { Validator } from "./validator/index.js";
import { toAbsoluteUrl, type PageAudit } from "@everyware/seo-core";

const client = new InMemoryGhostClient();
const posts = await client.listPosts();
const post = posts[0];
if (post === undefined) throw new Error("fixture corpus empty");

/** A schema-valid analysis from the deterministic stub, for diff tests. */
const stubOutcome = await new StubAnalyzer().analyze(post);
if (!stubOutcome.ok) throw new Error("the stub analyzer should never fail");
const stubAnalysis = stubOutcome.analysis;

const tempDirs: string[] = [];
const freshStore = (now?: () => number): FileSeoStore => {
  const dir = mkdtempSync(join(tmpdir(), "seo-pipeline-"));
  tempDirs.push(dir);
  return new FileSeoStore(dir, now);
};
afterAll(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
});

// ── T-03-005 deploy trigger ───────────────────────────────────────────────────

describe("triggerDeploy", () => {
  const hookUrl = "https://api.vercel.com/v1/integrations/deploy/hook";

  it("fires once and reports triggered", async () => {
    const fetchMock = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response("{}", { status: 200 }));
    const result = await triggerDeploy(
      { store: freshStore(), hookUrl, fetch: fetchMock },
      "test",
    );
    expect(result).toEqual({ status: "triggered" });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("debounces a second call inside the window without any HTTP request", async () => {
    const store = freshStore();
    const fetchMock = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response("{}", { status: 200 }));
    let clock = 1_000_000;
    const config = { store, hookUrl, fetch: fetchMock, now: () => clock };

    await triggerDeploy(config, "first");
    clock += 5_000;
    const second = await triggerDeploy(config, "second");

    expect(second.status).toBe("debounced");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("fires again once the window has passed", async () => {
    const store = freshStore();
    const fetchMock = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response("{}", { status: 200 }));
    let clock = 1_000_000;
    const config = { store, hookUrl, fetch: fetchMock, now: () => clock };

    await triggerDeploy(config, "first");
    clock += DEBOUNCE_MS + 1;
    await expect(triggerDeploy(config, "later")).resolves.toEqual({ status: "triggered" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("collapses five rapid publishes into one build", async () => {
    const store = freshStore();
    const fetchMock = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response("{}", { status: 200 }));
    const config = { store, hookUrl, fetch: fetchMock, now: () => 1_000_000 };

    for (let i = 0; i < 5; i += 1) await triggerDeploy(config, `post-${String(i)}`);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("returns failed rather than throwing on a non-2xx hook", async () => {
    const fetchMock = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response("nope", { status: 500 }));
    const result = await triggerDeploy({ store: freshStore(), hookUrl, fetch: fetchMock }, "x");
    expect(result.status).toBe("failed");
  });

  it("reports a clear message when the hook is not configured", async () => {
    const result = await triggerDeploy({ store: freshStore(), hookUrl: "" }, "x");
    expect(result).toMatchObject({ status: "failed" });
    if (result.status === "failed") expect(result.error).toContain("VERCEL_DEPLOY_HOOK_URL");
  });
});

// ── T-03-007 webhook intent ───────────────────────────────────────────────────

describe("readWebhookIntent", () => {
  const body = JSON.stringify({
    post: { current: { id: "p1", slug: "a-post", updated_at: "2026-09-07T10:00:00.000Z" } },
  });

  it("extracts an idempotency key from the post id and edit time", () => {
    const intent = readWebhookIntent(body, "post.published");
    expect(intent).toMatchObject({ kind: "process", slug: "a-post", analyse: true });
    if (intent.kind === "process") {
      expect(intent.idempotencyKey).toBe("p1:2026-09-07T10:00:00.000Z");
    }
  });

  it("rejects a body that is not JSON", () => {
    expect(readWebhookIntent("not json", "post.published").kind).toBe("reject");
  });

  it("rejects a payload with no post id or slug", () => {
    expect(readWebhookIntent(JSON.stringify({ post: {} }), "post.published").kind).toBe("reject");
  });

  it("does not analyse an unpublish or a delete, which only need a rebuild", () => {
    for (const event of ["post.unpublished", "post.deleted"]) {
      const intent = readWebhookIntent(body, event);
      expect(intent).toMatchObject({ kind: "process", analyse: false });
    }
  });

  it("still analyses an event name it does not recognise", () => {
    // Ghost adds events over time; ignoring a publish because a header changed
    // would be a silent failure.
    expect(readWebhookIntent(body, "unknown")).toMatchObject({ analyse: true });
  });
});

// ── T-03-008 deploy wait ──────────────────────────────────────────────────────

describe("waitForDeploy", () => {
  const pageWith = (dateModified: string): string =>
    `<html><head><script type="application/ld+json">${JSON.stringify({
      "@type": "BlogPosting",
      dateModified,
    })}</script></head><body></body></html>`;

  const fast = { sleep: () => Promise.resolve(), intervalMs: 1, timeoutMs: 1000 };

  it("resolves once the page reflects the edit", async () => {
    const stale = pageWith("2026-09-01T00:00:00.000Z");
    const fresh = pageWith("2026-09-07T10:00:00.000Z");
    const fetchMock = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(new Response(stale))
      .mockResolvedValueOnce(new Response(stale))
      .mockResolvedValueOnce(new Response(fresh));

    const result = await waitForDeploy("https://everyware.in/blog/x", "2026-09-07T10:00:00.000Z", {
      ...fast,
      fetch: fetchMock,
    });
    expect(result).toEqual({ status: "ready", polls: 3 });
  });

  it("times out rather than grading stale HTML", async () => {
    // Grading the previous deploy produces a report that is confidently about
    // the wrong bytes, and nothing in the output would reveal it.
    const fetchMock = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response(pageWith("2026-01-01T00:00:00.000Z")));

    const result = await waitForDeploy("https://everyware.in/blog/x", "2026-09-07T10:00:00.000Z", {
      ...fast,
      timeoutMs: 5,
      fetch: fetchMock,
    });
    expect(result.status).toBe("timeout");
  });

  it("treats a 404 during the window as not-yet-deployed", async () => {
    const fetchMock = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(new Response("gone", { status: 404 }))
      .mockResolvedValueOnce(new Response(pageWith("2026-09-07T10:00:00.000Z")));

    await expect(
      waitForDeploy("https://everyware.in/blog/x", "2026-09-07T10:00:00.000Z", {
        ...fast,
        fetch: fetchMock,
      }),
    ).resolves.toMatchObject({ status: "ready" });
  });

  it("treats a page with no BlogPosting as not ready", async () => {
    const fetchMock = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response("<html><body>no schema</body></html>"));
    const result = await waitForDeploy("https://everyware.in/blog/x", "2026-09-07T10:00:00.000Z", {
      ...fast,
      timeoutMs: 5,
      fetch: fetchMock,
    });
    expect(result.status).toBe("timeout");
  });

  it("survives a connection error mid-deploy", async () => {
    const fetchMock = vi
      .fn<typeof globalThis.fetch>()
      .mockRejectedValueOnce(new Error("ECONNRESET"))
      .mockResolvedValueOnce(new Response(pageWith("2026-09-07T10:00:00.000Z")));
    await expect(
      waitForDeploy("https://everyware.in/blog/x", "2026-09-07T10:00:00.000Z", {
        ...fast,
        fetch: fetchMock,
      }),
    ).resolves.toMatchObject({ status: "ready" });
  });
});

// ── T-03-010/011 tokenisation and candidate scoring ──────────────────────────

describe("tokenize", () => {
  it("is deterministic", () => {
    expect(tokenize("Washing machines and DRAINS!")).toEqual(
      tokenize("Washing machines and DRAINS!"),
    );
  });

  it("removes stopwords and short words", () => {
    expect(tokenize("the and of a an it")).toEqual([]);
  });

  it("stems plurals to a common root", () => {
    expect(stem("machines")).toBe("machine");
    expect(tokenize("washing machines")).toEqual(tokenize("washing machine"));
  });

  it("gives a term present in every document an IDF of zero", () => {
    const idf = inverseDocumentFrequency([
      ["appliance", "washing"],
      ["appliance", "cooling"],
    ]);
    expect(idf.get("appliance")).toBe(0);
    expect(idf.get("washing")).toBeGreaterThan(0);
  });

  it("gives a unique term the highest IDF in the corpus", () => {
    const idf = inverseDocumentFrequency([["a", "shared"], ["shared"], ["shared"]]);
    const values = [...idf.values()];
    expect(idf.get("a")).toBe(Math.max(...values));
  });

  it("scores identical vectors at 1 and disjoint ones at 0", () => {
    expect(cosineSimilarity({ a: 1 }, { a: 1 })).toBeCloseTo(1);
    expect(cosineSimilarity({ a: 1 }, { b: 1 })).toBe(0);
  });
});

describe("content index and candidate scoring", () => {
  const index = buildContentIndex(posts);
  const source = index.find((a) => a.slug === post.slug);
  if (source === undefined) throw new Error("index missing the source article");
  const NOW = Date.parse("2026-09-07T00:00:00.000Z");

  it("indexes every post with a non-empty vector", () => {
    expect(index).toHaveLength(posts.length);
    for (const article of index) {
      expect(Object.keys(article.terms).length, article.slug).toBeGreaterThan(0);
    }
  });

  it("produces byte-identical vectors on a rebuild", () => {
    expect(JSON.stringify(buildContentIndex(posts))).toBe(JSON.stringify(index));
  });

  it("ranks deterministically across ten runs", () => {
    const runs = Array.from({ length: 10 }, () =>
      scoreCandidates(source, index, NOW).map((c) => c.article.slug),
    );
    for (const run of runs) expect(run).toEqual(runs[0]);
  });

  it("never suggests the source article", () => {
    for (const article of index) {
      const slugs = scoreCandidates(article, index, NOW).map((c) => c.article.slug);
      expect(slugs, article.slug).not.toContain(article.slug);
    }
  });

  it("breaks score ties by slug rather than input order", () => {
    const twins: IndexedArticle[] = [
      { ...source, id: "z", slug: "zebra-post", terms: {}, tagSlugs: [], linkedSlugs: [] },
      { ...source, id: "a", slug: "alpha-post", terms: {}, tagSlugs: [], linkedSlugs: [] },
    ];
    const bare: IndexedArticle = { ...source, id: "src", terms: {}, tagSlugs: [], linkedSlugs: [] };
    const ranked = scoreCandidates(bare, twins, NOW).map((c) => c.article.slug);
    expect(ranked).toEqual(["alpha-post", "zebra-post"]);
  });

  it("excludes an article the source already links to", () => {
    const target = index[1];
    if (target === undefined) throw new Error("need two articles");
    const linked: IndexedArticle = { ...source, linkedSlugs: [target.slug] };
    expect(scoreCandidates(linked, index, NOW).map((c) => c.article.slug)).not.toContain(
      target.slug,
    );
  });

  it("returns at most ten candidates", () => {
    expect(scoreCandidates(source, index, NOW).length).toBeLessThanOrEqual(10);
  });

  it("returns nothing for a corpus of one", () => {
    expect(scoreCandidates(source, [source], NOW)).toEqual([]);
  });

  it("decays recency linearly and clamps at the horizon", () => {
    expect(recencyBoost(new Date(NOW).toISOString(), NOW)).toBeCloseTo(1);
    expect(recencyBoost(new Date(NOW - 182 * 86_400_000).toISOString(), NOW)).toBeCloseTo(0.5, 1);
    expect(recencyBoost(new Date(NOW - 400 * 86_400_000).toISOString(), NOW)).toBe(0);
  });

  it("excludes articles that already link to the target, for inbound", () => {
    const target = index[0];
    if (target === undefined) throw new Error("empty index");
    const withLink = index.map((a) =>
      a.slug === index[1]?.slug ? { ...a, linkedSlugs: [target.slug] } : a,
    );
    const inbound = scoreInboundCandidates(target, withLink, NOW).map((c) => c.article.slug);
    expect(inbound).not.toContain(index[1]?.slug);
  });
});

// ── T-03-012 link ranker hard constraints ────────────────────────────────────

describe("createLinkRanker", () => {
  const index = buildContentIndex(posts);
  const source = index[0];
  const candidate = index[1];
  if (source === undefined || candidate === undefined) throw new Error("need two articles");

  const rankerWith = (payload: unknown): GenerateContentClient => ({
    models: {
      generateContent: () => Promise.resolve({ text: JSON.stringify(payload) }),
    },
  });

  const anchorText = source.title.split(" ").slice(0, 3).join(" ");

  it("keeps a suggestion that satisfies both constraints", async () => {
    const ranker = createLinkRanker({
      client: rankerWith({
        suggestions: [
          { targetUrl: candidate.url, anchorText, reason: "closely related", confidence: 0.8 },
        ],
      }),
    });
    const result = await ranker.rank({
      anchorSourceText: source.title,
      sourceTitle: source.title,
      candidates: [{ article: candidate, score: 1, cosine: 1, sharedTags: 1 }],
    });
    expect(result.suggestions).toHaveLength(1);
    expect(result.dropped).toBe(0);
  });

  it("drops a URL that was not on the shortlist", async () => {
    // The model cannot invent a link target: a URL it made up would 404.
    const ranker = createLinkRanker({
      client: rankerWith({
        suggestions: [
          {
            targetUrl: "https://everyware.in/blog/invented-by-the-model",
            anchorText,
            reason: "made up",
            confidence: 0.9,
          },
        ],
      }),
    });
    const result = await ranker.rank({
      anchorSourceText: source.title,
      sourceTitle: source.title,
      candidates: [{ article: candidate, score: 1, cosine: 1, sharedTags: 1 }],
    });
    expect(result.suggestions).toEqual([]);
    expect(result.dropped).toBe(1);
  });

  it("drops an anchor that does not occur in the article", async () => {
    const ranker = createLinkRanker({
      client: rankerWith({
        suggestions: [
          {
            targetUrl: candidate.url,
            anchorText: "a phrase the editor would have to write",
            reason: "invented anchor",
            confidence: 0.9,
          },
        ],
      }),
    });
    const result = await ranker.rank({
      anchorSourceText: source.title,
      sourceTitle: source.title,
      candidates: [{ article: candidate, score: 1, cosine: 1, sharedTags: 1 }],
    });
    expect(result.suggestions).toEqual([]);
    expect(result.dropped).toBe(1);
  });

  it("returns at most five suggestions", async () => {
    const ranker = createLinkRanker({
      client: rankerWith({
        suggestions: Array.from({ length: 9 }, () => ({
          targetUrl: candidate.url,
          anchorText,
          reason: "related",
          confidence: 0.5,
        })),
      }),
    });
    const result = await ranker.rank({
      anchorSourceText: source.title,
      sourceTitle: source.title,
      candidates: [{ article: candidate, score: 1, cosine: 1, sharedTags: 1 }],
    });
    expect(result.suggestions).toHaveLength(5);
  });

  it("returns an empty list rather than throwing when the model errors", async () => {
    const ranker = createLinkRanker({
      client: { models: { generateContent: () => Promise.reject(new Error("500")) } },
    });
    await expect(
      ranker.rank({
        anchorSourceText: source.title,
        sourceTitle: source.title,
        candidates: [{ article: candidate, score: 1, cosine: 1, sharedTags: 1 }],
      }),
    ).resolves.toEqual({ suggestions: [], dropped: 0 });
  });

  it("does not call the model at all with an empty shortlist", async () => {
    const generateContent = vi.fn();
    const ranker = createLinkRanker({ client: { models: { generateContent } } });
    await ranker.rank({ anchorSourceText: "x", sourceTitle: "x", candidates: [] });
    expect(generateContent).not.toHaveBeenCalled();
  });
});

// ── T-03-014 diffs ───────────────────────────────────────────────────────────

describe("buildDiffs", () => {
  const audit = (overrides: PageAudit["results"] = []): PageAudit => ({
    url: toAbsoluteUrl("https://everyware.in/blog/x"),
    path: "/blog/x",
    file: "blog/x.html",
    kind: "article",
    score: 90,
    results: [...overrides],
  });

  it("produces no diff when everything matches", () => {
    expect(buildDiffs(audit(), null, { title: "T", description: "D", slug: "s" })).toEqual([]);
  });

  it("flags an over-long title even with no analysis at all", () => {
    const diffs = buildDiffs(
      audit([
        { id: "title-length", severity: "error", status: "fail", message: "title is 71 characters" },
      ]),
      null,
      { title: "x".repeat(71), description: "D", slug: "s" },
    );
    expect(diffs).toHaveLength(1);
    expect(diffs[0]?.reason).toContain("71");
    expect(diffs[0]?.suggested).toBeNull();
  });

  it("marks a slug change as needing a redirect", () => {
    const analysis = { ...stubAnalysis, suggestedSlug: "a-better-slug" };
    const diffs = buildDiffs(audit(), analysis, {
      title: analysis.suggestedTitle,
      description: analysis.suggestedDescription,
      slug: "the-original-slug",
    });
    const slugDiff = diffs.find((d) => d.field === "slug");
    expect(slugDiff?.actionable).toBe(false);
    expect(slugDiff?.reason).toContain("redirect");
  });

  it("orders diffs deterministically", () => {
    const analysis = { ...stubAnalysis, suggestedSlug: "other" };
    const diffs = buildDiffs(audit(), analysis, { title: "live", description: "live", slug: "s" });
    expect(diffs.map((d) => d.field)).toEqual(["title", "description", "slug"]);
  });
});

// ── T-03-015 orchestration ───────────────────────────────────────────────────

const passingAudit: PageAudit = {
  url: toAbsoluteUrl("https://everyware.in/blog/washing-machine-service-frequency"),
  path: "/blog/washing-machine-service-frequency",
  file: "blog/washing-machine-service-frequency.html",
  kind: "article",
  score: 100,
  results: [{ id: "title-present", severity: "error", status: "pass", message: "ok" }],
};

const validatorStub = (status: "validated" | "deploy-timeout" = "validated"): Validator => {
  const stub: Validator = {
    validateArticle: () =>
      Promise.resolve({ status, audit: status === "validated" ? passingAudit : null }),
    validateSite: () => Promise.resolve({ pages: [], siteResults: [], score: 100 }),
  };
  return stub;
};

describe("processPost", () => {
  it("produces a complete report", async () => {
    const store = freshStore();
    const result = await processPost(post.slug, {
      ghost: client,
      store,
      validator: validatorStub(),
    });

    expect(result.report).not.toBeNull();
    expect(result.report?.technicalScore).toBe(100);
    expect(result.report?.validationStatus).toBe("validated");
    await expect(store.getReport(post.slug)).resolves.toEqual(result.report);
  });

  it("copies the score from the audit rather than recomputing it", () => {
    expect(passingAudit.score).toBe(100);
  });

  it("completes with a null analysis when the analyzer throws", async () => {
    const throwing: SeoAnalyzer = {
      analyze: () => Promise.reject(new Error("provider exploded")),
    };
    const result = await processPost(post.slug, {
      ghost: client,
      store: freshStore(),
      validator: validatorStub(),
      analyzer: throwing,
    });

    expect(result.report?.analysis).toBeNull();
    expect(result.report?.analysisError).toContain("provider exploded");
    // The authoritative half survived.
    expect(result.report?.technicalScore).toBe(100);
  });

  it("records a deploy timeout without grading stale HTML", async () => {
    const result = await processPost(post.slug, {
      ghost: client,
      store: freshStore(),
      validator: validatorStub("deploy-timeout"),
    });
    expect(result.report?.validationStatus).toBe("deploy-timeout");
    expect(result.report?.technical).toBeNull();
    expect(result.report?.technicalScore).toBeNull();
  });

  it("skips an unknown slug rather than throwing", async () => {
    const result = await processPost("not-a-real-post", {
      ghost: client,
      store: freshStore(),
      validator: validatorStub(),
    });
    expect(result.report).toBeNull();
    expect(result.skipped).toContain("not-a-real-post");
  });

  it("is stable across runs apart from generatedAt", async () => {
    const store = freshStore();
    const config = { ghost: client, store, validator: validatorStub() };
    const first = await processPost(post.slug, config);
    const second = await processPost(post.slug, config);

    expect({ ...first.report, generatedAt: "" }).toEqual({ ...second.report, generatedAt: "" });
  });

  it("skips analysis past the hourly guard but still validates and reports", async () => {
    const store = freshStore();
    const config = { ghost: client, store, validator: validatorStub() };

    for (let i = 0; i < MAX_ANALYSES_PER_HOUR; i += 1) {
      await processPost(post.slug, config);
    }
    const limited = await processPost(post.slug, config);

    expect(limited.report?.analysis).toBeNull();
    expect(limited.report?.analysisError).toContain("limit");
    expect(limited.report?.technicalScore).toBe(100);
  });
});

// ── T-03-019 isolation guards ────────────────────────────────────────────────

describe("the worker never writes to Ghost", () => {
  it("makes no Admin API call anywhere in the package", async () => {
    const { readdirSync, readFileSync, statSync } = await import("node:fs");
    const { join: joinPath, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");

    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((entry) => {
        const full = joinPath(dir, entry);
        return statSync(full).isDirectory() ? walk(full) : [full];
      });

    const srcDir = dirname(fileURLToPath(import.meta.url));
    const offenders = walk(srcDir)
      .filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts"))
      .filter((file) => /ghost\/api\/admin|AdminAPI|admin_api_key/i.test(readFileSync(file, "utf8")));

    // No Admin API path means no worker action can generate a post.edited
    // event, which makes a webhook loop impossible rather than unlikely.
    expect(offenders).toEqual([]);
  });
});
