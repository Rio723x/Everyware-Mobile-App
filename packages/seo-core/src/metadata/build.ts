import { buildBlogPostingSchema } from "../schema-org/blog-posting.js";
import { buildBreadcrumbSchema, type SchemaCrumb } from "../schema-org/breadcrumb.js";
import { buildCollectionPageSchema } from "../schema-org/collection-page.js";
import { ROBOTS_DIRECTIVE, buildCanonical, buildPrevNext } from "./canonical.js";
import { buildDescription } from "./description.js";
import { buildSocialImage } from "./images.js";
import { buildOpenGraph, buildTwitter } from "./social.js";
import { buildTitle } from "./title.js";
import type { JsonLdDocument, PageMetadata, PageMetadataInput } from "./types.js";

/**
 * The breadcrumb trail for a page.
 *
 * Passed in rather than derived here, because the visible `<nav>` renders from
 * the same value. Two independent derivations of "where am I" is how the
 * rendered trail and the schema end up disagreeing.
 */
export type BreadcrumbTrail = readonly SchemaCrumb[];

/**
 * Everything that belongs in one page's `<head>`.
 *
 * This is the whole metadata interface: one function, four input shapes. An
 * Astro page learns it and cannot then construct an inconsistent head, because
 * the only other thing it can do is hand the result to SeoHead.
 *
 * Pure and total: no I/O, no clock, no configuration beyond the input. The same
 * input returns deep-equal output every time, which is what makes a rebuild
 * with unchanged content produce an unchanged site.
 */
export const buildPageMetadata = (
  input: PageMetadataInput,
  trail: BreadcrumbTrail,
): PageMetadata => {
  const title = buildTitle(input);
  const description = buildDescription(input);
  const canonical = buildCanonical(input);
  const image = buildSocialImage(input);
  const { prev, next } = buildPrevNext(input);

  const socialInput = { input, title, description, canonical, image };

  const primary: JsonLdDocument =
    input.kind === "article"
      ? buildBlogPostingSchema({ post: input.post, canonical, description, image })
      : buildCollectionPageSchema(canonical, title, description);

  return {
    title,
    description,
    canonical,
    robots: ROBOTS_DIRECTIVE,
    openGraph: buildOpenGraph(socialInput),
    twitter: buildTwitter(socialInput),
    jsonLd: [primary, buildBreadcrumbSchema(trail, canonical)],
    prev,
    next,
  };
};
