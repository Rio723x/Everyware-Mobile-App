import type { BlogAuthor, BlogPost, BlogTag } from "@everyware/ghost";

/**
 * One crumb in a breadcrumb trail.
 *
 * `href` is null for the final crumb, which is the current page and therefore
 * not a link.
 */
export interface Crumb {
  readonly label: string;
  readonly href: string | null;
}

/**
 * Builds a breadcrumb trail once, for both consumers.
 *
 * The visible `<nav>` and the BreadcrumbList JSON-LD (spec 02, T-02-008) must
 * agree - schema that describes a trail the page does not show is exactly the
 * defect spec 02's `jsonld-matches-page` rule exists to catch. Generating both
 * from this one value makes disagreement impossible rather than merely
 * unlikely, which is why the trail lives here instead of inside the component.
 */

const HOME: Crumb = { label: "Home", href: "/" };
const BLOG: Crumb = { label: "Blog", href: "/blog" };

export const listingTrail = (): readonly Crumb[] => [HOME, { ...BLOG, href: null }];

export const articleTrail = (post: BlogPost): readonly Crumb[] => {
  const primaryTag = post.tags[0];
  // A post with no public tag omits the category level rather than inventing
  // one. Positions renumber, so the trail stays contiguous either way.
  const category: readonly Crumb[] =
    primaryTag === undefined
      ? []
      : [{ label: primaryTag.name, href: `/blog/category/${primaryTag.slug}` }];

  return [HOME, BLOG, ...category, { label: post.title, href: null }];
};

export const categoryTrail = (tag: BlogTag): readonly Crumb[] => [
  HOME,
  BLOG,
  { label: tag.name, href: null },
];

export const authorTrail = (author: BlogAuthor): readonly Crumb[] => [
  HOME,
  BLOG,
  { label: author.name, href: null },
];
