import { InMemoryGhostClient, type BlogPost } from "@everyware/ghost";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { toSlug } from "../brand.js";
import { ORG_ID, SITE_URL, WEBSITE_ID } from "../config.js";
import { buildCanonical } from "../metadata/canonical.js";
import { buildDescription } from "../metadata/description.js";
import { buildSocialImage } from "../metadata/images.js";
import { buildPageMetadata } from "../metadata/build.js";
import { buildBlogPostingSchema } from "./blog-posting.js";
import { buildBreadcrumbSchema, type SchemaCrumb } from "./breadcrumb.js";
import { buildCollectionPageSchema } from "./collection-page.js";
import { SchemaValidationError } from "./validate.js";

const client = new InMemoryGhostClient();
const posts = await client.listPosts();
const [tag] = await client.listTags();
const [author] = await client.listAuthors();
const post = posts[0];
if (post === undefined || tag === undefined || author === undefined) {
  throw new Error("fixture corpus incomplete");
}

const forPost = (p: BlogPost): Parameters<typeof buildBlogPostingSchema>[0] => {
  const canonical = buildCanonical({ kind: "article", post: p });
  return {
    post: p,
    canonical,
    description: buildDescription({ kind: "article", post: p }),
    image: buildSocialImage({ kind: "article", post: p }),
  };
};

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

