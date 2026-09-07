import { AI_USER_AGENTS, siteUrl } from "../../config.js";
import { check, fail, pass, type RuleResult } from "../registry.js";
import type { SiteRule } from "../audit.js";
import { readCanonical, readTitle, readDescription } from "./head.js";
import { parseHTML } from "linkedom";

/** `<loc>` values, extracted without a full XML parser dependency. */
const locsOf = (xml: string): readonly string[] =>
  [...xml.matchAll(/<loc>([\s\S]*?)<\/loc>/g)]
    .map((match) => match[1]?.trim())
    .filter((loc): loc is string => loc !== undefined && loc !== "");

const lastmodsOf = (xml: string): readonly string[] =>
  [...xml.matchAll(/<lastmod>([\s\S]*?)<\/lastmod>/g)]
    .map((match) => match[1]?.trim())
    .filter((value): value is string => value !== undefined);

const duplicatesIn = (values: readonly string[]): readonly string[] => {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
};

export const sitemapExists: SiteRule = (input) =>
  check("sitemap-exists", "error", input.sitemapXml !== null, "no sitemap.xml in the output");

export const sitemapWellformed: SiteRule = (input) => {
  const xml = input.sitemapXml;
  if (xml === null) {
    return fail("sitemap-wellformed", "error", "no sitemap.xml to parse");
  }
  if (!xml.trimStart().startsWith("<?xml")) {
    return fail("sitemap-wellformed", "error", "sitemap.xml has no XML declaration");
  }
  return check(
    "sitemap-wellformed",
    "error",
    /<urlset[^>]+xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/.test(xml),
    "sitemap.xml has no <urlset> in the sitemaps.org 0.9 namespace",
  );
};

export const sitemapLocsValid: SiteRule = (input) => {
  const xml = input.sitemapXml;
  if (xml === null) return fail("sitemap-locs-valid", "error", "no sitemap.xml");

  const locs = locsOf(xml);
  if (locs.length === 0) return fail("sitemap-locs-valid", "error", "sitemap contains no <loc>");

  const invalid = locs.filter((loc) => !loc.startsWith(`${siteUrl("/").slice(0, -1)}/`));
  if (invalid.length > 0) {
    return fail(
      "sitemap-locs-valid",
      "error",
      `${String(invalid.length)} loc(s) are not absolute site URLs: ${invalid.slice(0, 3).join(", ")}`,
    );
  }
  const duplicates = duplicatesIn(locs);
  return check(
    "sitemap-locs-valid",
    "error",
    duplicates.length === 0,
    `duplicate loc(s): ${duplicates.slice(0, 3).join(", ")}`,
    `${String(locs.length)} unique absolute URLs`,
  );
};

export const sitemapNoFragments: SiteRule = (input) => {
  const xml = input.sitemapXml;
  if (xml === null) return fail("sitemap-no-fragments", "error", "no sitemap.xml");

  // The defect in the file this replaces: 22 of its 23 entries were fragment
  // URLs, which crawlers collapse into the home page.
  const offenders = locsOf(xml).filter((loc) => loc.includes("#") || loc.includes("?"));
  return check(
    "sitemap-no-fragments",
    "error",
    offenders.length === 0,
    `${String(offenders.length)} loc(s) contain a fragment or query: ${offenders.slice(0, 3).join(", ")}`,
  );
};

const W3C_DATETIME =
  /^\d{4}(-\d{2}(-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2}))?)?)?$/;

export const sitemapLastmodValid: SiteRule = (input) => {
  const xml = input.sitemapXml;
  if (xml === null) return fail("sitemap-lastmod-valid", "error", "no sitemap.xml");

  const invalid = lastmodsOf(xml).filter((value) => !W3C_DATETIME.test(value));
  return check(
    "sitemap-lastmod-valid",
    "error",
    invalid.length === 0,
    `${String(invalid.length)} invalid lastmod value(s): ${invalid.slice(0, 3).join(", ")}`,
  );
};

/**
 * The load-bearing sitemap rule.
 *
 * Set equality in **both** directions, deliberately: containment one way misses
 * pages absent from the sitemap, containment the other way misses sitemap
 * entries pointing at URLs that no longer exist. One assertion catches both.
 */
export const sitemapComplete: SiteRule = (input) => {
  const xml = input.sitemapXml;
  if (xml === null) return fail("sitemap-complete", "error", "no sitemap.xml");

  const listed = new Set(locsOf(xml));
  const canonicals = new Set(
    input.pages
      .map((page) => readCanonical(parseHTML(page.html).document))
      .filter((value): value is string => value !== null),
  );

  const missing = [...canonicals].filter((url) => !listed.has(url));
  const orphaned = [...listed].filter(
    (url) => !canonicals.has(url) && url !== siteUrl("/"),
  );

  if (missing.length === 0 && orphaned.length === 0) {
    return pass("sitemap-complete", "error", `${String(listed.size)} URLs, exactly matching the pages`);
  }
  const parts: string[] = [];
  if (missing.length > 0) {
    parts.push(`${String(missing.length)} page(s) missing from the sitemap: ${missing.slice(0, 3).join(", ")}`);
  }
  if (orphaned.length > 0) {
    parts.push(`${String(orphaned.length)} sitemap entr(ies) with no page: ${orphaned.slice(0, 3).join(", ")}`);
  }
  return fail("sitemap-complete", "error", parts.join("; "));
};

