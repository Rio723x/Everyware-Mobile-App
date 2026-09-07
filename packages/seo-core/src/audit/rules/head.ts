import { DESCRIPTION_MAX, DESCRIPTION_MIN } from "../../metadata/description.js";
import { TITLE_MAX } from "../../metadata/title.js";
import { check, fail, pass, type PageRule } from "../registry.js";

const TITLE_MIN = 10;
const TITLE_OPTIMAL_MIN = 15;
const TITLE_OPTIMAL_MAX = 60;
const DESCRIPTION_OPTIMAL_MIN = 70;
const DESCRIPTION_OPTIMAL_MAX = 160;

const textOf = (doc: Document, selector: string): string | null =>
  doc.querySelector(selector)?.textContent?.trim() ?? null;

const attrOf = (doc: Document, selector: string, attribute: string): string | null =>
  doc.querySelector(selector)?.getAttribute(attribute)?.trim() ?? null;

const titleOf = (doc: Document): string | null => textOf(doc, "title");
const descriptionOf = (doc: Document): string | null =>
  attrOf(doc, 'meta[name="description"]', "content");
const canonicalOf = (doc: Document): string | null =>
  attrOf(doc, 'link[rel="canonical"]', "href");

export const titlePresent: PageRule = (doc) => {
  const elements = doc.querySelectorAll("title");
  if (elements.length !== 1) {
    return fail("title-present", "error", `found ${String(elements.length)} <title> elements, expected exactly 1`);
  }
  const value = titleOf(doc) ?? "";
  return check("title-present", "error", value !== "", "the <title> is empty", `"${value}"`);
};

export const titleLength: PageRule = (doc) => {
  const value = titleOf(doc) ?? "";
  return check(
    "title-length",
    "error",
    value.length >= TITLE_MIN && value.length <= TITLE_MAX,
    `title is ${String(value.length)} characters, outside ${String(TITLE_MIN)}-${String(TITLE_MAX)}: "${value}"`,
  );
};

export const titleOptimal: PageRule = (doc) => {
  const value = titleOf(doc) ?? "";
  return check(
    "title-optimal",
    "warning",
    value.length >= TITLE_OPTIMAL_MIN && value.length <= TITLE_OPTIMAL_MAX,
    `title is ${String(value.length)} characters, outside the ${String(TITLE_OPTIMAL_MIN)}-${String(TITLE_OPTIMAL_MAX)} sweet spot: "${value}"`,
  );
};

export const descriptionPresent: PageRule = (doc) => {
  const elements = doc.querySelectorAll('meta[name="description"]');
  if (elements.length !== 1) {
    return fail(
      "description-present",
      "error",
      `found ${String(elements.length)} description metas, expected exactly 1`,
    );
  }
  const value = descriptionOf(doc) ?? "";
  return check("description-present", "error", value !== "", "the meta description is empty");
};

export const descriptionLength: PageRule = (doc) => {
  const value = descriptionOf(doc) ?? "";
  return check(
    "description-length",
    "error",
    value.length >= DESCRIPTION_MIN && value.length <= DESCRIPTION_MAX,
    `description is ${String(value.length)} characters, outside ${String(DESCRIPTION_MIN)}-${String(DESCRIPTION_MAX)}: "${value}"`,
  );
};

export const descriptionOptimal: PageRule = (doc) => {
  const value = descriptionOf(doc) ?? "";
  return check(
    "description-optimal",
    "warning",
    value.length >= DESCRIPTION_OPTIMAL_MIN && value.length <= DESCRIPTION_OPTIMAL_MAX,
    `description is ${String(value.length)} characters, outside the ${String(DESCRIPTION_OPTIMAL_MIN)}-${String(DESCRIPTION_OPTIMAL_MAX)} sweet spot`,
  );
};

export const canonicalPresent: PageRule = (doc) => {
  const elements = doc.querySelectorAll('link[rel="canonical"]');
  return check(
    "canonical-present",
    "error",
    elements.length === 1,
    `found ${String(elements.length)} canonical links, expected exactly 1`,
  );
};