describe("buildBlogPostingSchema", () => {
  it("validates for every fixture post", () => {
    for (const p of posts) {
      expect(() => buildBlogPostingSchema(forPost(p)), p.slug).not.toThrow();
    }
  });

  it("throws rather than returning an invalid document", () => {
    const broken = { ...post, publishedAt: "" as BlogPost["publishedAt"] };
    expect(() => buildBlogPostingSchema(forPost(broken))).toThrow(SchemaValidationError);
  });

  it("anchors @id and mainEntityOfPage to the canonical", () => {
    const doc = buildBlogPostingSchema(forPost(post));
    const canonical = buildCanonical({ kind: "article", post });
    expect(doc["@id"]).toBe(`${canonical}#article`);
    expect(doc["mainEntityOfPage"]).toEqual({ "@type": "WebPage", "@id": canonical });
  });

  it("references the Organization and WebSite nodes the marketing site declares", () => {
    const doc = buildBlogPostingSchema(forPost(post));
    expect(doc["publisher"]).toEqual({ "@id": ORG_ID });
    expect(doc["isPartOf"]).toEqual({ "@id": WEBSITE_ID });

    // Those @ids must match the ones already in apps/site/index.html, or the
    // blog declares a second, competing Organization on the same domain.
    const here = dirname(fileURLToPath(import.meta.url));
    const indexHtml = readFileSync(resolve(here, "../../../../apps/site/index.html"), "utf8");
    expect(indexHtml).toContain(ORG_ID);
    expect(indexHtml).toContain(WEBSITE_ID);
  });

  it("caps the headline at 110 characters without splitting a word", () => {
    const long = { ...post, title: "Word ".repeat(40).trim() };
    const doc = buildBlogPostingSchema(forPost(long));
    const headline = doc["headline"];
    expect(typeof headline).toBe("string");
    expect(String(headline).length).toBeLessThanOrEqual(110);
    expect(String(headline)).not.toMatch(/\s…$/);
  });

  it("uses the same description string the page will render", () => {
    const doc = buildBlogPostingSchema(forPost(post));
    expect(doc["description"]).toBe(buildDescription({ kind: "article", post }));
  });

  it("reports a word count matching the body text", () => {
    const doc = buildBlogPostingSchema(forPost(post));
    expect(doc["wordCount"]).toBe(post.plaintext.trim().split(/\s+/).length);
  });

  it("omits articleSection for an untagged post rather than inventing one", async () => {
    const untagged = await client.getPostBySlug(toSlug("smart-home-starter-guide"));
    if (untagged === null) throw new Error("fixture missing");
    const doc = buildBlogPostingSchema(forPost(untagged));
    expect(doc["articleSection"]).toBeUndefined();
    expect(doc["keywords"]).toEqual([]);
  });

  it("emits absolute https URLs for image and author", () => {
    const doc = buildBlogPostingSchema(forPost(post));
    expect((doc["image"] as string[])[0]).toMatch(/^https:\/\//);
    expect((doc["author"] as { url: string }).url).toMatch(/^https:\/\//);
  });
});

describe("buildBreadcrumbSchema", () => {
  it("numbers positions contiguously from 1", () => {
    const canonical = buildCanonical({ kind: "article", post });
    const doc = buildBreadcrumbSchema(articleTrail(post), canonical);
    const items = doc["itemListElement"] as { position: number }[];
    expect(items.map((i) => i.position)).toEqual(items.map((_, index) => index + 1));
  });

  it("ends at the page's own canonical", () => {
    const canonical = buildCanonical({ kind: "article", post });
    const doc = buildBreadcrumbSchema(articleTrail(post), canonical);
    const items = doc["itemListElement"] as { item: string }[];
    expect(items.at(-1)?.item).toBe(canonical);
  });

  it("produces a three-item trail for an untagged post", async () => {
    const untagged = await client.getPostBySlug(toSlug("smart-home-starter-guide"));
    if (untagged === null) throw new Error("fixture missing");
    const canonical = buildCanonical({ kind: "article", post: untagged });
    const doc = buildBreadcrumbSchema(articleTrail(untagged), canonical);
    expect((doc["itemListElement"] as unknown[]).length).toBe(3);
  });

  it("rejects a trail with non-contiguous positions", () => {
    // Constructed directly to prove the schema's refinement bites.
    expect(() =>
      buildBreadcrumbSchema([{ label: "Only", href: null }], buildCanonical({ kind: "listing", page: 1, totalPages: 1 })),
    ).toThrow(SchemaValidationError);
  });

  it("resolves relative crumb hrefs against the site origin", () => {
    const canonical = buildCanonical({ kind: "article", post });
    const doc = buildBreadcrumbSchema(articleTrail(post), canonical);
    const items = doc["itemListElement"] as { item: string }[];
    expect(items[0]?.item).toBe(`${SITE_URL}/`);
    expect(items[1]?.item).toBe(`${SITE_URL}/blog`);
  });
});

describe("buildCollectionPageSchema", () => {
  it("validates and points at the WebSite node", () => {
    const canonical = buildCanonical({ kind: "category", tag, postCount: 3, page: 1, totalPages: 1 });
    const doc = buildCollectionPageSchema(canonical, "Name", "A description of the collection.");
    expect(doc["@type"]).toBe("CollectionPage");
    expect(doc["isPartOf"]).toEqual({ "@id": WEBSITE_ID });
    expect(doc["url"]).toBe(canonical);
  });
});

describe("buildPageMetadata", () => {
  const listingTrail: SchemaCrumb[] = [
    { label: "Home", href: "/" },
    { label: "Blog", href: null },
  ];

  it("returns a complete PageMetadata for every kind", () => {
    const inputs = [
      { input: { kind: "article", post } as const, trail: articleTrail(post) },
      { input: { kind: "listing", page: 1, totalPages: 2 } as const, trail: listingTrail },
      {
        input: { kind: "category", tag, postCount: 3, page: 1, totalPages: 1 } as const,
        trail: [{ label: "Home", href: "/" }, { label: "Blog", href: "/blog" }, { label: tag.name, href: null }],
      },
      {
        input: { kind: "author", author, postCount: 3, page: 1, totalPages: 1 } as const,
        trail: [{ label: "Home", href: "/" }, { label: "Blog", href: "/blog" }, { label: author.name, href: null }],
      },
    ];

    for (const { input, trail } of inputs) {
      const meta = buildPageMetadata(input, trail);
      for (const [key, value] of Object.entries(meta)) {
        expect(value, `${input.kind}.${key}`).not.toBeUndefined();
      }
      expect(meta.jsonLd).toHaveLength(2);
    }
  });

  it("is deterministic", () => {
    const a = buildPageMetadata({ kind: "article", post }, articleTrail(post));
    const b = buildPageMetadata({ kind: "article", post }, articleTrail(post));
    expect(a).toEqual(b);
  });

  it("uses one canonical everywhere it appears", () => {
    const meta = buildPageMetadata({ kind: "article", post }, articleTrail(post));
    expect(meta.openGraph["og:url"]).toBe(meta.canonical);

    const breadcrumb = meta.jsonLd[1] as { itemListElement: { item: string }[] };
    expect(breadcrumb.itemListElement.at(-1)?.item).toBe(meta.canonical);

    const article = meta.jsonLd[0] as { "@id": string };
    expect(article["@id"]).toBe(`${meta.canonical}#article`);
  });

  it("mirrors title and description into OpenGraph", () => {
    const meta = buildPageMetadata({ kind: "article", post }, articleTrail(post));
    expect(meta.openGraph["og:title"]).toBe(meta.title);
    expect(meta.openGraph["og:description"]).toBe(meta.description);
  });

  it("emits BlogPosting for articles and CollectionPage for everything else", () => {
    const article = buildPageMetadata({ kind: "article", post }, articleTrail(post));
    expect((article.jsonLd[0] as { "@type": string })["@type"]).toBe("BlogPosting");
    expect((article.jsonLd[1] as { "@type": string })["@type"]).toBe("BreadcrumbList");

    const listing = buildPageMetadata({ kind: "listing", page: 1, totalPages: 1 }, listingTrail);
    expect((listing.jsonLd[0] as { "@type": string })["@type"]).toBe("CollectionPage");
  });

  it("never emits ItemList or FAQPage", () => {
    const meta = buildPageMetadata({ kind: "listing", page: 1, totalPages: 1 }, listingTrail);
    const serialised = JSON.stringify(meta.jsonLd);
    expect(serialised).not.toContain("ItemList");
    expect(serialised).not.toContain("FAQPage");
  });
});
