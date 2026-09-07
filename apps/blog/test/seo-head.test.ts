import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(here, "../src");

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

/** Windows gives backslashes; compare on one separator. */
const posix = (file: string): string => file.split(sep).join("/");

/** Frontmatter, HTML comments and block comments are prose, not markup. */
const markupOf = (source: string): string =>
  source
    .replace(/^---[\s\S]*?\n---/, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");

/**
 * Without this guard, the spec 02 rule engine grades output that any page could
 * quietly bypass by writing its own tags. It is the reason the rules mean
 * anything at all.
 */
const components = walk(srcDir)
  .filter((file) => file.endsWith(".astro"))
  .filter((file) => !file.endsWith("SeoHead.astro"))
  .map((file) => ({
    file: posix(relative(srcDir, file)),
    markup: markupOf(readFileSync(file, "utf8")),
  }));

describe("SeoHead is the only source of metadata", () => {
  it("finds files to check", () => {
    expect(components.length).toBeGreaterThan(5);
  });

  it("no other component writes a meta tag", () => {
    const offenders = components
      .filter(({ file, markup }) => {
        const metas = markup.match(/<meta\b[^>]*>/gi) ?? [];
        if (metas.length === 0) return false;
        // BlogLayout carries charset and viewport: document mechanics rather
        // than SEO metadata, and required on every page by the audit rules.
        if (file === "layouts/BlogLayout.astro") {
          return metas.some((tag) => !/charset|viewport/i.test(tag));
        }
        return true;
      })
      .map(({ file }) => file);

    expect(offenders).toEqual([]);
  });

  it("no other component writes JSON-LD", () => {
    const offenders = components
      .filter(({ markup }) => /application\/ld\+json/i.test(markup))
      .map(({ file }) => file);
    expect(offenders).toEqual([]);
  });

  it("no other component writes a title or a canonical link", () => {
    const offenders = components
      .filter(({ markup }) => /<title\b/i.test(markup) || /rel=["']canonical["']/i.test(markup))
      .map(({ file }) => file);
    expect(offenders).toEqual([]);
  });

  it("every route template passes metadata into the head slot", () => {
    const routes = components.filter(({ file }) => file.startsWith("pages/blog/"));
    expect(routes.length).toBeGreaterThanOrEqual(5);
    for (const route of routes) {
      expect(route.markup, route.file).toContain('<SeoHead slot="head"');
    }
  });
});
