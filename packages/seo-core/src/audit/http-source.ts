import { toAbsoluteUrl } from "../brand.js";
import { SITE_URL } from "../config.js";
import type { SiteAuditInput, SitePage } from "./audit.js";

export interface HttpSourceOptions {
  readonly baseUrl?: string;
  readonly fetch?: typeof globalThis.fetch;
  readonly retries?: number;
}

interface FetchedPage {
  readonly html: string;
  readonly status: number;
  readonly redirectChain: readonly string[];
  readonly xRobotsTag: string | null;
}

const FETCH_FAILED = "<!-- fetch-failed -->";

/**
 * Fetches a page, following redirects manually so the chain is observable.
 *
 * A canonical URL that 301s is a defect spec 01 D6 promised would not exist,
 * and `fetch`'s automatic following would hide it entirely.
 */
const fetchPage = async (
  url: string,
  doFetch: typeof globalThis.fetch,
  retries: number,
): Promise<FetchedPage> => {
  const chain: string[] = [];
  let current = url;

  for (let hop = 0; hop <= 5; hop += 1) {
    let response: Response | null = null;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        response = await doFetch(current, { redirect: "manual" });
        break;
      } catch {
        // A transient network failure should not abort the whole audit run;
        // only a persistent one becomes a reported result.
        if (attempt === retries) {
          return { html: FETCH_FAILED, status: 0, redirectChain: chain, xRobotsTag: null };
        }
      }
    }
    if (response === null) {
      return { html: FETCH_FAILED, status: 0, redirectChain: chain, xRobotsTag: null };
    }

    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location !== null) {
      chain.push(location);
      current = new URL(location, current).toString();
      continue;
    }

    return {
      html: response.ok ? await response.text() : FETCH_FAILED,
      status: response.status,
      redirectChain: chain,
      xRobotsTag: response.headers.get("x-robots-tag"),
    };
  }

  return { html: FETCH_FAILED, status: 0, redirectChain: chain, xRobotsTag: null };
};

/**
 * The live-HTTP adapter over the same `SiteAuditInput` the dist adapter builds.
 *
 * One rule set, two sources: spec 03's validator grades the deployed site with
 * exactly the rules that gated the build, so the two can never disagree about
 * what "correct" means.
 */
export const httpPageSource = async (
  paths: readonly string[],
  options: HttpSourceOptions = {},
): Promise<SiteAuditInput> => {
  const baseUrl = (options.baseUrl ?? SITE_URL).replace(/\/+$/, "");
  const doFetch = options.fetch ?? globalThis.fetch;
  const retries = options.retries ?? 2;

  const pages: SitePage[] = [];
  for (const path of paths) {
    const url = `${baseUrl}${path}`;
    const fetched = await fetchPage(url, doFetch, retries);
    pages.push({
      file: path,
      path,
      url: toAbsoluteUrl(path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`),
      html: fetched.html,
      status: fetched.status,
      redirectChain: fetched.redirectChain,
      xRobotsTag: fetched.xRobotsTag,
    });
  }

  const asset = async (name: string): Promise<string | null> => {
    try {
      const response = await doFetch(`${baseUrl}/${name}`);
      return response.ok ? await response.text() : null;
    } catch {
      return null;
    }
  };

  return {
    pages,
    allPaths: new Set(paths),
    sitemapXml: await asset("sitemap.xml"),
    robotsTxt: await asset("robots.txt"),
  };
};

export const FETCH_FAILED_MARKER = FETCH_FAILED;
