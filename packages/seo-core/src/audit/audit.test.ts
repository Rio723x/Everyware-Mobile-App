import { parseHTML } from "linkedom";
import { describe, expect, it } from "vitest";
import { toAbsoluteUrl } from "../brand.js";
import { AI_USER_AGENTS, SITE_URL } from "../config.js";
import { buildRobotsTxt } from "../robots.js";
import { buildSitemapXml, type SitemapEntry } from "../sitemap.js";
import { toIsoDateTime } from "../brand.js";
import { auditPage, auditSite, kindOfPath, scoreOf, type SiteAuditInput } from "./audit.js";
import { PAGE_RULES } from "./audit.js";
import { RULE_IDS, type PageContext, type RuleId, type RuleResult } from "./registry.js";
import { SITE_RULES } from "./rules/site.js";

/**
 * Every rule gets a passing fixture and a failing one.
 *
 * A rule that has only ever been seen to pass is a comment with a green tick
 * next to it: these hand it the defect it exists to catch and check it says so,
 * naming the observed value.
 */

const CANONICAL = "https://everyware.in/blog/a-post";

interface PageParts {
  readonly title?: string;
  readonly description?: string;
  readonly canonical?: string | null;
  readonly robots?: string;
  readonly h1?: string | null;
  readonly body?: string;
  readonly head?: string;
  readonly lang?: string | null;
  readonly ogOverrides?: Readonly<Record<string, string | null>>;
  readonly jsonLd?: readonly unknown[] | null;
}

const blogPosting = (overrides: Readonly<Record<string, unknown>> = {}): unknown => ({
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "@id": `${CANONICAL}#article`,
  mainEntityOfPage: { "@type": "WebPage", "@id": CANONICAL },
  headline: "A Post Title",
  description: "A meta description that is comfortably long enough to satisfy the length rule.",
  image: ["https://cms.everyware.in/content/images/size/w1200/x.jpg"],
  datePublished: "2026-08-01T00:00:00.000+00:00",
  dateModified: "2026-08-02T00:00:00.000+00:00",
  wordCount: 400,
  keywords: ["Maintenance"],
  inLanguage: "en-IN",
  author: { "@type": "Person", name: "Priya Nair", url: "https://everyware.in/blog/author/priya" },
  publisher: { "@id": "https://everyware.in/#org" },
  isPartOf: { "@id": "https://everyware.in/#website" },
  ...overrides,
});

const breadcrumb = (last: string = CANONICAL): unknown => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
    { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
    { "@type": "ListItem", position: 3, name: "A Post Title", item: last },
  ],
});

const OG_DEFAULTS: Readonly<Record<string, string>> = {
  "og:type": "article",
  "og:title": "A Post Title",
  "og:description": "A meta description that is comfortably long enough to satisfy the length rule.",
  "og:url": CANONICAL,
  "og:site_name": "EveryWare",
  "og:locale": "en_IN",
  "og:image": "https://cms.everyware.in/content/images/size/w1200/x.jpg",
  "og:image:width": "1200",
  "og:image:height": "630",
  "og:image:alt": "A described image",
  "article:published_time": "2026-08-01T00:00:00.000+00:00",
  "article:modified_time": "2026-08-02T00:00:00.000+00:00",
  "article:author": "https://everyware.in/blog/author/priya",
};

const buildPage = (parts: PageParts = {}): string => {
  const og = { ...OG_DEFAULTS, ...(parts.ogOverrides ?? {}) };
  const ogTags = Object.entries(og)
    .filter(([, value]) => value !== null)
    .map(([property, value]) => `<meta property="${property}" content="${String(value)}">`)
    .join("");

  const jsonLd = (parts.jsonLd ?? [blogPosting(), breadcrumb()])
    .map(
      (entry) =>
        `<script type="application/ld+json">${typeof entry === "string" ? entry : JSON.stringify(entry)}</script>`,
    )
    .join("");

  const canonical =
    parts.canonical === null
      ? ""
      : `<link rel="canonical" href="${parts.canonical ?? CANONICAL}">`;

  const lang = parts.lang === null ? "" : ` lang="${parts.lang ?? "en"}"`;

  return (
    `<!doctype html><html${lang}><head>` +
    `<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<title>${parts.title ?? "A Post Title | Everyware Blog"}</title>` +
    `<meta name="description" content="${parts.description ?? OG_DEFAULTS["og:description"] ?? ""}">` +
    canonical +
    `<meta name="robots" content="${parts.robots ?? "index, follow, max-image-preview:large, max-snippet:-1"}">` +
    ogTags +
    `<meta name="twitter:card" content="summary_large_image">` +
    `<meta name="twitter:title" content="A Post Title">` +
    `<meta name="twitter:description" content="A description long enough to satisfy the rule.">` +
    `<meta name="twitter:image" content="https://cms.everyware.in/x.jpg">` +
    `<meta name="twitter:image:alt" content="A described image">` +
    jsonLd +
    `</head><body><main>` +
    (parts.h1 === null ? "" : `<h1>${parts.h1 ?? "A Post Title"}</h1>`) +
    (parts.body ?? `<p>Body</p><a href="/blog">Back to the blog</a>`) +
    `</main></body></html>`
  );
};

