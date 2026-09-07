import { check, fail, pass, type PageRule } from "../registry.js";

export const htmlLang: PageRule = (doc) => {
  const lang = doc.documentElement.getAttribute("lang")?.trim() ?? "";
  return check("html-lang", "error", lang !== "", "<html> has no lang attribute", `lang="${lang}"`);
};

export const charsetViewport: PageRule = (doc) => {
  const hasCharset = doc.querySelector("meta[charset]") !== null;
  const hasViewport = doc.querySelector('meta[name="viewport"]') !== null;
  if (hasCharset && hasViewport) {
    return pass("charset-viewport", "error", "both present");
  }
  const missing = [hasCharset ? null : "charset", hasViewport ? null : "viewport"].filter(
    (item): item is string => item !== null,
  );
  return fail("charset-viewport", "error", `missing meta: ${missing.join(", ")}`);
};

export const h1Single: PageRule = (doc) => {
  const headings = doc.querySelectorAll("h1");
  return check(
    "h1-single",
    "error",
    headings.length === 1,
    `found ${String(headings.length)} <h1> elements, expected exactly 1`,
  );
};

export const h1NonEmpty: PageRule = (doc) => {
  const heading = doc.querySelector("h1");
  if (heading === null) {
    return fail("h1-non-empty", "error", "no <h1> to check");
  }
  const text = heading.textContent?.trim() ?? "";
  return check("h1-non-empty", "error", text !== "", "the <h1> has no text content", `"${text}"`);
};

/**
 * Heading levels must not skip.
 *
 * h2 followed by h4 looks identical once styled and quietly breaks the document
 * outline every screen reader and crawler builds from it.
 */
export const headingOrder: PageRule = (doc) => {
  const headings = [...doc.querySelectorAll("h1,h2,h3,h4,h5,h6")];
  let previous = 0;

  for (const element of headings) {
    const level = Number(element.tagName.slice(1));
    if (previous !== 0 && level > previous + 1) {
      const text = element.textContent?.trim().slice(0, 40) ?? "";
      return fail(
        "heading-order",
        "error",
        `h${String(previous)} is followed by h${String(level)} ("${text}"), skipping a level`,
      );
    }
    previous = level;
  }
  return pass("heading-order", "error", `${String(headings.length)} headings in order`);
};

export const imgAlt: PageRule = (doc) => {
  const offenders = [...doc.querySelectorAll("img")].filter((img) => {
    // A decorative image declares itself as such; anything else must describe
    // itself or it is invisible to a screen reader.
    if (img.getAttribute("role") === "presentation" || img.getAttribute("aria-hidden") === "true") {
      return false;
    }
    return (img.getAttribute("alt") ?? "").trim() === "";
  });

  if (offenders.length === 0) {
    return pass("img-alt", "error", `${String(doc.querySelectorAll("img").length)} images described`);
  }
  const sources = offenders.map((img) => img.getAttribute("src") ?? "(no src)").slice(0, 3);
  return fail(
    "img-alt",
    "error",
    `${String(offenders.length)} image(s) without alt text: ${sources.join(", ")}`,
  );
};

export const structureRules: readonly PageRule[] = [
  htmlLang,
  charsetViewport,
  h1Single,
  h1NonEmpty,
  headingOrder,
  imgAlt,
];
