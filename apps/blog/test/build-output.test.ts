import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { InMemoryGhostClient } from "@everyware/ghost";

const here = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(here, "../dist");

/**
 * These assertions run against the emitted HTML files, never against component
 * props or Astro internals. The existing site's canonicals pass every
 * state-level check and are still wrong in the browser, which is exactly the
 * class of bug this file exists to catch.
 */
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

export const htmlFiles = (): readonly string[] =>
  walk(distDir)
    .filter((file) => file.endsWith(".html"))
    .map((file) => relative(distDir, file).split("\\").join("/"));

const client = new InMemoryGhostClient();

beforeAll(() => {
  if (!existsSync(distDir)) {
    throw new Error(
      "apps/blog/dist is missing. Run `npm run build -w apps/blog` before this suite - " +
        "a build-output test that skips when there is no build is worse than no test.",
    );
  }
});

describe("listing routes", () => {
  it("emits the blog index at blog.html", () => {
    expect(htmlFiles()).toContain("blog.html");
  });

  it("emits pages 2..n and never page/1", async () => {
    const posts = await client.listPosts();
    const files = htmlFiles();

    // The fixture corpus is deliberately larger than one page so this assertion
    // is real rather than vacuous.
    expect(posts.length).toBeGreaterThan(12);
    expect(files).toContain("blog/page/2.html");
    expect(files).not.toContain("blog/page/1.html");
  });

  it("puts the newest 12 posts on page 1 and the remainder on page 2", async () => {
    const posts = await client.listPosts();
    const page1 = readFileSync(resolve(distDir, "blog.html"), "utf8");
    const page2 = readFileSync(resolve(distDir, "blog/page/2.html"), "utf8");

    for (const post of posts.slice(0, 12)) {
      expect(page1).toContain(`/blog/${post.slug}`);
    }
    for (const post of posts.slice(12)) {
      expect(page2).toContain(`/blog/${post.slug}`);
      expect(page1).not.toContain(`href="/blog/${post.slug}"`);
    }
  });

  it("carries rel=next on page 1 and rel=prev on the last page", () => {
    const page1 = readFileSync(resolve(distDir, "blog.html"), "utf8");
    const page2 = readFileSync(resolve(distDir, "blog/page/2.html"), "utf8");

    expect(page1).toMatch(/rel="next"/);
    expect(page1).not.toMatch(/rel="prev"/);
    expect(page2).toMatch(/rel="prev"/);
  });

  it("links page 2's prev back to /blog, not /blog/page/1", () => {
    const page2 = readFileSync(resolve(distDir, "blog/page/2.html"), "utf8");
    expect(page2).toMatch(/rel="prev"\s+href="\/blog"/);
    expect(page2).not.toContain("/blog/page/1");
  });
});

describe("every emitted page", () => {
  it("has exactly one non-empty h1", () => {
    for (const file of htmlFiles()) {
      const html = readFileSync(resolve(distDir, file), "utf8");
      const headings = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/g) ?? [];
      expect(headings, file).toHaveLength(1);
      expect(headings[0]?.replace(/<[^>]+>/g, "").trim(), file).not.toBe("");
    }
  });

  it("declares a breadcrumb landmark and a main landmark", () => {
    for (const file of htmlFiles()) {
      const html = readFileSync(resolve(distDir, file), "utf8");
      expect(html, file).toMatch(/<nav[^>]*aria-label="Breadcrumb"/);
      expect(html, file).toMatch(/<main/);
    }
  });

  it("gives every img a non-empty alt", () => {
    for (const file of htmlFiles()) {
      const html = readFileSync(resolve(distDir, file), "utf8");
      for (const tag of html.match(/<img\b[^>]*>/g) ?? []) {
        expect(tag, file).toMatch(/\salt="[^"]+"/);
      }
    }
  });

  it("gives every time element a parseable datetime", () => {
    for (const file of htmlFiles()) {
      const html = readFileSync(resolve(distDir, file), "utf8");
      for (const tag of html.match(/<time\b[^>]*>/g) ?? []) {
        const value = /datetime="([^"]+)"/.exec(tag)?.[1];
        expect(value, `${file}: ${tag}`).toBeDefined();
        expect(Number.isNaN(Date.parse(value ?? "")), `${file}: ${tag}`).toBe(false);
      }
    }
  });

  it("ships no JavaScript", () => {
    for (const file of htmlFiles()) {
      const html = readFileSync(resolve(distDir, file), "utf8");
      expect(html.match(/<script/g) ?? [], file).toEqual([]);
    }
  });
});
