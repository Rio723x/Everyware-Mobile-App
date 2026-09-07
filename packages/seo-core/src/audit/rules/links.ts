import { SITE_URL } from "../../config.js";
import { check, fail, pass, skip, type PageRule } from "../registry.js";

/** In-site hrefs, fragment-stripped. `mailto:`, `tel:` and off-site are ignored. */
const internalPaths = (doc: Document): readonly string[] =>
  [...doc.querySelectorAll("a[href]")]
    .map((anchor) => anchor.getAttribute("href") ?? "")
    .filter((href) => href.startsWith("/") || href.startsWith(SITE_URL))
    .map((href) => (href.startsWith(SITE_URL) ? href.slice(SITE_URL.length) || "/" : href))
    .map((href) => href.split("#")[0] ?? "")
    .map((href) => href.split("?")[0] ?? "")
    .filter((href) => href !== "");

export const internalLinksPresent: PageRule = (doc) => {
  const links = internalPaths(doc);
  return check(
    "internal-links-present",
    "error",
    links.length > 0,
    "page links nowhere in-site: an orphan is a dead end for readers and crawlers alike",
    `${String(links.length)} internal links`,
  );
};

export const internalLinksResolve: PageRule = (doc, ctx) => {
  const dangling = [...new Set(internalPaths(doc))].filter((href) => !ctx.emittedPaths.has(href));
  if (dangling.length === 0) {
    return pass("internal-links-resolve", "error", "every internal link resolves");
  }
  return fail(
    "internal-links-resolve",
    "error",
    `${String(dangling.length)} link(s) point at URLs that were never emitted: ${dangling.slice(0, 5).join(", ")}`,
  );
};

/**
 * Paginated pages must declare their neighbours.
 *
 * Page 1 has no prev and the last page has no next, so this checks the
 * boundaries rather than merely counting the tags.
 */
export const paginationRel: PageRule = (doc, ctx) => {
  const match = /\/page\/(\d+)$/.exec(ctx.path);
  const hasPrev = doc.querySelector('link[rel="prev"]') !== null;
  const hasNext = doc.querySelector('link[rel="next"]') !== null;

  if (match === null) {
    // A page-1 listing may legitimately carry rel=next; an article carries neither.
    if (ctx.kind === "article" && (hasPrev || hasNext)) {
      return fail("pagination-rel", "error", "an article should declare neither rel=prev nor rel=next");
    }
    if (hasPrev) {
      return fail("pagination-rel", "error", `${ctx.path} is a first page but declares rel="prev"`);
    }
    return skip("pagination-rel", "error", "not a paginated page");
  }

  const pageNumber = Number(match[1]);
  if (!hasPrev) {
    return fail("pagination-rel", "error", `page ${String(pageNumber)} is missing rel="prev"`);
  }

  const prev = doc.querySelector('link[rel="prev"]')?.getAttribute("href") ?? "";
  if (pageNumber === 2) {
    const expected = `${SITE_URL}${ctx.path.replace(/\/page\/\d+$/, "")}`;
    if (prev !== expected) {
      return fail(
        "pagination-rel",
        "error",
        `page 2's rel="prev" is "${prev}", expected the base path "${expected}" — /page/1 is never emitted`,
      );
    }
  }
  return pass("pagination-rel", "error", `page ${String(pageNumber)} links its neighbours`);
};

export const linkRules: readonly PageRule[] = [
  internalLinksPresent,
  internalLinksResolve,
  paginationRel,
];
