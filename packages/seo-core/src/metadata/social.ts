import type { AbsoluteUrl } from "../brand.js";
import { OG_LOCALE, SITE_NAME, TWITTER_HANDLE, siteUrl } from "../config.js";
import type {
  OpenGraphMetadata,
  PageMetadataInput,
  SocialImage,
  TwitterMetadata,
} from "./types.js";

export interface SocialInput {
  readonly input: PageMetadataInput;
  readonly title: string;
  readonly description: string;
  readonly canonical: AbsoluteUrl;
  readonly image: SocialImage;
}

/**
 * OpenGraph properties.
 *
 * `og:url` is the canonical passed in, never recomputed. Two code paths
 * deriving the same URL is how they end up disagreeing after a refactor, and
 * the `og-url-canonical` rule exists precisely because that disagreement is
 * invisible until a crawler reports duplicate content.
 */
export const buildOpenGraph = ({
  input,
  title,
  description,
  canonical,
  image,
}: SocialInput): OpenGraphMetadata => {
  const base: Record<string, string> = {
    "og:type": input.kind === "article" ? "article" : "website",
    "og:title": title,
    "og:description": description,
    "og:url": canonical,
    "og:site_name": SITE_NAME,
    "og:locale": OG_LOCALE,
    "og:image": image.url,
    "og:image:width": String(image.width),
    "og:image:height": String(image.height),
    "og:image:alt": image.alt,
  };

  if (input.kind === "article") {
    const { post } = input;
    base["article:published_time"] = post.publishedAt;
    base["article:modified_time"] = post.updatedAt;
    base["article:author"] = siteUrl(`/blog/author/${post.primaryAuthor.slug}`);

    const primaryTag = post.tags[0];
    if (primaryTag !== undefined) {
      base["article:section"] = primaryTag.name;
    }
  }

  return base;
};

/**
 * Twitter card properties.
 *
 * Always `summary_large_image`: every page here has a 1200x630 image, and the
 * small-summary card wastes it.
 */
export const buildTwitter = ({ title, description, image }: SocialInput): TwitterMetadata => ({
  "twitter:card": "summary_large_image",
  "twitter:title": title,
  "twitter:description": description,
  "twitter:image": image.url,
  "twitter:image:alt": image.alt,
  "twitter:site": TWITTER_HANDLE,
  "twitter:creator": TWITTER_HANDLE,
});
