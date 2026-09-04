import { HttpGhostClient } from "./http-client.js";
import { InMemoryGhostClient } from "./memory-client.js";
import type { GhostClient } from "./types.js";

export interface CreateGhostClientOptions {
  readonly url?: string | undefined;
  readonly key?: string | undefined;
  /** Defaults to `process.env.NODE_ENV === "production"`. */
  readonly isProduction?: boolean;
  readonly warn?: (message: string) => void;
}

export class GhostConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GhostConfigurationError";
  }
}

/**
 * Chooses an adapter from configuration.
 *
 * Missing credentials in development is a convenience: the blog builds from
 * fixtures so nobody needs a CMS to work on a template. Missing credentials in
 * a production build is a hard failure, because the alternative is deploying an
 * empty blog that looks like a successful build - the worst possible outcome,
 * since nothing alerts and every URL 404s.
 */
export const createGhostClient = (options: CreateGhostClientOptions = {}): GhostClient => {
  const url = options.url ?? process.env["GHOST_CONTENT_API_URL"];
  const key = options.key ?? process.env["GHOST_CONTENT_API_KEY"];
  const isProduction = options.isProduction ?? process.env["NODE_ENV"] === "production";
  const warn = options.warn ?? ((message: string) => console.warn(message));

  if (url !== undefined && url !== "" && key !== undefined && key !== "") {
    return new HttpGhostClient({ url, key });
  }

  if (isProduction) {
    throw new GhostConfigurationError(
      "GHOST_CONTENT_API_URL and GHOST_CONTENT_API_KEY are required for a production build. " +
        "Refusing to build the blog from fixtures - that would deploy an empty blog as a green build.",
    );
  }

  warn(
    "[@everyware/ghost] No Ghost credentials found - building the blog from committed fixtures. " +
      "Set GHOST_CONTENT_API_URL and GHOST_CONTENT_API_KEY to use live content.",
  );
  return new InMemoryGhostClient();
};
