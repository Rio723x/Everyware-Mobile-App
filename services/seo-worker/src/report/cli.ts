import { toSlug } from "@everyware/seo-core";
import { createStore } from "../store/index.js";
import type { SeoReport } from "./types.js";

export interface ReportCliOptions {
  readonly slug: string | null;
  readonly all: boolean;
  readonly json: boolean;
}

export const parseReportArgs = (argv: readonly string[]): ReportCliOptions => {
  const value = (flag: string): string | null => {
    const index = argv.indexOf(flag);
    return index >= 0 ? (argv[index + 1] ?? null) : null;
  };
  return {
    slug: value("--slug"),
    all: argv.includes("--all"),
    json: argv.includes("--json"),
  };
};

const errorFailures = (report: SeoReport): readonly { id: string; message: string }[] =>
  report.technical?.results.filter(
    (result) => result.severity === "error" && result.status === "fail",
  ) ?? [];

export const formatReport = (report: SeoReport): string => {
  const lines: string[] = [];
  const failures = errorFailures(report);

  lines.push(`${report.slug}  —  ${report.url}`);
  lines.push(
    `  technical: ${report.technicalScore === null ? "not validated" : `${String(report.technicalScore)}/100`}` +
      `   (${report.validationStatus})`,
  );

  if (failures.length > 0) {
    lines.push("", "  Failing rules:");
    for (const failure of failures) {
      lines.push(`    FAIL  ${failure.id}: ${failure.message}`);
    }
  }

  if (report.analysis === null) {
    lines.push("", `  Analysis: unavailable — ${report.analysisError ?? "no reason recorded"}`);
  } else {
    const { analysis } = report;
    lines.push("", "  Analysis (advisory):");
    lines.push(`    topic:       ${analysis.primaryTopic}`);
    lines.push(`    intent:      ${analysis.searchIntent}`);
    lines.push(`    title:       ${analysis.suggestedTitle}`);
    lines.push(`    description: ${analysis.suggestedDescription}`);
    if (analysis.contentGaps.length > 0) {
      lines.push(`    gaps:        ${analysis.contentGaps.join("; ")}`);
    }
  }

  if (report.diffs.length > 0) {
    lines.push("", "  Differences from what is live:");
    for (const diff of report.diffs) {
      lines.push(`    ${diff.field}${diff.actionable ? "" : " (needs a redirect)"}: ${diff.reason}`);
      if (diff.suggested !== null) lines.push(`      suggested: ${diff.suggested}`);
    }
  }

  const links = [...report.outboundLinkSuggestions, ...report.inboundLinkSuggestions];
  if (links.length > 0) {
    lines.push("", "  Internal links to consider:");
    for (const link of links) {
      const direction = link.sourceUrl === null ? "from this article" : `from ${link.sourceUrl}`;
      lines.push(`    ${direction} → ${link.targetUrl}`);
      lines.push(`      anchor: "${link.anchorText}"  (${link.reason})`);
    }
  }
  if (report.droppedSuggestions > 0) {
    lines.push(
      "",
      `  ${String(report.droppedSuggestions)} model suggestion(s) were dropped for failing a hard constraint.`,
    );
  }

  return lines.join("\n");
};

/**
 * Prints an SEO report.
 *
 * Exits non-zero when the technical audit has error-severity failures, so this
 * works as a pre-publish or CI gate rather than only as something a human reads.
 */
export const runReportCli = async (argv: readonly string[]): Promise<number> => {
  const options = parseReportArgs(argv);
  const store = createStore();

  if (options.all) {
    const summaries = await store.listReports();
    if (summaries.length === 0) {
      process.stdout.write("No reports stored yet.\n");
      return 0;
    }
    process.stdout.write(
      `${summaries
        .map(
          (entry) =>
            `${String(entry.technicalScore ?? 0).padStart(3)}/100  ` +
            `${String(entry.errorCount).padStart(2)} errors  ` +
            `${entry.hasAnalysis ? "analysed" : "no analysis"}  ${entry.slug}`,
        )
        .join("\n")}\n`,
    );
    return summaries.some((entry) => entry.errorCount > 0) ? 1 : 0;
  }

  if (options.slug === null) {
    process.stderr.write("seo:report — pass --slug <slug> or --all\n");
    return 2;
  }

  const report = await store.getReport(toSlug(options.slug));
  if (report === null) {
    process.stderr.write(`seo:report — no report stored for "${options.slug}"\n`);
    return 2;
  }

  process.stdout.write(
    options.json ? `${JSON.stringify(report, null, 2)}\n` : `${formatReport(report)}\n`,
  );
  return errorFailures(report).length > 0 ? 1 : 0;
};
