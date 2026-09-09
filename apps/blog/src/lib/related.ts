import type { BlogPost } from "@everyware/ghost";

export const RELATED_COUNT = 3;

/**
 * Picks related articles for a post, deterministically.
 *
 * Ranked by shared tag count, then by recency, then by slug. The final slug
 * tiebreak is what makes the result stable: without it, two posts with equal
 * score and equal timestamps could order differently between builds, and a
 * rebuild with unchanged content would produce a different page.
 *
 * If fewer than RELATED_COUNT posts share a tag, the list is filled with the
 * most recent others rather than left short - a two-card row looks like a bug,
 * and the block's real job is making sure no article is a dead end.
 */
export const relatedPosts = (
  source: BlogPost,
  all: readonly BlogPost[],
  count: number = RELATED_COUNT,
): readonly BlogPost[] => {
  const sourceTags = new Set(source.tags.map((tag) => tag.slug));

  const candidates = all
    .filter((post) => post.id !== source.id)
    .map((post) => ({
      post,
      shared: post.tags.filter((tag) => sourceTags.has(tag.slug)).length,
      published: Date.parse(post.publishedAt),
    }))
    .sort(
      (a, b) =>
        b.shared - a.shared ||
        b.published - a.published ||
        a.post.slug.localeCompare(b.post.slug),
    );

  return candidates.slice(0, count).map((entry) => entry.post);
};
