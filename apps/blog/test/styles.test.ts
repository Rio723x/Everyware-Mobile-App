import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const blogCss = readFileSync(resolve(here, "../src/styles/blog.css"), "utf8");
const tokensCss = readFileSync(resolve(here, "../../../packages/tokens/tokens.css"), "utf8");

describe("blog.css", () => {
  it("contains no hex colour literals - every colour is a token", () => {
    // Strip comments first: the file's own header is prose, not styling.
    const withoutComments = blogCss.replace(/\/\*[\s\S]*?\*\//g, "");
    const hexLiterals = withoutComments.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
    expect(hexLiterals).toEqual([]);
  });

  it("imports the shared token package rather than redefining tokens", () => {
    expect(blogCss).toContain('@import "@everyware/tokens/tokens.css"');
    expect(blogCss).not.toContain(":root {");
  });

  it("only references custom properties the token file actually defines", () => {
    const defined = new Set(
      [...tokensCss.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gim)].map((match) => match[1]),
    );
    const used = new Set(
      [...blogCss.matchAll(/var\((--[a-z0-9-]+)/gi)].map((match) => match[1]),
    );
    const missing = [...used].filter((name) => !defined.has(name));
    expect(missing).toEqual([]);
  });
});

describe("packages/tokens", () => {
  it("still defines the brand palette the marketing site depends on", () => {
    for (const token of [
      "--brand-cyan",
      "--brand-ink",
      "--canvas-base",
      "--text-dark",
      "--text-muted",
      "--font-display",
      "--font-body",
      "--radius-pill",
      "--shadow-glass",
      "--ease-smooth",
    ]) {
      expect(tokensCss).toContain(token);
    }
  });
});
