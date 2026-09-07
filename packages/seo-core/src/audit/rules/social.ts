import { OG_MIN_HEIGHT, OG_MIN_WIDTH } from "../../metadata/images.js";
import { check, fail, pass, skip, type PageRule } from "../registry.js";
import { readCanonical } from "./head.js";

const og = (doc: Document, property: string): string | null =>
  doc.querySelector(`meta[property="${property}"]`)?.getAttribute("content")?.trim() ?? null;

const twitter = (doc: Document, name: string): string | null =>
  doc.querySelector(`meta[name="${name}"]`)?.getAttribute("content")?.trim() ?? null;

const REQUIRED_OG = [
  "og:type",
  "og:title",
  "og:description",
  "og:url",
  "og:image",
  "og:site_name",
  "og:locale",
] as const;

export const ogRequired: PageRule = (doc) => {
  const missing = REQUIRED_OG.filter((property) => (og(doc, property) ?? "") === "");
  return check(
    "og-required",
    "error",
    missing.length === 0,
    // Naming which property is missing is the difference between a two-minute
    // fix and reading the whole head by eye.
    `missing or empty OpenGraph properties: ${missing.join(", ")}`,
  );
};

export const ogImageDimensions: PageRule = (doc) => {
  const width = Number(og(doc, "og:image:width") ?? "0");
  const height = Number(og(doc, "og:image:height") ?? "0");
  return check(
    "og-image-dimensions",
    "error",
    width >= OG_MIN_WIDTH && height >= OG_MIN_HEIGHT,
    `og:image is declared ${String(width)}x${String(height)}, below the ${String(OG_MIN_WIDTH)}x${String(OG_MIN_HEIGHT)} needed for a large card`,
  );
};

export const ogImageAbsolute: PageRule = (doc) => {
  const value = og(doc, "og:image") ?? "";
  return check(
    "og-image-absolute",
    "error",
    value.startsWith("https://"),
    `og:image is not an absolute https URL: "${value}"`,
  );
};

export const ogImageAlt: PageRule = (doc) => {
  const value = og(doc, "og:image:alt") ?? "";
  return check("og-image-alt", "error", value !== "", "og:image:alt is missing or empty");
};

export const ogUrlCanonical: PageRule = (doc) => {
  const url = og(doc, "og:url");
  const canonical = readCanonical(doc);
  return check(
    "og-url-canonical",
    "error",
    url !== null && url === canonical,
    `og:url "${url ?? "(missing)"}" differs from the canonical "${canonical ?? "(missing)"}"`,
  );
};

const ARTICLE_FIELDS = [
  "article:published_time",
  "article:modified_time",
  "article:author",
] as const;

export const ogArticleFields: PageRule = (doc, ctx) => {
  if (ctx.kind !== "article") {
    return skip("og-article-fields", "error", `not an article (${ctx.kind})`);
  }
  if (og(doc, "og:type") !== "article") {
    return fail(
      "og-article-fields",
      "error",
      `og:type is "${og(doc, "og:type") ?? "(missing)"}" on an article page, expected "article"`,
    );
  }
  const missing = ARTICLE_FIELDS.filter((property) => (og(doc, property) ?? "") === "");
  if (missing.length > 0) {
    return fail("og-article-fields", "error", `missing article properties: ${missing.join(", ")}`);
  }
  for (const property of ["article:published_time", "article:modified_time"] as const) {
    const value = og(doc, property) ?? "";
    if (Number.isNaN(Date.parse(value))) {
      return fail("og-article-fields", "error", `${property} is not a parseable date: "${value}"`);
    }
  }
  return pass("og-article-fields", "error", "complete");
};

const REQUIRED_TWITTER = [
  "twitter:title",
  "twitter:description",
  "twitter:image",
  "twitter:image:alt",
] as const;

export const twitterRequired: PageRule = (doc) => {
  const card = twitter(doc, "twitter:card") ?? "";
  if (card !== "summary_large_image") {
    return fail(
      "twitter-required",
      "error",
      `twitter:card is "${card}", expected "summary_large_image" — every page here has a 1200x630 image and the small card wastes it`,
    );
  }
  const missing = REQUIRED_TWITTER.filter((name) => (twitter(doc, name) ?? "") === "");
  return check(
    "twitter-required",
    "error",
    missing.length === 0,
    `missing or empty Twitter properties: ${missing.join(", ")}`,
  );
};

export const socialRules: readonly PageRule[] = [
  ogRequired,
  ogImageDimensions,
  ogImageAbsolute,
  ogImageAlt,
  ogUrlCanonical,
  ogArticleFields,
  twitterRequired,
];
