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

const allHtmlFiles = (): readonly string[] =>
  walk(distDir)
    .filter((file) => file.endsWith(".html"))
    .map((file) => relative(distDir, file).split("\\").join("/"));

/**
 * Every indexable page. 404.html is excluded: it is served for URLs that do not
 * exist, so assertions about the content set - one file per post, links that
 * resolve to real posts - do not apply to it. It gets its own tests below.
 */
export const htmlFiles = (): readonly string[] =>
  allHtmlFiles().filter((file) => file !== "404.html");

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

  it("ships no executable JavaScript", () => {
    // JSON-LD is data the browser never executes, so it is excluded here.
    for (const file of htmlFiles()) {
      const html = readFileSync(resolve(distDir, file), "utf8");
      const executable = (html.match(/<script[^>]*>/g) ?? []).filter(
        (tag) => !tag.includes("application/ld+json"),
      );
      expect(executable, file).toEqual([]);
    }
  });
});

describe("article pages", () => {
  it("emits exactly one file per published post", async () => {
    const posts = await client.listPosts();
    // Articles are blog/<slug>.html exactly: one path segment under blog/,
    // which excludes blog/page/, blog/category/ and blog/author/.
    const articleFiles = htmlFiles().filter((file) => /^blog\/[^/]+\.html$/.test(file));
    expect(articleFiles).toHaveLength(posts.length);
    for (const post of posts) {
      expect(articleFiles).toContain(`blog/${post.slug}.html`);
    }
  });

  it("uses the post title as the page's only h1", async () => {
    for (const post of await client.listPosts()) {
      const html = readFileSync(resolve(distDir, `blog/${post.slug}.html`), "utf8");
      const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1]?.replace(/<[^>]+>/g, "").trim();
      expect(h1, post.slug).toBe(post.title);
    }
  });

  it("puts the full article text in the raw HTML, with no JavaScript involved", async () => {
    // The whole reason Astro is here: a crawler must receive the article in the
    // first byte, not after hydration.
    for (const post of await client.listPosts()) {
      const html = readFileSync(resolve(distDir, `blog/${post.slug}.html`), "utf8");
      const bodyText = (/<div class="article-body"[^>]*>([\s\S]*?)<\/div>/.exec(html)?.[1] ?? "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const expected = post.plaintext.replace(/\s+/g, " ").trim();

      expect(bodyText, post.slug).not.toBe("");
      // Every sentence of the source text must survive into the served HTML.
      for (const sentence of expected.split(". ").filter((s) => s.length > 12)) {
        expect(bodyText, `${post.slug}: "${sentence}"`).toContain(sentence.replace(/\.$/, ""));
      }
    }
  });

  it("never skips a heading level", async () => {
    for (const post of await client.listPosts()) {
      const html = readFileSync(resolve(distDir, `blog/${post.slug}.html`), "utf8");
      const levels = [...html.matchAll(/<h([1-6])\b/gi)].map((m) => Number(m[1]));
      let previous = 0;
      for (const level of levels) {
        if (previous !== 0) {
          expect(level, `${post.slug}: h${String(previous)} -> h${String(level)}`).toBeLessThanOrEqual(
            previous + 1,
          );
        }
        previous = level;
      }
    }
  });

  it("lazy-loads body images and eagerly loads the hero", async () => {
    const post = (await client.listPosts()).find((p) => p.featureImage !== null);
    expect(post).toBeDefined();
    const html = readFileSync(resolve(distDir, `blog/${post?.slug ?? ""}.html`), "utf8");
    expect(html).toMatch(/class="article-hero"[^>]*loading="eager"|loading="eager"[^>]*article-hero/);
  });

  it("links every article to at least one other internal Everyware URL", async () => {
    // No orphan pages: an article that links nowhere is a dead end for both
    // crawlers and readers.
    for (const post of await client.listPosts()) {
      const html = readFileSync(resolve(distDir, `blog/${post.slug}.html`), "utf8");
      const internal = [...html.matchAll(/href="(\/[^"]*)"/g)]
        .map((m) => m[1])
        .filter((href): href is string => href !== undefined)
        .filter((href) => href !== `/blog/${post.slug}`);
      expect(internal.length, post.slug).toBeGreaterThan(0);
    }
  });

  it("gives an untagged article a three-level breadcrumb rather than a broken four-level one", () => {
    const html = readFileSync(resolve(distDir, "blog/smart-home-starter-guide.html"), "utf8");
    const crumbs = html.match(/<li>[\s\S]*?<\/li>/g) ?? [];
    const breadcrumbBlock = /<nav[^>]*aria-label="Breadcrumb"[\s\S]*?<\/nav>/.exec(html)?.[0] ?? "";
    expect(breadcrumbBlock.match(/<li>/g) ?? []).toHaveLength(3);
    expect(crumbs.length).toBeGreaterThan(0);
  });
});

