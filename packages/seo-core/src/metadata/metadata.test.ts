import { InMemoryGhostClient, type BlogAuthor, type BlogPost, type BlogTag } from "@everyware/ghost";
import { describe, expect, it } from "vitest";
import { toSlug } from "../brand.js";
import { SITE_URL } from "../config.js";
import { ROBOTS_DIRECTIVE, buildCanonical, buildPrevNext } from "./canonical.js";
import { DESCRIPTION_MAX, DESCRIPTION_MIN, DescriptionTooShortError, buildDescription } from "./description.js";
import { OG_MIN_HEIGHT, OG_MIN_WIDTH, buildSocialImage, toGhostWidth } from "./images.js";
import { buildOpenGraph, buildTwitter } from "./social.js";
import { TITLE_MAX, buildTitle } from "./title.js";
import type { PageMetadataInput } from "./types.js";

const client = new InMemoryGhostClient();
const load = async (): Promise<{
  post: BlogPost;
  tag: BlogTag;
  author: BlogAuthor;
  posts: readonly BlogPost[];
}> => {
  const posts = await client.listPosts();
  const [tag] = await client.listTags();
  const [author] = await client.listAuthors();
  const post = posts[0];
  if (post === undefined || tag === undefined || author === undefined) {
    throw new Error("fixture corpus incomplete");
  }
  return { post, tag, author, posts };
};

const { post, tag, author, posts } = await load();

const withTitle = (title: string): PageMetadataInput => ({
  kind: "article",
  post: { ...post, title, metaTitle: null },
});

describe("buildTitle", () => {
  it("uses an editor's meta_title verbatim", () => {
    const input: PageMetadataInput = {
      kind: "article",
      post: { ...post, metaTitle: "A Hand-Written SEO Title" },
    };
    expect(buildTitle(input)).toBe("A Hand-Written SEO Title");
  });

  it("ignores a whitespace-only meta_title and falls through", () => {
    const input: PageMetadataInput = { kind: "article", post: { ...post, metaTitle: "   " } };
    expect(buildTitle(input)).not.toBe("   ");
    expect(buildTitle(input)).toContain(post.title.slice(0, 20));
  });

  it("appends the blog suffix to a short title", () => {
    // 45 characters or fewer: there is room for the suffix.
    const short = "Why a Microwave Sparks";
    expect(short.length).toBeLessThanOrEqual(45);
    expect(buildTitle(withTitle(short))).toBe(`${short} | Everyware Blog`);
  });

  it("omits the suffix once the title is long enough to stand alone", () => {
    const long = "How Often Should You Service a Washing Machine Really";
    expect(long.length).toBeGreaterThan(45);
    expect(buildTitle(withTitle(long))).toBe(long);
  });

  it("treats exactly 45 characters as short", () => {
    const exact = "x".repeat(45);
    expect(buildTitle(withTitle(exact))).toBe(`${exact} | Everyware Blog`);
  });

  it("treats exactly 46 characters as long", () => {
    const exact = "y".repeat(46);
    expect(buildTitle(withTitle(exact))).toBe(exact);
  });

  it("truncates past the maximum at a word boundary", () => {
    const words = "Absolutely Everything You Could Ever Possibly Want To Know About Servicing A Washing Machine";
    const result = buildTitle(withTitle(words));
    expect(result.length).toBeLessThanOrEqual(TITLE_MAX);
    expect(result.endsWith("…")).toBe(true);
    expect(result).not.toMatch(/\s…$/);
  });

  it("builds listing titles, with a page number past page 1", () => {
    expect(buildTitle({ kind: "listing", page: 1, totalPages: 3 })).toBe(
      "Everyware Blog — Appliance Care, Repair Costs, Buying Guides",
    );
    expect(buildTitle({ kind: "listing", page: 2, totalPages: 3 })).toBe("Everyware Blog — Page 2");
  });

  it("builds category titles", () => {
    const base: PageMetadataInput = { kind: "category", tag, postCount: 5, page: 1, totalPages: 2 };
    expect(buildTitle(base)).toBe(`${tag.name} | Everyware Blog`);
    expect(buildTitle({ ...base, page: 2 })).toBe(`${tag.name} — Page 2 | Everyware Blog`);
  });

  it("builds author titles", () => {
    const base: PageMetadataInput = { kind: "author", author, postCount: 5, page: 1, totalPages: 2 };
    expect(buildTitle(base)).toBe(`Articles by ${author.name} | Everyware Blog`);
    expect(buildTitle({ ...base, page: 2 })).toBe(
      `Articles by ${author.name} — Page 2 | Everyware Blog`,
    );
  });

  it("is deterministic", () => {
    const input: PageMetadataInput = { kind: "article", post };
    expect(buildTitle(input)).toBe(buildTitle(input));
  });

  it("never produces a title below the rule's lower bound", () => {
    for (const p of posts) {
      expect(buildTitle({ kind: "article", post: p }).length).toBeGreaterThanOrEqual(10);
    }
  });
});

