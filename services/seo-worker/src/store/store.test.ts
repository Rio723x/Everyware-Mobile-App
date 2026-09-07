import { toSlug } from "@everyware/seo-core";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { IndexedArticle } from "../links/types.js";
import type { SeoReport } from "../report/types.js";
import { createStore, RedisConfigurationError, UpstashRedisStore } from "./index.js";
import { FileSeoStore } from "./file-store.js";
import type { SeoStore } from "./store.js";

const report = (slug: string, score: number): SeoReport => ({
  postId: `post-${slug}`,
  slug,
  url: `https://everyware.in/blog/${slug}`,
  generatedAt: "2026-09-07T10:00:00.000Z",
  ghostUpdatedAt: "2026-09-07T09:00:00.000Z",
  technical: {
    url: `https://everyware.in/blog/${slug}`,
    path: `/blog/${slug}`,
    file: `blog/${slug}.html`,
    kind: "article",
    score,
    results: [{ id: "title-present", severity: "error", status: "pass", message: "ok" }],
  },
  technicalScore: score,
  validationStatus: "validated",
  analysis: null,
  analysisError: null,
  outboundLinkSuggestions: [],
  inboundLinkSuggestions: [],
  droppedSuggestions: 0,
  diffs: [],
});

const article: IndexedArticle = {
  id: "a",
  slug: "a-post",
  url: "https://everyware.in/blog/a-post",
  title: "A Post",
  excerpt: "An excerpt.",
  publishedAt: "2026-08-01T00:00:00.000+00:00",
  tagSlugs: ["maintenance"],
  terms: { washing: 0.5, machine: 0.25 },
  linkedSlugs: [],
};

/**
 * One suite, both adapters.
 *
 * They are only substitutable if they agree, and an adapter tested in isolation
 * drifts from the other the first time a behaviour is subtle - the atomicity of
 * a claim, say, or the ordering of a listing.
 */
const conformanceSuite = (name: string, makeStore: () => SeoStore): void => {
  describe(`${name} conformance`, () => {
    let store: SeoStore;

    beforeEach(() => {
      store = makeStore();
    });

    it("claims an idempotency key once", async () => {
      await expect(store.claimIdempotencyKey("post-1:2026", 60)).resolves.toBe(true);
      await expect(store.claimIdempotencyKey("post-1:2026", 60)).resolves.toBe(false);
    });

    it("lets a different key through", async () => {
      await expect(store.claimIdempotencyKey("post-1:a", 60)).resolves.toBe(true);
      await expect(store.claimIdempotencyKey("post-1:b", 60)).resolves.toBe(true);
    });

    it("round-trips a report deep-equal", async () => {
      const saved = report("washing-machine", 96);
      await store.saveReport(saved);
      await expect(store.getReport(toSlug("washing-machine"))).resolves.toEqual(saved);
    });

    it("returns null for an unknown slug rather than throwing", async () => {
      await expect(store.getReport(toSlug("never-written"))).resolves.toBeNull();
    });

    it("lists reports worst score first", async () => {
      await store.saveReport(report("good", 100));
      await store.saveReport(report("bad", 62));
      const listed = await store.listReports();
      expect(listed.map((entry) => entry.slug)).toEqual(["bad", "good"]);
    });

    it("round-trips the content index", async () => {
      await store.saveContentIndex([article]);
      await expect(store.getContentIndex()).resolves.toEqual([article]);
    });

    it("returns null for an index that was never written", async () => {
      await expect(store.getContentIndex()).resolves.toBeNull();
    });

    it("stores and reads a debounce timestamp", async () => {
      await expect(store.getDebounce("deploy")).resolves.toBeNull();
      await store.setDebounce("deploy", 1_700_000_000_000);
      await expect(store.getDebounce("deploy")).resolves.toBe(1_700_000_000_000);
    });

    it("increments a counter from zero", async () => {
      await expect(store.incrementCounter("analyses", 3600)).resolves.toBe(1);
      await expect(store.incrementCounter("analyses", 3600)).resolves.toBe(2);
    });
  });
};

