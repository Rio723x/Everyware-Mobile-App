import { BLOG_NAME } from "../config.js";
import { collapseWhitespace, truncateAtWord } from "./text.js";
import type { PageMetadataInput } from "./types.js";

export const DESCRIPTION_MIN = 50;
export const DESCRIPTION_MAX = 170;

/** Where the plaintext fallback aims, leaving room under the hard maximum. */
const PLAINTEXT_TARGET = 155;

export class DescriptionTooShortError extends Error {
  readonly slug: string;

  constructor(slug: string, produced: string) {
    super(
      `Article "${slug}" produced a ${String(produced.length)}-character meta description: ` +
        `"${produced}". Minimum is ${String(DESCRIPTION_MIN)}. ` +
        `Add a custom excerpt in Ghost, or write more body text.`,
    );
    this.name = "DescriptionTooShortError";
    this.slug = slug;
  }
}

/**
 * Builds a meta description deterministically.
 *
 * Article sources, in order: Ghost `meta_description`, `custom_excerpt`,
 * `excerpt`, then the opening of the body text.
 *
 * If every source is empty or trivially short the build **fails** rather than
 * emitting a 20-character description. That is a content defect, and papering
 * over it hides it from the only person who can fix it.
 */
export const buildDescription = (input: PageMetadataInput): string => {
  const raw = rawDescription(input);
  const text = raw.length > DESCRIPTION_MAX ? truncateAtWord(raw, DESCRIPTION_MAX) : raw;

  if (input.kind === "article" && text.length < DESCRIPTION_MIN) {
    throw new DescriptionTooShortError(input.post.slug, text);
  }
  return text;
};

const plural = (count: number, singular: string): string =>
  `${String(count)} ${count === 1 ? singular : `${singular}s`}`;

const rawDescription = (input: PageMetadataInput): string => {
  switch (input.kind) {
    case "article": {
      const { post } = input;
      // `post.excerpt` is already `custom_excerpt ?? excerpt`, collapsed by the
      // Ghost package's normalisation - so the spec's five-step chain is three
      // steps here, with steps 2 and 3 resolved upstream where the wire format
      // is still visible.
      for (const candidate of [post.metaDescription, post.excerpt]) {
        const value = collapseWhitespace(candidate ?? "");
        if (value !== "") {
          return value;
        }
      }
      return truncateAtWord(collapseWhitespace(post.plaintext), PLAINTEXT_TARGET);
    }

    case "listing":
      return input.page > 1
        ? `Page ${String(input.page)} of ${String(input.totalPages)} from the ${BLOG_NAME} — appliance care, repair costs and buying guides for Indian households.`
        : `Practical appliance care, real repair costs and buying guides for Indian households, from the people who work the service desks.`;

    case "category":
      return collapseWhitespace(
        input.tag.description ??
          `${plural(input.postCount, "article")} on ${input.tag.name.toLowerCase()} from the ${BLOG_NAME}, covering what goes wrong, what it costs and how to avoid it.`,
      );

    case "author":
      return collapseWhitespace(
        input.author.bio ??
          `${plural(input.postCount, "article")} written by ${input.author.name} for the ${BLOG_NAME}, on appliance care, repair costs and buying decisions.`,
      );
  }
};
