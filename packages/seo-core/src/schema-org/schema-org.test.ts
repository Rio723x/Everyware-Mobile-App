import { InMemoryGhostClient, type BlogPost } from "@everyware/ghost";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { toSlug } from "../brand.js";
import { ORG_ID, SITE_URL, WEBSITE_ID } from "../config.js";
import { buildPageMetadata } from "../metadata/build.js";
import { buildCanonical } from "../metadata/canonical.js";
import { buildDescription } from "../metadata/description.js";
import { buildSocialImage } from "../metadata/images.js";
import { buildBlogPostingSchema } from "./blog-posting.js";
import { buildBreadcrumbSchema, type SchemaCrumb } from "./breadcrumb.js";
import { buildCollectionPageSchema } from "./collection-page.js";
import {
  SchemaValidationError,
  blogPostingSchema,
  breadcrumbListSchema,
  collectionPageSchema,
  validateSchema,
} from "./validate.js";

/**
 * Documents are read back through the zod schemas rather than with type
 * assertions. That gives typed access without an `as` in sight, and the parse
 * itself is a second assertion that what the builder emitted is valid.
 */
const client = new InMemoryGhostClient();
const posts = await client.listPosts();
const [tag] = await client.listTags();
const [author] = await client.listAuthors();
const post = posts[0];
if (post === undefined || tag === undefined || author === undefined) {
  throw new Error("fixture corpus incomplete");
}

const forPost = (p: BlogPost): Parameters<typeof buildBlogPostingSchema>[0] => ({
  post: p,
  canonical: buildCanonical({ kind: "article", post: p }),
  description: buildDescription({ kind: "article", post: p }),
  image: buildSocialImage({ kind: "article", post: p }),
});

const articlePosting = (p: BlogPost) => blogPostingSchema.parse(buildBlogPostingSchema(forPost(p)));

const articleTrail = (p: BlogPost): SchemaCrumb[] => {
  const primary = p.tags[0];
  return [
    { label: "Home", href: "/" },
    { label: "Blog", href: "/blog" },
    ...(primary === undefined
      ? []
      : [{ label: primary.name, href: `/blog/category/${primary.slug}` }]),
    { label: p.title, href: null },
  ];
};

const listingTrail: SchemaCrumb[] = [
  { label: "Home", href: "/" },
  { label: "Blog", href: null },
];

