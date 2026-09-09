import type { AbsoluteUrl } from "../brand.js";
import { LOCALE, WEBSITE_ID } from "../config.js";
import type { JsonLdDocument } from "../metadata/types.js";
import { collectionPageSchema, validateSchema } from "./validate.js";

/**
 * CollectionPage for listing, category and author routes.
 *
 * Deliberately carries no ItemList of posts. It would add crawl surface with no
 * benefit and one more thing to keep in sync with the visible page, and the
 * `jsonld-matches-page` rule would then have to police it. FAQPage is likewise
 * never emitted anywhere: it requires visible Q&A markup, and generating it
 * from an AI suggestion is exactly the "AI invents schema" failure the plan
 * warns about.
 */
export const buildCollectionPageSchema = (
  canonical: AbsoluteUrl,
  name: string,
  description: string,
): JsonLdDocument =>
  validateSchema("CollectionPage", collectionPageSchema, {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${canonical}#collection`,
    name,
    description,
    url: canonical,
    inLanguage: LOCALE,
    isPartOf: { "@id": WEBSITE_ID },
  });
