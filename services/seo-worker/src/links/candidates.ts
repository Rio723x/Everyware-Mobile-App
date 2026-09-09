import type { BlogPost } from "@everyware/ghost";
import { siteUrl } from "@everyware/seo-core";
import { cosineSimilarity, inverseDocumentFrequency, tfidfVector, tokenize } from "./tokenize.js";
import type { IndexedArticle, ScoredCandidate } from "./types.js";

export const CANDIDATE_LIMIT = 10;
export const RECENCY_HORIZON_DAYS = 365;

const WEIGHT = { cosine: 0.5, tags: 0.3, recency: 0.2 } as const;

/** Slugs an article's body already links to, so they are never re-suggested. */
const linkedSlugsOf = (html: string): readonly string[] => [
  ...new Set(
    [...html.matchAll(/href="(?:https:\/\/[^/"]+)?\/blog\/([a-z0-9_-]+)"/g)]
      .map((match) => match[1])
      .filter((slug): slug is string => slug !== undefined),
  ),
];

/**
 * Builds the content index.
 *
 * IDF needs the whole corpus, so this is a batch operation over every post
 * rather than something computable one article at a time.
 */
export const buildContentIndex = (posts: readonly BlogPost[]): readonly IndexedArticle[] => {
  const documents = posts.map((post) =>
    tokenize(`${post.title} ${post.excerpt} ${post.plaintext}`),
  );
  const idf = inverseDocumentFrequency(documents);

  return posts.map((post, index) => ({
    id: post.id,
    slug: post.slug,
    url: siteUrl(`/blog/${post.slug}`),
    title: post.title,
    excerpt: post.excerpt,
    publishedAt: post.publishedAt,
    tagSlugs: post.tags.map((tag) => tag.slug),
    terms: tfidfVector(documents[index] ?? [], idf),
    linkedSlugs: [...linkedSlugsOf(post.html)],
  }));
};

/** 1.0 today, falling linearly to 0.0 at the horizon. */
export const recencyBoost = (
  publishedAt: string,
  nowMs: number,
  horizonDays: number = RECENCY_HORIZON_DAYS,
): number => {
  const ageDays = (nowMs - Date.parse(publishedAt)) / 86_400_000;
  if (Number.isNaN(ageDays)) return 0;
  return Math.max(0, Math.min(1, 1 - ageDays / horizonDays));
};

const jaccard = (a: readonly string[], b: readonly string[]): number => {
  if (a.length === 0 && b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = [...setA].filter((value) => setB.has(value)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
};

/**
 * Ranks internal-link candidates for one article. Pure and deterministic.
 *
 *   0.5 * cosine(tfidf) + 0.3 * jaccard(tags) + 0.2 * recency
 *
 * The final slug tiebreak is what makes it reproducible: without it, two posts
 * with identical scores and timestamps could order differently between runs, and
 * a rebuild with unchanged content would produce different suggestions.
 *
 * This half does the real work. The model in `ranker.ts` only chooses among
 * what this produces and explains why - which is what keeps it from inventing
 * a URL.
 */
export const scoreCandidates = (
  source: IndexedArticle,
  index: readonly IndexedArticle[],
  nowMs: number,
  limit: number = CANDIDATE_LIMIT,
): readonly ScoredCandidate[] => {
  const alreadyLinked = new Set(source.linkedSlugs);

  return index
    .filter((article) => article.id !== source.id && !alreadyLinked.has(article.slug))
    .map((article) => {
      const cosine = cosineSimilarity(source.terms, article.terms);
      const tagOverlap = jaccard(source.tagSlugs, article.tagSlugs);
      const score =
        WEIGHT.cosine * cosine +
        WEIGHT.tags * tagOverlap +
        WEIGHT.recency * recencyBoost(article.publishedAt, nowMs);

      return {
        article,
        score,
        cosine,
        sharedTags: article.tagSlugs.filter((slug) => source.tagSlugs.includes(slug)).length,
      };
    })
    .sort((a, b) => b.score - a.score || a.article.slug.localeCompare(b.article.slug))
    .slice(0, limit);
};

/**
 * The reverse direction: existing articles that should link *to* a new one.
 *
 * A new post starts with zero inbound internal links, and that is the gap worth
 * closing - outbound links alone leave it an orphan in the link graph, reachable
 * only from the listing page.
 */
export const scoreInboundCandidates = (
  target: IndexedArticle,
  index: readonly IndexedArticle[],
  nowMs: number,
  limit: number = CANDIDATE_LIMIT,
): readonly ScoredCandidate[] =>
  scoreCandidates(target, index, nowMs, index.length)
    // Exclude articles that already link to the target: they need no suggestion.
    .filter((candidate) => !candidate.article.linkedSlugs.includes(target.slug))
    .slice(0, limit);
