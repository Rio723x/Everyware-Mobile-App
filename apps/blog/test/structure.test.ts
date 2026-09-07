import { InMemoryGhostClient } from "@everyware/ghost";
import { listEmittedPages, listHtmlFiles } from "@everyware/seo-core";
import { parseHTML } from "linkedom";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Spec 01's structural guarantees, asserted over the **merged** dist/ - the
 * exact bytes a crawler would receive, parsed with a real DOM.
 *
 * The distinction matters: the existing marketing site's canonicals would pass
 * any check written against application state, and are still wrong in the
 * browser. Every assertion here reads emitted HTML.
 */
const here = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(here, "../../../dist");

const client = new InMemoryGhostClient();
const pages = listEmittedPages(distDir);
const blogPages = pages.filter((page) => page.path.startsWith("/blog"));

const doc = (html: string): Document => parseHTML(html).document;

describe("the merged build", () => {
  it("contains both apps", () => {
    const files = listHtmlFiles(distDir);
    expect(files).toContain("index.html"); // the React SPA
    expect(files).toContain("blog.html"); // the Astro blog
    expect(files).toContain("404.html");
  });

  it("emits one article per published post, and one page per tag and author", async () => {
    const [posts, tags, authors] = await Promise.all([
      client.listPosts(),
      client.listTags(),
      client.listAuthors(),
    ]);
    const files = listHtmlFiles(distDir);

    expect(files.filter((f) => /^blog\/[^/]+\.html$/.test(f))).toHaveLength(posts.length);
    expect(files.filter((f) => f.startsWith("blog/category/"))).toHaveLength(tags.length);
    expect(files.filter((f) => f.startsWith("blog/author/"))).toHaveLength(authors.length);
  });

  it("maps every emitted file to a clean URL with no trailing slash", () => {
    for (const page of pages) {
      expect(page.path, page.file).not.toMatch(/\.html$/);
      if (page.path !== "/") {
        expect(page.path, page.file).not.toMatch(/\/$/);
      }
    }
  });
});

describe("every blog page", () => {
  it("has exactly one non-empty h1", () => {
    for (const page of blogPages) {
      const headings = doc(page.html).querySelectorAll("h1");
      expect(headings.length, page.file).toBe(1);
      expect(headings[0]?.textContent?.trim(), page.file).toBeTruthy();
    }
  });

  it("declares lang, charset and viewport", () => {
    for (const page of blogPages) {
      const d = doc(page.html);
      expect(d.documentElement.getAttribute("lang"), page.file).toBe("en");
      expect(d.querySelector("meta[charset]"), page.file).not.toBeNull();
      expect(d.querySelector('meta[name="viewport"]'), page.file).not.toBeNull();
    }
  });

  it("provides a main landmark and a breadcrumb", () => {
    for (const page of blogPages) {
      const d = doc(page.html);
      expect(d.querySelector("main"), page.file).not.toBeNull();
      expect(d.querySelector('nav[aria-label="Breadcrumb"]'), page.file).not.toBeNull();
    }
  });

  it("never skips a heading level", () => {
    for (const page of blogPages) {
      const levels = [...doc(page.html).querySelectorAll("h1,h2,h3,h4,h5,h6")].map((el) =>
        Number(el.tagName.slice(1)),
      );
      let previous = 0;
      for (const level of levels) {
        if (previous !== 0) {
          expect(level, `${page.file}: h${String(previous)} then h${String(level)}`)
            .toBeLessThanOrEqual(previous + 1);
        }
        previous = level;
      }
    }
  });

  it("gives every image a non-empty alt", () => {
    for (const page of blogPages) {
      for (const img of doc(page.html).querySelectorAll("img")) {
        expect(img.getAttribute("alt")?.trim(), `${page.file}: ${img.outerHTML}`).toBeTruthy();
      }
    }
  });

  it("gives every time element a parseable ISO datetime", () => {
    for (const page of blogPages) {
      for (const el of doc(page.html).querySelectorAll("time")) {
        const value = el.getAttribute("datetime") ?? "";
        expect(Number.isNaN(Date.parse(value)), `${page.file}: "${value}"`).toBe(false);
      }
    }
  });

  it("ships no executable JavaScript", () => {
    // application/ld+json is data, not code: the browser parses it and never
    // executes it, so structured data does not violate the zero-JS promise.
    for (const page of blogPages) {
      const executable = [...doc(page.html).querySelectorAll("script")].filter(
        (el) => el.getAttribute("type") !== "application/ld+json",
      );
      expect(executable.map((el) => el.outerHTML.slice(0, 80)), page.file).toEqual([]);
    }
  });

  it("links somewhere internal, and every internal link resolves", () => {
    const served = new Set(pages.map((page) => page.path));
    // The SPA's hash routes all live at "/", which is emitted.
    for (const page of blogPages) {
      const hrefs = [...doc(page.html).querySelectorAll("a[href]")]
        .map((a) => a.getAttribute("href") ?? "")
        .filter((href) => href.startsWith("/"))
        .map((href) => href.split("#")[0] ?? "")
        .filter((href) => href !== "");

      expect(hrefs.length, `${page.file} is an orphan`).toBeGreaterThan(0);

      for (const href of hrefs) {
        expect(served.has(href), `${page.file} links to ${href}, which was not emitted`).toBe(true);
      }
    }
  });
});

describe("emitted metadata", () => {
  it("gives every blog page exactly one title, description and canonical", () => {
    for (const page of blogPages) {
      const d = doc(page.html);
      expect(d.querySelectorAll("title").length, page.file).toBe(1);
      expect(d.querySelectorAll('meta[name="description"]').length, page.file).toBe(1);
      expect(d.querySelectorAll('link[rel="canonical"]').length, page.file).toBe(1);
    }
  });

  it("makes every canonical self-referential", () => {
    for (const page of blogPages) {
      const canonical = doc(page.html)
        .querySelector('link[rel="canonical"]')
        ?.getAttribute("href");
      expect(canonical, page.file).toBe(`https://everyware.in${page.path}`);
    }
  });

  it("emits JSON-LD that parses, with no HTML-escaping corruption", () => {
    for (const page of blogPages) {
      const scripts = [...doc(page.html).querySelectorAll('script[type="application/ld+json"]')];
      expect(scripts.length, page.file).toBe(2);
      for (const script of scripts) {
        expect(() => JSON.parse(script.textContent ?? ""), page.file).not.toThrow();
      }
    }
  });

  it("sets og:url to the canonical on every page", () => {
    for (const page of blogPages) {
      const d = doc(page.html);
      expect(
        d.querySelector('meta[property="og:url"]')?.getAttribute("content"),
        page.file,
      ).toBe(d.querySelector('link[rel="canonical"]')?.getAttribute("href"));
    }
  });

  it("never emits noindex", () => {
    for (const page of blogPages) {
      const robots = doc(page.html).querySelector('meta[name="robots"]')?.getAttribute("content");
      expect(robots, page.file).toBeTruthy();
      expect(robots?.toLowerCase(), page.file).not.toContain("noindex");
    }
  });
});
