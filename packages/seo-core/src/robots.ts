import { AI_USER_AGENTS, siteUrl } from "./config.js";

/**
 * Builds robots.txt.
 *
 * The hand-written file this replaces contained `Allow: /#info` and
 * `Allow: /#experiences`, which do nothing - robots.txt path matching ignores
 * fragments entirely. Those are dropped.
 *
 * What is deliberately kept is the explicit allow-list for AI and generative
 * search crawlers. Those entries were a considered decision by whoever wrote
 * the original file, and a rewrite is exactly the moment such things get lost,
 * so `AI_USER_AGENTS` is pinned by a test against the original.
 */
export const buildRobotsTxt = (): string => {
  const aiGroups = AI_USER_AGENTS.map((agent) => `User-agent: ${agent}\nAllow: /`).join("\n\n");

  return (
    `# robots.txt for Everyware — generated at build time, do not edit by hand.\n` +
    `# Source: packages/seo-core/src/robots.ts\n` +
    `\n` +
    `User-agent: *\n` +
    `Allow: /\n` +
    `\n` +
    `# AI and generative-search crawlers are explicitly welcome.\n` +
    `${aiGroups}\n` +
    `\n` +
    `Sitemap: ${siteUrl("/sitemap.xml")}\n`
  );
};
