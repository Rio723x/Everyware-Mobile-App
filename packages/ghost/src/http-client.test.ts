import { toSlug } from "@everyware/seo-core";
import { describe, expect, it, vi } from "vitest";
import postsFixture from "./fixtures/posts.json" with { type: "json" };
import tagsFixture from "./fixtures/tags.json" with { type: "json" };
import authorsFixture from "./fixtures/authors.json" with { type: "json" };
import { GhostConfigurationError, createGhostClient } from "./create-client.js";
import { GhostRequestError, HttpGhostClient } from "./http-client.js";
import { InMemoryGhostClient } from "./memory-client.js";
import { GhostSchemaError } from "./schema.js";

const noSleep = (): Promise<void> => Promise.resolve();

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const makeClient = (fetchImpl: typeof globalThis.fetch): HttpGhostClient =>
  new HttpGhostClient({
    url: "https://cms.everyware.in",
    key: "test-content-key",
    fetch: fetchImpl,
    sleep: noSleep,
  });

describe("pagination", () => {
  it("follows meta.pagination to exhaustion", async () => {
    const firstHalf = postsFixture.slice(0, 3);
    const secondHalf = postsFixture.slice(3);
    const fetchMock = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          posts: firstHalf,
          meta: { pagination: { page: 1, limit: "all", pages: 2, total: 6, next: 2, prev: null } },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          posts: secondHalf,
          meta: { pagination: { page: 2, limit: "all", pages: 2, total: 6, next: null, prev: 1 } },
        }),
      );

    const posts = await makeClient(fetchMock).listPosts();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(posts).toHaveLength(postsFixture.length);
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("page=2");
  });

  it("stops after one request when there is no next page", async () => {
    const fetchMock = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      jsonResponse({
        posts: postsFixture,
        meta: { pagination: { page: 1, limit: "all", pages: 1, total: 6, next: null, prev: null } },
      }),
    );

    await makeClient(fetchMock).listPosts();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("retry policy", () => {
  it("retries a 5xx and succeeds on the third attempt", async () => {
    const fetchMock = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(jsonResponse({ errors: [] }, 500))
      .mockResolvedValueOnce(jsonResponse({ errors: [] }, 502))
      .mockResolvedValueOnce(
        jsonResponse({
          posts: postsFixture,
          meta: { pagination: { page: 1, limit: "all", pages: 1, total: 6, next: null, prev: null } },
        }),
      );

    const posts = await makeClient(fetchMock).listPosts();

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(posts).toHaveLength(postsFixture.length);
  });

  it("throws after exhausting retries on persistent 5xx", async () => {
    const fetchMock = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(jsonResponse({ errors: [] }, 503));

    await expect(makeClient(fetchMock).listPosts()).rejects.toThrow(GhostRequestError);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("retries network failures", async () => {
    const fetchMock = vi
      .fn<typeof globalThis.fetch>()
      .mockRejectedValueOnce(new Error("ECONNRESET"))
      .mockResolvedValueOnce(
        jsonResponse({
          posts: [],
          meta: { pagination: { page: 1, limit: "all", pages: 1, total: 0, next: null, prev: null } },
        }),
      );

    await expect(makeClient(fetchMock).listPosts()).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry a 4xx", async () => {
    const fetchMock = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(jsonResponse({ errors: [] }, 400));

    await expect(makeClient(fetchMock).listPosts()).rejects.toThrow(GhostRequestError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("keeps the Content API key out of error messages", async () => {
    const fetchMock = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(jsonResponse({ errors: [] }, 400));

    await expect(makeClient(fetchMock).listPosts()).rejects.toThrow(/key=REDACTED/);
    await expect(makeClient(fetchMock).listPosts()).rejects.not.toThrow(/test-content-key/);
  });
});

describe("getPostBySlug", () => {
  it("returns null on 404", async () => {
    const fetchMock = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(jsonResponse({ errors: [] }, 404));

    await expect(makeClient(fetchMock).getPostBySlug(toSlug("missing"))).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws on a persistent 500", async () => {
    const fetchMock = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(jsonResponse({ errors: [] }, 500));

    await expect(makeClient(fetchMock).getPostBySlug(toSlug("boom"))).rejects.toThrow(
      GhostRequestError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("returns null when the response carries no post", async () => {
    const fetchMock = vi.fn<typeof globalThis.fetch>().mockResolvedValue(jsonResponse({ posts: [] }));
    await expect(makeClient(fetchMock).getPostBySlug(toSlug("empty"))).resolves.toBeNull();
  });
});

describe("schema validation", () => {
  it("throws naming the offending post slug", async () => {
    const broken = { ...postsFixture[0], published_at: null };
    // A fresh Response per call: a Response body can only be read once, and this
    // assertion runs the request twice.
    const fetchMock = vi.fn<typeof globalThis.fetch>().mockImplementation(() =>
      Promise.resolve(
        jsonResponse({
          posts: [broken],
          meta: {
            pagination: { page: 1, limit: "all", pages: 1, total: 1, next: null, prev: null },
          },
        }),
      ),
    );

    await expect(makeClient(fetchMock).listPosts()).rejects.toThrow(GhostSchemaError);
    await expect(makeClient(fetchMock).listPosts()).rejects.toThrow(
      /washing-machine-service-frequency/,
    );
  });

  it("throws when the envelope itself is malformed", async () => {
    const fetchMock = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(() => Promise.resolve(jsonResponse({ unexpected: true })));

    await expect(makeClient(fetchMock).listPosts()).rejects.toThrow(/posts response/);
  });
});

describe("adapter conformance", () => {
  // The two adapters are only substitutable if they agree. Running the same
  // fixture payload through both and comparing the domain objects is what makes
  // every fixture-backed test downstream a statement about production.
  const singlePage = (items: readonly unknown[], envelopeKey: string): Response =>
    jsonResponse({
      [envelopeKey]: items,
      meta: {
        pagination: { page: 1, limit: "all", pages: 1, total: items.length, next: null, prev: null },
      },
    });

  const httpClient = makeClient(
    vi.fn<typeof globalThis.fetch>().mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/tags/")) return Promise.resolve(singlePage(tagsFixture, "tags"));
      if (url.includes("/authors/")) return Promise.resolve(singlePage(authorsFixture, "authors"));
      return Promise.resolve(singlePage(postsFixture, "posts"));
    }),
  );
  const memoryClient = new InMemoryGhostClient();

  it("produces deep-equal posts", async () => {
    expect(await httpClient.listPosts()).toEqual(await memoryClient.listPosts());
  });

  it("produces deep-equal tags, with internal tags excluded by both", async () => {
    expect(await httpClient.listTags()).toEqual(await memoryClient.listTags());
  });

  it("produces deep-equal authors", async () => {
    expect(await httpClient.listAuthors()).toEqual(await memoryClient.listAuthors());
  });
});

describe("createGhostClient", () => {
  it("returns the HTTP adapter when both credentials are present", () => {
    const client = createGhostClient({
      url: "https://cms.everyware.in",
      key: "k",
      isProduction: true,
    });
    expect(client).toBeInstanceOf(HttpGhostClient);
  });

  it("falls back to fixtures with a warning outside production", () => {
    const warn = vi.fn<(message: string) => void>();
    const client = createGhostClient({ url: undefined, key: undefined, isProduction: false, warn });
    expect(client).toBeInstanceOf(InMemoryGhostClient);
    expect(warn).toHaveBeenCalledOnce();
  });

  it("throws in production rather than deploying an empty blog", () => {
    expect(() =>
      createGhostClient({ url: undefined, key: undefined, isProduction: true }),
    ).toThrow(GhostConfigurationError);
  });

  it("treats an empty-string credential as missing", () => {
    expect(() => createGhostClient({ url: "", key: "", isProduction: true })).toThrow(
      GhostConfigurationError,
    );
  });
});

describe("forceFixtures", () => {
  it("returns the fixture adapter even when live credentials are present", () => {
    // Guards the test suite: a developer with .env.local pointing at live Ghost
    // must still get deterministic, offline builds when running tests.
    const client = createGhostClient({
      url: "https://cms.everyware.in",
      key: "real-looking-key",
      isProduction: true,
      forceFixtures: true,
    });
    expect(client).toBeInstanceOf(InMemoryGhostClient);
  });

  it("does not throw in production when fixtures are forced", () => {
    expect(() =>
      createGhostClient({ url: undefined, key: undefined, isProduction: true, forceFixtures: true }),
    ).not.toThrow();
  });
});
