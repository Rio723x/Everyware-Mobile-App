export {
  BrandValidationError,
  toAbsoluteUrl,
  toIsoDateTime,
  toSlug,
  type AbsoluteUrl,
  type IsoDateTime,
  type Slug,
} from "./brand.js";

export {
  AI_USER_AGENTS,
  LOCALE,
  OG_LOCALE,
  ORG_ID,
  POSTS_PER_PAGE,
  SITE_NAME,
  SITE_URL,
  TWITTER_HANDLE,
  WEBSITE_ID,
  siteUrl,
  type AiUserAgent,
} from "./config.js";

export {
  ArticleHtmlError,
  addImageLoadingHints,
  assertHeadingOrder,
  assertNoH1,
  findImagesWithoutAlt,
  prepareArticleHtml,
} from "./html.js";

export {
  fileToPath,
  listEmittedPages,
  listHtmlFiles,
  type EmittedPage,
} from "./dist-files.js";

export {
  PAGE_KINDS,
  type JsonLdDocument,
  type OpenGraphMetadata,
  type PageKind,
  type PageMetadata,
  type PageMetadataInput,
  type SocialImage,
  type TwitterMetadata,
} from "./metadata/types.js";

export { buildPageMetadata, type BreadcrumbTrail } from "./metadata/build.js";
export { buildTitle, TITLE_MAX } from "./metadata/title.js";
export {
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  DescriptionTooShortError,
  buildDescription,
} from "./metadata/description.js";
export {
  ROBOTS_DIRECTIVE,
  basePathFor,
  buildCanonical,
  buildPrevNext,
  type PrevNext,
} from "./metadata/canonical.js";
export {
  OG_MIN_HEIGHT,
  OG_MIN_WIDTH,
  buildSocialImage,
  toGhostWidth,
} from "./metadata/images.js";
export { buildOpenGraph, buildTwitter } from "./metadata/social.js";
export { collapseWhitespace, stripHtml, truncateAtWord } from "./metadata/text.js";

export { buildBlogPostingSchema } from "./schema-org/blog-posting.js";
export { buildBreadcrumbSchema, type SchemaCrumb } from "./schema-org/breadcrumb.js";
export { buildCollectionPageSchema } from "./schema-org/collection-page.js";
export {
  SchemaValidationError,
  blogPostingSchema,
  breadcrumbListSchema,
  collectionPageSchema,
  validateSchema,
} from "./schema-org/validate.js";

export {
  RULE_IDS,
  check,
  fail,
  pass,
  skip,
  type PageAudit,
  type PageContext,
  type PageRule,
  type RuleId,
  type RuleResult,
  type RuleSeverity,
  type RuleStatus,
  type SiteAudit,
} from "./audit/registry.js";

export {
  PAGE_RULES,
  UNREADABLE_PREFIX,
  auditPage,
  auditSite,
  hasErrors,
  isGradedPath,
  isUnreadable,
  kindOfPath,
  scoreOf,
  type SiteAuditInput,
  type SitePage,
  type SiteRule,
} from "./audit/audit.js";

export { SITE_RULES } from "./audit/rules/site.js";
export { buildSitemapXml, type ChangeFrequency, type SitemapEntry } from "./sitemap.js";
export { buildRobotsTxt } from "./robots.js";

export { distPageSource } from "./audit/dist-source.js";

export {
  httpPageSource,
  pathsFromSitemap,
  type HttpSourceOptions,
} from "./audit/http-source.js";

export {
  auditReportSchema,
  formatText,
  parseArgs,
  runCli,
  toReport,
  type AuditReport,
} from "./audit/cli.js";
