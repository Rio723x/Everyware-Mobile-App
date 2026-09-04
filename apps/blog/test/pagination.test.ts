import { describe, expect, it } from "vitest";
import { extraPageNumbers, paginate } from "../src/lib/pagination";
import { articleTrail, authorTrail, categoryTrail, listingTrail } from "../src/lib/breadcrumbs";
import { InMemoryGhostClient } from "@everyware/ghost";
import { toSlug } from "@everyware/seo-core";

const items = Array.from({ length: 25 }, (_, i) => i + 1);

describe("paginate", () => {
  it("slices page 1 and offers no prev", () => {
    const page = paginate(items, 1, "/blog");
    expect(page.items).toEqual(items.slice(0, 12));
    expect(page.prevHref).toBeNull();
    expect(page.nextHref).toBe("/blog/page/2");
    expect(page.totalPages).toBe(3);
  });

  it("slices a middle page with both links", () => {
    const page = paginate(items, 2, "/blog");
    expect(page.items).toEqual(items.slice(12, 24));
    expect(page.prevHref).toBe("/blog");
    expect(page.nextHref).toBe("/blog/page/3");
  });

  it("offers no next on the last page", () => {
    const page = paginate(items, 3, "/blog");
    expect(page.items).toEqual([25]);
    expect(page.nextHref).toBeNull();
    expect(page.prevHref).toBe("/blog/page/2");
  });

  it("links page 2's prev to the base path, never to /page/1", () => {
    // Two URLs serving identical content is a duplicate-content problem, so
    // /blog/page/1 must never be linked or generated.
    expect(paginate(items, 2, "/blog").prevHref).toBe("/blog");
    expect(paginate(items, 2, "/blog/category/x").prevHref).toBe("/blog/category/x");
  });

  it("clamps an out-of-range page rather than returning an empty slice", () => {
    expect(paginate(items, 99, "/blog").page).toBe(3);
    expect(paginate(items, 0, "/blog").page).toBe(1);
  });

  it("reports one page for an empty list", () => {
    const page = paginate([], 1, "/blog");
    expect(page.totalPages).toBe(1);
    expect(page.items).toEqual([]);
    expect(page.prevHref).toBeNull();
    expect(page.nextHref).toBeNull();
  });
});

describe("extraPageNumbers", () => {
  it("returns nothing when everything fits on page 1", () => {
    expect(extraPageNumbers(12)).toEqual([]);
    expect(extraPageNumbers(5)).toEqual([]);
    expect(extraPageNumbers(0)).toEqual([]);
  });

  it("starts at 2, never 1", () => {
    expect(extraPageNumbers(25)).toEqual([2, 3]);
    expect(extraPageNumbers(13)).toEqual([2]);
  });
});

describe("breadcrumb trails", () => {
  const client = new InMemoryGhostClient();

  it("ends every trail with an unlinked current page", async () => {
    const post = await client.getPostBySlug(toSlug("washing-machine-service-frequency"));
    const tags = await client.listTags();
    const authors = await client.listAuthors();
    const firstTag = tags[0];
    const firstAuthor = authors[0];
    if (post === null || firstTag === undefined || firstAuthor === undefined) {
      throw new Error("fixture corpus is missing a post, tag or author");
    }

    for (const trail of [
      listingTrail(),
      articleTrail(post),
      categoryTrail(firstTag),
      authorTrail(firstAuthor),
    ]) {
      expect(trail.at(-1)?.href).toBeNull();
      expect(trail.slice(0, -1).every((crumb) => crumb.href !== null)).toBe(true);
    }
  });

  it("includes the primary category for a tagged article", async () => {
    const post = await client.getPostBySlug(toSlug("washing-machine-service-frequency"));
    if (post === null) throw new Error("fixture missing");
    expect(articleTrail(post).map((c) => c.label)).toEqual([
      "Home",
      "Blog",
      "Appliance Maintenance",
      post.title,
    ]);
  });

  it("omits the category level for an untagged article rather than inventing one", async () => {
    const post = await client.getPostBySlug(toSlug("smart-home-starter-guide"));
    if (post === null) throw new Error("fixture missing");
    const trail = articleTrail(post);
    expect(trail).toHaveLength(3);
    expect(trail.map((c) => c.label)).toEqual(["Home", "Blog", post.title]);
  });
});
