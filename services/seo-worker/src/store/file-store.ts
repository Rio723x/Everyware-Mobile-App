import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Slug } from "@everyware/seo-core";
import { seoReportSchema, summarise, type SeoReport, type SeoReportSummary } from "../report/types.js";
import { indexedArticleSchema, type IndexedArticle } from "../links/types.js";
import type { SeoStore } from "./store.js";

interface Claim {
  readonly expiresAtMs: number;
}

interface Counter {
  readonly count: number;
  readonly expiresAtMs: number;
}

/**
 * A store backed by JSON files.
 *
 * Used by every test and by local development, so the suite needs no
 * credentials and no network. Atomicity of `claimIdempotencyKey` comes from
 * `writeFileSync` with the `wx` flag, which fails if the file already exists -
 * the same guarantee Redis gives with `SET NX`.
 */
export class FileSeoStore implements SeoStore {
  readonly #dir: string;
  readonly #now: () => number;

  constructor(dir = ".seo-store", now: () => number = Date.now) {
    this.#dir = resolve(dir);
    this.#now = now;
    for (const sub of ["idem", "reports", "debounce", "counters"]) {
      mkdirSync(join(this.#dir, sub), { recursive: true });
    }
  }

  #path(...parts: string[]): string {
    return join(this.#dir, ...parts);
  }

  #readJson(file: string): unknown {
    return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
  }

  claimIdempotencyKey(key: string, ttlSeconds: number): Promise<boolean> {
    const file = this.#path("idem", `${encodeURIComponent(key)}.json`);
    const existing = this.#readJson(file);

    if (existing !== null && typeof existing === "object" && "expiresAtMs" in existing) {
      const claim: Claim = { expiresAtMs: Number(existing.expiresAtMs) };
      if (claim.expiresAtMs > this.#now()) {
        return Promise.resolve(false);
      }
      rmSync(file, { force: true });
    }

    try {
      // `wx` fails when the file exists, which is what makes this atomic
      // against a concurrent claim rather than a read-then-write race.
      writeFileSync(file, JSON.stringify({ expiresAtMs: this.#now() + ttlSeconds * 1000 }), {
        flag: "wx",
      });
      return Promise.resolve(true);
    } catch {
      return Promise.resolve(false);
    }
  }

  saveReport(report: SeoReport): Promise<void> {
    writeFileSync(
      this.#path("reports", `${encodeURIComponent(report.slug)}.json`),
      `${JSON.stringify(report, null, 2)}\n`,
      "utf8",
    );
    return Promise.resolve();
  }

  getReport(slug: Slug): Promise<SeoReport | null> {
    const raw = this.#readJson(this.#path("reports", `${encodeURIComponent(slug)}.json`));
    return Promise.resolve(raw === null ? null : seoReportSchema.parse(raw));
  }

  listReports(): Promise<readonly SeoReportSummary[]> {
    const dir = this.#path("reports");
    const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".json")) : [];
    const summaries = files
      .map((file) => seoReportSchema.parse(this.#readJson(join(dir, file))))
      .map(summarise)
      .sort((a, b) => (a.technicalScore ?? 0) - (b.technicalScore ?? 0));
    return Promise.resolve(summaries);
  }

  saveContentIndex(index: readonly IndexedArticle[]): Promise<void> {
    writeFileSync(this.#path("content-index.json"), JSON.stringify(index), "utf8");
    return Promise.resolve();
  }

  getContentIndex(): Promise<readonly IndexedArticle[] | null> {
    const raw = this.#readJson(this.#path("content-index.json"));
    if (raw === null) return Promise.resolve(null);
    return Promise.resolve(indexedArticleSchema.array().parse(raw));
  }

  getDebounce(key: string): Promise<number | null> {
    const raw = this.#readJson(this.#path("debounce", `${encodeURIComponent(key)}.json`));
    if (raw === null || typeof raw !== "object" || !("atEpochMs" in raw)) {
      return Promise.resolve(null);
    }
    return Promise.resolve(Number(raw.atEpochMs));
  }

  setDebounce(key: string, atEpochMs: number): Promise<void> {
    writeFileSync(
      this.#path("debounce", `${encodeURIComponent(key)}.json`),
      JSON.stringify({ atEpochMs }),
      "utf8",
    );
    return Promise.resolve();
  }

  incrementCounter(key: string, ttlSeconds: number): Promise<number> {
    const file = this.#path("counters", `${encodeURIComponent(key)}.json`);
    const raw = this.#readJson(file);
    const now = this.#now();

    let counter: Counter = { count: 0, expiresAtMs: now + ttlSeconds * 1000 };
    if (raw !== null && typeof raw === "object" && "count" in raw && "expiresAtMs" in raw) {
      const expiresAtMs = Number(raw.expiresAtMs);
      if (expiresAtMs > now) {
        counter = { count: Number(raw.count), expiresAtMs };
      }
    }

    const next: Counter = { count: counter.count + 1, expiresAtMs: counter.expiresAtMs };
    writeFileSync(file, JSON.stringify(next), "utf8");
    return Promise.resolve(next.count);
  }
}
