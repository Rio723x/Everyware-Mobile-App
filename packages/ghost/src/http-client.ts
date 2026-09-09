import type { Slug } from "@everyware/seo-core";
import {
  GhostSchemaError,
  ghostAuthorsResponseSchema,
  ghostPostsResponseSchema,
  ghostTagsResponseSchema,
} from "./schema.js";
import { byPublishedAtDesc, normalizeAuthor, normalizePost, normalizeTags } from "./normalize.js";
import type { BlogAuthor, BlogPost, BlogTag, GhostClient } from "./types.js";

const RETRY_DELAYS_MS = [250, 500, 1000] as const;

export interface GhostHttpConfig {
  readonly url: string;
  readonly key: string;
  /** Injectable for tests. Defaults to the global fetch. */
  readonly fetch?: typeof globalThis.fetch;
  /** Injectable for tests so retry backoff does not cost real seconds. */
  readonly sleep?: (ms: number) => Promise<void>;
}

export class GhostRequestError extends Error {
  readonly status: number | null;
  readonly attempts: number;

  constructor(message: string, status: number | null, attempts: number) {
    super(message);
    this.name = "GhostRequestError";
    this.status = status;
    this.attempts = attempts;
  }
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The live Ghost Content API adapter.
 *
 * Everything a caller would otherwise have to know - the API version prefix, the
 * `include` and `formats` parameters, page cursors, which failures are worth
 * retrying, and how a wire post becomes a domain post - lives in here. The
 * interface it satisfies is the same six methods as the fixture adapter, and it
 * shares the same normalisation, so the two are genuinely substitutable.
 */
export class HttpGhostClient implements GhostClient {
  readonly #baseUrl: string;
  readonly #key: string;
  readonly #fetch: typeof globalThis.fetch;
  readonly #sleep: (ms: number) => Promise<void>;

  constructor(config: GhostHttpConfig) {
    this.#baseUrl = config.url.replace(/\/+$/, "");
    this.#key = config.key;
    this.#fetch = config.fetch ?? globalThis.fetch;
    this.#sleep = config.sleep ?? defaultSleep;
  }

  #endpoint(resource: string, params: Readonly<Record<string, string>>, page: number): string {
    const url = new URL(`${this.#baseUrl}/ghost/api/content/${resource}/`);
    url.searchParams.set("key", this.#key);
    url.searchParams.set("limit", "all");
    for (const [name, value] of Object.entries(params)) {
      url.searchParams.set(name, value);
    }
    if (page > 1) {
      url.searchParams.set("page", String(page));
    }
    return url.toString();
  }

  /**
   * Retries 5xx and network failures with exponential backoff; never retries a
   * 4xx, because a bad key or a bad filter will fail identically on the fourth
   * attempt and retrying only delays a clear error.
   */
  async #fetchJson(url: string): Promise<unknown> {
    let lastError: GhostRequestError | null = null;

    for (let attempt = 1; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
      let response: Response;
      try {
        response = await this.#fetch(url);
      } catch (cause) {
        lastError = new GhostRequestError(
          `Network failure requesting Ghost: ${cause instanceof Error ? cause.message : String(cause)}`,
          null,
          attempt,
        );
        await this.#backoff(attempt);
        continue;
      }

      if (response.ok) {
        return await response.json();
      }

      if (response.status >= 400 && response.status < 500) {
        throw new GhostRequestError(
          `Ghost returned ${String(response.status)} for ${redactKey(url)}`,
          response.status,
          attempt,
        );
      }

      lastError = new GhostRequestError(
        `Ghost returned ${String(response.status)} for ${redactKey(url)}`,
        response.status,
        attempt,
      );
      await this.#backoff(attempt);
    }

    throw (
      lastError ??
      new GhostRequestError("Ghost request failed", null, RETRY_DELAYS_MS.length)
    );
  }

