import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { toAbsoluteUrl } from "../brand.js";
import { SITE_URL } from "../config.js";
import { fileToPath, listHtmlFiles } from "../dist-files.js";
import type { SiteAuditInput, SitePage } from "./audit.js";

/**
 * Reads a built site off disk for auditing.
 *
 * `404.html` is excluded: it is served for URLs that do not exist, so
 * site-level claims about the content set do not apply to it.
 */
export const distPageSource = (distDir: string): SiteAuditInput => {
  const allFiles = listHtmlFiles(distDir);
  const allPaths = new Set(allFiles.map(fileToPath));

  const pages: SitePage[] = allFiles
    .filter((file) => file !== "404.html")
    // The React SPA at "/" is out of scope for spec 02 - it keeps its existing
    // hand-written head - so it is not graded, only linked to.
    .filter((file) => fileToPath(file).startsWith("/blog"))
    .map((file) => {
      const path = fileToPath(file);
      return {
        file,
        path,
        url: toAbsoluteUrl(path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`),
        html: readFileSync(resolve(distDir, file), "utf8"),
      };
    });

  const asset = (name: string): string | null => {
    const full = resolve(distDir, name);
    return existsSync(full) ? readFileSync(full, "utf8") : null;
  };

  return {
    pages,
    allPaths,
    sitemapXml: asset("sitemap.xml"),
    robotsTxt: asset("robots.txt"),
  };
};
