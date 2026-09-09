import { BLOG_NAME } from "../config.js";
import { collapseWhitespace, truncateAtWord } from "./text.js";
import type { PageMetadataInput } from "./types.js";

/**
 * Hard ceiling. Titles longer than this are truncated at a word boundary.
 * Google's SERP cut-off varies with pixel width, so this is a sanity bound
 * rather than a promise about what gets displayed.
 */
export const TITLE_MAX = 70;

/**
 * Above this length, appending " | Everyware Blog" would push the title past
 * the useful range, so the post title stands alone.
 */
const SUFFIX_THRESHOLD = 45;

const SUFFIX = ` | ${BLOG_NAME}`;

const LISTING_TITLE = `${BLOG_NAME} — Appliance Care, Repair Costs, Buying Guides`;

/**
 * Builds a page title deterministically.
 *
 * The same input always produces the same string: no dates, no randomness, no
 * model. An editor's explicit `meta_title` always wins - if someone took the
 * trouble to write one, no algorithm should second-guess it.
 */
export const buildTitle = (input: PageMetadataInput): string => {
  const raw = rawTitle(input);
  return raw.length > TITLE_MAX ? truncateAtWord(raw, TITLE_MAX) : raw;
};

const withPage = (base: string, page: number): string =>
  page > 1 ? `${base} — Page ${String(page)}` : base;

const rawTitle = (input: PageMetadataInput): string => {
  switch (input.kind) {
    case "article": {
      const override = collapseWhitespace(input.post.metaTitle ?? "");
      if (override !== "") {
        return override;
      }
      const title = collapseWhitespace(input.post.title);
      return title.length > SUFFIX_THRESHOLD ? title : `${title}${SUFFIX}`;
    }

    case "listing":
      return input.page > 1 ? `${BLOG_NAME} — Page ${String(input.page)}` : LISTING_TITLE;

    case "category":
      return `${withPage(input.tag.name, input.page)}${SUFFIX}`;

    case "author":
      return `${withPage(`Articles by ${input.author.name}`, input.page)}${SUFFIX}`;
  }
};
