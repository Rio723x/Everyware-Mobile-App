#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { z } from "zod";
import { auditSite, hasErrors, isGradedPath, type SiteAuditInput } from "./audit.js";
import { distPageSource } from "./dist-source.js";
import { httpPageSource, pathsFromSitemap } from "./http-source.js";
import { SITE_RULES } from "./rules/site.js";
import type { PageAudit, RuleResult, SiteAudit } from "./registry.js";

/**
 * Schema for `seo-audit.json`.
 *
 * The artifact is validated against its own schema before being written, so
 * spec 03 can consume it without guessing its shape or defensively re-checking
 * every field.
 */
export const auditReportSchema = z.object({
  generatedAt: z.string(),
  source: z.union([
    z.object({ type: z.literal("dist"), dir: z.string() }),
    z.object({ type: z.literal("http"), baseUrl: z.string() }),
  ]),
  score: z.number().int().min(0).max(100),
  errorCount: z.number().int().nonnegative(),
  warningCount: z.number().int().nonnegative(),
  pages: z.array(
    z.object({
      url: z.string(),
      path: z.string(),
      file: z.string(),
      kind: z.string(),
      score: z.number().int().min(0).max(100),
      results: z.array(
        z.object({
          id: z.string(),
          severity: z.enum(["error", "warning"]),
          status: z.enum(["pass", "fail", "not-applicable"]),
          message: z.string(),
        }),
      ),
    }),
  ),
  siteResults: z.array(
    z.object({
      id: z.string(),
      severity: z.enum(["error", "warning"]),
      status: z.enum(["pass", "fail", "not-applicable"]),
      message: z.string(),
    }),
  ),
});

export type AuditReport = z.infer<typeof auditReportSchema>;

const countBy = (audit: SiteAudit, severity: "error" | "warning"): number =>
  [...audit.pages.flatMap((page) => page.results), ...audit.siteResults].filter(
    (result) => result.severity === severity && result.status === "fail",
  ).length;

export const toReport = (
  audit: SiteAudit,
  source: AuditReport["source"],
  now: Date,
): AuditReport =>
  auditReportSchema.parse({
    generatedAt: now.toISOString(),
    source,
    score: audit.score,
    errorCount: countBy(audit, "error"),
    warningCount: countBy(audit, "warning"),
    pages: audit.pages.map((page) => ({
      url: page.url,
      path: page.path,
      file: page.file,
      kind: page.kind,
      score: page.score,
      results: page.results.map(toPlainResult),
    })),
    siteResults: audit.siteResults.map(toPlainResult),
  });

const toPlainResult = (result: RuleResult) => ({
  id: result.id,
  severity: result.severity,
  status: result.status,
  message: result.message,
});

const failuresOf = (results: readonly RuleResult[]): readonly RuleResult[] =>
  results.filter((result) => result.status === "fail");

export const formatText = (audit: SiteAudit): string => {
  const lines: string[] = [];
  const worstFirst = [...audit.pages].sort((a, b) => a.score - b.score);

  lines.push(`SEO audit — overall ${String(audit.score)}/100`, "");

  const siteFailures = failuresOf(audit.siteResults);
  lines.push(`Site-level (${String(audit.siteResults.length)} rules)`);
  if (siteFailures.length === 0) {
    lines.push("  all passing");
  } else {
    for (const result of siteFailures) {
      lines.push(`  ${result.severity === "error" ? "FAIL" : "warn"}  ${result.id}: ${result.message}`);
    }
  }
  lines.push("");

  for (const page of worstFirst) {
    const failures = failuresOf(page.results);
    if (failures.length === 0) continue;
    lines.push(`${String(page.score).padStart(3)}/100  ${page.path}`);
    for (const result of failures) {
      lines.push(`         ${result.severity === "error" ? "FAIL" : "warn"}  ${result.id}: ${result.message}`);
    }
  }

  const clean = audit.pages.filter((page) => failuresOf(page.results).length === 0).length;
  lines.push("", `${String(clean)}/${String(audit.pages.length)} pages with no findings.`);
  return lines.join("\n");
};

interface CliOptions {
  readonly dist: string | null;
  readonly baseUrl: string | null;
  readonly format: "json" | "text";
  readonly out: string;
}

export const parseArgs = (argv: readonly string[]): CliOptions => {
  const value = (flag: string): string | null => {
    const index = argv.indexOf(flag);
    return index >= 0 ? (argv[index + 1] ?? null) : null;
  };
  const format = value("--format") === "json" ? "json" : "text";
  return {
    dist: value("--dist"),
    baseUrl: value("--base-url"),
    format,
    out: value("--out") ?? "seo-audit.json",
  };
};

export const runCli = async (argv: readonly string[]): Promise<number> => {
  const options = parseArgs(argv);

  if (options.dist === null && options.baseUrl === null) {
    process.stderr.write("seo:audit — pass --dist <dir> or --base-url <url>\n");
    return 2;
  }

  let input: SiteAuditInput;
  let source: AuditReport["source"];

  if (options.dist !== null) {
    // listHtmlFiles throws when the directory is missing, rather than reporting
    // a vacuous pass on an empty page set.
    input = distPageSource(options.dist);
    source = { type: "dist", dir: options.dist };
  } else {
    const baseUrl = options.baseUrl ?? "";
    const probe = await httpPageSource([], { baseUrl });
    const advertised =
      probe.sitemapXml === null ? ["/blog"] : pathsFromSitemap(probe.sitemapXml, baseUrl);
    // Grade the same set the dist audit grades. The rest of the sitemap still
    // reaches the audit as `allPaths`, so links into it resolve.
    input = await httpPageSource(advertised.filter(isGradedPath), { baseUrl });
    source = { type: "http", baseUrl };
  }

  const audit = auditSite(input, SITE_RULES);
  const report = toReport(audit, source, new Date());

  if (options.format === "json") {
    writeFileSync(options.out, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    process.stdout.write(`seo:audit — wrote ${options.out} (score ${String(audit.score)}/100)\n`);
  } else {
    process.stdout.write(`${formatText(audit)}\n`);
  }

  const failed =
    hasErrors(audit.siteResults) || audit.pages.some((page: PageAudit) => hasErrors(page.results));
  if (failed) {
    process.stderr.write(
      `\nseo:audit FAILED — ${String(report.errorCount)} error-severity rule(s) did not pass.\n`,
    );
    return 1;
  }
  return 0;
};
