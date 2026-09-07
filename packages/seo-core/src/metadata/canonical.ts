import { siteUrl } from "../config.js";
import { toAbsoluteUrl, type AbsoluteUrl } from "../brand.js";
import type { PageMetadataInput } from "./types.js";

/**
 * Applied to every blog page. There is no code path that emits `noindex` —
 * spec 02's `no-noindex-anywhere` rule asserts its absence across the output.
 */
export const ROBOTS_DIRECTIVE =
  "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";

/** The path a route's page 1 lives at, without pagination. */
export const basePathFor = (input: PageMetadataInput): string => {
  switch (input.kind) {
    case "article":
      return `/blog/${input.post.slug}`;
    case "listing":
      return "/blog";
    case "category":
      return `/blog/category/${input.tag.slug}`;
    case "author":
      return `/blog/author/${input.author.slug}`;
  }
};

const pageOf = (input: PageMetadataInput): number =>
  input.kind === "article" ? 1 : input.page;

const totalPagesOf = (input: PageMetadataInput): number =>
  input.kind === "article" ? 1 : input.totalPages;

/** Page 1 is the base path; deeper pages append `/page/n`. */
const pathForPage = (basePath: string, page: number): string =>
  page > 1 ? `${basePath}/page/${String(page)}` : basePath;

/**
 * The page's own canonical URL.
 *
 * **Paginated pages are self-canonical.** Page 2 canonicalises to page 2, not
 * back to page 1: they hold different articles, and pointing them at page 1
 * tells a crawler the content on page 2 does not deserve its own URL.
 *
 * A Ghost `canonical_url` on a post overrides everything. That field exists for
 * republished content, and honouring it is the whole reason it exists.
 */
export const buildCanonical = (input: PageMetadataInput): AbsoluteUrl => {
  if (input.kind === "article") {
    const override = input.post.canonicalUrl;
    if (override !== null && override.trim() !== "") {
      return toAbsoluteUrl(override.trim());
    }
  }
  return siteUrl(pathForPage(basePathFor(input), pageOf(input)));
};

export interface PrevNext {
  readonly prev: AbsoluteUrl | null;
  readonly next: AbsoluteUrl | null;
}

/**
 * `rel="prev"` / `rel="next"` targets.
 *
 * Page 2's `prev` is the base path, never `/page/1` — that URL is never
 * generated, and linking to it would be a link to a 404.
 */
export const buildPrevNext = (input: PageMetadataInput): PrevNext => {
  const page = pageOf(input);
  const totalPages = totalPagesOf(input);
  const basePath = basePathFor(input);

  return {
    prev: page > 1 ? siteUrl(pathForPage(basePath, page - 1)) : null,
    next: page < totalPages ? siteUrl(pathForPage(basePath, page + 1)) : null,
  };
};
