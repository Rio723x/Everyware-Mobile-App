# T-01-001 — Convert repo to npm workspaces and move the app to `apps/site`

**Spec:** 01-foundation D2, §6.1
**Depends on:** none
**Estimate:** ~1.5h

## What to build

Turn the repo root into an npm workspace root and relocate the existing React/Vite app into
`apps/site` **without changing a single line of its source**.

1. `git mv` into `apps/site/`: `index.html`, `package.json`, `package-lock.json`, `vite.config.js`,
   `src/`, `public/`, `script.js`, `style.css`, and the loose image/video assets at the repo root.
   Leave the markdown planning docs, `specs/`, `tickets/` and `.gitignore` at the root.
2. New root `package.json`: `"private": true`, `"workspaces": ["apps/*", "packages/*", "services/*"]`,
   and orchestration scripts only — no application dependencies:
   `dev:site`, `dev:blog` (stub for now), `build` (currently just `npm run build -w apps/site`),
   `typecheck`, `test`.
3. Extend `.gitignore` with `dist/`, `.astro/`, `.seo-store/`, `.vercel/`.

Do the move as a pure rename commit. Any content edit belongs in a later ticket.

## Acceptance criteria

- [ ] `npm install` at the repo root succeeds and links `apps/site`.
- [ ] `npm run dev:site` starts Vite on port 3000 and the site renders exactly as before.
- [ ] `npm run build -w apps/site` produces `apps/site/dist/index.html` plus `assets/`.
- [ ] `git log --follow apps/site/src/App.jsx` shows the pre-move history.
- [ ] `git diff --find-renames HEAD~1 -- apps/site` reports renames only — **zero content changes**.
- [ ] `apps/site/public/robots.txt` and `apps/site/public/sitemap.xml` still exist untouched
      (Spec 02 deletes them later).

## Status

Not started
