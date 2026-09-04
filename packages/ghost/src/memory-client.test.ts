import { toSlug } from "@everyware/seo-core";
import { describe, expect, it } from "vitest";
import postsFixture from "./fixtures/posts.json" with { type: "json" };
import { InMemoryGhostClient } from "./memory-client.js";
import { GhostSchemaError } from "./schema.js";
import { normalizePost, readingTimeMinutes } from "./normalize.js";

const client = new InMemoryGhostClient();

describe("InMemoryGhostClient", () => {
  it("implements all six methods", async () => {
    await expect(client.listPosts()).resolves.toBeInstanceOf(Array);
    await expect(client.getPostBySlug(toSlug("washing-machine-service-frequency"))).resolves.toBeTruthy();
    await expect(client.listPostsByTag(toSlug("service-costs"))).resolves.toBeInstanceOf(Array);
    await expect(client.listPostsByAuthor(toSlug("priya-nair"))).resolves.toBeInstanceOf(Array);
    await expect(client.listTags()).resolves.toBeInstanceOf(Array);
    await expect(client.listAuthors()).resolves.toBeInstanceOf(Array);
  });

  it("returns posts newest first", async () => {
    const posts = await client.listPosts();
    const timestamps = posts.map((post) => Date.parse(post.publishedAt));
    expect(timestamps).toEqual([...timestamps].sort((a, b) => b - a));
  });

  it("resolves null for an unknown slug rather than throwing", async () => {
    await expect(client.getPostBySlug(toSlug("does-not-exist"))).resolves.toBeNull();
  });

  it("filters posts by tag", async () => {
    const posts = await client.listPostsByTag(toSlug("service-costs"));
    expect(posts.map((post) => post.slug)).toEqual([
      "washing-machine-service-frequency",
      "ac-servicing-cost-india",
    ]);
  });

  it("filters posts by author", async () => {
    const posts = await client.listPostsByAuthor(toSlug("rahul-menon"));
    expect(posts.map((post) => post.slug)).toEqual([
      "ac-servicing-cost-india",
      "choosing-a-water-purifier",
    ]);
  });
});

describe("internal tag filtering", () => {
  it("excludes hash- tags from listTags()", async () => {
    const tags = await client.listTags();
    expect(tags.map((tag) => tag.slug)).not.toContain("hash-featured");
    expect(tags).toHaveLength(3);
  });

  it("excludes internal tags from a post that carries one", async () => {
    const post = await client.getPostBySlug(toSlug("refrigerator-not-cooling-checklist"));
    expect(post).not.toBeNull();
    // This fixture carries #featured in Ghost; it must not reach the domain type,
    // or it would generate a public category page for an editorial workflow tag.
    expect(post?.tags.map((tag) => tag.slug)).toEqual(["appliance-maintenance"]);
  });
});

describe("normalisation", () => {
  it("prefers custom_excerpt over excerpt", async () => {
    const post = await client.getPostBySlug(toSlug("washing-machine-service-frequency"));
    expect(post?.excerpt).toMatch(/^Once a year for normal use/);
  });

  it("falls back to excerpt when custom_excerpt is null", async () => {
    const post = await client.getPostBySlug(toSlug("ac-servicing-cost-india"));
    expect(post?.excerpt).toMatch(/^A split AC service runs between 450 and 800/);
  });

  it("returns a null featureImage when Ghost has none", async () => {
    const post = await client.getPostBySlug(toSlug("choosing-a-water-purifier"));
    expect(post?.featureImage).toBeNull();
  });

  it("pairs a feature image with its alt text", async () => {
    const post = await client.getPostBySlug(toSlug("washing-machine-service-frequency"));
    expect(post?.featureImage?.alt).not.toBe("");
  });

  it("carries the editor's meta_title through untouched", async () => {
    const post = await client.getPostBySlug(toSlug("geyser-thermostat-quick-tip"));
    expect(post?.metaTitle).toBe("Set Your Geyser to 60C: The One-Minute Fix");
  });

  it("brands dates as IsoDateTime", async () => {
    const post = await client.getPostBySlug(toSlug("washing-machine-service-frequency"));
    expect(Number.isNaN(Date.parse(post?.publishedAt ?? ""))).toBe(false);
  });
});

describe("readingTimeMinutes", () => {
  it("is at least 1 for a very short post", async () => {
    const post = await client.getPostBySlug(toSlug("geyser-thermostat-quick-tip"));
    // The property under test is the floor, not the exact word count: any post
    // well under 200 words must still read as one minute rather than zero.
    expect(post?.plaintext.split(/\s+/).length).toBeLessThan(200);
    expect(post?.readingTimeMinutes).toBe(1);
  });

  it("rounds up", () => {
    expect(readingTimeMinutes("word ".repeat(201))).toBe(2);
    expect(readingTimeMinutes("word ".repeat(200))).toBe(1);
    expect(readingTimeMinutes("")).toBe(1);
  });
});

describe("schema failures", () => {
  // Widened deliberately: the fixture literal narrows to a tuple union, and the
  // point of these tests is to feed the parser payloads it should reject.
  const validPost: Record<string, unknown> = { ...postsFixture[0] };

  it("throws naming the offending post when a required field is dropped", () => {
    const { title: _title, ...withoutTitle } = { ...validPost };
    expect(() => normalizePost(withoutTitle)).toThrow(GhostSchemaError);
    expect(() => normalizePost(withoutTitle)).toThrow(/washing-machine-service-frequency/);
  });

  it("throws when a post has no author at all", () => {
    expect(() =>
      normalizePost({ ...validPost, authors: [], primary_author: null }),
    ).toThrow(/has no author/);
  });

  it("still names the context when the payload has no slug to report", () => {
    expect(() => normalizePost({ nonsense: true })).toThrow(/failed validation in post/);
  });
});
