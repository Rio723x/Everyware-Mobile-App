import type { Slug } from "@everyware/seo-core";
import type { SeoReport, SeoReportSummary } from "../report/types.js";
import type { IndexedArticle } from "../links/types.js";

/**
 * Durable state for the worker.
 *
 * Small on purpose: idempotency claims, debounce timestamps, reports and one
 * content index. Everything here is key/value with a TTL, which is why a
 * key/value store is the right shape rather than a relational one.
 *
 * This is also the seam a later phase attaches to. Spec 03 defers Search
 * Console ingestion (plan phases 9-11); when it arrives, a `SearchPerformance`
 * record joins `SeoReport` by article id and nothing else in this interface
 * changes.
 */
export interface SeoStore {
  /**
   * Claims a key, returning false when it was already claimed.
   *
   * Must be atomic. Ghost retries webhooks and can double-fire, so a
   * read-then-write would let two deliveries both believe they were first.
   */
  claimIdempotencyKey(key: string, ttlSeconds: number): Promise<boolean>;

  saveReport(report: SeoReport): Promise<void>;
  getReport(slug: Slug): Promise<SeoReport | null>;
  listReports(): Promise<readonly SeoReportSummary[]>;

  saveContentIndex(index: readonly IndexedArticle[]): Promise<void>;
  getContentIndex(): Promise<readonly IndexedArticle[] | null>;

  getDebounce(key: string): Promise<number | null>;
  setDebounce(key: string, atEpochMs: number): Promise<void>;

  /** Rolling counter for the analysis rate guard. Returns the new count. */
  incrementCounter(key: string, ttlSeconds: number): Promise<number>;
}
