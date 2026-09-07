import { toAbsoluteUrl } from "../brand.js";
import { SITE_NAME, siteUrl } from "../config.js";
import type { PageMetadataInput, SocialImage } from "./types.js";

/** The minimum a social card needs to render at full size on every platform. */
export const OG_MIN_WIDTH = 1200;
export const OG_MIN_HEIGHT = 630;

/**
 * The site-wide fallback: the 1200x630 asset the marketing site's own
 * OpenGraph tags already point at, so a post with no feature image still shares
 * as recognisably Everyware rather than as a bare link.
 */
const FALLBACK_PATH = "/PhoneOnly.png";
const FALLBACK_ALT = `${SITE_NAME} — verified home appliance repair across India`;

/**
 * Rewrites a Ghost image URL through Ghost's own resize path.
 *
 * Ghost serves `/content/images/2026/08/x.jpg` at original size, which may be
 * narrower than 1200px and would then render as a small card. Inserting
 * `/size/w1200` asks Ghost for a known width, which is what lets the declared
 * `og:image:width` below be true rather than hopeful.
 *
 * A URL already carrying a size segment is rewritten, not nested.
 */
export const toGhostWidth = (url: string, width: number): string => {
  const sized = `/size/w${String(width)}`;

  if (/\/content\/images\/size\/w\d+\//.test(url)) {
    return url.replace(/\/content\/images\/size\/w\d+\//, `/content/images${sized}/`);
  }
  if (url.includes("/content/images/")) {
    return url.replace("/content/images/", `/content/images${sized}/`);
  }
  // Not a Ghost-hosted image: an external URL passes through untouched, since
  // Ghost's resize path would 404 on someone else's CDN.
  return url;
};

/**
 * The social card image for a page.
 *
 * `width`/`height` are always declared, and `alt` is never empty — both are
 * asserted by rules in §6.3, and an undescribed social image is invisible to
 * anyone using a screen reader on a shared link.
 */
export const buildSocialImage = (input: PageMetadataInput): SocialImage => {
  if (input.kind === "article") {
    const image = input.post.featureImage;
    if (image !== null && image.url !== "") {
      const alt = image.alt.trim();
      return {
        url: toAbsoluteUrl(toGhostWidth(image.url, OG_MIN_WIDTH)),
        width: OG_MIN_WIDTH,
        height: OG_MIN_HEIGHT,
        alt: alt === "" ? input.post.title : alt,
      };
    }
  }

  return {
    url: siteUrl(FALLBACK_PATH),
    width: OG_MIN_WIDTH,
    height: OG_MIN_HEIGHT,
    alt: FALLBACK_ALT,
  };
};
