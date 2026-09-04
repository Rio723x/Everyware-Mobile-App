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

- [x] `npm run build` from the repo root produces `dist/index.html` (the SPA), `dist/blog.html`,
      and one `dist/blog/<slug>.html` per fixture post.
- [x] The merge reports zero collisions on a clean tree.
- [x] Planting a deliberate collision (e.g. `apps/site/public/blog.html`) makes the build exit
      non-zero and print that path. Remove the plant afterwards.
- [x] `npx serve dist` then: `/` loads the SPA; `#experiences/3` and `#info` still work;
      `/blog` and `/blog/<slug>` load the blog.
- [x] `dist/assets/` (Vite) and `dist/_astro/` (Astro) both exist and do not overlap.
- [ ] `vercel.json` is valid JSON and is picked up by a preview deployment.
      **Half-verified:** the JSON is valid and the local merged output is correct,
      but no preview deployment exists yet. Vercel project settings (Framework
      Preset → Other) still need changing by hand. Both land in T-01-018.

## Status

**Done in the repo** — commit on `feat/everyware-blog-platform`. One dashboard
change is outstanding and belongs to T-01-018.

### Verified

- `npm run build` from the root: 25 blog files + 18 site files = **43 in `dist/`,
  0 collisions**.
- **The collision guard bites.** Planting `apps/site/public/blog.html` fails the
  build with exit 1 and prints `1 path(s) are claimed by both apps: - blog.html`.
- Serving the merged `dist/`: `/` is the SPA (still loading its own
  `assets/index-*.js`), and `/blog`, `/blog/<slug>`, `/blog/category/<slug>`,
  `/blog/author/<slug>` and `/blog/page/2` all return **200 with zero redirects**
  — the no-trailing-slash promise in D6 holding in practice. An unknown path
  returns 404.
- `dist/assets/` (Vite) and `dist/_astro/` (Astro) coexist and do not overlap.

### Bug found and fixed while writing this

The first `listFiles` implementation relativised paths *inside* the recursion,
so every nested file came back as a bare filename with its directory prefix
stripped — the merge then tried to copy `assets/x.png` from the repo root and
crashed. Fixed by walking to absolute paths and relativising once at the top.
Worth noting because the failure mode was loud; a version that silently
flattened `assets/` into `dist/` would have shipped a broken site.
