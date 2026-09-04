# T-01-007 — `apps/blog` Astro scaffold and content client wiring

**Spec:** 01-foundation D5, D6, §5.2, §6.1
**Depends on:** T-01-006
**Estimate:** ~1h

## What to build

1. `apps/blog` workspace: `astro`, `@astrojs/react`, `react`, `react-dom`, plus workspace
   dependencies on `packages/ghost` and `packages/seo-core`.
2. `astro.config.ts` exactly per Spec 01 §5.2: site `https://everyware.in`, output `static`,
   trailingSlash `never`, build format `file`, integrations `[react()]`.
   **No Vercel adapter** — D5 explains why; adding one breaks the dist merge in T-01-016.
3. `apps/blog/tsconfig.json` extending `tsconfig.base.json` plus Astro's strict preset.
4. `src/lib/content.ts` — creates the single `GhostClient` instance used by every page at build time.
5. A temporary `src/pages/blog/index.astro` listing post titles as plain text, purely to prove the
   pipeline end to end. T-01-011 replaces it.
6. Root scripts: `dev:blog`, and `astro check` wired into `npm run typecheck`.

## Acceptance criteria

- [x] `npm run dev:blog` serves `/blog` on port 4321 and lists the fixture post titles **with no
      Ghost credentials present**.
- [x] `npm run build -w apps/blog` emits `apps/blog/dist/blog.html`.
- [x] The emitted path is `blog.html`, not `blog/index.html` or `blog/index/index.html` —
      confirming the file format and no-trailing-slash settings.
- [x] `npm run typecheck` runs `astro check` and exits 0.
- [x] `apps/blog/dist` contains no `.vercel` directory.

## Status

**Done** — commit on `feat/everyware-blog-platform`.

### Corrections and notes

1. **Emitted filename corrected across spec 01 and the affected tickets.**
   With `build.format: "file"`, `pages/blog/index.astro` emits `dist/blog.html`,
   not `dist/blog/index.html` as spec 01 D6 originally stated. The **URL** is
   `/blog` either way, which is what the decision actually turned on, so the
   correction is to the filename column only. Spec 01 D6, its merge-script
   assertion and its DoD, plus tickets 01-011, 01-016, 02-012 and 02-016, were
   all updated in the same commit.

2. **Astro version.** Pinned to `^5.14.1`, resolving to 5.18.2. Astro 7.3.1 is
   published. Nothing here depends on staying on 5 and the config surface this
   project uses is four options wide, so the upgrade is cheap whenever it is
   wanted — flagged for a decision rather than taken silently.

3. `astro check` reports 0 errors and is wired into `npm run typecheck`.
   `.astro` linting from T-01-003 is now in place, as promised there.

4. The React integration emits an unreferenced `_astro/client.*.js` chunk.
   No blog page links to it and the emitted HTML contains zero `<script>` tags;
   it disappears from the output the moment a real island exists or if the
   integration is dropped.
