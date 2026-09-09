import type { PageAudit } from "@everyware/seo-core";
import { metadataDiffSchema, type MetadataDiff, type SeoAnalysis } from "./types.js";

const observedValue = (audit: PageAudit, ruleId: string): string => {
  const result = audit.results.find((entry) => entry.id === ruleId);
  return result?.message ?? "";
};

const failed = (audit: PageAudit, ruleId: string): boolean =>
  audit.results.some((entry) => entry.id === ruleId && entry.status === "fail");

/**
 * Compares what is live against what the analyzer suggested.
 *
 * A diff is a **comparison, never an action**. Nothing here writes to Ghost, to
 * the repository, or to a rendered page - an editor reads it and decides. That
 * is the whole division of authority in spec 03, and it is enforced by this
 * module having no write path at all rather than by convention.
 *
 * Rule-derived diffs are produced even when `analysis` is null, because a
 * 71-character title is worth flagging whether or not a model had an opinion
 * about it.
 */
export const buildDiffs = (
  audit: PageAudit | null,
  analysis: SeoAnalysis | null,
  live: { readonly title: string; readonly description: string; readonly slug: string },
): readonly MetadataDiff[] => {
  const diffs: MetadataDiff[] = [];

  const push = (
    field: MetadataDiff["field"],
    liveValue: string,
    suggested: string | null,
    reason: string,
    actionable: boolean,
  ): void => {
    diffs.push(metadataDiffSchema.parse({ field, live: liveValue, suggested, reason, actionable }));
  };

  // Rule-derived: independent of the analyzer.
  if (audit !== null) {
    if (failed(audit, "title-length") || failed(audit, "title-optimal")) {
      push(
        "title",
        live.title,
        analysis?.suggestedTitle ?? null,
        observedValue(audit, failed(audit, "title-length") ? "title-length" : "title-optimal"),
        true,
      );
    }
    if (failed(audit, "description-length") || failed(audit, "description-optimal")) {
      push(
        "description",
        live.description,
        analysis?.suggestedDescription ?? null,
        observedValue(
          audit,
          failed(audit, "description-length") ? "description-length" : "description-optimal",
        ),
        true,
      );
    }
  }

  if (analysis !== null) {
    const has = (field: MetadataDiff["field"]): boolean => diffs.some((d) => d.field === field);

    if (!has("title") && analysis.suggestedTitle !== live.title) {
      push("title", live.title, analysis.suggestedTitle, "the analyzer proposes a different title", true);
    }
    if (!has("description") && analysis.suggestedDescription !== live.description) {
      push(
        "description",
        live.description,
        analysis.suggestedDescription,
        "the analyzer proposes a different meta description",
        true,
      );
    }
    if (analysis.suggestedSlug !== live.slug) {
      push(
        "slug",
        live.slug,
        analysis.suggestedSlug,
        "changing a published slug breaks every existing link to it, and needs a redirect - not actionable on its own",
        false,
      );
    }
  }

  // Stable ordering so two reports for the same article are comparable.
  const order: readonly MetadataDiff["field"][] = ["title", "description", "slug"];
  return [...diffs].sort((a, b) => order.indexOf(a.field) - order.indexOf(b.field));
};
