# T-01-008 — Extract shared design tokens; blog base stylesheet

**Spec:** 01-foundation D7, §2.3
**Depends on:** T-01-007
**Estimate:** ~1h

## What to build

One token file, two consumers, so the blog and the marketing site can never drift.

1. Move the `:root` custom-property block **verbatim** from `apps/site/src/styles/index.css`
   lines 13-51 into `apps/blog/src/styles/tokens.css`.
2. Replace it in `apps/site/src/styles/index.css` with a single `@import` of that file. This is the
   **only** permitted content change under `apps/site/src` in the whole of Spec 01.
3. `apps/blog/src/styles/blog.css` — base blog rules built exclusively from those tokens:
   the `.container` semantics (max-width 1240px, 24px gutter), body background/colour/font,
   the Oxygen font link (mirroring `apps/site/index.html`), an article prose block capped at
   `72ch`, card grid breakpoints (1-up under 768px, 2-up from 768px, 3-up from 1100px), and a
   visible focus ring.
4. No hard-coded hex values, font stacks, radii or shadows in `blog.css` — token references only.

## Acceptance criteria

- [x] `apps/site` renders identically before and after: the token block in the built CSS from
      `npm run build -w apps/site` has unchanged values.
- [x] `git diff apps/site/src` shows exactly one changed file and one changed hunk (the `@import`).
- [x] `blog.css` contains no `#` hex literal — grep-asserted in a test.
- [x] Both apps build successfully.

## Status

**Done** — commit on `feat/everyware-blog-platform`. 4 tests here, 77 across the workspace.

### Deviation recorded

The tokens live in **`packages/tokens/tokens.css`**, not `apps/blog/src/styles/tokens.css`
as spec 01 D7 stated.

D7's requirement is "one file, two consumers, so they cannot drift", and that
still holds. What changed is where the file sits. Putting it inside `apps/blog`
would have made the marketing site `@import` a path inside the blog — a
dependency pointing from the established app into the newcomer, and a relative
`@import` crossing app boundaries that both dev servers would need filesystem
allowances for. A package is resolved identically by Vite and Astro, needs no
`server.fs.allow`, and points neither app at the other. Spec 01 D7 and §6.1 were
updated to match.

Two files under `apps/site` changed rather than one: `index.css` (a single hunk —
the `:root` block replaced by the `@import`) and `package.json` (one line adding
the `@everyware/tokens` dependency, without which the import cannot resolve).

**Strongest evidence the marketing site is unchanged:** the built stylesheet
kept its content hash — `assets/index-BvEmDpLJ.css` before and after — so the
emitted CSS is byte-identical, not merely equivalent.