describe("related posts and CTA", () => {
  it("renders a related-articles aside on every article", async () => {
    for (const post of await client.listPosts()) {
      const html = readFileSync(resolve(distDir, `blog/${post.slug}.html`), "utf8");
      expect(html, post.slug).toMatch(/<aside[^>]*aria-label="Related articles"/);
    }
  });

  it("links three other articles from every article", async () => {
    for (const post of await client.listPosts()) {
      const html = readFileSync(resolve(distDir, `blog/${post.slug}.html`), "utf8");
      const aside = /<aside[^>]*aria-label="Related articles"[\s\S]*?<\/aside>/.exec(html)?.[0] ?? "";
      const linked = new Set(
        [...aside.matchAll(/href="\/blog\/([a-z0-9-]+)"/g)].map((m) => m[1]),
      );
      expect(linked.size, post.slug).toBe(3);
      expect(linked.has(post.slug), `${post.slug} links to itself`).toBe(false);
    }
  });

  it("renders the CTA band with no script on every page", () => {
    for (const file of htmlFiles()) {
      const html = readFileSync(resolve(distDir, file), "utf8");
      expect(html, file).toMatch(/aria-label="Get the EveryWare app"/);
      const executable = (html.match(/<script[^>]*>/g) ?? []).filter(
        (tag) => !tag.includes("application/ld+json"),
      );
      expect(executable, file).toEqual([]);
    }
  });
});

describe("category and author routes", () => {
  it("emits one page per public tag and none for internal tags", async () => {
    const tags = await client.listTags();
    const files = htmlFiles().filter((f) => f.startsWith("blog/category/"));

    expect(files).toHaveLength(tags.length);
    for (const tag of tags) {
      expect(files).toContain(`blog/category/${tag.slug}.html`);
    }
    // An editorial workflow tag must never become a public URL.
    expect(files.some((f) => f.includes("hash-"))).toBe(false);
  });

  it("emits one page per author", async () => {
    const authors = await client.listAuthors();
    const files = htmlFiles().filter((f) => f.startsWith("blog/author/"));

    expect(files).toHaveLength(authors.length);
    for (const author of authors) {
      expect(files).toContain(`blog/author/${author.slug}.html`);
    }
  });

  it("lists exactly the posts carrying that tag, newest first", async () => {
    for (const tag of await client.listTags()) {
      const html = readFileSync(resolve(distDir, `blog/category/${tag.slug}.html`), "utf8");
      const grid = /<div class="post-grid">[\s\S]*?<\/div>\s*<\/div>/.exec(html)?.[0] ?? html;
      const expected = await client.listPostsByTag(tag.slug);

      for (const post of expected.slice(0, 12)) {
        expect(grid, `${tag.slug} should list ${post.slug}`).toContain(`/blog/${post.slug}`);
      }
    }
  });

  it("uses the tag or author name as the h1", async () => {
    for (const tag of await client.listTags()) {
      const html = readFileSync(resolve(distDir, `blog/category/${tag.slug}.html`), "utf8");
      const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1]?.replace(/<[^>]+>/g, "").trim();
      expect(h1, tag.slug).toBe(tag.name);
    }
    for (const author of await client.listAuthors()) {
      const html = readFileSync(resolve(distDir, `blog/author/${author.slug}.html`), "utf8");
      const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1]?.replace(/<[^>]+>/g, "").trim();
      expect(h1, author.slug).toBe(author.name);
    }
  });

  it("renders no empty paragraph for a tag without a description or an author without a bio", async () => {
    for (const file of htmlFiles().filter(
      (f) => f.startsWith("blog/category/") || f.startsWith("blog/author/"),
    )) {
      const html = readFileSync(resolve(distDir, file), "utf8");
      expect(html, file).not.toMatch(/<p class="blog-lead">\s*<\/p>/);
    }
  });

  it("renders no broken image for an author with no avatar", async () => {
    // Rahul has profile_image: null in the fixtures.
    const html = readFileSync(resolve(distDir, "blog/author/rahul-menon.html"), "utf8");
    expect(html).not.toMatch(/<img[^>]*class="author-avatar"/);
  });

  it("resolves every tag chip and author link emitted anywhere in the blog", () => {
    const emitted = new Set(htmlFiles());
    for (const file of htmlFiles()) {
      const html = readFileSync(resolve(distDir, file), "utf8");
      const internal = [...html.matchAll(/href="(\/blog[^"#?]*)"/g)]
        .map((m) => m[1])
        .filter((href): href is string => href !== undefined);

      for (const href of internal) {
        const target = href === "/blog" ? "blog.html" : `${href.replace(/^\//, "")}.html`;
        expect(emitted.has(target), `${file} links to ${href}, which was not emitted`).toBe(true);
      }
    }
  });
});

describe("404 page", () => {
  it("is emitted", () => {
    expect(allHtmlFiles()).toContain("404.html");
  });

  it("offers a way onward to both the blog and the homepage", () => {
    const html = readFileSync(resolve(distDir, "404.html"), "utf8");
    expect(html).toMatch(/href="\/blog"/);
    expect(html).toMatch(/href="\/"/);
  });

  it("has exactly one h1 and ships no JavaScript", () => {
    const html = readFileSync(resolve(distDir, "404.html"), "utf8");
    expect(html.match(/<h1/g) ?? []).toHaveLength(1);
    expect(html.match(/<script/g) ?? []).toEqual([]);
  });

  it("renders the same chrome as every other page", () => {
    const html = readFileSync(resolve(distDir, "404.html"), "utf8");
    expect(html).toMatch(/class="blog-header"/);
    expect(html).toMatch(/class="blog-footer"/);
  });
});