const tempDirs: string[] = [];
const freshFileStore = (now?: () => number): FileSeoStore => {
  const dir = mkdtempSync(join(tmpdir(), "seo-store-"));
  tempDirs.push(dir);
  return new FileSeoStore(dir, now);
};

afterAll(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
});

conformanceSuite("FileSeoStore", () => freshFileStore());

/**
 * An in-memory Redis good enough to run the same suite. Not a claim that
 * Upstash behaves identically - it is a check that the adapter's command
 * sequences produce the documented semantics.
 */
const fakeRedis = (): typeof globalThis.fetch => {
  const strings = new Map<string, string>();
  const sets = new Map<string, Set<string>>();

  const execute = (args: readonly string[]): string | number | string[] | null => {
    const [command, key = "", ...rest] = args;

    switch (command) {
      case "SET": {
        if (rest.includes("NX") && strings.has(key)) return null;
        strings.set(key, rest[0] ?? "");
        return "OK";
      }
      case "GET":
        return strings.get(key) ?? null;
      case "SADD": {
        const set = sets.get(key) ?? new Set<string>();
        set.add(rest[0] ?? "");
        sets.set(key, set);
        return 1;
      }
      case "SMEMBERS":
        return [...(sets.get(key) ?? [])];
      case "INCR": {
        const next = Number(strings.get(key) ?? "0") + 1;
        strings.set(key, String(next));
        return next;
      }
      case "EXPIRE":
        return 1;
      default:
        return null;
    }
  };

  const impl: typeof globalThis.fetch = (_input, init) => {
    const args: string[] = JSON.parse(String(init?.body ?? "[]"));
    return Promise.resolve(
      new Response(JSON.stringify({ result: execute(args) }), { status: 200 }),
    );
  };
  return impl;
};

conformanceSuite(
  "UpstashRedisStore",
  () => new UpstashRedisStore({ url: "https://fake", token: "t", fetch: fakeRedis() }),
);

describe("FileSeoStore specifics", () => {
  it("expires a claim once its TTL has passed", async () => {
    let now = 1_000_000;
    const store = freshFileStore(() => now);

    await expect(store.claimIdempotencyKey("k", 60)).resolves.toBe(true);
    await expect(store.claimIdempotencyKey("k", 60)).resolves.toBe(false);

    now += 61_000;
    await expect(store.claimIdempotencyKey("k", 60)).resolves.toBe(true);
  });

  it("yields exactly one winner across concurrent claims", async () => {
    const store = freshFileStore();
    const results = await Promise.all(
      Array.from({ length: 10 }, () => store.claimIdempotencyKey("race", 60)),
    );
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it("resets a counter after its window", async () => {
    let now = 1_000_000;
    const store = freshFileStore(() => now);

    await store.incrementCounter("c", 3600);
    await expect(store.incrementCounter("c", 3600)).resolves.toBe(2);

    now += 3_600_001;
    await expect(store.incrementCounter("c", 3600)).resolves.toBe(1);
  });
});

describe("UpstashRedisStore specifics", () => {
  it("claims with a single SET NX EX command", async () => {
    const calls: string[][] = [];
    const spy = vi.fn<typeof globalThis.fetch>().mockImplementation((_input, init) => {
      calls.push(JSON.parse(String(init?.body ?? "[]")));
      return Promise.resolve(new Response(JSON.stringify({ result: "OK" }), { status: 200 }));
    });

    const store = new UpstashRedisStore({ url: "https://fake", token: "t", fetch: spy });
    await store.claimIdempotencyKey("k", 60);

    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual(["SET", "seo:idem:k", "1", "NX", "EX", "60"]);
  });

  it("throws at construction when credentials are missing", () => {
    expect(() => new UpstashRedisStore({ url: "", token: "" })).toThrow(RedisConfigurationError);
  });
});

describe("createStore", () => {
  it("defaults to the file store", () => {
    const dir = mkdtempSync(join(tmpdir(), "seo-store-"));
    tempDirs.push(dir);
    expect(createStore({ driver: undefined, dir })).toBeInstanceOf(FileSeoStore);
  });

  it("fails fast when redis is requested without credentials", () => {
    expect(() => createStore({ driver: "redis" })).toThrow(RedisConfigurationError);
  });
});
