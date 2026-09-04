# T-01-016 — `merge-dist` script, `vercel.json`, root build pipeline

**Spec:** 01-foundation D1, D6, §6.3
**Depends on:** T-01-015
**Estimate:** ~1.5h

## What to build

The step that makes the routing boundary real: two build outputs merged into one deployable
directory, with collisions treated as build failures.

1. `scripts/merge-dist.mjs`:
   - Empty `./dist`.
   - Copy `apps/blog/dist/**` into `dist/` **first** — Astro wins any contested path, which is what
     implements the migration path in Spec 01 D1.
   - Copy `apps/site/dist/**` into `dist/`, **skipping** any path that already exists, then
     **exit non-zero listing every skipped path**. A collision means the two apps are fighting for
     a URL; that must be loud, never a silent overwrite.
   - Assert `dist/index.html`, `dist/blog.html` and at least one `dist/blog/*.html` exist.
2. Root `build` script: `npm run build -w apps/site && npm run build -w apps/blog && node scripts/merge-dist.mjs`.
3. `vercel.json`: `buildCommand: "npm run build"`, `outputDirectory: "dist"`, `cleanUrls: true`,
   `trailingSlash: false`.
4. Update the Vercel project: Framework Preset **Other** (auto-detection now guesses wrong),
   Install Command `npm install`.

## Acceptance criteria

- [ ] `npm run build` from the repo root produces `dist/index.html` (the SPA), `dist/blog.html`,
      and one `dist/blog/<slug>.html` per fixture post.
- [ ] The merge reports zero collisions on a clean tree.
- [ ] Planting a deliberate collision (e.g. `apps/site/public/blog.html`) makes the build exit
      non-zero and print that path. Remove the plant afterwards.
- [ ] `npx serve dist` then: `/` loads the SPA; `#experiences/3` and `#info` still work;
      `/blog` and `/blog/<slug>` load the blog.
- [ ] `dist/assets/` (Vite) and `dist/_astro/` (Astro) both exist and do not overlap.
- [ ] `vercel.json` is valid JSON and is picked up by a preview deployment.

## Status

Not started
