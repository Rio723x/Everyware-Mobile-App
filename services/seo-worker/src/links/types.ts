import { z } from "zod";

/**
 * One article in the content index.
 *
 * `terms` is a TF-IDF vector, stored as plain entries so it round-trips through
 * JSON without a custom serialiser.
 */
export const indexedArticleSchema = z.object({
  id: z.string(),
  slug: z.string(),
  url: z.string(),
  title: z.string(),
  excerpt: z.string(),
  publishedAt: z.string(),
  tagSlugs: z.array(z.string()),
  terms: z.record(z.string(), z.number()),
  /** Slugs this article already links to, so they are never re-suggested. */
  linkedSlugs: z.array(z.string()),
});

export type IndexedArticle = z.infer<typeof indexedArticleSchema>;

export interface ScoredCandidate {
  readonly article: IndexedArticle;
  readonly score: number;
  readonly sharedTags: number;
  readonly cosine: number;
}
