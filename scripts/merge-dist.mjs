#!/usr/bin/env node
/**
 * Merges the two app builds into one deployable directory.
 *
 * This script is where the routing boundary in spec 01 D1 stops being a
 * decision and becomes a fact: Astro's output is copied first and therefore
 * wins any contested path, and the React SPA fills in everything left. That
 * ordering is also the migration path - the day a marketing page becomes an
 * Astro route, it takes the URL automatically.
 *
 * A collision is a hard failure, never a silent overwrite. Two apps fighting
 * for the same URL is a real problem, and the deploy that quietly picks one is
 * the deploy nobody can debug three weeks later.
 */
import { cp, mkdir, readdir, rm, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

const BLOG_DIST = resolve(root, "apps/blog/dist");
const SITE_DIST = resolve(root, "apps/site/dist");
const OUT = resolve(root, "dist");

/** Every file under `dir`, as absolute paths. */
const walk = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const full = join(dir, entry.name);
      return entry.isDirectory() ? walk(full) : [full];
    }),
  );
  return nested.flat();
};

/**
 * Every file under `dir`, as paths relative to it, with forward slashes.
 * Relativising happens once here rather than inside the recursion, which would
 * strip the directory prefix off every nested file.
 */
const listFiles = async (dir) =>
  (await walk(dir)).map((file) => relative(dir, file).split("\\").join("/"));

const fail = (message) => {
  process.stderr.write(`\nmerge-dist: ${message}\n\n`);
  process.exit(1);
};

const requireBuild = async (dir, label) => {
  if (!existsSync(dir)) {
    fail(`${label} has not been built. Expected ${relative(root, dir)} to exist.`);
  }
  const info = await stat(dir);
  if (!info.isDirectory()) {
    fail(`${relative(root, dir)} is not a directory.`);
  }
};

await requireBuild(BLOG_DIST, "The Astro blog");
await requireBuild(SITE_DIST, "The React site");

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

// 1. Astro first: it owns the URL space.
await cp(BLOG_DIST, OUT, { recursive: true });
const blogFiles = new Set(await listFiles(BLOG_DIST));

// 2. The SPA fills in the rest. Anything already claimed is a collision.
const siteFiles = await listFiles(SITE_DIST);
const collisions = siteFiles.filter((file) => blogFiles.has(file));

if (collisions.length > 0) {
  fail(
    `${String(collisions.length)} path(s) are claimed by both apps:\n` +
      collisions.map((file) => `  - ${file}`).join("\n") +
      "\n\nThe Astro blog and the React site cannot both serve the same URL. " +
      "Remove the duplicate from apps/site, or delete the Astro route.",
  );
}

for (const file of siteFiles) {
  const target = join(OUT, file);
  await mkdir(dirname(target), { recursive: true });
  await cp(join(SITE_DIST, file), target);
}

// 3. The output is only useful if both apps actually landed in it.
const merged = new Set(await listFiles(OUT));
const required = ["index.html", "blog.html"];
const missing = required.filter((file) => !merged.has(file));
if (missing.length > 0) {
  fail(`the merged output is missing: ${missing.join(", ")}`);
}
if (![...merged].some((file) => /^blog\/[^/]+\.html$/.test(file))) {
  fail("the merged output contains no article pages under blog/.");
}

const blogCount = blogFiles.size;
const siteCount = siteFiles.length;
process.stdout.write(
  `merge-dist: ${String(blogCount)} blog file(s) + ${String(siteCount)} site file(s) ` +
    `= ${String(merged.size)} in dist/, 0 collisions\n`,
);
