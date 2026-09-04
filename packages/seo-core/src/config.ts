import { toAbsoluteUrl, type AbsoluteUrl } from "./brand.js";

/**
 * The canonical origin, with no trailing slash. Every canonical URL, sitemap
 * entry and OpenGraph URL in the system is derived from this one value, so a
 * staging build cannot leak production URLs or vice versa.
 */
export const SITE_URL = (process.env["PUBLIC_SITE_URL"] ?? "https://everyware.in").replace(
  /\/+$/,
  "",
);

/**
 * `@id` references to the Organization and WebSite nodes that already exist in
 * the marketing app's `@graph` (apps/site/index.html). Blog JSON-LD points at
 * these rather than declaring a second, competing Organization.
 */
export const ORG_ID = `${SITE_URL}/#org`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

export const LOCALE = "en-IN";
export const OG_LOCALE = "en_IN";
export const SITE_NAME = "EveryWare";
export const TWITTER_HANDLE = "@geteveryware";

export const POSTS_PER_PAGE = 12;

/**
 * AI and generative-search crawlers explicitly allowed by the current
 * hand-written robots.txt. These allowances are deliberate and must survive the
 * move to a generated robots.txt, so they live in one constant that a test
 * pins against the original file.
 */
export const AI_USER_AGENTS = [
  "GPTBot",
  "ChatGPT-User",
  "PerplexityBot",
  "ClaudeBot",
  "Google-Extended",
  "Bytespider",
  "Amazonbot",
] as const;

export type AiUserAgent = (typeof AI_USER_AGENTS)[number];

/**
 * Joins a path onto the canonical origin, normalising slashes.
 *
 * `siteUrl("/blog")`, `siteUrl("blog")` and `siteUrl("//blog")` all produce
 * `https://everyware.in/blog`. The site root is the single exception that keeps
 * its trailing slash.
 */
export const siteUrl = (path: string): AbsoluteUrl => {
  const trimmed = path.replace(/^\/+/, "").replace(/\/+$/, "");
  const collapsed = trimmed.replace(/\/{2,}/g, "/");
  return toAbsoluteUrl(collapsed === "" ? `${SITE_URL}/` : `${SITE_URL}/${collapsed}`);
};
