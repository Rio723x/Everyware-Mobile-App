import { blogPostingSchema, breadcrumbListSchema } from "../../schema-org/validate.js";
import { collapseWhitespace } from "../../metadata/text.js";
import { check, fail, pass, skip, type PageRule } from "../registry.js";
import { readCanonical, readDescription } from "./head.js";

interface ParsedScript {
  readonly index: number;
  readonly value: unknown;
}

const parseAll = (doc: Document): { parsed: ParsedScript[]; errors: string[] } => {
  const parsed: ParsedScript[] = [];
  const errors: string[] = [];

  [...doc.querySelectorAll('script[type="application/ld+json"]')].forEach((script, index) => {
    try {
      parsed.push({ index, value: JSON.parse(script.textContent ?? "") });
    } catch (error) {
      errors.push(
        `script #${String(index)}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  });

  return { parsed, errors };
};

const typeOf = (value: unknown): string | null => {
  if (typeof value !== "object" || value === null || !("@type" in value)) {
    return null;
  }
  // The `in` check above narrows `value`, so this reads without an assertion.
  const type: unknown = value["@type"];
  return typeof type === "string" ? type : null;
};

const documentsOfType = (doc: Document, type: string): unknown[] =>
  parseAll(doc).parsed.filter((entry) => typeOf(entry.value) === type).map((entry) => entry.value);

export const jsonldParses: PageRule = (doc) => {
  const { parsed, errors } = parseAll(doc);
  if (errors.length > 0) {
    return fail("jsonld-parses", "error", `invalid JSON-LD — ${errors.join("; ")}`);
  }
  return pass("jsonld-parses", "error", `${String(parsed.length)} document(s) parsed`);
};

export const jsonldBlogPosting: PageRule = (doc, ctx) => {
  if (ctx.kind !== "article") {
    return skip("jsonld-blogposting", "error", `not an article (${ctx.kind})`);
  }
  const docs = documentsOfType(doc, "BlogPosting");
  if (docs.length !== 1) {
    return fail(
      "jsonld-blogposting",
      "error",
      `found ${String(docs.length)} BlogPosting documents, expected exactly 1`,
    );
  }
  const result = blogPostingSchema.safeParse(docs[0]);
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    return fail("jsonld-blogposting", "error", `BlogPosting is invalid — ${detail}`);
  }
  return pass("jsonld-blogposting", "error", "valid");
};

export const jsonldBreadcrumb: PageRule = (doc) => {
  const docs = documentsOfType(doc, "BreadcrumbList");
  if (docs.length !== 1) {
    return fail(
      "jsonld-breadcrumb",
      "error",
      `found ${String(docs.length)} BreadcrumbList documents, expected exactly 1`,
    );
  }
  const result = breadcrumbListSchema.safeParse(docs[0]);
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    return fail("jsonld-breadcrumb", "error", `BreadcrumbList is invalid — ${detail}`);
  }

  const last = result.data.itemListElement.at(-1);
  const canonical = readCanonical(doc);
  return check(
    "jsonld-breadcrumb",
    "error",
    last?.item === canonical,
    `the last breadcrumb points at "${last?.item ?? "(none)"}" but the page canonical is "${canonical ?? "(missing)"}"`,
  );
};

/**
 * Structured data must describe what the page actually shows.
 *
 * Schema that describes invisible or different content is the failure this
 * whole rule set exists to catch, and it is the reason every rule parses
 * rendered HTML rather than trusting the builders that produced it.
 */
export const jsonldMatchesPage: PageRule = (doc, ctx) => {
  if (ctx.kind !== "article") {
    return skip("jsonld-matches-page", "error", `not an article (${ctx.kind})`);
  }
  const result = blogPostingSchema.safeParse(documentsOfType(doc, "BlogPosting")[0]);
  if (!result.success) {
    return fail("jsonld-matches-page", "error", "no valid BlogPosting to compare against the page");
  }

  const visibleH1 = collapseWhitespace(doc.querySelector("h1")?.textContent ?? "");
  const headline = collapseWhitespace(result.data.headline);

  // Google caps headline at 110 characters, so a long title is truncated with
  // an ellipsis in the schema while the visible h1 stays whole. A truncated
  // headline must still be a prefix of what the page shows - which catches a
  // genuinely different headline while allowing the documented shortening.
  const matches = headline.endsWith("…")
    ? visibleH1.startsWith(headline.slice(0, -1).trimEnd())
    : headline === visibleH1;

  if (!matches) {
    return fail(
      "jsonld-matches-page",
      "error",
      `schema headline "${headline}" does not match the visible <h1> "${visibleH1}"`,
    );
  }

  const metaDescription = collapseWhitespace(readDescription(doc) ?? "");
  const schemaDescription = collapseWhitespace(result.data.description);
  if (schemaDescription !== metaDescription) {
    return fail(
      "jsonld-matches-page",
      "error",
      `schema description differs from the meta description — schema: "${schemaDescription.slice(0, 60)}…", meta: "${metaDescription.slice(0, 60)}…"`,
    );
  }

  return pass("jsonld-matches-page", "error", "schema matches the rendered page");
};

export const jsonLdRules: readonly PageRule[] = [
  jsonldParses,
  jsonldBlogPosting,
  jsonldBreadcrumb,
  jsonldMatchesPage,
];