const context = (overrides: Partial<PageContext> = {}): PageContext => ({
  url: toAbsoluteUrl(CANONICAL),
  path: "/blog/a-post",
  file: "blog/a-post.html",
  kind: "article",
  emittedPaths: new Set(["/", "/blog", "/blog/a-post", "/blog/category/maintenance"]),
  ...overrides,
});

const run = (html: string, ctx: PageContext = context()): Map<RuleId, RuleResult> => {
  const { document } = parseHTML(html);
  return new Map(PAGE_RULES.map((rule) => rule(document, ctx)).map((r) => [r.id, r]));
};

const statusOf = (html: string, id: RuleId, ctx?: PageContext): string =>
  run(html, ctx).get(id)?.status ?? "missing";

const messageOf = (html: string, id: RuleId, ctx?: PageContext): string =>
  run(html, ctx).get(id)?.message ?? "";

describe("the clean fixture passes every page rule", () => {
  it("has no failures", () => {
    const failures = [...run(buildPage()).values()].filter((r) => r.status === "fail");
    expect(failures.map((r) => `${r.id}: ${r.message}`)).toEqual([]);
  });
});

describe("head rules", () => {
  it("title-present fails on two titles", () => {
    const html = buildPage().replace("</title>", "</title><title>Second</title>");
    expect(statusOf(html, "title-present")).toBe("fail");
    expect(messageOf(html, "title-present")).toContain("2");
  });

  it.each([
    [9, "fail"],
    [10, "pass"],
    [70, "pass"],
    [71, "fail"],
  ])("title-length at %i characters is %s", (length, expected) => {
    expect(statusOf(buildPage({ title: "x".repeat(length) }), "title-length")).toBe(expected);
  });

  it.each([
    [49, "fail"],
    [50, "pass"],
    [170, "pass"],
    [171, "fail"],
  ])("description-length at %i characters is %s", (length, expected) => {
    expect(statusOf(buildPage({ description: "x".repeat(length) }), "description-length")).toBe(
      expected,
    );
  });

  it("canonical-present fails when absent and when duplicated", () => {
    expect(statusOf(buildPage({ canonical: null }), "canonical-present")).toBe("fail");
    const doubled = buildPage().replace(
      '<meta name="robots"',
      `<link rel="canonical" href="${CANONICAL}"><meta name="robots"`,
    );
    expect(statusOf(doubled, "canonical-present")).toBe("fail");
  });

  it.each([
    ["http://everyware.in/blog/a-post", "not https"],
    ["/blog/a-post", "relative"],
    ["https://everyware.in/blog/a-post#top", "fragment"],
    ["https://everyware.in/blog/a-post?x=1", "query"],
  ])("canonical-absolute rejects %s (%s)", (value) => {
    expect(statusOf(buildPage({ canonical: value }), "canonical-absolute")).toBe("fail");
  });

  it("canonical-self fails when the canonical is not the page's own URL, showing both", () => {
    const html = buildPage({ canonical: "https://everyware.in/blog/other" });
    expect(statusOf(html, "canonical-self")).toBe("fail");
    expect(messageOf(html, "canonical-self")).toContain("/blog/other");
    expect(messageOf(html, "canonical-self")).toContain("/blog/a-post");
  });

  it("canonical-self fails on a redirect, which the HTML alone cannot reveal", () => {
    const ctx = context({ redirectChain: ["https://everyware.in/blog/a-post/"] });
    expect(statusOf(buildPage(), "canonical-self", ctx)).toBe("fail");
    expect(messageOf(buildPage(), "canonical-self", ctx)).toContain("redirects");
  });

  it("canonical-no-trailing-slash allows the root but nothing deeper", () => {
    expect(
      statusOf(buildPage({ canonical: "https://everyware.in/blog/a-post/" }), "canonical-no-trailing-slash"),
    ).toBe("fail");
  });

  it.each([
    "noindex",
    "NOINDEX, follow",
    "index, noindex",
    "follow,noindex",
  ])("robots-not-noindex detects %s regardless of case or position", (value) => {
    expect(statusOf(buildPage({ robots: value }), "robots-not-noindex")).toBe("fail");
  });

  it("robots-not-noindex catches an X-Robots-Tag header while the HTML is clean", () => {
    const ctx = context({ xRobotsTag: "noindex, nofollow" });
    expect(statusOf(buildPage(), "robots-not-noindex", ctx)).toBe("fail");
    expect(messageOf(buildPage(), "robots-not-noindex", ctx)).toContain("X-Robots-Tag");
  });

  it("every failure message states the observed value", () => {
    const html = buildPage({ title: "x".repeat(99) });
    expect(messageOf(html, "title-length")).toContain("99");
  });
});

