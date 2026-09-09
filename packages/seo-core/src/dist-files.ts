import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

/**
 * Filesystem access to a built site.
 *
 * Spec 02's `DistPageSource` is built on this, which is why it lives in
 * seo-core rather than in the blog's test folder: the rule engine and the
 * structural suite must agree on what "the emitted pages" means, and two
 * implementations of that would eventually disagree about, say, whether
 * 404.html counts.
 */

/** A built page: its public URL path and its raw HTML. */
export interface EmittedPage {
  /** Path relative to the dist root, forward slashes, e.g. `blog/x.html`. */
  readonly file: string;
  /** The URL this file is served at, e.g. `/blog/x`. */
  readonly path: string;
  readonly html: string;
}

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

/** Every `.html` file under `distDir`, relative and forward-slashed. */
export const listHtmlFiles = (distDir: string): readonly string[] => {
  if (!existsSync(distDir)) {
    throw new Error(
      `No build found at ${distDir}. Run the build first - a check that skips ` +
        `when there is no output is worse than no check.`,
    );
  }
  return walk(distDir)
    .filter((file) => file.toLowerCase().endsWith(".html"))
    .map((file) => relative(distDir, file).split("\\").join("/"))
    .sort();
};

/**
 * Maps an emitted file to the URL it is served at.
 *
 * This is the inverse of spec 01 D6's routing table under `build.format: "file"`
 * plus Vercel's `cleanUrls`: `blog.html` is served at `/blog`, `blog/x.html` at
 * `/blog/x`, and `index.html` at `/`.
 */
export const fileToPath = (file: string): string => {
  if (file === "index.html") {
    return "/";
  }
  return `/${file.replace(/\.html$/i, "")}`;
};

/**
 * Pages that are meant to be indexed.
 *
 * `404.html` is excluded: it is served for URLs that do not exist, so
 * assertions about the content set do not apply to it.
 */
export const listEmittedPages = (
  distDir: string,
  options: { readonly includeNotFound?: boolean } = {},
): readonly EmittedPage[] =>
  listHtmlFiles(distDir)
    .filter((file) => options.includeNotFound === true || file !== "404.html")
    .map((file) => ({
      file,
      path: fileToPath(file),
      html: readFileSync(resolve(distDir, file), "utf8"),
    }));
