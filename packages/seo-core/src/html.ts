/**
 * Post-processing for CMS-authored article HTML.
 *
 * Ghost renders the article body; this module adjusts it for the page it is
 * about to land in, and refuses bodies that would break the page's structure.
 * It is string-level on purpose: pulling in a DOM parser to add two attributes
 * would cost more than it explains, and every transform here is anchored to an
 * opening tag rather than to arbitrary content.
 */

export class ArticleHtmlError extends Error {
  readonly slug: string;

  constructor(slug: string, reason: string) {
    super(`Article "${slug}" ${reason}`);
    this.name = "ArticleHtmlError";
    this.slug = slug;
  }
}

/**
 * The article template owns the page's only `<h1>`, so a body that contains one
 * would produce two - which fails the `h1-single` audit rule in spec 02 and
 * muddles the document outline for every crawler and screen reader.
 *
 * This is an editorial rule, and an editorial rule that is not enforced in code
 * is a suggestion. Failing the build names the offending post so the writer can
 * be told exactly which one to fix.
 */
export const assertNoH1 = (html: string, slug: string): void => {
  if (/<h1\b/i.test(html)) {
    throw new ArticleHtmlError(
      slug,
      "contains an <h1> in its body. The template owns the page's only h1 - " +
        "start article headings at h2.",
    );
  }
};

/**
 * Heading levels must not skip: h2 -> h4 breaks the document outline even
 * though it looks identical once styled.
 */
export const assertHeadingOrder = (html: string, slug: string): void => {
  const levels = [...html.matchAll(/<h([1-6])\b/gi)].map((match) => Number(match[1]));
  let previous = 1; // the template's own h1

  for (const level of levels) {
    if (level > previous + 1) {
      throw new ArticleHtmlError(
        slug,
        `skips a heading level: h${String(previous)} is followed by h${String(level)}.`,
      );
    }
    previous = level;
  }
};

/**
 * Adds `loading="lazy"` and `decoding="async"` to body images that lack them.
 *
 * Only images inside the article body: the hero above it is loaded eagerly on
 * purpose, since it is the largest contentful paint on most article pages.
 * Existing attributes are never overwritten - an editor who set
 * `loading="eager"` deliberately keeps it.
 */
export const addImageLoadingHints = (html: string): string =>
  html.replace(/<img\b([^>]*)>/gi, (tag, attrs: string) => {
    let result = attrs;
    if (!/\bloading\s*=/i.test(result)) {
      result += ' loading="lazy"';
    }
    if (!/\bdecoding\s*=/i.test(result)) {
      result += ' decoding="async"';
    }
    return `<img${result}>`;
  });

/** Every image the audit sees must describe itself. */
export const findImagesWithoutAlt = (html: string): readonly string[] =>
  (html.match(/<img\b[^>]*>/gi) ?? []).filter((tag) => !/\salt\s*=\s*"[^"]+"/i.test(tag));

/**
 * The single entry point the article template calls: validate, then transform.
 * Validation runs first so a structural problem is reported as itself rather
 * than as a confusing diff in the transformed output.
 */
export const prepareArticleHtml = (html: string, slug: string): string => {
  assertNoH1(html, slug);
  assertHeadingOrder(html, slug);
  return addImageLoadingHints(html);
};
