import { InMemoryGhostClient } from "@everyware/ghost";
import { toSlug } from "@everyware/seo-core";
import { describe, expect, it } from "vitest";
import { relatedPosts } from "../src/lib/related";

const client = new InMemoryGhostClient();

describe("relatedPosts", () => {
  it("is deterministic across repeated calls", async () => {
    const all = await client.listPosts();
    const source = all[0];
    if (source === undefined) throw new Error("empty fixture corpus");

    const runs = Array.from({ length: 10 }, () =>
      relatedPosts(source, all).map((post) => post.slug),
    );
    for (const run of runs) {
      expect(run).toEqual(runs[0]);
    }
  });

  it("never includes the source article", async () => {
    const all = await client.listPosts();
    for (const source of all) {
      expect(relatedPosts(source, all).map((p) => p.id)).not.toContain(source.id);
    }
  });

  it("prefers posts sharing a tag", async () => {
    const all = await client.listPosts();
    const source = await client.getPostBySlug(toSlug("washing-machine-service-frequency"));
    if (source === null) throw new Error("fixture missing");

    const sourceTags = new Set(source.tags.map((t) => t.slug));
    const related = relatedPosts(source, all);
    const firstShares = related[0]?.tags.some((t) => sourceTags.has(t.slug));
    expect(firstShares).toBe(true);
  });

  it("fills to three by recency when too few share a tag", async () => {
    const all = await client.listPosts();
    // This post has no tags at all, so nothing can share one with it.
    const source = await client.getPostBySlug(toSlug("smart-home-starter-guide"));
    if (source === null) throw new Error("fixture missing");

    const related = relatedPosts(source, all);
    expect(related).toHaveLength(3);
    const timestamps = related.map((p) => Date.parse(p.publishedAt));
    expect(timestamps).toEqual([...timestamps].sort((a, b) => b - a));
  });

  it("returns nothing for a corpus of one", async () => {
    const source = (await client.listPosts())[0];
    if (source === undefined) throw new Error("empty fixture corpus");
    expect(relatedPosts(source, [source])).toEqual([]);
  });
});