export const robotsExists: SiteRule = (input) =>
  check("robots-exists", "error", input.robotsTxt !== null, "no robots.txt in the output");

export const robotsSitemapLine: SiteRule = (input) => {
  const txt = input.robotsTxt;
  if (txt === null) return fail("robots-sitemap-line", "error", "no robots.txt");
  const expected = `Sitemap: ${siteUrl("/sitemap.xml")}`;
  return check(
    "robots-sitemap-line",
    "error",
    txt.includes(expected),
    `robots.txt does not contain "${expected}"`,
  );
};

export const robotsNoBlanketDisallow: SiteRule = (input) => {
  const txt = input.robotsTxt;
  if (txt === null) return fail("robots-no-blanket-disallow", "error", "no robots.txt");

  // Walked line by line rather than matched with one regex. The obvious regex
  // wants an end-of-string anchor inside a multiline match, and JavaScript has
  // no \Z - a first attempt here used one and silently matched a literal "Z",
  // so the rule passed everything until a negative test caught it.
  let inWildcardGroup = false;
  for (const rawLine of txt.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;

    const agent = /^User-agent:\s*(.+)$/i.exec(line);
    if (agent !== null) {
      inWildcardGroup = agent[1]?.trim() === "*";
      continue;
    }
    if (inWildcardGroup && /^Disallow:\s*\/\s*$/i.test(line)) {
      return fail(
        "robots-no-blanket-disallow",
        "error",
        "the User-agent: * group contains Disallow: /, which hides the entire site from every crawler",
      );
    }
  }
  return pass("robots-no-blanket-disallow", "error", "the wildcard group allows crawling");
};

export const robotsAiAgentsPreserved: SiteRule = (input) => {
  const txt = input.robotsTxt;
  if (txt === null) return fail("robots-ai-agents-preserved", "error", "no robots.txt");

  const missing = AI_USER_AGENTS.filter(
    (agent) => !new RegExp(`^User-agent:\\s*${agent}\\s*$`, "m").test(txt),
  );
  return check(
    "robots-ai-agents-preserved",
    "error",
    missing.length === 0,
    `AI crawler allowances lost in the rewrite: ${missing.join(", ")}`,
    `all ${String(AI_USER_AGENTS.length)} preserved`,
  );
};

/** Two pages claiming one canonical means one of them will never rank. */
export const canonicalUniqueness: SiteRule = (input) => {
  const byCanonical = new Map<string, string[]>();
  for (const page of input.pages) {
    const canonical = readCanonical(parseHTML(page.html).document);
    if (canonical === null) continue;
    byCanonical.set(canonical, [...(byCanonical.get(canonical) ?? []), page.path]);
  }
  const clashes = [...byCanonical.entries()].filter(([, paths]) => paths.length > 1);
  return check(
    "canonical-uniqueness",
    "error",
    clashes.length === 0,
    clashes
      .slice(0, 3)
      .map(([canonical, paths]) => `${paths.join(" and ")} both claim ${canonical}`)
      .join("; "),
  );
};

export const noNoindexAnywhere: SiteRule = (_input, pages) => {
  const offenders = pages
    .filter((page) =>
      page.results.some((result) => result.id === "robots-not-noindex" && result.status === "fail"),
    )
    .map((page) => page.path);
  return check(
    "no-noindex-anywhere",
    "error",
    offenders.length === 0,
    `noindex found on: ${offenders.slice(0, 5).join(", ")}`,
  );
};

const uniquenessRule = (
  id: "title-unique" | "description-unique",
  label: string,
  read: (doc: Document) => string | null,
): SiteRule => {
  return (input): RuleResult => {
    const byValue = new Map<string, string[]>();
    for (const page of input.pages) {
      const value = read(parseHTML(page.html).document);
      if (value === null || value === "") continue;
      byValue.set(value, [...(byValue.get(value) ?? []), page.path]);
    }
    const clashes = [...byValue.entries()].filter(([, paths]) => paths.length > 1);
    return check(
      id,
      "error",
      clashes.length === 0,
      clashes
        .slice(0, 3)
        .map(([value, paths]) => `${paths.join(" and ")} share the ${label} "${value.slice(0, 60)}"`)
        .join("; "),
    );
  };
};

export const titleUnique = uniquenessRule("title-unique", "title", readTitle);
export const descriptionUnique = uniquenessRule(
  "description-unique",
  "description",
  readDescription,
);

export const SITE_RULES: readonly SiteRule[] = [
  sitemapExists,
  sitemapWellformed,
  sitemapLocsValid,
  sitemapNoFragments,
  sitemapLastmodValid,
  sitemapComplete,
  robotsExists,
  robotsSitemapLine,
  robotsNoBlanketDisallow,
  robotsAiAgentsPreserved,
  canonicalUniqueness,
  noNoindexAnywhere,
  titleUnique,
  descriptionUnique,
];