describe("buildDescription", () => {
  it("prefers an editor's meta_description", () => {
    const value = "A hand-written meta description that is comfortably long enough to pass.";
    expect(
      buildDescription({ kind: "article", post: { ...post, metaDescription: value } }),
    ).toBe(value);
  });

  it("falls back to the excerpt", () => {
    expect(buildDescription({ kind: "article", post })).toBe(post.excerpt);
  });

  it("falls back to the body text when there is no excerpt", () => {
    const result = buildDescription({
      kind: "article",
      post: { ...post, metaDescription: null, excerpt: "" },
    });
    expect(result.length).toBeGreaterThanOrEqual(DESCRIPTION_MIN);
    expect(post.plaintext).toContain(result.replace(/…$/, "").slice(0, 40));
  });

  it("collapses whitespace and newlines", () => {
    const messy = `  Lots   of\n\nwhitespace   here, and enough words to clear the minimum length.  `;
    expect(buildDescription({ kind: "article", post: { ...post, metaDescription: messy } })).toBe(
      "Lots of whitespace here, and enough words to clear the minimum length.",
    );
  });

  it("throws naming the slug when every source is too short", () => {
    const empty = { ...post, metaDescription: null, excerpt: "", plaintext: "Tiny." };
    expect(() => buildDescription({ kind: "article", post: empty })).toThrow(
      DescriptionTooShortError,
    );
    expect(() => buildDescription({ kind: "article", post: empty })).toThrow(
      new RegExp(post.slug),
    );
  });

  it("keeps every fixture description inside the rule bounds", () => {
    for (const p of posts) {
      const value = buildDescription({ kind: "article", post: p });
      expect(value.length, p.slug).toBeGreaterThanOrEqual(DESCRIPTION_MIN);
      expect(value.length, p.slug).toBeLessThanOrEqual(DESCRIPTION_MAX);
    }
  });

  it("describes listing, category and author pages", () => {
    for (const input of [
      { kind: "listing", page: 1, totalPages: 2 },
      { kind: "category", tag, postCount: 4, page: 1, totalPages: 1 },
      { kind: "author", author, postCount: 4, page: 1, totalPages: 1 },
    ] satisfies PageMetadataInput[]) {
      const value = buildDescription(input);
      expect(value.length).toBeGreaterThanOrEqual(DESCRIPTION_MIN);
      expect(value.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
    }
  });

  it("falls back to generated copy for a tag with no description", () => {
    const bare: BlogTag = { ...tag, description: null };
    const value = buildDescription({ kind: "category", tag: bare, postCount: 3, page: 1, totalPages: 1 });
    expect(value).toContain("3 articles");
  });
});

describe("buildCanonical", () => {
  it("matches the routing table for every page kind", () => {
    expect(buildCanonical({ kind: "article", post })).toBe(`${SITE_URL}/blog/${post.slug}`);
    expect(buildCanonical({ kind: "listing", page: 1, totalPages: 2 })).toBe(`${SITE_URL}/blog`);
    expect(buildCanonical({ kind: "category", tag, postCount: 1, page: 1, totalPages: 1 })).toBe(
      `${SITE_URL}/blog/category/${tag.slug}`,
    );
    expect(buildCanonical({ kind: "author", author, postCount: 1, page: 1, totalPages: 1 })).toBe(
      `${SITE_URL}/blog/author/${author.slug}`,
    );
  });

  it("makes paginated pages self-canonical, never page 1", () => {
    expect(buildCanonical({ kind: "listing", page: 2, totalPages: 3 })).toBe(
      `${SITE_URL}/blog/page/2`,
    );
    expect(
      buildCanonical({ kind: "category", tag, postCount: 20, page: 2, totalPages: 2 }),
    ).toBe(`${SITE_URL}/blog/category/${tag.slug}/page/2`);
  });

  it("honours a Ghost canonical_url override", () => {
    const republished = { ...post, canonicalUrl: "https://example.com/original-article" };
    expect(buildCanonical({ kind: "article", post: republished })).toBe(
      "https://example.com/original-article",
    );
  });

  it("never emits a fragment, a query or a trailing slash", () => {
    for (const p of posts) {
      const value = buildCanonical({ kind: "article", post: p });
      expect(value).not.toContain("#");
      expect(value).not.toContain("?");
      expect(value.endsWith("/")).toBe(false);
    }
  });
});

describe("buildPrevNext", () => {
  it("has no prev on page 1 and no next on the last page", () => {
    expect(buildPrevNext({ kind: "listing", page: 1, totalPages: 3 })).toEqual({
      prev: null,
      next: `${SITE_URL}/blog/page/2`,
    });
    expect(buildPrevNext({ kind: "listing", page: 3, totalPages: 3 })).toEqual({
      prev: `${SITE_URL}/blog/page/2`,
      next: null,
    });
  });

  it("points page 2's prev at the base path, not /page/1", () => {
    expect(buildPrevNext({ kind: "listing", page: 2, totalPages: 3 }).prev).toBe(`${SITE_URL}/blog`);
  });

  it("gives an article neither", () => {
    expect(buildPrevNext({ kind: "article", post })).toEqual({ prev: null, next: null });
  });
});

describe("robots", () => {
  it("never says noindex", () => {
    expect(ROBOTS_DIRECTIVE).not.toContain("noindex");
    expect(ROBOTS_DIRECTIVE).toContain("max-image-preview:large");
    expect(ROBOTS_DIRECTIVE).toContain("max-snippet:-1");
  });
});

describe("toGhostWidth", () => {
  it("inserts a size segment into a Ghost URL", () => {
    expect(toGhostWidth("https://cms.everyware.in/content/images/2026/08/x.jpg", 1200)).toBe(
      "https://cms.everyware.in/content/images/size/w1200/2026/08/x.jpg",
    );
  });

  it("rewrites rather than nests an existing size", () => {
    expect(
      toGhostWidth("https://cms.everyware.in/content/images/size/w600/2026/08/x.jpg", 1200),
    ).toBe("https://cms.everyware.in/content/images/size/w1200/2026/08/x.jpg");
  });

  it("leaves a non-Ghost URL alone", () => {
    expect(toGhostWidth("https://images.example.com/a.jpg", 1200)).toBe(
      "https://images.example.com/a.jpg",
    );
  });
});

describe("buildSocialImage", () => {
  it("uses the feature image, resized, with its alt text", () => {
    const image = buildSocialImage({ kind: "article", post });
    expect(image.url).toContain("/size/w1200/");
    expect(image.alt).toBe(post.featureImage?.alt);
  });

  it("falls back to the site asset when a post has no feature image", async () => {
    const tagless = await client.getPostBySlug(toSlug("choosing-a-water-purifier"));
    if (tagless === null) throw new Error("fixture missing");
    expect(tagless.featureImage).toBeNull();
    expect(buildSocialImage({ kind: "article", post: tagless }).url).toBe(
      `${SITE_URL}/PhoneOnly.png`,
    );
  });

  it("always declares dimensions at or above the platform minimum", () => {
    for (const p of posts) {
      const image = buildSocialImage({ kind: "article", post: p });
      expect(image.width).toBeGreaterThanOrEqual(OG_MIN_WIDTH);
      expect(image.height).toBeGreaterThanOrEqual(OG_MIN_HEIGHT);
      expect(image.alt.trim()).not.toBe("");
    }
  });
});

describe("buildOpenGraph and buildTwitter", () => {
  const shared = {
    title: "A Title",
    description: "A description long enough to be plausible as a real one.",
    canonical: buildCanonical({ kind: "article", post }),
    image: buildSocialImage({ kind: "article", post }),
  };

  it("emits every required OpenGraph property", () => {
    const og = buildOpenGraph({ ...shared, input: { kind: "article", post } });
    for (const key of [
      "og:type",
      "og:title",
      "og:description",
      "og:url",
      "og:site_name",
      "og:locale",
      "og:image",
      "og:image:width",
      "og:image:height",
      "og:image:alt",
    ]) {
      expect(og[key], key).toBeTruthy();
    }
  });

  it("sets og:url to exactly the canonical it was given", () => {
    const og = buildOpenGraph({ ...shared, input: { kind: "article", post } });
    expect(og["og:url"]).toBe(shared.canonical);
  });

  it("marks articles as article and everything else as website", () => {
    expect(buildOpenGraph({ ...shared, input: { kind: "article", post } })["og:type"]).toBe(
      "article",
    );
    expect(
      buildOpenGraph({ ...shared, input: { kind: "listing", page: 1, totalPages: 1 } })["og:type"],
    ).toBe("website");
  });

  it("adds article timestamps only to articles", () => {
    const article = buildOpenGraph({ ...shared, input: { kind: "article", post } });
    expect(article["article:published_time"]).toBe(post.publishedAt);
    expect(article["article:modified_time"]).toBe(post.updatedAt);
    expect(article["article:author"]).toContain("/blog/author/");

    const listing = buildOpenGraph({
      ...shared,
      input: { kind: "listing", page: 1, totalPages: 1 },
    });
    expect(Object.keys(listing).some((k) => k.startsWith("article:"))).toBe(false);
  });

  it("mirrors title and description into the Twitter card", () => {
    const twitter = buildTwitter({ ...shared, input: { kind: "article", post } });
    expect(twitter["twitter:card"]).toBe("summary_large_image");
    expect(twitter["twitter:title"]).toBe(shared.title);
    expect(twitter["twitter:description"]).toBe(shared.description);
    expect(twitter["twitter:image:alt"]).toBeTruthy();
  });
});