describe("buildBlogPostingSchema", () => {
  it("validates for every fixture post", () => {
    for (const p of posts) {
      expect(() => buildBlogPostingSchema(forPost(p)), p.slug).not.toThrow();
    }
  });

  it("refuses an invalid document rather than returning it", () => {
    // Driven through validateSchema directly: forging an invalid branded date
    // would need a type assertion, and the behaviour under test is that a
    // malformed document is refused, whatever produced it.
    const { datePublished: _dropped, ...missingDate } = articlePosting(post);
    expect(() => validateSchema("BlogPosting", blogPostingSchema, missingDate)).toThrow(
      SchemaValidationError,
    );
    expect(() => validateSchema("BlogPosting", blogPostingSchema, missingDate)).toThrow(
      /datePublished/,
    );
  });

  it("anchors @id and mainEntityOfPage to the canonical", () => {
    const canonical = buildCanonical({ kind: "article", post });
    const doc = articlePosting(post);
    expect(doc["@id"]).toBe(`${canonical}#article`);
    expect(doc.mainEntityOfPage).toEqual({ "@type": "WebPage", "@id": canonical });
  });

  it("references the Organization and WebSite nodes the marketing site declares", () => {
    const doc = articlePosting(post);
    expect(doc.publisher).toEqual({ "@id": ORG_ID });
    expect(doc.isPartOf).toEqual({ "@id": WEBSITE_ID });

    // Those @ids must exist in apps/site/index.html, or the blog declares a
    // second, competing Organization on the same domain.
    const here = dirname(fileURLToPath(import.meta.url));
    const indexHtml = readFileSync(resolve(here, "../../../../apps/site/index.html"), "utf8");
    expect(indexHtml).toContain(ORG_ID);
    expect(indexHtml).toContain(WEBSITE_ID);
  });

  it("caps the headline at 110 characters without splitting a word", () => {
    const doc = articlePosting({ ...post, title: "Word ".repeat(40).trim() });
    expect(doc.headline.length).toBeLessThanOrEqual(110);
    expect(doc.headline).not.toMatch(/\s…$/);
  });

  it("uses the same description string the page will render", () => {
    expect(articlePosting(post).description).toBe(buildDescription({ kind: "article", post }));
  });

  it("reports a word count matching the body text", () => {
    expect(articlePosting(post).wordCount).toBe(post.plaintext.trim().split(/\s+/).length);
  });

  it("omits articleSection for an untagged post rather than inventing one", async () => {
    const untagged = await client.getPostBySlug(toSlug("smart-home-starter-guide"));
    if (untagged === null) throw new Error("fixture missing");
    const doc = articlePosting(untagged);
    expect(doc.articleSection).toBeUndefined();
    expect(doc.keywords).toEqual([]);
  });

  it("emits absolute https URLs for image and author", () => {
    const doc = articlePosting(post);
    expect(doc.image[0]).toMatch(/^https:\/\//);
    expect(doc.author.url).toMatch(/^https:\/\//);
  });
});

describe("buildBreadcrumbSchema", () => {
  const canonical = buildCanonical({ kind: "article", post });
  const parsed = (trail: SchemaCrumb[], url = canonical) =>
    breadcrumbListSchema.parse(buildBreadcrumbSchema(trail, url));

  it("numbers positions contiguously from 1", () => {
    const items = parsed(articleTrail(post)).itemListElement;
    expect(items.map((entry) => entry.position)).toEqual(items.map((_, index) => index + 1));
  });

  it("ends at the page's own canonical", () => {
    expect(parsed(articleTrail(post)).itemListElement.at(-1)?.item).toBe(canonical);
  });

  it("produces a three-item trail for an untagged post", async () => {
    const untagged = await client.getPostBySlug(toSlug("smart-home-starter-guide"));
    if (untagged === null) throw new Error("fixture missing");
    const url = buildCanonical({ kind: "article", post: untagged });
    expect(parsed(articleTrail(untagged), url).itemListElement).toHaveLength(3);
  });

  it("rejects a trail too short to be a breadcrumb", () => {
    expect(() => buildBreadcrumbSchema([{ label: "Only", href: null }], canonical)).toThrow(
      SchemaValidationError,
    );
  });

  it("resolves relative crumb hrefs against the site origin", () => {
    const items = parsed(articleTrail(post)).itemListElement;
    expect(items[0]?.item).toBe(`${SITE_URL}/`);
    expect(items[1]?.item).toBe(`${SITE_URL}/blog`);
  });
});

describe("buildCollectionPageSchema", () => {
  it("validates and points at the WebSite node", () => {
    const canonical = buildCanonical({
      kind: "category",
      tag,
      postCount: 3,
      page: 1,
      totalPages: 1,
    });
    const doc = collectionPageSchema.parse(
      buildCollectionPageSchema(canonical, "Name", "A description of the collection."),
    );
    expect(doc["@type"]).toBe("CollectionPage");
    expect(doc.isPartOf).toEqual({ "@id": WEBSITE_ID });
    expect(doc.url).toBe(canonical);
  });
});

describe("buildPageMetadata", () => {
  const categoryTrail: SchemaCrumb[] = [
    { label: "Home", href: "/" },
    { label: "Blog", href: "/blog" },
    { label: tag.name, href: null },
  ];
  const authorTrail: SchemaCrumb[] = [
    { label: "Home", href: "/" },
    { label: "Blog", href: "/blog" },
    { label: author.name, href: null },
  ];

  it("returns a complete PageMetadata for every kind", () => {
    const cases = [
      { input: { kind: "article", post } as const, trail: articleTrail(post) },
      { input: { kind: "listing", page: 1, totalPages: 2 } as const, trail: listingTrail },
      {
        input: { kind: "category", tag, postCount: 3, page: 1, totalPages: 1 } as const,
        trail: categoryTrail,
      },
      {
        input: { kind: "author", author, postCount: 3, page: 1, totalPages: 1 } as const,
        trail: authorTrail,
      },
    ];

    for (const { input, trail } of cases) {
      const meta = buildPageMetadata(input, trail);
      for (const [key, value] of Object.entries(meta)) {
        expect(value, `${input.kind}.${key}`).not.toBeUndefined();
      }
      expect(meta.jsonLd, input.kind).toHaveLength(2);
    }
  });

  it("is deterministic", () => {
    expect(buildPageMetadata({ kind: "article", post }, articleTrail(post))).toEqual(
      buildPageMetadata({ kind: "article", post }, articleTrail(post)),
    );
  });

  it("uses one canonical everywhere it appears", () => {
    const meta = buildPageMetadata({ kind: "article", post }, articleTrail(post));
    expect(meta.openGraph["og:url"]).toBe(meta.canonical);
    expect(breadcrumbListSchema.parse(meta.jsonLd[1]).itemListElement.at(-1)?.item).toBe(
      meta.canonical,
    );
    expect(blogPostingSchema.parse(meta.jsonLd[0])["@id"]).toBe(`${meta.canonical}#article`);
  });

  it("mirrors title and description into OpenGraph", () => {
    const meta = buildPageMetadata({ kind: "article", post }, articleTrail(post));
    expect(meta.openGraph["og:title"]).toBe(meta.title);
    expect(meta.openGraph["og:description"]).toBe(meta.description);
  });

  it("emits BlogPosting for articles and CollectionPage for everything else", () => {
    const article = buildPageMetadata({ kind: "article", post }, articleTrail(post));
    expect(article.jsonLd[0]?.["@type"]).toBe("BlogPosting");
    expect(article.jsonLd[1]?.["@type"]).toBe("BreadcrumbList");

    const listing = buildPageMetadata({ kind: "listing", page: 1, totalPages: 1 }, listingTrail);
    expect(listing.jsonLd[0]?.["@type"]).toBe("CollectionPage");
  });

  it("never emits ItemList or FAQPage", () => {
    const meta = buildPageMetadata({ kind: "listing", page: 1, totalPages: 1 }, listingTrail);
    const serialised = JSON.stringify(meta.jsonLd);
    expect(serialised).not.toContain("ItemList");
    expect(serialised).not.toContain("FAQPage");
  });
});
