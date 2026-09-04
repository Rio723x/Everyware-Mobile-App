import react from "@astrojs/react";
import { defineConfig } from "astro/config";

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
});
