import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(here, "../src");

const read = (relative: string): string => readFileSync(resolve(srcDir, relative), "utf8");

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

const layout = read("layouts/BlogLayout.astro");
const header = read("components/BlogHeader.astro");
const footer = read("components/BlogFooter.astro");

/** Strips frontmatter, HTML comments and JS block comments before scanning markup. */
const stripCommentary = (source: string): string =>
  source
    .replace(/^---[\s\S]*?\n---/, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");

describe("BlogLayout emits no metadata of its own", () => {
  // This is the seam spec 02 fills. If the layout starts writing metadata,
  // SeoHead stops being the single place a meta tag can come from, and the
  // spec 02 rule engine would be grading output that other files can bypass.
  const markup = stripCommentary(layout);

  it("has no <title>", () => {
    expect(markup).not.toMatch(/<title/i);
  });

  it("has no description, canonical, OpenGraph or Twitter tags", () => {
    expect(markup).not.toMatch(/name=["']description["']/i);
    expect(markup).not.toMatch(/rel=["']canonical["']/i);
    expect(markup).not.toMatch(/property=["']og:/i);
    expect(markup).not.toMatch(/name=["']twitter:/i);
  });

  it("has no JSON-LD", () => {
    expect(markup).not.toMatch(/application\/ld\+json/i);
  });

  it("exposes the named head slot spec 02 fills", () => {
    expect(markup).toMatch(/<slot\s+name=["']head["']\s*\/>/);
  });

  it("still carries charset and viewport, which every audited page requires", () => {
    expect(markup).toMatch(/<meta\s+charset=/i);
    expect(markup).toMatch(/name=["']viewport["']/i);
  });

  it('declares <html lang="en">', () => {
    expect(markup).toMatch(/<html\s+lang=["']en["']>/);
  });
});

describe("header and footer links resolve from any URL", () => {
  // The marketing app's Navbar and EditorialFooter use bare `#anchor` hrefs and
  // mutate window.location.hash. On /blog/some-post those set a fragment on the
  // blog URL instead of navigating home, which is why these components are
  // rebuilt rather than reused (spec 01 D7).
  const hrefsIn = (source: string): string[] =>
    [...stripCommentary(source).matchAll(/href=\{?["']([^"'{}]+)["']\}?/g)]
      .map((match) => match[1])
      .filter((href): href is string => href !== undefined);

  const navHrefs = [
    ...[...header.matchAll(/href:\s*"([^"]+)"/g)].map((m) => m[1]),
    ...[...footer.matchAll(/href:\s*"([^"]+)"/g)].map((m) => m[1]),
    ...hrefsIn(header),
    ...hrefsIn(footer),
  ].filter((href): href is string => href !== undefined);

  it("finds links to check", () => {
    expect(navHrefs.length).toBeGreaterThan(8);
  });

  it("every href is root-absolute, mailto: or tel: - never a bare fragment", () => {
    const offenders = navHrefs.filter(
      (href) =>
        !href.startsWith("/") && !href.startsWith("mailto:") && !href.startsWith("tel:"),
    );
    expect(offenders).toEqual([]);
  });

  it("drops the dead href=\"#\" social links the original footer carried", () => {
    expect(navHrefs).not.toContain("#");
  });
});

describe("chrome ships no JavaScript", () => {
  it("neither header nor footer uses a client directive or inline script", () => {
    for (const source of [header, footer, layout]) {
      const markup = stripCommentary(source);
      expect(markup).not.toMatch(/client:(load|idle|visible|media|only)/);
      expect(markup).not.toMatch(/<script/i);
    }
  });
});

describe("images", () => {
  it("every img in the chrome has a non-empty alt", () => {
    for (const source of [header, footer, layout]) {
      for (const [tag] of stripCommentary(source).matchAll(/<img\b[^>]*>/g)) {
        expect(tag).toMatch(/alt=["'][^"']+["']/);
      }
    }
  });
});

describe("styling discipline", () => {
  it("component styles use tokens, not hex literals", () => {
    for (const file of walk(srcDir).filter((f) => f.endsWith(".astro"))) {
      const styleBlocks = readFileSync(file, "utf8").match(/<style>[\s\S]*?<\/style>/g) ?? [];
      for (const block of styleBlocks) {
        expect(block.replace(/\/\*[\s\S]*?\*\//g, "").match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).toEqual(
          [],
        );
      }
    }
  });
});