describe("structure rules", () => {
  it("html-lang fails without a lang attribute", () => {
    expect(statusOf(buildPage({ lang: null }), "html-lang")).toBe("fail");
  });

  it("charset-viewport names which meta is missing", () => {
    const html = buildPage().replace('<meta name="viewport" content="width=device-width, initial-scale=1">', "");
    expect(statusOf(html, "charset-viewport")).toBe("fail");
    expect(messageOf(html, "charset-viewport")).toContain("viewport");
  });

  it("h1-single fails on zero and on two", () => {
    expect(statusOf(buildPage({ h1: null }), "h1-single")).toBe("fail");
    expect(statusOf(buildPage({ body: "<h1>Second</h1>" }), "h1-single")).toBe("fail");
  });

  it("h1-non-empty fails on whitespace", () => {
    expect(statusOf(buildPage({ h1: "   " }), "h1-non-empty")).toBe("fail");
  });

  it.each([
    ["<h2>a</h2><h4>b</h4>", "h2 to h4"],
    ["<h3>a</h3>", "h1 to h3"],
  ])("heading-order rejects %s (%s)", (body) => {
    expect(statusOf(buildPage({ body }), "heading-order")).toBe("fail");
  });

  it("heading-order accepts h1, h2, h3, h2", () => {
    expect(statusOf(buildPage({ body: "<h2>a</h2><h3>b</h3><h2>c</h2><a href='/blog'>x</a>" }), "heading-order")).toBe("pass");
  });

  it.each([
    ['<img src="a.jpg">', "no alt"],
    ['<img src="a.jpg" alt="">', "empty alt"],
    ['<img src="a.jpg" alt="   ">', "whitespace alt"],
  ])("img-alt rejects %s (%s)", (body) => {
    expect(statusOf(buildPage({ body: `${body}<a href="/blog">x</a>` }), "img-alt")).toBe("fail");
  });

  it("img-alt allows a declared decorative image", () => {
    const body = '<img src="a.jpg" alt="" role="presentation"><a href="/blog">x</a>';
    expect(statusOf(buildPage({ body }), "img-alt")).toBe("pass");
  });
});

describe("social rules", () => {
  it("og-required names the missing property", () => {
    const html = buildPage({ ogOverrides: { "og:locale": null } });
    expect(statusOf(html, "og-required")).toBe("fail");
    expect(messageOf(html, "og-required")).toContain("og:locale");
  });

  it("og-image-dimensions fails below the platform minimum", () => {
    expect(
      statusOf(buildPage({ ogOverrides: { "og:image:width": "600" } }), "og-image-dimensions"),
    ).toBe("fail");
  });

  it("og-image-absolute fails on a relative URL", () => {
    expect(statusOf(buildPage({ ogOverrides: { "og:image": "/x.jpg" } }), "og-image-absolute")).toBe(
      "fail",
    );
  });

  it("og-image-alt fails when empty", () => {
    expect(statusOf(buildPage({ ogOverrides: { "og:image:alt": null } }), "og-image-alt")).toBe(
      "fail",
    );
  });

  it("og-url-canonical fails on a trailing-slash difference alone", () => {
    expect(
      statusOf(buildPage({ ogOverrides: { "og:url": `${CANONICAL}/` } }), "og-url-canonical"),
    ).toBe("fail");
  });

  it("og-article-fields is not-applicable on a listing page, not a pass", () => {
    const ctx = context({ kind: "listing", path: "/blog" });
    expect(statusOf(buildPage(), "og-article-fields", ctx)).toBe("not-applicable");
  });

  it("og-article-fields fails an article missing a timestamp", () => {
    expect(
      statusOf(buildPage({ ogOverrides: { "article:modified_time": null } }), "og-article-fields"),
    ).toBe("fail");
  });

  it("twitter-required rejects a small card", () => {
    const html = buildPage().replace(
      '<meta name="twitter:card" content="summary_large_image">',
      '<meta name="twitter:card" content="summary">',
    );
    expect(statusOf(html, "twitter-required")).toBe("fail");
  });
});

