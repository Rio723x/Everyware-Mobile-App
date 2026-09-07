import { z } from "zod";

/**
 * Zod schemas for the JSON-LD this project emits.
 *
 * Every builder validates its own output before returning, so an invalid
 * document cannot escape the module. That matters more than usual here: bad
 * structured data is silently ignored by crawlers, so the failure mode without
 * this check is "we shipped schema for a year and it never did anything".
 */

const absoluteUrl = z.string().url().startsWith("https://");
const isoDateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/, {
    message: "must be a full ISO-8601 timestamp with an offset",
  });

const idRef = z.object({ "@id": absoluteUrl });

export const blogPostingSchema = z.object({
  "@context": z.literal("https://schema.org"),
  "@type": z.literal("BlogPosting"),
  "@id": absoluteUrl,
  mainEntityOfPage: z.object({ "@type": z.literal("WebPage"), "@id": absoluteUrl }),
  headline: z.string().min(1).max(110),
  description: z.string().min(1),
  image: z.array(absoluteUrl).min(1),
  datePublished: isoDateTime,
  dateModified: isoDateTime,
  wordCount: z.number().int().nonnegative(),
  keywords: z.array(z.string()),
  articleSection: z.string().min(1).optional(),
  inLanguage: z.string().min(2),
  author: z.object({
    "@type": z.literal("Person"),
    name: z.string().min(1),
    url: absoluteUrl,
  }),
  publisher: idRef,
  isPartOf: idRef,
});

export const breadcrumbListSchema = z
  .object({
    "@context": z.literal("https://schema.org"),
    "@type": z.literal("BreadcrumbList"),
    itemListElement: z
      .array(
        z.object({
          "@type": z.literal("ListItem"),
          position: z.number().int().positive(),
          name: z.string().min(1),
          item: absoluteUrl,
        }),
      )
      .min(2),
  })
  .refine(
    (doc) => doc.itemListElement.every((entry, index) => entry.position === index + 1),
    { message: "breadcrumb positions must be contiguous starting at 1" },
  );

export const collectionPageSchema = z.object({
  "@context": z.literal("https://schema.org"),
  "@type": z.literal("CollectionPage"),
  "@id": absoluteUrl,
  name: z.string().min(1),
  description: z.string().min(1),
  url: absoluteUrl,
  inLanguage: z.string().min(2),
  isPartOf: idRef,
});

export class SchemaValidationError extends Error {
  constructor(type: string, cause: z.ZodError) {
    const detail = cause.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    super(`Generated ${type} JSON-LD is invalid — ${detail}`);
    this.name = "SchemaValidationError";
    this.cause = cause;
  }
}

/** Parses a built document, throwing a message that names the offending field. */
export const validateSchema = <T>(type: string, schema: z.ZodType<T>, doc: unknown): T => {
  const parsed = schema.safeParse(doc);
  if (!parsed.success) {
    throw new SchemaValidationError(type, parsed.error);
  }
  return parsed.data;
};
