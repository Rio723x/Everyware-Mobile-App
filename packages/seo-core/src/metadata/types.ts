import type { BlogAuthor, BlogPost, BlogTag } from "@everyware/ghost";
import type { AbsoluteUrl } from "../brand.js";

export const PAGE_KINDS = ["article", "listing", "category", "author"] as const;
export type PageKind = (typeof PAGE_KINDS)[number];

/**
 * What a page needs to describe itself.
 *
 * A discriminated union rather than a bag of optional fields: a listing page
 * has no post and an article has no page count, and encoding that as
 * `post?: BlogPost` would put the burden of remembering which combinations are
 * legal on every caller, forever.
 */
export type PageMetadataInput =
  | { readonly kind: "article"; readonly post: BlogPost }
  | { readonly kind: "listing"; readonly page: number; readonly totalPages: number }
  | {
      readonly kind: "category";
      readonly tag: BlogTag;
      readonly postCount: number;
      readonly page: number;
      readonly totalPages: number;
    }
  | {
      readonly kind: "author";
      readonly author: BlogAuthor;
      readonly postCount: number;
      readonly page: number;
      readonly totalPages: number;
    };

export interface SocialImage {
  readonly url: AbsoluteUrl;
  readonly width: number;
  readonly height: number;
  readonly alt: string;
}

/** OpenGraph properties as `property` -> `content`, ready to render verbatim. */
export type OpenGraphMetadata = Readonly<Record<string, string>>;

/** Twitter card properties as `name` -> `content`. */
export type TwitterMetadata = Readonly<Record<string, string>>;

/** A validated JSON-LD document. Builders never return an invalid one. */
export type JsonLdDocument = Readonly<Record<string, unknown>>;

/**
 * Everything that goes in a page's `<head>`.
 *
 * `SeoHead.astro` renders exactly this and nothing else, which is what makes
 * the spec 02 rule engine enforceable: there is one place a meta tag can come
 * from, so a rule that grades the output cannot be bypassed by a page writing
 * its own tags.
 */
export interface PageMetadata {
  readonly title: string;
  readonly description: string;
  readonly canonical: AbsoluteUrl;
  readonly robots: string;
  readonly openGraph: OpenGraphMetadata;
  readonly twitter: TwitterMetadata;
  readonly jsonLd: readonly JsonLdDocument[];
  readonly prev: AbsoluteUrl | null;
  readonly next: AbsoluteUrl | null;
}
