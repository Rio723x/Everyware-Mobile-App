/**
 * Shared text helpers for the title and description algorithms.
 *
 * Both need to shorten prose to a limit without producing "How to Service a
 * Washing Mac…", so the word-boundary logic lives here once.
 */

/** Collapses all whitespace runs to single spaces and trims. */
export const collapseWhitespace = (value: string): string => value.replace(/\s+/g, " ").trim();

/**
 * Truncates at the last word boundary that fits, appending an ellipsis.
 *
 * `limit` counts the ellipsis, so the result is never longer than `limit`.
 * A single word longer than the limit is hard-cut, since there is no boundary
 * to fall back to and returning it whole would break the caller's contract.
 */
export const truncateAtWord = (value: string, limit: number): string => {
  const text = collapseWhitespace(value);
  if (text.length <= limit) {
    return text;
  }

  const room = limit - 1; // one character for the ellipsis
  const slice = text.slice(0, room + 1);
  const lastSpace = slice.lastIndexOf(" ");

  const head = lastSpace > 0 ? slice.slice(0, lastSpace) : text.slice(0, room);
  return `${head.replace(/[\s,;:.!?-]+$/, "")}…`;
};

/** Strips HTML tags and decodes the handful of entities Ghost emits. */
export const stripHtml = (html: string): string =>
  collapseWhitespace(
    html
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'"),
  );
