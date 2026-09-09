import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@astrojs/react";
import { defineConfig } from "astro/config";
import { loadEnv } from "vite";

const here = dirname(fileURLToPath(import.meta.url));
const monorepoRoot = resolve(here, "../..");

/**
 * Load `.env` / `.env.local` from the monorepo root into `process.env`.
 *
 * Two mismatches make this necessary. Vite exposes env files through
 * `import.meta.env`, not `process.env` - and the build-time Ghost client is
 * plain Node that also runs from the SEO worker and the CLI, so it reads
 * `process.env`. Vite also looks only in the Astro project root, while the env
 * file belongs at the monorepo root next to `.env.example`.
 *
 * Real environment variables always win: on Vercel and in CI nothing is
 * overwritten, so a deployment cannot be silently redirected by a stray local
 * file.
 */
const fileEnv = loadEnv("", monorepoRoot, "");
for (const key of ["GHOST_CONTENT_API_URL", "GHOST_CONTENT_API_KEY", "PUBLIC_SITE_URL"]) {
  const value = fileEnv[key];
  if (process.env[key] === undefined && value !== undefined && value !== "") {
    process.env[key] = value;
  }
}

/**
 * Static output with no adapter, deliberately.
 *
 * An adapter would write to .vercel/output instead of dist/, which fights the
 * output-merging step that joins this app with the React SPA (spec 01, D5/§6.3).
 * The SEO worker's endpoints live in the repo-root api/ directory as native
 * Vercel Functions, which work alongside a static output directory.
 */
export default defineConfig({
  site: "https://everyware.in",
  output: "static",
  trailingSlash: "never",
  build: { format: "file" },
  integrations: [react()],
  vite: {
    resolve: {
      /**
       * Point the workspace packages at their TypeScript source explicitly.
       *
       * Those packages declare a `node` export condition resolving to `dist/`,
       * which is what lets plain-Node scripts import them. Vite's SSR resolver
       * also matches `node`, so without these aliases the build would demand
       * compiled output that does not exist on a clean checkout - and it failed
       * exactly that way on the first deploy.
       *
       * Aliasing here decouples the two consumers: the bundler always reads
       * source, Node always reads dist, and neither depends on the other having
       * been built first.
       */
      alias: {
        "@everyware/seo-core": resolve(monorepoRoot, "packages/seo-core/src/index.ts"),
        "@everyware/ghost": resolve(monorepoRoot, "packages/ghost/src/index.ts"),
      },
    },
  },
});
