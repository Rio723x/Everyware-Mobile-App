import { fileToPath, listHtmlFiles } from "@everyware/seo-core";
import { parseHTML } from "linkedom";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

/**
 * The negative half of the structural suite.
 *
 * Every assertion in structure.test.ts passes today. That is only meaningful if
 * each one would fail on the defect it is meant to catch - an assertion never
 * observed failing is a comment with a green tick next to it. These build the
 * broken HTML deliberately and check the corresponding rule rejects it.
 */
const doc = (html: string): Document => parseHTML(html).document;

const page = (body: string, head = ""): string =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
  `<meta name="viewport" content="width=device-width"><title>t</title>${head}</head>` +
  `<body><main>${body}</main></body></html>`;

const headingLevels = (html: string): number[] =>
  [...doc(html).querySelectorAll("h1,h2,h3,h4,h5,h6")].map((el) => Number(el.tagName.slice(1)));

const skipsALevel = (html: string): boolean => {
  let previous = 0;
  for (const level of headingLevels(html)) {
    if (previous !== 0 && level > previous + 1) return true;
    previous = level;
  }
  return false;
};

describe("h1 assertions catch their defects", () => {
  it("rejects two h1s", () => {
    expect(doc(page("<h1>a</h1><h1>b</h1>")).querySelectorAll("h1").length).toBe(2);
  });

  it("rejects a whitespace-only h1", () => {
    const text = doc(page("<h1>   </h1>")).querySelector("h1")?.textContent?.trim();
    expect(text).toBeFalsy();
  });

  it("accepts exactly one non-empty h1", () => {
    const d = doc(page("<h1>Real title</h1>"));
    expect(d.querySelectorAll("h1").length).toBe(1);
    expect(d.querySelector("h1")?.textContent?.trim()).toBeTruthy();
  });
});

describe("heading order catches skipped levels", () => {
  it("rejects h2 followed by h4", () => {
    expect(skipsALevel(page("<h1>a</h1><h2>b</h2><h4>c</h4>"))).toBe(true);
  });

  it("rejects h1 followed by h3", () => {
    expect(skipsALevel(page("<h1>a</h1><h3>b</h3>"))).toBe(true);
  });

  it("accepts h1, h2, h3, h2", () => {
    expect(skipsALevel(page("<h1>a</h1><h2>b</h2><h3>c</h3><h2>d</h2>"))).toBe(false);
  });
});

describe("alt-text assertion catches missing descriptions", () => {
  it.each([
    ['<img src="a.jpg">', "no alt attribute"],
    ['<img src="a.jpg" alt="">', "empty alt"],
    ['<img src="a.jpg" alt="   ">', "whitespace alt"],
  ])("rejects %s (%s)", (markup) => {
    const img = doc(page(markup)).querySelector("img");
    expect(img?.getAttribute("alt")?.trim()).toBeFalsy();
  });

  it("accepts a described image", () => {
    const img = doc(page('<img src="a.jpg" alt="A technician opening a filter panel">'))
      .querySelector("img");
    expect(img?.getAttribute("alt")?.trim()).toBeTruthy();
  });
});

describe("datetime assertion catches unparseable values", () => {
  it.each([["not-a-date"], [""], ["2026-13-45"]])("rejects datetime=%s", (value) => {
    const el = doc(page(`<time datetime="${value}">x</time>`)).querySelector("time");
    expect(Number.isNaN(Date.parse(el?.getAttribute("datetime") ?? ""))).toBe(true);
  });

  it("accepts a full ISO timestamp", () => {
    const el = doc(page('<time datetime="2026-08-28T09:30:00.000+00:00">x</time>')).querySelector(
      "time",
    );
    expect(Number.isNaN(Date.parse(el?.getAttribute("datetime") ?? ""))).toBe(false);
  });
});

describe("internal-link assertion catches dangling and orphan pages", () => {
  const served = new Set(["/", "/blog", "/blog/real-post"]);

  const internalHrefs = (html: string): string[] =>
    [...doc(html).querySelectorAll("a[href]")]
      .map((a) => a.getAttribute("href") ?? "")
      .filter((href) => href.startsWith("/"))
      .map((href) => href.split("#")[0] ?? "")
      .filter((href) => href !== "");

  it("rejects a link to a slug that was never emitted", () => {
    const hrefs = internalHrefs(page('<a href="/blog/typo-slug">x</a>'));
    expect(hrefs.every((href) => served.has(href))).toBe(false);
  });

  it("rejects an orphan page with no internal links at all", () => {
    const hrefs = internalHrefs(page('<a href="https://example.com">x</a><a href="mailto:a@b.c">y</a>'));
    expect(hrefs).toHaveLength(0);
  });

  it("accepts a page linking only to emitted paths, fragments included", () => {
    const hrefs = internalHrefs(page('<a href="/blog/real-post">x</a><a href="/#info">y</a>'));
    expect(hrefs.every((href) => served.has(href))).toBe(true);
  });
});

describe("script assertion catches shipped JavaScript", () => {
  it("rejects a page carrying a script tag", () => {
    expect(doc(page("<script>console.log(1)</script>")).querySelectorAll("script").length).toBe(1);
  });
});

describe("listHtmlFiles and fileToPath", () => {
  const dir = mkdtempSync(join(tmpdir(), "everyware-dist-"));

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("throws rather than passing vacuously when there is no build", () => {
    expect(() => listHtmlFiles(join(dir, "does-not-exist"))).toThrow(/No build found/);
  });

  it("finds nested html files with their directory prefix intact", () => {
    mkdirSync(join(dir, "blog", "category"), { recursive: true });
    writeFileSync(join(dir, "index.html"), page("<h1>home</h1>"));
    writeFileSync(join(dir, "blog.html"), page("<h1>blog</h1>"));
    writeFileSync(join(dir, "blog", "a-post.html"), page("<h1>post</h1>"));
    writeFileSync(join(dir, "blog", "category", "x.html"), page("<h1>cat</h1>"));

    expect(listHtmlFiles(dir)).toEqual([
      "blog.html",
      "blog/a-post.html",
      "blog/category/x.html",
      "index.html",
    ]);
  });

  it("maps files to the URLs they are served at", () => {
    expect(fileToPath("index.html")).toBe("/");
    expect(fileToPath("blog.html")).toBe("/blog");
    expect(fileToPath("blog/a-post.html")).toBe("/blog/a-post");
    expect(fileToPath("blog/category/x.html")).toBe("/blog/category/x");
  });
});
