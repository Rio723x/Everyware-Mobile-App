import { parseHTML } from "linkedom";
import type { AbsoluteUrl } from "../brand.js";
import type { PageKind } from "../metadata/types.js";
import { headRules } from "./rules/head.js";
import { jsonLdRules } from "./rules/jsonld.js";
import { linkRules } from "./rules/links.js";
import { socialRules } from "./rules/social.js";
import { structureRules } from "./rules/structure.js";
import type {
  PageAudit,
  PageContext,
  PageRule,
  RuleResult,
  RuleSeverity,
  SiteAudit,
} from "./registry.js";

/** Every page rule, in a fixed order so reports are comparable across runs. */
export const PAGE_RULES: readonly PageRule[] = [
  ...headRules,
  ...structureRules,
  ...socialRules,
  ...jsonLdRules,
  ...linkRules,
];

const WEIGHT: Readonly<Record<RuleSeverity, number>> = { error: 3, warning: 1 };

/**
 * A deterministic score from the results alone.
 *
 * Errors weigh three times a warning; `not-applicable` rules are excluded from
 * both sums, so a page is never punished for a rule that does not apply to it.
 * A page with nothing applicable scores 100 rather than dividing by zero.
 */
export const scoreOf = (results: readonly RuleResult[]): number => {
  const applicable = results.filter((result) => result.status !== "not-applicable");
  if (applicable.length === 0) {
    return 100;
  }
  const total = applicable.reduce((sum, result) => sum + WEIGHT[result.severity], 0);
  const earned = applicable
    .filter((result) => result.status === "pass")
    .reduce((sum, result) => sum + WEIGHT[result.severity], 0);
  return Math.round((100 * earned) / total);
};

export const hasErrors = (results: readonly RuleResult[]): boolean =>
  results.some((result) => result.severity === "error" && result.status === "fail");

/** Derives a page kind from its public path, mirroring spec 01's route table. */
export const kindOfPath = (path: string): PageKind | "unknown" => {
  if (path === "/blog" || /^\/blog\/page\/\d+$/.test(path)) return "listing";
  if (/^\/blog\/category\//.test(path)) return "category";
  if (/^\/blog\/author\//.test(path)) return "author";
  if (/^\/blog\/[^/]+$/.test(path)) return "article";
  return "unknown";
};

/**
 * A page that could not be fetched or parsed.
 *
 * Returned instead of running the rules, because a rule handed an empty
 * document has nothing to say about it - and a rule that throws takes the whole
 * audit down with it, turning "one page was unreachable" into "no report at
 * all". Reported as a single failing result so it still counts against the score.
 */
export const UNREADABLE_PREFIX = "could not audit";

/** True when a page was not fetchable or parseable, so no rule could run. */
export const isUnreadable = (audit: PageAudit): boolean =>
  audit.results.length === 1 && (audit.results[0]?.message.startsWith(UNREADABLE_PREFIX) ?? false);

const unreadablePage = (ctx: PageContext, reason: string): PageAudit => {
  const results: RuleResult[] = [
    {
      id: "canonical-present",
      severity: "error",
      status: "fail",
      message: `${UNREADABLE_PREFIX} ${ctx.url}: ${reason}`,
    },
  ];
  return { url: ctx.url, path: ctx.path, file: ctx.file, kind: ctx.kind, results, score: 0 };
};

export const auditPage = (html: string, ctx: PageContext): PageAudit => {
  const { document } = parseHTML(html);

  // linkedom yields a document with a null documentElement for empty or
  // unparseable input - which is what a failed fetch produces.
  if (document.documentElement === null) {
    return unreadablePage(
      ctx,
      html.includes("fetch-failed") ? "the page could not be fetched" : "the page could not be parsed",
    );
  }

  const results = PAGE_RULES.map((rule) => rule(document, ctx));

  return {
    url: ctx.url,
    path: ctx.path,
    file: ctx.file,
    kind: ctx.kind,
    results,
    score: scoreOf(results),
  };
};

export interface SitePage {
  readonly url: AbsoluteUrl;
  readonly path: string;
  readonly file: string;
  readonly html: string;
  readonly status?: number;
  readonly redirectChain?: readonly string[];
  readonly xRobotsTag?: string | null;
}

export interface SiteAuditInput {
  /**
   * The pages the rules grade.
   *
   * Deliberately narrower than everything the build emits: spec 02 §2 puts the
   * React SPA's own `<head>` out of scope, so `/` is not audited. Grading a
   * page nobody is authorised to change in this spec produces findings that
   * can only be ignored, and a gate people learn to ignore stops being a gate.
   */
  readonly pages: readonly SitePage[];
  /**
   * Every path the build emitted, audited or not. Internal links from the blog
   * to the marketing site must still resolve.
   */
  readonly allPaths: ReadonlySet<string>;
  readonly sitemapXml: string | null;
  readonly robotsTxt: string | null;
}

/** Site-level rules see the whole output, not one page at a time. */
export type SiteRule = (input: SiteAuditInput, pages: readonly PageAudit[]) => RuleResult;

export const auditSite = (
  input: SiteAuditInput,
  siteRules: readonly SiteRule[],
): SiteAudit => {
  const emittedPaths = input.allPaths;

  const pages = input.pages.map((page) =>
    auditPage(page.html, {
      url: page.url,
      path: page.path,
      file: page.file,
      kind: kindOfPath(page.path),
      emittedPaths,
      ...(page.status === undefined ? {} : { status: page.status }),
      ...(page.redirectChain === undefined ? {} : { redirectChain: page.redirectChain }),
      ...(page.xRobotsTag === undefined ? {} : { xRobotsTag: page.xRobotsTag }),
    }),
  );

  const siteResults = siteRules.map((rule) => rule(input, pages));
  const allResults = [...pages.flatMap((page) => page.results), ...siteResults];

  return { pages, siteResults, score: scoreOf(allResults) };
};
