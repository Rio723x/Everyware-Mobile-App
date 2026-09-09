import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { AI_USER_AGENTS, SITE_URL, siteUrl } from "./config.js";

const here = dirname(fileURLToPath(import.meta.url));
/**
 * A snapshot of the hand-written robots.txt this project replaced, kept so the
 * pin below still means something after the original was deleted in T-02-018.
 */
const robotsPath = resolve(here, "fixtures/original-robots.txt");

describe("siteUrl", () => {
  it.each(["/blog", "blog", "//blog", "/blog/"])("normalises %s", (input) => {
    expect(siteUrl(input)).toBe(`${SITE_URL}/blog`);
  });

  it("collapses interior duplicate slashes", () => {
    expect(siteUrl("/blog//category//x")).toBe(`${SITE_URL}/blog/category/x`);
  });

  it("returns the site root with its trailing slash", () => {
    expect(siteUrl("/")).toBe(`${SITE_URL}/`);
    expect(siteUrl("")).toBe(`${SITE_URL}/`);
  });

  it("produces values that satisfy the AbsoluteUrl brand", () => {
    expect(() => siteUrl("/blog/washing-machine-care")).not.toThrow();
  });
});

describe("AI_USER_AGENTS", () => {
  // Pins the constant to the file this project replaced, so the deliberate
  // AI-crawler allowances cannot be silently dropped in the rewrite.
  it("matches every AI crawler the original hand-written robots.txt allowed", () => {
    const robots = readFileSync(robotsPath, "utf8");
    const declared = [...robots.matchAll(/^User-agent:\s*(.+)$/gm)]
      .map((match) => match[1]?.trim())
      .filter((agent): agent is string => agent !== undefined && agent !== "*");

    expect([...AI_USER_AGENTS].sort()).toEqual(declared.sort());
  });
});
