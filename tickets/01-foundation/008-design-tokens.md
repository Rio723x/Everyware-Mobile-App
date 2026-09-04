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

- [ ] `apps/site` renders identically before and after: the token block in the built CSS from
      `npm run build -w apps/site` has unchanged values.
- [ ] `git diff apps/site/src` shows exactly one changed file and one changed hunk (the `@import`).
- [ ] `blog.css` contains no `#` hex literal — grep-asserted in a test.
- [ ] Both apps build successfully.

## Status

Not started
