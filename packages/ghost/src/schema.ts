import { z } from "zod";

/**
 * Zod schemas for the Ghost Content API wire format.
 *
 * These describe what Ghost actually sends. The domain types the rest of the
 * system consumes are derived from them by `normalize.ts` - there is no
 * hand-written twin of a wire shape anywhere, so a Ghost upgrade that changes a
 * field surfaces here as a parse failure rather than as `undefined` three
 * layers away.
 */

export const ghostTagSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable().default(null),
  feature_image: z.string().nullable().default(null),
  visibility: z.string().default("public"),
});

export const ghostAuthorSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  bio: z.string().nullable().default(null),
  profile_image: z.string().nullable().default(null),
  website: z.string().nullable().default(null),
});

export const ghostPostSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  html: z.string().nullable().default(null),
  plaintext: z.string().nullable().default(null),
  excerpt: z.string().nullable().default(null),
  custom_excerpt: z.string().nullable().default(null),
  feature_image: z.string().nullable().default(null),
  feature_image_alt: z.string().nullable().default(null),
  published_at: z.string(),
  updated_at: z.string(),
  canonical_url: z.string().nullable().default(null),
  meta_title: z.string().nullable().default(null),
  meta_description: z.string().nullable().default(null),
  tags: z.array(ghostTagSchema).default([]),
  authors: z.array(ghostAuthorSchema).default([]),
  primary_author: ghostAuthorSchema.nullable().default(null),
});

export const ghostPaginationSchema = z.object({
  page: z.number(),
  limit: z.union([z.number(), z.literal("all")]),
  pages: z.number(),
  total: z.number(),
  next: z.number().nullable(),
  prev: z.number().nullable(),
});

export const ghostMetaSchema = z.object({
  pagination: ghostPaginationSchema,
});

export const ghostPostsResponseSchema = z.object({
  posts: z.array(z.unknown()),
  meta: ghostMetaSchema.optional(),
});

export const ghostTagsResponseSchema = z.object({
  tags: z.array(z.unknown()),
  meta: ghostMetaSchema.optional(),
});

export const ghostAuthorsResponseSchema = z.object({
  authors: z.array(z.unknown()),
  meta: ghostMetaSchema.optional(),
});

export type GhostTagWire = z.infer<typeof ghostTagSchema>;
export type GhostAuthorWire = z.infer<typeof ghostAuthorSchema>;
export type GhostPostWire = z.infer<typeof ghostPostSchema>;
export type GhostPagination = z.infer<typeof ghostPaginationSchema>;

/**
 * Thrown when a Ghost payload does not match the schema.
 *
 * The offending slug is carried on the error and rendered into the message,
 * because a build that fails with "expected string, received null" and no
 * indication of which of forty posts caused it is a build that wastes an
 * afternoon.
 */
export class GhostSchemaError extends Error {
  readonly slug: string | null;

  constructor(slug: string | null, context: string, cause: unknown) {
    const subject = slug === null ? context : `${context} for post "${slug}"`;
    const detail = cause instanceof Error ? cause.message : String(cause);
    super(`Ghost response failed validation in ${subject}: ${detail}`);
    this.name = "GhostSchemaError";
    this.slug = slug;
    this.cause = cause;
  }
}

/**
 * Reads a slug out of an unvalidated payload so a parse failure can name the
 * post that caused it. Returns null when the payload is too malformed to have
 * one, which is itself useful information in the message.
 */
export const peekSlug = (value: unknown): string | null => {
  if (typeof value !== "object" || value === null || !("slug" in value)) {
    return null;
  }
  const { slug } = value;
  return typeof slug === "string" ? slug : null;
};
