import { toIsoDateTime, toSlug } from "@everyware/seo-core";
import {
  GhostSchemaError,
  ghostAuthorSchema,
  ghostPostSchema,
  ghostTagSchema,
  peekSlug,
} from "./schema.js";
import type { BlogAuthor, BlogPost, BlogTag, FeatureImage } from "./types.js";

const WORDS_PER_MINUTE = 200;

/**
 * Ghost marks editorial-workflow tags two ways: `visibility: "internal"`, and a
 * slug prefixed `hash-` (the `#tag` syntax in the editor). Either is enough to
 * keep a tag out of the public site, and checking both means an internal tag
 * created through the API rather than the editor is still excluded.
 */
const isInternalTag = (tag: { slug: string; visibility: string }): boolean =>
  tag.slug.startsWith("hash-") || tag.visibility === "internal";

const countWords = (text: string): number => {
  const trimmed = text.trim();
  return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
};

export const readingTimeMinutes = (plaintext: string): number =>
  Math.max(1, Math.ceil(countWords(plaintext) / WORDS_PER_MINUTE));

/**
 * Pairs an image with alt text, falling back when the CMS has none.
 *
 * Ghost leaves `feature_image_alt` null far more often than editors expect -
 * its own default post does. An empty alt makes the image invisible to screen
 * readers and fails the `img-alt` audit rule, so the caller supplies a
 * description of last resort. Real alt text from the editor always wins.
 */
const toImage = (
  url: string | null,
  alt: string | null,
  fallbackAlt: string,
): FeatureImage | null => {
  if (url === null || url === "") return null;
  const described = (alt ?? "").trim();
  return { url, alt: described === "" ? fallbackAlt : described };
};

export const normalizeTag = (raw: unknown): BlogTag => {
  const parsed = ghostTagSchema.safeParse(raw);
  if (!parsed.success) {
    throw new GhostSchemaError(peekSlug(raw), "tag", parsed.error);
  }
  const tag = parsed.data;
  return {
    id: tag.id,
    slug: toSlug(tag.slug),
    name: tag.name,
    description: tag.description,
  };
};

export const normalizeAuthor = (raw: unknown): BlogAuthor => {
  const parsed = ghostAuthorSchema.safeParse(raw);
  if (!parsed.success) {
    throw new GhostSchemaError(peekSlug(raw), "author", parsed.error);
  }
  const author = parsed.data;
  return {
    id: author.id,
    slug: toSlug(author.slug),
    name: author.name,
    bio: author.bio,
    profileImage: toImage(author.profile_image, null, `${author.name}, Everyware`),
  };
};

/**
 * Turns one Ghost post into the domain shape.
 *
 * Both the HTTP and in-memory adapters route through this function, which is
 * what makes them substitutable: an adapter that normalised independently would
 * eventually disagree with the other, and the fixture tests would stop proving
 * anything about production.
 */
export const normalizePost = (raw: unknown): BlogPost => {
  const parsed = ghostPostSchema.safeParse(raw);
  if (!parsed.success) {
    throw new GhostSchemaError(peekSlug(raw), "post", parsed.error);
  }
  const post = parsed.data;

  if (post.primary_author === null && post.authors.length === 0) {
    throw new GhostSchemaError(post.slug, "post", new Error("has no author"));
  }

  const authors = post.authors.map(normalizeAuthor);
  const primaryAuthorRaw = post.primary_author ?? post.authors[0];
  if (primaryAuthorRaw === undefined) {
    throw new GhostSchemaError(post.slug, "post", new Error("has no primary author"));
  }

  const plaintext = post.plaintext ?? "";
  const excerpt = (post.custom_excerpt ?? post.excerpt ?? "").trim();

  return {
    id: post.id,
    slug: toSlug(post.slug),
    title: post.title,
    html: post.html ?? "",
    plaintext,
    excerpt,
    featureImage: toImage(post.feature_image, post.feature_image_alt, post.title),
    primaryAuthor: normalizeAuthor(primaryAuthorRaw),
    authors: authors.length > 0 ? authors : [normalizeAuthor(primaryAuthorRaw)],
    tags: post.tags.filter((tag) => !isInternalTag(tag)).map(normalizeTag),
    publishedAt: toIsoDateTime(post.published_at),
    updatedAt: toIsoDateTime(post.updated_at),
    readingTimeMinutes: readingTimeMinutes(plaintext),
    wordCount: countWords(plaintext),
    metaTitle: post.meta_title,
    metaDescription: post.meta_description,
    canonicalUrl: post.canonical_url,
  };
};

export const normalizeTags = (raw: readonly unknown[]): BlogTag[] => {
  const parsed = raw.map((entry) => ghostTagSchema.safeParse(entry));
  return raw
    .filter((_, index) => {
      const result = parsed[index];
      if (result === undefined || !result.success) {
        throw new GhostSchemaError(peekSlug(raw[index]), "tag", result?.error);
      }
      return !isInternalTag(result.data);
    })
    .map(normalizeTag);
};

/** Newest first. Every list this package returns is ordered this way. */
export const byPublishedAtDesc = (a: BlogPost, b: BlogPost): number =>
  Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
