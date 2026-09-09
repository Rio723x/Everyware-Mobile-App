import type { AbsoluteUrl, IsoDateTime } from "./brand.js";

export type ChangeFrequency = "daily" | "weekly" | "monthly";

export interface SitemapEntry {
  readonly loc: AbsoluteUrl;
  readonly lastmod: IsoDateTime;
  readonly changefreq: ChangeFrequency;
  readonly priority: number;
}

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

/**
 * Builds a sitemap from canonical URLs.
 *
 * Entries are sorted by `loc` so a rebuild with unchanged content produces a
 * byte-identical file - otherwise every deploy shows a diff and nobody reads
 * them any more.
 *
 * The hand-written sitemap this replaces listed 22 fragment URLs
 * (`everyware.in/#info` and friends). Crawlers discard the fragment, so those
 * were 22 duplicate entries for the home page. Nothing here can emit one: a
 * `loc` is an `AbsoluteUrl`, and that brand rejects fragments.
 */
export const buildSitemapXml = (entries: readonly SitemapEntry[]): string => {
  const sorted = [...entries].sort((a, b) => a.loc.localeCompare(b.loc));

  const urls = sorted
    .map(
      (entry) =>
        `  <url>\n` +
        `    <loc>${escapeXml(entry.loc)}</loc>\n` +
        `    <lastmod>${entry.lastmod}</lastmod>\n` +
        `    <changefreq>${entry.changefreq}</changefreq>\n` +
        `    <priority>${entry.priority.toFixed(2)}</priority>\n` +
        `  </url>`,
    )
    .join("\n");

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${urls}\n` +
    `</urlset>\n`
  );
};
