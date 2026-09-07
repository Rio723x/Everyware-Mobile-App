import type { AbsoluteUrl } from "../brand.js";
import type { PageKind } from "../metadata/types.js";

/**
 * Every rule id, as a literal union rather than `string`.
 *
 * Adding a result with an unregistered id is a compile error, and the audit
 * report's shape is therefore known statically - which matters because spec 03
 * consumes it and would otherwise be matching on strings that might not exist.
 */
export const RULE_IDS = [
  // head
  "title-present",
  "title-length",
  "title-optimal",
  "title-unique",
  "description-present",
  "description-length",
  "description-optimal",
  "description-unique",
  "canonical-present",
  "canonical-absolute",
  "canonical-self",
  "canonical-no-trailing-slash",
  "robots-not-noindex",
  "robots-directives",
  // structure
  "html-lang",
  "charset-viewport",
  "h1-single",
  "h1-non-empty",
  "heading-order",
  "img-alt",
  // social
  "og-required",
  "og-image-dimensions",
  "og-image-absolute",
  "og-image-alt",
  "og-url-canonical",
  "og-article-fields",
  "twitter-required",
  // json-ld
  "jsonld-parses",
  "jsonld-blogposting",
  "jsonld-breadcrumb",
  "jsonld-matches-page",
  // links
  "internal-links-present",
  "internal-links-resolve",
  "pagination-rel",
  // site-level
  "sitemap-exists",
  "sitemap-wellformed",
  "sitemap-locs-valid",
  "sitemap-no-fragments",
  "sitemap-lastmod-valid",
  "sitemap-complete",
  "robots-exists",
  "robots-sitemap-line",
  "robots-no-blanket-disallow",
  "robots-ai-agents-preserved",
  "canonical-uniqueness",
  "no-noindex-anywhere",
] as const;

export type RuleId = (typeof RULE_IDS)[number];

export type RuleSeverity = "error" | "warning";
export type RuleStatus = "pass" | "fail" | "not-applicable";

export interface RuleResult {
  readonly id: RuleId;
  readonly severity: RuleSeverity;
  readonly status: RuleStatus;
  /** States the observed value on failure. "title-length failed" costs an afternoon. */
  readonly message: string;
}

/** What a page rule knows about the page beyond its DOM. */
export interface PageContext {
  readonly url: AbsoluteUrl;
  /** Public path, e.g. `/blog/washing-machine-care`. */
  readonly path: string;
  readonly file: string;
  readonly kind: PageKind | "unknown";
  /** Populated by the HTTP adapter; undefined when auditing files on disk. */
  readonly status?: number;
  readonly redirectChain?: readonly string[];
  readonly xRobotsTag?: string | null;
  /** Every path the build emitted, for link resolution. */
  readonly emittedPaths: ReadonlySet<string>;
}

export type PageRule = (doc: Document, ctx: PageContext) => RuleResult;

export interface PageAudit {
  readonly url: AbsoluteUrl;
  readonly path: string;
  readonly file: string;
  readonly kind: PageKind | "unknown";
  readonly results: readonly RuleResult[];
  readonly score: number;
}

export interface SiteAudit {
  readonly pages: readonly PageAudit[];
  readonly siteResults: readonly RuleResult[];
  readonly score: number;
}

export const pass = (id: RuleId, severity: RuleSeverity, message: string): RuleResult => ({
  id,
  severity,
  status: "pass",
  message,
});

export const fail = (id: RuleId, severity: RuleSeverity, message: string): RuleResult => ({
  id,
  severity,
  status: "fail",
  message,
});

export const skip = (id: RuleId, severity: RuleSeverity, message: string): RuleResult => ({
  id,
  severity,
  status: "not-applicable",
  message,
});

/** `pass` when the condition holds, `fail` with the observed value otherwise. */
export const check = (
  id: RuleId,
  severity: RuleSeverity,
  condition: boolean,
  failure: string,
  success = "ok",
): RuleResult => (condition ? pass(id, severity, success) : fail(id, severity, failure));