describe("json-ld rules", () => {
  it("jsonld-parses fails on trailing-comma JSON and names the script", () => {
    const html = buildPage({ jsonLd: ['{"a": 1,}'] });
    expect(statusOf(html, "jsonld-parses")).toBe("fail");
    expect(messageOf(html, "jsonld-parses")).toContain("script #0");
  });

  it("jsonld-blogposting fails on a non-ISO date", () => {
    const html = buildPage({ jsonLd: [blogPosting({ datePublished: "2026-08-01" }), breadcrumb()] });
    expect(statusOf(html, "jsonld-blogposting")).toBe("fail");
  });

  it("jsonld-blogposting fails on a relative image", () => {
    const html = buildPage({ jsonLd: [blogPosting({ image: ["/x.jpg"] }), breadcrumb()] });
    expect(statusOf(html, "jsonld-blogposting")).toBe("fail");
  });

  it("jsonld-breadcrumb fails on non-contiguous positions", () => {
    const broken = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
        { "@type": "ListItem", position: 4, name: "Post", item: CANONICAL },
      ],
    };
    expect(statusOf(buildPage({ jsonLd: [blogPosting(), broken] }), "jsonld-breadcrumb")).toBe("fail");
  });

  it("jsonld-breadcrumb fails when the last item is not the canonical", () => {
    const html = buildPage({ jsonLd: [blogPosting(), breadcrumb("https://everyware.in/blog/other")] });
    expect(statusOf(html, "jsonld-breadcrumb")).toBe("fail");
  });

  it("jsonld-matches-page fails when the headline differs from the visible h1", () => {
    const html = buildPage({ h1: "A Completely Different Heading" });
    expect(statusOf(html, "jsonld-matches-page")).toBe("fail");
    expect(messageOf(html, "jsonld-matches-page")).toContain("Different Heading");
  });

  it("jsonld-matches-page fails when the schema description differs from the meta", () => {
    const html = buildPage({
      jsonLd: [blogPosting({ description: "Something else entirely, long enough to be valid." }), breadcrumb()],
    });
    expect(statusOf(html, "jsonld-matches-page")).toBe("fail");
  });

  it("jsonld-matches-page allows a headline truncated at Google's 110-character cap", () => {
    const long = `${"Word ".repeat(30).trim()}`;
    const html = buildPage({
      h1: long,
      jsonLd: [blogPosting({ headline: `${long.slice(0, 100)}…` }), breadcrumb()],
    });
    expect(statusOf(html, "jsonld-matches-page")).toBe("pass");
  });
});

describe("link rules", () => {
  it("internal-links-present fails on an orphan", () => {
    const body = '<a href="https://example.com">out</a><a href="mailto:a@b.c">mail</a>';
    expect(statusOf(buildPage({ body }), "internal-links-present")).toBe("fail");
  });

  it("internal-links-resolve names the dangling href and the page", () => {
    const html = buildPage({ body: '<a href="/blog/typo-slug">x</a>' });
    expect(statusOf(html, "internal-links-resolve")).toBe("fail");
    expect(messageOf(html, "internal-links-resolve")).toContain("/blog/typo-slug");
  });

  it("ignores mailto, tel and off-site links", () => {
    const body = '<a href="/blog">in</a><a href="mailto:a@b.c">m</a><a href="tel:+1">t</a><a href="https://x.com">o</a>';
    expect(statusOf(buildPage({ body }), "internal-links-resolve")).toBe("pass");
  });

  it("resolves a link carrying a fragment against its path", () => {
    expect(statusOf(buildPage({ body: '<a href="/blog#top">x</a>' }), "internal-links-resolve")).toBe("pass");
  });

  it("pagination-rel is not-applicable on an article", () => {
    expect(statusOf(buildPage(), "pagination-rel")).toBe("not-applicable");
  });

  it("pagination-rel fails when page 2 has no rel=prev", () => {
    const ctx = context({ kind: "listing", path: "/blog/page/2", url: toAbsoluteUrl("https://everyware.in/blog/page/2") });
    expect(statusOf(buildPage(), "pagination-rel", ctx)).toBe("fail");
  });
});

