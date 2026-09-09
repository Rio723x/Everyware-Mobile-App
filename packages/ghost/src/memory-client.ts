import type { Slug } from "@everyware/seo-core";
import authorsFixture from "./fixtures/authors.json" with { type: "json" };
import postsFixture from "./fixtures/posts.json" with { type: "json" };
import tagsFixture from "./fixtures/tags.json" with { type: "json" };
import { byPublishedAtDesc, normalizeAuthor, normalizePost, normalizeTags } from "./normalize.js";
import type { BlogAuthor, BlogPost, BlogTag, GhostClient } from "./types.js";

/**
 * A GhostClient backed by committed fixtures.
 *
 * This exists so the entire blog - templates, metadata, the audit rules, the
 * SEO worker - can be built and tested with no Ghost instance, no credentials
 * and no network. It runs the same `normalize.ts` as the HTTP adapter, so a
 * test that passes here is a test about production behaviour rather than about
 * a parallel fake.
 */
export class InMemoryGhostClient implements GhostClient {
  readonly #posts: readonly BlogPost[];
  readonly #tags: readonly BlogTag[];
  readonly #authors: readonly BlogAuthor[];

  constructor(source?: {
    readonly posts?: readonly unknown[];
    readonly tags?: readonly unknown[];
    readonly authors?: readonly unknown[];
  }) {
    this.#posts = [...(source?.posts ?? postsFixture).map(normalizePost)].sort(byPublishedAtDesc);
    this.#tags = normalizeTags(source?.tags ?? tagsFixture);
    this.#authors = (source?.authors ?? authorsFixture).map(normalizeAuthor);
  }

  listPosts(): Promise<readonly BlogPost[]> {
    return Promise.resolve(this.#posts);
  }

  getPostBySlug(slug: Slug): Promise<BlogPost | null> {
    return Promise.resolve(this.#posts.find((post) => post.slug === slug) ?? null);
  }

  listPostsByTag(tagSlug: Slug): Promise<readonly BlogPost[]> {
    return Promise.resolve(
      this.#posts.filter((post) => post.tags.some((tag) => tag.slug === tagSlug)),
    );
  }

  listPostsByAuthor(authorSlug: Slug): Promise<readonly BlogPost[]> {
    return Promise.resolve(
      this.#posts.filter((post) => post.authors.some((author) => author.slug === authorSlug)),
    );
  }

  listTags(): Promise<readonly BlogTag[]> {
    return Promise.resolve(this.#tags);
  }

  listAuthors(): Promise<readonly BlogAuthor[]> {
    return Promise.resolve(this.#authors);
  }
}
