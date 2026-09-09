import { z } from "zod";

/**
 * The AI analyzer's output.
 *
 * The length bounds mirror spec 02's *optimal* thresholds on purpose: a
 * suggestion the deterministic validator would immediately flag is not a useful
 * suggestion, so it is refused at the boundary rather than stored and shown to
 * an editor who would then be misled by it.
 */
export const seoAnalysisSchema = z.object({
  primaryTopic: z.string().min(3).max(80),
  searchIntent: z.enum(["informational", "commercial", "transactional", "navigational"]),
  secondaryTopics: z.array(z.string().min(3).max(80)).max(8),
  entities: z.array(z.string()).max(15),
  suggestedTitle: z.string().min(15).max(60),
  suggestedDescription: z.string().min(70).max(160),
  suggestedSlug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(70),
  summary: z.string().min(40).max(400),
  likelyQuestions: z.array(z.string()).max(8),
  contentGaps: z.array(z.string()).max(8),
  faqOpportunities: z
    .array(z.object({ question: z.string(), why: z.string() }))
    .max(6),
});

export type SeoAnalysis = z.infer<typeof seoAnalysisSchema>;

/**
 * A recommended internal link.
 *
 * Both constraints are enforced in code after the model responds, never merely
 * requested in the prompt: `targetUrl` must be one of the supplied candidates,
 * and `anchorText` must occur verbatim in the article it would be inserted
 * into. The model therefore cannot invent a URL, and cannot propose an anchor
 * an editor would have to write from scratch.
 */
export const linkSuggestionSchema = z.object({
  targetUrl: z.string().url(),
  anchorText: z.string().min(2),
  reason: z.string().min(5),
  confidence: z.number().min(0).max(1),
  /** For inbound suggestions: the existing article that should carry the link. */
  sourceUrl: z.string().url().nullable().default(null),
});

export type LinkSuggestion = z.infer<typeof linkSuggestionSchema>;

/** Where a live value diverges from what the analyzer suggested. */
export const metadataDiffSchema = z.object({
  field: z.enum(["title", "description", "slug"]),
  live: z.string(),
  suggested: z.string().nullable(),
  reason: z.string(),
  /** Changing a published slug breaks every existing link to it. */
  actionable: z.boolean(),
});

export type MetadataDiff = z.infer<typeof metadataDiffSchema>;

const ruleResultSchema = z.object({
  id: z.string(),
  severity: z.enum(["error", "warning"]),
  status: z.enum(["pass", "fail", "not-applicable"]),
  message: z.string(),
});

/** The audit result, in the shape spec 02's engine produces. */
export const pageAuditSchema = z.object({
  url: z.string(),
  path: z.string(),
  file: z.string(),
  kind: z.string(),
  score: z.number().int().min(0).max(100),
  results: z.array(ruleResultSchema),
});

export const seoReportSchema = z.object({
  postId: z.string(),
  slug: z.string(),
  url: z.string(),
  generatedAt: z.string(),
  ghostUpdatedAt: z.string(),

  /** Authoritative: produced by spec 02's rules against the live HTML. */
  technical: pageAuditSchema.nullable(),
  technicalScore: z.number().int().min(0).max(100).nullable(),
  validationStatus: z.enum(["validated", "deploy-timeout", "fetch-failed", "skipped"]),

  /** Advisory. Null when the analyzer failed, was rate-limited, or has no key. */
  analysis: seoAnalysisSchema.nullable(),
  analysisError: z.string().nullable(),

  outboundLinkSuggestions: z.array(linkSuggestionSchema),
  inboundLinkSuggestions: z.array(linkSuggestionSchema),
  droppedSuggestions: z.number().int().nonnegative(),

  diffs: z.array(metadataDiffSchema),
});

export type SeoReport = z.infer<typeof seoReportSchema>;

export const seoReportSummarySchema = z.object({
  slug: z.string(),
  url: z.string(),
  generatedAt: z.string(),
  technicalScore: z.number().int().nullable(),
  errorCount: z.number().int().nonnegative(),
  hasAnalysis: z.boolean(),
});

export type SeoReportSummary = z.infer<typeof seoReportSummarySchema>;

export const summarise = (report: SeoReport): SeoReportSummary => ({
  slug: report.slug,
  url: report.url,
  generatedAt: report.generatedAt,
  technicalScore: report.technicalScore,
  errorCount:
    report.technical?.results.filter(
      (result) => result.severity === "error" && result.status === "fail",
    ).length ?? 0,
  hasAnalysis: report.analysis !== null,
});
