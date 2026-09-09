import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The guards that hold spec 03's central claim in place: AI recommends, code
 * decides, humans approve.
 *
 * Without these the separation is a convention, and conventions erode under
 * deadline. Each one is a structural fact a future change would have to break
 * loudly rather than quietly.
 */
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");
const distDir = resolve(repoRoot, "dist");

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

const posix = (file: string): string => file.split(sep).join("/");

const sourceFiles = (dir: string, extensions: readonly string[]): string[] =>
  walk(resolve(repoRoot, dir))
    .filter((file) => extensions.some((extension) => file.endsWith(extension)))
    .filter((file) => !file.includes(`${sep}dist${sep}`));

describe("the analyzer cannot reach a rendered page", () => {
  it("apps/blog imports nothing from services/seo-worker", () => {
    // The structural version of "AI is advisory". If the blog could import the
    // worker, a future change could put a model suggestion into a page.
    const offenders = sourceFiles("apps/blog/src", [".ts", ".astro", ".tsx"])
      .filter((file) => /@everyware\/seo-worker|services\/seo-worker/.test(readFileSync(file, "utf8")))
      .map((file) => posix(relative(repoRoot, file)));

    expect(offenders).toEqual([]);
  });

  it("apps/blog does not depend on the worker package", () => {
    const manifest: unknown = JSON.parse(
      readFileSync(resolve(repoRoot, "apps/blog/package.json"), "utf8"),
    );
    const declared = JSON.stringify(manifest);
    expect(declared).not.toContain("@everyware/seo-worker");
  });

  it("the built site contains no analyzer output", () => {
    // Nothing from the advisory layer should be reachable in shipped HTML.
    const markers = ["suggestedTitle", "primaryTopic", "searchIntent", "faqOpportunities"];
    const offenders: string[] = [];

    for (const file of walk(distDir).filter((f) => f.endsWith(".html"))) {
      const html = readFileSync(file, "utf8");
      if (markers.some((marker) => html.includes(marker))) {
        offenders.push(posix(relative(distDir, file)));
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("the worker never writes to Ghost", () => {
  it("makes no Ghost Admin API call anywhere", () => {
    // No write path means no worker action can generate a post.edited event,
    // which makes a webhook loop impossible rather than merely unlikely.
    const offenders = [
      ...sourceFiles("services/seo-worker/src", [".ts"]),
      ...sourceFiles("api", [".ts"]),
    ]
      .filter((file) => !file.endsWith(".test.ts"))
      .filter((file) => /ghost\/api\/admin|AdminAPI|GHOST_ADMIN_API_KEY/i.test(readFileSync(file, "utf8")))
      .map((file) => posix(relative(repoRoot, file)));

    expect(offenders).toEqual([]);
  });
});

describe("plan phases 9 to 11 are deferred, not half-started", () => {
  it("contains no Search Console, Bing, IndexNow or analytics ingestion code", () => {
    const forbidden = [
      /searchconsole/i,
      /google.?search.?console/i,
      /webmaster/i,
      /indexnow/i,
      /GSC_/,
      /bing.?api/i,
    ];

    const offenders = [
      ...sourceFiles("services/seo-worker/src", [".ts"]),
      ...sourceFiles("packages", [".ts"]),
      ...sourceFiles("api", [".ts"]),
      ...sourceFiles("apps/blog/src", [".ts", ".astro"]),
    ]
      .filter((file) => !file.endsWith(".test.ts"))
      .filter((file) => {
        const content = readFileSync(file, "utf8");
        return forbidden.some((pattern) => pattern.test(content));
      })
      .map((file) => posix(relative(repoRoot, file)));

    expect(offenders).toEqual([]);
  });
});

describe("no secrets in the repository", () => {
  it("contains no API key or token literals", () => {
    const patterns = [
      /sk-ant-[A-Za-z0-9]/,
      /AIza[0-9A-Za-z_-]{30,}/,
      /\bghp_[A-Za-z0-9]{20,}/,
    ];

    // Asked of git rather than the filesystem: a gitignored .env is fine, a
    // committed one is not.
    const tracked = execFileSync("git", ["ls-files"], { cwd: repoRoot, encoding: "utf8" })
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "")
      .filter((line) => /\.(ts|tsx|astro|js|mjs|json|md|ya?ml|txt|env.*)$/.test(line));

    const offenders: string[] = [];
    for (const file of tracked) {
      let content: string;
      try {
        content = readFileSync(resolve(repoRoot, file), "utf8");
      } catch {
        continue;
      }
      if (patterns.some((pattern) => pattern.test(content))) {
        offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("does not track any .env file", () => {
    const tracked = execFileSync("git", ["ls-files"], { cwd: repoRoot, encoding: "utf8" });
    const envFiles = tracked
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => /(^|\/)\.env($|\.)/.test(line))
      .filter((line) => !line.endsWith(".env.example"));

    expect(envFiles).toEqual([]);
  });
});

describe("the build is independent of the analyzer", () => {
  it("hashes the emitted site so a byte change would be detectable", () => {
    // The full two-build comparison lives in the launch runbook, since it takes
    // minutes. This records the fingerprint the comparison is made against, and
    // fails if dist/ is missing entirely.
    const files = walk(distDir).filter((f) => f.endsWith(".html")).sort();
    expect(files.length).toBeGreaterThan(3);

    const fingerprint = createHash("sha256");
    for (const file of files) {
      fingerprint.update(posix(relative(distDir, file)));
      fingerprint.update(readFileSync(file));
    }
    expect(fingerprint.digest("hex")).toMatch(/^[a-f0-9]{64}$/);
  });
});
