import type { BlogPost } from "@everyware/ghost";
import type { AbsoluteUrl } from "../brand.js";
import { LOCALE, ORG_ID, WEBSITE_ID, siteUrl } from "../config.js";
import { truncateAtWord } from "../metadata/text.js";
import type { JsonLdDocument, SocialImage } from "../metadata/types.js";
import { blogPostingSchema, validateSchema } from "./validate.js";

/** Google's documented headline limit. Longer headlines are ignored, not truncated by them. */
const HEADLINE_MAX = 110;

export interface BlogPostingInput {
  readonly post: BlogPost;
  readonly canonical: AbsoluteUrl;
  readonly description: string;
  readonly image: SocialImage;
}

/**
 * BlogPosting JSON-LD for an article.
 *
 * `publisher` and `isPartOf` are `@id` references to the Organization and
 * WebSite nodes that already exist in the marketing app's @graph, rather than
 * fresh inline nodes. Declaring a second Organization at a different @id would
 * split the entity across two competing definitions on the same domain.
 *
 * `description` is passed in rather than recomputed: it must equal the meta
 * description, and the `jsonld-matches-page` rule fails the build if it does
 * not. One value, two consumers.
 */
export const buildBlogPostingSchema = ({
  post,
  canonical,
  description,
  image,
}: BlogPostingInput): JsonLdDocument => {
  const primaryTag = post.tags[0];

  const doc: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${canonical}#article`,
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    headline: truncateAtWord(post.title, HEADLINE_MAX),
    description,
    image: [image.url],
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    wordCount: post.wordCount,
    keywords: post.tags.map((tag) => tag.name),
    inLanguage: LOCALE,
    author: {
      "@type": "Person",
      name: post.primaryAuthor.name,
      url: siteUrl(`/blog/author/${post.primaryAuthor.slug}`),
    },
    publisher: { "@id": ORG_ID },
    isPartOf: { "@id": WEBSITE_ID },
  };

  // A post with no public tag omits articleSection rather than inventing a
  // category it does not belong to.
  if (primaryTag !== undefined) {
    doc["articleSection"] = primaryTag.name;
  }

  return validateSchema("BlogPosting", blogPostingSchema, doc);
};
