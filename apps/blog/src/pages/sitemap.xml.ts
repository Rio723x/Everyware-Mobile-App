import type { APIRoute } from "astro";
import {
  buildCanonical,
  buildSitemapXml,
  toIsoDateTime,
  type SitemapEntry,
} from "@everyware/seo-core";
import { POSTS_PER_PAGE, siteUrl } from "@everyware/seo-core";
import { ghost } from "../lib/content";
import { extraPageNumbers } from "../lib/pagination";

/**
 * Every indexable URL, and nothing else.
 *
 * Each `loc` is the page's own canonical, produced by the same `buildCanonical`
 * the page itself uses. Deriving them separately here is how a sitemap ends up
 * advertising URLs that redirect or 404.
 */
export const GET: APIRoute = async () => {
  const [posts, tags, authors] = await Promise.all([
    ghost.listPosts(),
    ghost.listTags(),
    ghost.listAuthors(),
  ]);

  const newest = (list: readonly { updatedAt: string }[]): string =>
    list.reduce((latest, item) => (item.updatedAt > latest ? item.updatedAt : latest), "") ||
    new Date().toISOString();

  const entries: SitemapEntry[] = [
    {
      loc: siteUrl("/"),
      lastmod: toIsoDateTime(new Date()),
      changefreq: "weekly",
      priority: 1.0,
    },
    {
      loc: buildCanonical({ kind: "listing", page: 1, totalPages: 1 }),
      lastmod: toIsoDateTime(newest(posts)),
      changefreq: "daily",
      priority: 0.9,
    },
  ];

  for (const page of extraPageNumbers(posts.length)) {
    entries.push({
      loc: buildCanonical({ kind: "listing", page, totalPages: page }),
      lastmod: toIsoDateTime(newest(posts.slice((page - 1) * POSTS_PER_PAGE, page * POSTS_PER_PAGE))),
      changefreq: "weekly",
      priority: 0.5,
    });
  }

  for (const post of posts) {
    entries.push({
      loc: buildCanonical({ kind: "article", post }),
      lastmod: post.updatedAt,
      changefreq: "monthly",
      priority: 0.8,
    });
  }

  for (const tag of tags) {
    const tagged = await ghost.listPostsByTag(tag.slug);
    entries.push({
      loc: buildCanonical({ kind: "category", tag, postCount: tagged.length, page: 1, totalPages: 1 }),
      lastmod: toIsoDateTime(newest(tagged)),
      changefreq: "weekly",
      priority: 0.6,
    });
  }

  for (const author of authors) {
    const written = await ghost.listPostsByAuthor(author.slug);
    entries.push({
      loc: buildCanonical({
        kind: "author",
        author,
        postCount: written.length,
        page: 1,
        totalPages: 1,
      }),
      lastmod: toIsoDateTime(newest(written)),
      changefreq: "weekly",
      priority: 0.5,
    });
  }

  return new Response(buildSitemapXml(entries), {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
