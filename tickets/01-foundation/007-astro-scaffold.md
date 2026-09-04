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

- [ ] `npm run dev:blog` serves `/blog` on port 4321 and lists the fixture post titles **with no
      Ghost credentials present**.
- [ ] `npm run build -w apps/blog` emits `apps/blog/dist/blog/index.html`.
- [ ] The emitted path is `blog/index.html`, not `blog/index/index.html` — confirming the file
      format and no-trailing-slash settings.
- [ ] `npm run typecheck` runs `astro check` and exits 0.
- [ ] `apps/blog/dist` contains no `.vercel` directory.

## Status

Not started
