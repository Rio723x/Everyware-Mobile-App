import type { IsoDateTime, Slug } from "@everyware/seo-core";

/** A hero or avatar image that is always paired with its alt text. */
export interface FeatureImage {
  readonly url: string;
  readonly alt: string;
}

export interface BlogTag {
  readonly id: string;
  readonly slug: Slug;
  readonly name: string;
  readonly description: string | null;
}

export interface BlogAuthor {
  readonly id: string;
  readonly slug: Slug;
  readonly name: string;
  readonly bio: string | null;
  readonly profileImage: FeatureImage | null;
}

export interface BlogPost {
  readonly id: string;
  readonly slug: Slug;
  readonly title: string;
  /** Ghost-rendered article body. Headings start at h2; the template owns the h1. */
  readonly html: string;
  /** Plain text body - drives reading time here and analysis in spec 03. */
  readonly plaintext: string;
  readonly excerpt: string;
  readonly featureImage: FeatureImage | null;
  readonly primaryAuthor: BlogAuthor;
  readonly authors: readonly BlogAuthor[];
  /** Public tags only. Internal `#tags` never reach this array. */
  readonly tags: readonly BlogTag[];
  readonly publishedAt: IsoDateTime;
  readonly updatedAt: IsoDateTime;
  readonly readingTimeMinutes: number;
  readonly wordCount: number;
  /** Editor's explicit SEO overrides. Spec 02 honours these above anything computed. */
  readonly metaTitle: string | null;
  readonly metaDescription: string | null;
  /** Set by the editor for republished content; overrides the computed canonical. */
  readonly canonicalUrl: string | null;
}

/**
 * The blog's read surface over Ghost.
 *
 * Six methods. Pagination, `include=` parameters, retry, internal-tag filtering,
 * wire validation and normalisation all live behind them, so a caller never sees
 * a Ghost wire object, a page cursor, or a raw date string.
 */
export interface GhostClient {
  /** Every published post, newest first. Pagination is handled internally. */
  listPosts(): Promise<readonly BlogPost[]>;
  getPostBySlug(slug: Slug): Promise<BlogPost | null>;
  listPostsByTag(tagSlug: Slug): Promise<readonly BlogPost[]>;
  listPostsByAuthor(authorSlug: Slug): Promise<readonly BlogPost[]>;
  /** Public tags only - internal `#tags` are filtered out. */
  listTags(): Promise<readonly BlogTag[]>;
  listAuthors(): Promise<readonly BlogAuthor[]>;
}
