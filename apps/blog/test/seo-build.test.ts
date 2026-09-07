import { InMemoryGhostClient } from "@everyware/ghost";
import {
  SITE_RULES,
  auditSite,
  distPageSource,
  hasErrors,
  type PageAudit,
  type RuleId,
} from "@everyware/seo-core";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

/**
 * Spec 02's central claim, checked end to end: build the site, then audit the
 * emitted files.
 *
 * This is the test that would have caught the existing marketing site's
 * fragment canonicals - they pass every check written against application
 * state and are still wrong in the browser.
 */
const here = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(here, "../../../dist");

const audit = () => auditSite(distPageSource(distDir), SITE_RULES);

const failuresOf = (page: PageAudit): readonly string[] =>
  page.results.filter((r) => r.status === "fail" && r.severity === "error").map((r) => r.id);

describe("the built site passes the rule set", () => {
  const result = audit();

  it("has zero error-severity failures on any page", () => {
    const offenders = result.pages
      .filter((page) => hasErrors(page.results))
      .map((page) => `${page.path}: ${failuresOf(page).join(", ")}`);
    expect(offenders).toEqual([]);
  });

  it("has zero error-severity failures at site level", () => {
    const offenders = result.siteResults
      .filter((r) => r.status === "fail" && r.severity === "error")
      .map((r) => `${r.id}: ${r.message}`);
    expect(offenders).toEqual([]);
  });

  it("scores 100 overall and at least 95 on every page", () => {
    expect(result.score).toBe(100);
    for (const page of result.pages) {
      expect(page.score, `${page.path} scored ${String(page.score)}`).toBeGreaterThanOrEqual(95);
    }
  });

  it("audits every blog route kind, and not the out-of-scope SPA", () => {
    const kinds = new Set(result.pages.map((page) => page.kind));
    expect([...kinds].sort()).toEqual(["article", "author", "category", "listing"]);
    expect(result.pages.some((page) => page.path === "/")).toBe(false);
  });

  it("exercises every rule at least once rather than skipping it everywhere", () => {
    // A rule that reports not-applicable on every page is untested by this run,
    // which would make a green result mean less than it appears to.
    const everRan = new Set<RuleId>();
    for (const page of result.pages) {
      for (const rule of page.results) {
        if (rule.status !== "not-applicable") everRan.add(rule.id);
      }
    }
    for (const rule of result.siteResults) {
      if (rule.status !== "not-applicable") everRan.add(rule.id);
    }
    expect(everRan.size).toBeGreaterThanOrEqual(30);
  });

  it("covers the corpus shapes the rules need", async () => {
    const client = new InMemoryGhostClient();
    const posts = await client.listPosts();

    expect(posts.length, "pagination needs more than one page").toBeGreaterThan(12);
    expect(posts.some((p) => p.tags.length === 0), "a tagless post").toBe(true);
    expect(posts.some((p) => p.featureImage === null), "a post with no feature image").toBe(true);
    expect(new Set(posts.map((p) => p.primaryAuthor.slug)).size, "two authors").toBeGreaterThan(1);
  });
});

describe("the gate has teeth", () => {
  // Each case corrupts one emitted file, re-audits, and asserts the specific
  // rules that should notice. A gate never observed failing is decoration.
  const target = resolve(distDir, "blog/washing-machine-service-frequency.html");
  const original = readFileSync(target, "utf8");

  afterEach(() => {
    writeFileSync(target, original, "utf8");
  });

  const auditTarget = (): readonly string[] => {
    const page = audit().pages.find((p) => p.path === "/blog/washing-machine-service-frequency");
    if (page === undefined) throw new Error("target page vanished from the audit");
    return failuresOf(page);
  };

  it("notices a removed canonical", () => {
    writeFileSync(target, original.replace(/<link rel="canonical"[^>]*>/, ""), "utf8");
    const failed = auditTarget();
    expect(failed).toContain("canonical-present");
    expect(failed).toContain("canonical-self");
  });

  it("notices a second h1", () => {
    writeFileSync(target, original.replace("</main>", "<h1>Planted</h1></main>"), "utf8");
    expect(auditTarget()).toContain("h1-single");
  });

  it("notices an injected noindex", () => {
    writeFileSync(
      target,
      original.replace(/(<meta name="robots" content=")/, '$1noindex, '),
      "utf8",
    );
    expect(auditTarget()).toContain("robots-not-noindex");
  });

  it("notices schema that stops matching the page", () => {
    writeFileSync(
      target,
      original.replace(/<h1([^>]*)>[^<]*<\/h1>/, "<h1$1>A Different Heading Entirely</h1>"),
      "utf8",
    );
    expect(auditTarget()).toContain("jsonld-matches-page");
  });

  it("notices a dangling internal link", () => {
    writeFileSync(target, original.replace("</main>", '<a href="/blog/typo-slug">x</a></main>'), "utf8");
    expect(auditTarget()).toContain("internal-links-resolve");
  });

  it("restores cleanly, so the suite leaves no damage behind", () => {
    expect(readFileSync(target, "utf8")).toBe(original);
    expect(auditTarget()).toEqual([]);
  });
});

describe("site-level rules react to a broken sitemap", () => {
  const sitemapPath = resolve(distDir, "sitemap.xml");
  const original = readFileSync(sitemapPath, "utf8");

  afterEach(() => {
    writeFileSync(sitemapPath, original, "utf8");
  });

  const siteFailures = (): readonly string[] =>
    audit()
      .siteResults.filter((r) => r.status === "fail" && r.severity === "error")
      .map((r) => r.id);

  it("notices a page missing from the sitemap", () => {
    writeFileSync(
      sitemapPath,
      original.replace(/<url>\s*<loc>[^<]*washing-machine-service-frequency<\/loc>[\s\S]*?<\/url>/, ""),
      "utf8",
    );
    expect(siteFailures()).toContain("sitemap-complete");
  });

  it("notices a fragment URL, the defect in the file this replaced", () => {
    writeFileSync(
      sitemapPath,
      original.replace(
        "</urlset>",
        "<url><loc>https://everyware.in/#info</loc><lastmod>2026-09-03</lastmod><changefreq>daily</changefreq><priority>0.95</priority></url></urlset>",
      ),
      "utf8",
    );
    const failed = siteFailures();
    expect(failed).toContain("sitemap-no-fragments");
    expect(failed).toContain("sitemap-complete");
  });
});
