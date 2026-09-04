/**
 * Branded primitives for values whose validity is the entire point.
 *
 * A canonical URL that is not absolute, or a slug with an uppercase letter, is
 * not a string problem discovered in production - it is a type error caught at
 * the call site. The only way to obtain one of these types is to pass through a
 * validating factory below, so every function that accepts an `AbsoluteUrl`
 * knows it received one.
 */

declare const brand: unique symbol;

type Brand<T, B extends string> = T & { readonly [brand]: B };

/** A URL path segment: lowercase alphanumerics separated by single hyphens. */
export type Slug = Brand<string, "Slug">;

/** An absolute `https://` URL with no fragment, no query, and no trailing slash. */
export type AbsoluteUrl = Brand<string, "AbsoluteUrl">;

/** A full ISO-8601 timestamp including a UTC offset. */
export type IsoDateTime = Brand<string, "IsoDateTime">;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class BrandValidationError extends Error {
  constructor(brandName: string, value: unknown, reason: string) {
    super(`Invalid ${brandName}: ${reason}. Received: ${JSON.stringify(value)}`);
    this.name = "BrandValidationError";
  }
}

export const toSlug = (value: string): Slug => {
  if (!SLUG_PATTERN.test(value)) {
    throw new BrandValidationError(
      "Slug",
      value,
      "must be lowercase alphanumerics separated by single hyphens",
    );
  }
  // Invariant: the value matched SLUG_PATTERN on the line above.
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return value as Slug;
};

export const toAbsoluteUrl = (value: string): AbsoluteUrl => {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new BrandValidationError("AbsoluteUrl", value, "is not a parseable URL");
  }

  if (parsed.protocol !== "https:") {
    throw new BrandValidationError("AbsoluteUrl", value, "must use the https protocol");
  }
  if (parsed.hash !== "") {
    throw new BrandValidationError("AbsoluteUrl", value, "must not contain a fragment");
  }
  if (parsed.search !== "") {
    throw new BrandValidationError("AbsoluteUrl", value, "must not contain a query string");
  }
  // The site root is the one URL allowed to end in a slash: `https://host/` has
  // no path to strip, and `https://host` is a different string for canonical
  // comparison. Everything deeper must be slash-free (spec 01, D6).
  if (parsed.pathname !== "/" && value.endsWith("/")) {
    throw new BrandValidationError("AbsoluteUrl", value, "must not end with a trailing slash");
  }

  // Invariant: every constraint above has been checked.
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return value as AbsoluteUrl;
};

export const toIsoDateTime = (value: Date | string): IsoDateTime => {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new BrandValidationError("IsoDateTime", value, "is an Invalid Date");
    }
    // Invariant: a valid Date always serialises to a full ISO-8601 string.
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return value.toISOString() as IsoDateTime;
  }

  // A date-only string such as "2026-09-04" parses fine but carries no time or
  // offset, which is exactly the ambiguity this brand exists to exclude.
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    throw new BrandValidationError(
      "IsoDateTime",
      value,
      "must be a full ISO-8601 timestamp including a UTC offset",
    );
  }
  if (Number.isNaN(Date.parse(value))) {
    throw new BrandValidationError("IsoDateTime", value, "is not a real point in time");
  }

  // Invariant: the value matched the ISO-8601 pattern and parses to a real time.
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return value as IsoDateTime;
};