export const canonicalAbsolute: PageRule = (doc) => {
  const value = canonicalOf(doc);
  if (value === null) {
    return fail("canonical-absolute", "error", "no canonical to check");
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return fail("canonical-absolute", "error", `canonical is not a parseable URL: "${value}"`);
  }
  if (parsed.protocol !== "https:") {
    return fail("canonical-absolute", "error", `canonical is not https: "${value}"`);
  }
  if (parsed.hash !== "" || parsed.search !== "") {
    return fail(
      "canonical-absolute",
      "error",
      `canonical carries a fragment or query, which crawlers treat as a different URL: "${value}"`,
    );
  }
  return pass("canonical-absolute", "error", value);
};

/**
 * The canonical must be the page's own URL.
 *
 * This is the rule the existing marketing site fails: its sub-routes all
 * canonicalise to fragment URLs, collapsing 22 pages into one.
 */
export const canonicalSelf: PageRule = (doc, ctx) => {
  // Transport information exists only on the HTTP adapter. A canonical URL that
  // redirects breaks spec 01 D6's 200-with-no-redirect promise, and the HTML
  // alone cannot reveal it.
  const chain = ctx.redirectChain ?? [];
  if (chain.length > 0) {
    return fail(
      "canonical-self",
      "error",
      `the canonical URL redirects to ${chain.join(" -> ")}, so it is not the URL that serves this page`,
    );
  }
  if (ctx.status !== undefined && ctx.status !== 200) {
    return fail("canonical-self", "error", `expected HTTP 200 at ${ctx.url}, got ${String(ctx.status)}`);
  }

  const value = canonicalOf(doc);
  return check(
    "canonical-self",
    "error",
    value === ctx.url,
    `canonical is "${value ?? "(missing)"}" but the page is served at "${ctx.url}"`,
  );
};

export const canonicalNoTrailingSlash: PageRule = (doc) => {
  const value = canonicalOf(doc);
  if (value === null) {
    return fail("canonical-no-trailing-slash", "error", "no canonical to check");
  }
  const path = (() => {
    try {
      return new URL(value).pathname;
    } catch {
      return value;
    }
  })();
  // The site root is the one URL allowed to end in a slash.
  return check(
    "canonical-no-trailing-slash",
    "error",
    path === "/" || !value.endsWith("/"),
    `canonical ends with a trailing slash: "${value}"`,
  );
};

const NOINDEX = /(^|[,\s])noindex([,\s]|$)/i;

export const robotsNotNoindex: PageRule = (doc, ctx) => {
  const meta = attrOf(doc, 'meta[name="robots"]', "content") ?? "";
  if (NOINDEX.test(meta)) {
    return fail("robots-not-noindex", "error", `<meta name="robots"> contains noindex: "${meta}"`);
  }
  // Only the HTTP adapter can see response headers; on disk this is undefined.
  const header = ctx.xRobotsTag ?? "";
  if (NOINDEX.test(header)) {
    return fail(
      "robots-not-noindex",
      "error",
      `X-Robots-Tag header contains noindex: "${header}" (the HTML itself is clean, which is why this is easy to miss)`,
    );
  }
  return pass("robots-not-noindex", "error", "indexable");
};

export const robotsDirectives: PageRule = (doc) => {
  const meta = attrOf(doc, 'meta[name="robots"]', "content") ?? "";
  return check(
    "robots-directives",
    "warning",
    meta.includes("max-image-preview:large") && meta.includes("max-snippet:-1"),
    `robots directive is missing max-image-preview:large or max-snippet:-1: "${meta}"`,
  );
};

export const headRules: readonly PageRule[] = [
  titlePresent,
  titleLength,
  titleOptimal,
  descriptionPresent,
  descriptionLength,
  descriptionOptimal,
  canonicalPresent,
  canonicalAbsolute,
  canonicalSelf,
  canonicalNoTrailingSlash,
  robotsNotNoindex,
  robotsDirectives,
];

export const readTitle = titleOf;
export const readDescription = descriptionOf;
export const readCanonical = canonicalOf;
