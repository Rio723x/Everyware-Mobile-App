import { POSTS_PER_PAGE } from "@everyware/seo-core";

export interface Page<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly totalPages: number;
  readonly prevHref: string | null;
  readonly nextHref: string | null;
}

/**
 * Paginates a list under a base path.
 *
 * Page 1 always lives at the base path itself, never at `<base>/page/1`. Two
 * URLs serving identical content is a duplicate-content problem, and this is
 * the single place that rule is expressed - the listing, category and author
 * routes all page identically because they all call this.
 */
export const paginate = <T>(
  items: readonly T[],
  page: number,
  basePath: string,
  perPage: number = POSTS_PER_PAGE,
): Page<T> => {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const clamped = Math.min(Math.max(1, page), totalPages);
  const start = (clamped - 1) * perPage;

  const hrefFor = (target: number): string =>
    target === 1 ? basePath : `${basePath}/page/${String(target)}`;

  return {
    items: items.slice(start, start + perPage),
    page: clamped,
    totalPages,
    prevHref: clamped > 1 ? hrefFor(clamped - 1) : null,
    nextHref: clamped < totalPages ? hrefFor(clamped + 1) : null,
  };
};

/**
 * The page numbers that need their own route: 2..n. Page 1 is the base path,
 * so `getStaticPaths` must not generate it.
 */
export const extraPageNumbers = (
  itemCount: number,
  perPage: number = POSTS_PER_PAGE,
): readonly number[] => {
  const totalPages = Math.ceil(itemCount / perPage);
  return Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) => index + 2);
};