  async #backoff(attempt: number): Promise<void> {
    if (attempt < RETRY_DELAYS_MS.length) {
      await this.#sleep(RETRY_DELAYS_MS[attempt - 1] ?? 0);
    }
  }

  /**
   * Walks `meta.pagination` to exhaustion. `limit=all` is the documented way to
   * ask for everything, but a server-side cap silently truncates it, and a blog
   * that quietly stops at post 100 is worse than one that fails.
   */
  async #collect(resource: string, params: Readonly<Record<string, string>>): Promise<unknown[]> {
    const collected: unknown[] = [];
    let page = 1;

    for (;;) {
      const payload = await this.#fetchJson(this.#endpoint(resource, params, page));
      const parsed = parseEnvelope(resource, payload);
      collected.push(...parsed.items);

      const next = parsed.next;
      if (next === null) {
        return collected;
      }
      page = next;
    }
  }

  async listPosts(): Promise<readonly BlogPost[]> {
    const raw = await this.#collect("posts", {
      include: "tags,authors",
      formats: "html,plaintext",
    });
    return raw.map(normalizePost).sort(byPublishedAtDesc);
  }

  async getPostBySlug(slug: Slug): Promise<BlogPost | null> {
    const url = new URL(`${this.#baseUrl}/ghost/api/content/posts/slug/${slug}/`);
    url.searchParams.set("key", this.#key);
    url.searchParams.set("include", "tags,authors");
    url.searchParams.set("formats", "html,plaintext");

    try {
      const payload = await this.#fetchJson(url.toString());
      const parsed = ghostPostsResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new GhostSchemaError(slug, "post lookup", parsed.error);
      }
      const [first] = parsed.data.posts;
      return first === undefined ? null : normalizePost(first);
    } catch (error) {
      // A missing post is an ordinary answer to "is there a post at this slug",
      // not an exceptional one. Every other failure still propagates.
      if (error instanceof GhostRequestError && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async listPostsByTag(tagSlug: Slug): Promise<readonly BlogPost[]> {
    const raw = await this.#collect("posts", {
      include: "tags,authors",
      formats: "html,plaintext",
      filter: `tag:${tagSlug}`,
    });
    return raw.map(normalizePost).sort(byPublishedAtDesc);
  }

  async listPostsByAuthor(authorSlug: Slug): Promise<readonly BlogPost[]> {
    const raw = await this.#collect("posts", {
      include: "tags,authors",
      formats: "html,plaintext",
      filter: `authors:${authorSlug}`,
    });
    return raw.map(normalizePost).sort(byPublishedAtDesc);
  }

  async listTags(): Promise<readonly BlogTag[]> {
    const raw = await this.#collect("tags", {});
    return normalizeTags(raw);
  }

  async listAuthors(): Promise<readonly BlogAuthor[]> {
    const raw = await this.#collect("authors", {});
    return raw.map(normalizeAuthor);
  }
}

interface Envelope {
  readonly items: readonly unknown[];
  readonly next: number | null;
}

const parseEnvelope = (resource: string, payload: unknown): Envelope => {
  if (resource === "tags") {
    const parsed = ghostTagsResponseSchema.safeParse(payload);
    if (!parsed.success) {
      throw new GhostSchemaError(null, "tags response", parsed.error);
    }
    return { items: parsed.data.tags, next: parsed.data.meta?.pagination.next ?? null };
  }
  if (resource === "authors") {
    const parsed = ghostAuthorsResponseSchema.safeParse(payload);
    if (!parsed.success) {
      throw new GhostSchemaError(null, "authors response", parsed.error);
    }
    return { items: parsed.data.authors, next: parsed.data.meta?.pagination.next ?? null };
  }
  const parsed = ghostPostsResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new GhostSchemaError(null, "posts response", parsed.error);
  }
  return { items: parsed.data.posts, next: parsed.data.meta?.pagination.next ?? null };
};

/** Keeps the Content API key out of error messages and logs. */
const redactKey = (url: string): string => url.replace(/key=[^&]*/, "key=REDACTED");
