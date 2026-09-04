import { createGhostClient, type GhostClient } from "@everyware/ghost";

/**
 * Is this a deployment build, as opposed to someone building locally?
 *
 * `import.meta.env.PROD` is true for every `astro build`, including the one a
 * developer runs on a laptop with no Ghost credentials - so it is the wrong
 * signal. A deployment is identified by the CI environment itself, which is the
 * only place an empty blog would actually reach users.
 */
const isDeploymentBuild =
  process.env["VERCEL"] === "1" || process.env["CI"] === "true";

/**
 * The single Ghost client used across the whole build: one warning when
 * credentials are absent, and one place to change if the source ever moves.
 */
export const ghost: GhostClient = createGhostClient({
  url: process.env["GHOST_CONTENT_API_URL"],
  key: process.env["GHOST_CONTENT_API_KEY"],
  isProduction: isDeploymentBuild,
});
