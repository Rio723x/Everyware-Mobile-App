import type { Slug } from "@everyware/seo-core";
import { seoReportSchema, summarise, type SeoReport, type SeoReportSummary } from "../report/types.js";
import { indexedArticleSchema, type IndexedArticle } from "../links/types.js";
import type { SeoStore } from "./store.js";

export interface RedisConfig {
  readonly url: string;
  readonly token: string;
  readonly fetch?: typeof globalThis.fetch;
}

export class RedisConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RedisConfigurationError";
  }
}

const KEY = {
  idem: (key: string) => `seo:idem:${key}`,
  report: (slug: string) => `seo:report:${slug}`,
  reportIndex: "seo:report:index",
  contentIndex: "seo:index",
  debounce: (key: string) => `seo:debounce:${key}`,
  counter: (key: string) => `seo:counter:${key}`,
};

/**
 * Upstash Redis over its HTTP API.
 *
 * HTTP rather than a socket client because this runs in a serverless function:
 * there is no process to hold a connection pool, and a TCP client would open a
 * new connection per invocation.
 */
export class UpstashRedisStore implements SeoStore {
  readonly #url: string;
  readonly #token: string;
  readonly #fetch: typeof globalThis.fetch;

  constructor(config: RedisConfig) {
    if (config.url === "" || config.token === "") {
      throw new RedisConfigurationError(
        "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required when SEO_STORE_DRIVER=redis.",
      );
    }
    this.#url = config.url.replace(/\/+$/, "");
    this.#token = config.token;
    this.#fetch = config.fetch ?? globalThis.fetch;
  }

  async #command(...args: readonly (string | number)[]): Promise<unknown> {
    const response = await this.#fetch(this.#url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.#token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args.map(String)),
    });
    if (!response.ok) {
      throw new Error(`Upstash returned ${String(response.status)} for ${String(args[0])}`);
    }
    const payload: unknown = await response.json();
    if (typeof payload === "object" && payload !== null && "result" in payload) {
      return payload.result;
    }
    return null;
  }

  async claimIdempotencyKey(key: string, ttlSeconds: number): Promise<boolean> {
    // One command, so atomicity is Redis's problem rather than this code's.
    const result = await this.#command("SET", KEY.idem(key), "1", "NX", "EX", ttlSeconds);
    return result === "OK";
  }

  async saveReport(report: SeoReport): Promise<void> {
    await this.#command("SET", KEY.report(report.slug), JSON.stringify(report));
    await this.#command("SADD", KEY.reportIndex, report.slug);
  }

  async getReport(slug: Slug): Promise<SeoReport | null> {
    const raw = await this.#command("GET", KEY.report(slug));
    if (typeof raw !== "string") return null;
    return seoReportSchema.parse(JSON.parse(raw));
  }

  async listReports(): Promise<readonly SeoReportSummary[]> {
    const slugs = await this.#command("SMEMBERS", KEY.reportIndex);
    if (!Array.isArray(slugs)) return [];

    const summaries: SeoReportSummary[] = [];
    for (const slug of slugs) {
      const raw = await this.#command("GET", KEY.report(String(slug)));
      if (typeof raw === "string") {
        summaries.push(summarise(seoReportSchema.parse(JSON.parse(raw))));
      }
    }
    return summaries.sort((a, b) => (a.technicalScore ?? 0) - (b.technicalScore ?? 0));
  }

  async saveContentIndex(index: readonly IndexedArticle[]): Promise<void> {
    await this.#command("SET", KEY.contentIndex, JSON.stringify(index));
  }

  async getContentIndex(): Promise<readonly IndexedArticle[] | null> {
    const raw = await this.#command("GET", KEY.contentIndex);
    if (typeof raw !== "string") return null;
    return indexedArticleSchema.array().parse(JSON.parse(raw));
  }

  async getDebounce(key: string): Promise<number | null> {
    const raw = await this.#command("GET", KEY.debounce(key));
    return typeof raw === "string" ? Number(raw) : null;
  }

  async setDebounce(key: string, atEpochMs: number): Promise<void> {
    await this.#command("SET", KEY.debounce(key), String(atEpochMs));
  }

  async incrementCounter(key: string, ttlSeconds: number): Promise<number> {
    const count = await this.#command("INCR", KEY.counter(key));
    if (count === 1) {
      await this.#command("EXPIRE", KEY.counter(key), ttlSeconds);
    }
    return Number(count);
  }
}