describe("scoring", () => {
  const result = (severity: "error" | "warning", status: "pass" | "fail" | "not-applicable"): RuleResult => ({
    id: "title-present",
    severity,
    status,
    message: "",
  });

  it("scores all-pass as 100", () => {
    expect(scoreOf([result("error", "pass"), result("warning", "pass")])).toBe(100);
  });

  it("weights an error three times a warning", () => {
    // 1 warning passing out of (1 error + 1 warning) = 1/4
    expect(scoreOf([result("error", "fail"), result("warning", "pass")])).toBe(25);
  });

  it("excludes not-applicable rules from both sums", () => {
    expect(scoreOf([result("error", "pass"), result("error", "not-applicable")])).toBe(100);
  });

  it("returns 100 rather than dividing by zero", () => {
    expect(scoreOf([result("error", "not-applicable")])).toBe(100);
  });
});

describe("kindOfPath", () => {
  it.each([
    ["/blog", "listing"],
    ["/blog/page/2", "listing"],
    ["/blog/a-post", "article"],
    ["/blog/category/x", "category"],
    ["/blog/author/x", "author"],
    ["/", "unknown"],
  ])("maps %s to %s", (path, expected) => {
    expect(kindOfPath(path)).toBe(expected);
  });
});

describe("site rules", () => {
  const entries: SitemapEntry[] = [
    {
      loc: toAbsoluteUrl(`${SITE_URL}/blog/a-post`),
      lastmod: toIsoDateTime("2026-08-02T00:00:00.000+00:00"),
      changefreq: "monthly",
      priority: 0.8,
    },
  ];

  const baseInput = (overrides: Partial<SiteAuditInput> = {}): SiteAuditInput => ({
    pages: [
      {
        url: toAbsoluteUrl(CANONICAL),
        path: "/blog/a-post",
        file: "blog/a-post.html",
        html: buildPage(),
      },
    ],
    allPaths: new Set(["/", "/blog", "/blog/a-post"]),
    sitemapXml: buildSitemapXml(entries),
    robotsTxt: buildRobotsTxt(),
    ...overrides,
  });

  const site = (overrides: Partial<SiteAuditInput> = {}) =>
    new Map(auditSite(baseInput(overrides), SITE_RULES).siteResults.map((r) => [r.id, r]));

  it("passes every site rule on a clean build", () => {
    const failures = [...site().values()].filter((r) => r.status === "fail");
    expect(failures.map((r) => `${r.id}: ${r.message}`)).toEqual([]);
  });

  it("sitemap-exists fails when there is no sitemap", () => {
    expect(site({ sitemapXml: null }).get("sitemap-exists")?.status).toBe("fail");
  });

  it("sitemap-wellformed fails on a missing urlset namespace", () => {
    expect(site({ sitemapXml: "<?xml version='1.0'?><urlset></urlset>" }).get("sitemap-wellformed")?.status).toBe("fail");
  });

  it("sitemap-no-fragments catches the defect in the file this replaced", () => {
    const withFragment = buildSitemapXml(entries).replace(
      "/blog/a-post",
      "/blog/a-post</loc><loc>https://everyware.in/#info",
    );
    expect(site({ sitemapXml: withFragment }).get("sitemap-no-fragments")?.status).toBe("fail");
  });

  it("sitemap-complete catches a page missing from the sitemap", () => {
    const result = site({ sitemapXml: buildSitemapXml([]) }).get("sitemap-complete");
    expect(result?.status).toBe("fail");
    expect(result?.message).toContain("missing from the sitemap");
  });

  it("sitemap-complete catches an entry with no page, in the other direction", () => {
    const extra: SitemapEntry[] = [
      ...entries,
      {
        loc: toAbsoluteUrl(`${SITE_URL}/blog/deleted-post`),
        lastmod: toIsoDateTime("2026-08-02T00:00:00.000+00:00"),
        changefreq: "monthly",
        priority: 0.8,
      },
    ];
    const result = site({ sitemapXml: buildSitemapXml(extra) }).get("sitemap-complete");
    expect(result?.status).toBe("fail");
    expect(result?.message).toContain("no page");
    expect(result?.message).toContain("deleted-post");
  });

  it("robots-sitemap-line fails when the Sitemap directive is missing", () => {
    expect(site({ robotsTxt: "User-agent: *\nAllow: /\n" }).get("robots-sitemap-line")?.status).toBe("fail");
  });

  it("robots-no-blanket-disallow catches Disallow: / in the wildcard group", () => {
    const txt = `User-agent: *\nDisallow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
    expect(site({ robotsTxt: txt }).get("robots-no-blanket-disallow")?.status).toBe("fail");
  });

  it("robots-ai-agents-preserved fails when one allowance is dropped", () => {
    const dropped = buildRobotsTxt().replace(`User-agent: ${AI_USER_AGENTS[0] ?? ""}\nAllow: /\n\n`, "");
    const result = site({ robotsTxt: dropped }).get("robots-ai-agents-preserved");
    expect(result?.status).toBe("fail");
    expect(result?.message).toContain(AI_USER_AGENTS[0] ?? "");
  });

  it("canonical-uniqueness names both pages that clash", () => {
    const input = baseInput({
      pages: [
        { url: toAbsoluteUrl(CANONICAL), path: "/blog/a-post", file: "a.html", html: buildPage() },
        { url: toAbsoluteUrl(`${SITE_URL}/blog/b-post`), path: "/blog/b-post", file: "b.html", html: buildPage() },
      ],
      allPaths: new Set(["/", "/blog", "/blog/a-post", "/blog/b-post"]),
    });
    const results = new Map(auditSite(input, SITE_RULES).siteResults.map((r) => [r.id, r]));
    const clash = results.get("canonical-uniqueness");
    expect(clash?.status).toBe("fail");
    expect(clash?.message).toContain("/blog/a-post");
    expect(clash?.message).toContain("/blog/b-post");
  });

  it("no-noindex-anywhere reports the offending page", () => {
    const input = baseInput({
      pages: [
        {
          url: toAbsoluteUrl(CANONICAL),
          path: "/blog/a-post",
          file: "a.html",
          html: buildPage({ robots: "noindex, follow" }),
        },
      ],
    });
    const results = new Map(auditSite(input, SITE_RULES).siteResults.map((r) => [r.id, r]));
    expect(results.get("no-noindex-anywhere")?.status).toBe("fail");
    expect(results.get("no-noindex-anywhere")?.message).toContain("/blog/a-post");
  });
});

describe("rule coverage", () => {
  it("registers every rule id the engines actually emit", () => {
    const emitted = new Set<string>();
    for (const result of run(buildPage()).values()) emitted.add(result.id);
    for (const result of auditSite(
      {
        pages: [{ url: toAbsoluteUrl(CANONICAL), path: "/blog/a-post", file: "a.html", html: buildPage() }],
        allPaths: new Set(["/blog/a-post"]),
        sitemapXml: null,
        robotsTxt: null,
      },
      SITE_RULES,
    ).siteResults) {
      emitted.add(result.id);
    }

    // RULE_IDS is a readonly tuple of literals; widening it to string[] for the
    // membership test avoids asserting each emitted id into the union.
    const registered: readonly string[] = RULE_IDS;
    const unregistered = [...emitted].filter((id) => !registered.includes(id));
    expect(unregistered).toEqual([]);
    // 34 page + site rules run; the registry may list ids reserved for later.
    expect(emitted.size).toBeGreaterThanOrEqual(30);
  });
});

describe("an unreadable page reports rather than throwing", () => {
  // Found by running the pipeline against a URL that was not deployed yet: the
  // fetch-failed marker parses to a document with a null documentElement, and a
  // rule that touched it crashed the whole audit. One unreachable page must
  // never mean no report at all.
  const ctx = context();

  it("does not throw on the fetch-failed marker", () => {
    expect(() => auditPage("<!-- fetch-failed -->", ctx)).not.toThrow();
  });

  it("reports why, and scores zero", () => {
    const audit = auditPage("<!-- fetch-failed -->", ctx);
    expect(audit.score).toBe(0);
    expect(audit.results).toHaveLength(1);
    expect(audit.results[0]?.status).toBe("fail");
    expect(audit.results[0]?.message).toContain("could not be fetched");
  });

  it("does not throw on an empty body", () => {
    expect(() => auditPage("", ctx)).not.toThrow();
    expect(auditPage("", ctx).results[0]?.message).toContain("could not be parsed");
  });

  it("still audits a real page normally", () => {
    expect(auditPage(buildPage(), ctx).results.length).toBeGreaterThan(20);
  });
});
