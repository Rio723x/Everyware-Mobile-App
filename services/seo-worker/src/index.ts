import type { GhostClient } from "@everyware/ghost";
import { buildDescription, buildTitle, toSlug } from "@everyware/seo-core";
import { StubAnalyzer, type SeoAnalyzer } from "./analyzer/index.js";
import {
  buildContentIndex,
  nullRanker,
  scoreCandidates,
  scoreInboundCandidates,
  type LinkRanker,
} from "./links/index.js";
import { buildDiffs } from "./report/diff.js";
import { seoReportSchema, type LinkSuggestion, type SeoReport } from "./report/types.js";
import type { SeoStore } from "./store/store.js";
import type { Validator } from "./validator/index.js";

export const MAX_ANALYSES_PER_HOUR = 20;
const ANALYSIS_COUNTER_KEY = "analyses:hourly";
const ANALYSIS_WINDOW_SECONDS = 3600;

export interface ProcessPostConfig {
  readonly ghost: GhostClient;
  readonly store: SeoStore;
  readonly validator: Validator;
  readonly analyzer?: SeoAnalyzer;
  readonly ranker?: LinkRanker;
  readonly now?: () => Date;
  readonly log?: (message: string, detail?: unknown) => void;
}

export interface ProcessResult {
  readonly report: SeoReport | null;
  readonly skipped?: string;
}

/**
 * The worker's single entry point.
 *
 * Order matters: analysis and link suggestions run first because they are cheap
 * and independent, then the deploy-gated validation, then the report. Every
 * advisory step is wrapped so its failure degrades that field to null or empty
 * and nothing else - the technical audit is the authoritative output and must
 * survive anything the model or the network does.
 *
 * Nothing here writes to Ghost. There is no Admin API call anywhere in this
 * package, which is what makes a webhook loop structurally impossible rather
 * than merely unlikely: no worker action can generate a `post.edited` event.
 */
export const processPost = async (
  slug: string,
  config: ProcessPostConfig,
): Promise<ProcessResult> => {
  const now = config.now ?? (() => new Date());
  const log = config.log ?? (() => undefined);
  const analyzer = config.analyzer ?? new StubAnalyzer();
  const ranker = config.ranker ?? nullRanker;

  const post = await config.ghost.getPostBySlug(toSlug(slug));
  if (post === null) {
    return { report: null, skipped: `no published post at slug "${slug}"` };
  }

  const posts = await config.ghost.listPosts();

  // ── advisory: AI analysis ────────────────────────────────────────────────
  let analysis = null;
  let analysisError: string | null = null;

  const analysesThisHour = await config.store.incrementCounter(
    ANALYSIS_COUNTER_KEY,
    ANALYSIS_WINDOW_SECONDS,
  );

  if (analysesThisHour > MAX_ANALYSES_PER_HOUR) {
    // The guard protects a free-tier quota, so exceeding it skips the advisory
    // layer and touches nothing else. Validation and the report still happen.
    analysisError = `skipped: ${String(analysesThisHour - 1)} analyses already run this hour (limit ${String(MAX_ANALYSES_PER_HOUR)})`;
    log("analysis rate limit reached", analysisError);
  } else {
    try {
      const outcome = await analyzer.analyze(post);
      if (outcome.ok) {
        analysis = outcome.analysis;
      } else {
        analysisError = outcome.error;
      }
    } catch (error) {
      analysisError = error instanceof Error ? error.message : String(error);
    }
  }

  // ── advisory: internal links ─────────────────────────────────────────────
  let outbound: readonly LinkSuggestion[] = [];
  let inbound: readonly LinkSuggestion[] = [];
  let dropped = 0;

  try {
    const index = buildContentIndex(posts);
    await config.store.saveContentIndex(index);

    const source = index.find((article) => article.slug === post.slug);
    if (source !== undefined) {
      const nowMs = now().getTime();

      const outboundResult = await ranker.rank({
        anchorSourceText: post.plaintext,
        sourceTitle: post.title,
        candidates: scoreCandidates(source, index, nowMs),
      });
      outbound = outboundResult.suggestions;
      dropped += outboundResult.dropped;

      // Inbound: which existing articles should link here. A new post starts
      // with no inbound links, which is the gap actually worth closing.
      for (const candidate of scoreInboundCandidates(source, index, nowMs, 3)) {
        const existing = posts.find((p) => p.slug === candidate.article.slug);
        if (existing === undefined) continue;

        const result = await ranker.rank({
          anchorSourceText: existing.plaintext,
          sourceTitle: existing.title,
          candidates: [{ ...candidate, article: source }],
          sourceUrlForSuggestions: () => candidate.article.url,
        });
        inbound = [...inbound, ...result.suggestions];
        dropped += result.dropped;
      }
    }
  } catch (error) {
    log("link recommendation failed", error);
  }

  // ── authoritative: validation against the live HTML ──────────────────────
  const validation = await config.validator.validateArticle(post.slug, post.updatedAt);

  const report = seoReportSchema.parse({
    postId: post.id,
    slug: post.slug,
    url: `https://everyware.in/blog/${post.slug}`,
    generatedAt: now().toISOString(),
    ghostUpdatedAt: post.updatedAt,

    technical: validation.audit,
    // Copied, never recomputed: a second scoring implementation would drift
    // from the audit and the report would then disagree with itself.
    technicalScore: validation.audit?.score ?? null,
    validationStatus: validation.status,

    analysis,
    analysisError,

    outboundLinkSuggestions: outbound,
    inboundLinkSuggestions: inbound,
    droppedSuggestions: dropped,

    diffs: buildDiffs(validation.audit, analysis, {
      title: buildTitle({ kind: "article", post }),
      description: buildDescription({ kind: "article", post }),
      slug: post.slug,
    }),
  });

  await config.store.saveReport(report);
  return { report };
};

export * from "./analyzer/index.js";
export * from "./deploy/index.js";
export * from "./links/index.js";
export * from "./store/index.js";
export * from "./validator/index.js";
export * from "./webhook/index.js";
export { buildDiffs } from "./report/diff.js";
export { formatReport, parseReportArgs, runReportCli } from "./report/cli.js";
export {
  seoAnalysisSchema,
  seoReportSchema,
  summarise,
  type LinkSuggestion,
  type MetadataDiff,
  type SeoAnalysis,
  type SeoReport,
  type SeoReportSummary,
} from "./report/types.js";
