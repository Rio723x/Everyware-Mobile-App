import { toAbsoluteUrl, type AbsoluteUrl } from "../brand.js";
import { siteUrl } from "../config.js";
import type { JsonLdDocument } from "../metadata/types.js";
import { breadcrumbListSchema, validateSchema } from "./validate.js";

/**
 * One crumb. `href` is null for the current page, which is not a link.
 *
 * Structurally identical to the blog app's `Crumb`, and deliberately so: the
 * visible breadcrumb and this schema are built from the same trail, because
 * schema describing a trail the page does not show is the exact defect
 * `jsonld-matches-page` exists to catch.
 */
export interface SchemaCrumb {
  readonly label: string;
  readonly href: string | null;
}

export const buildBreadcrumbSchema = (
  trail: readonly SchemaCrumb[],
  canonical: AbsoluteUrl,
): JsonLdDocument => {
  const doc = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.label,
      // The final crumb has no href; its URL is the page's own canonical.
      item: crumb.href === null ? canonical : resolve(crumb.href),
    })),
  };

  return validateSchema("BreadcrumbList", breadcrumbListSchema, doc);
};

const resolve = (href: string): AbsoluteUrl =>
  href.startsWith("https://") ? toAbsoluteUrl(href) : siteUrl(href);
