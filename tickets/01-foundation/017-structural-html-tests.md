# T-01-017 — Structural HTML assertion suite over the built output

**Spec:** 01-foundation §9 (Rendering)
**Depends on:** T-01-016
**Estimate:** ~2h

## What to build

A test suite that parses the **emitted HTML files** and asserts Spec 01's structural guarantees.
It must read `dist/**/*.html` with `linkedom` — never inspect Astro internals or component props.
This is the harness Spec 02's rule engine later extends, so keep the file-walking helper reusable.

Assertions, applied to every emitted blog page:

- exactly one `<h1>`, with non-whitespace text
- an `<article>` or `<main>` element
- a `<nav aria-label="Breadcrumb">`
- every `<time>` has a `datetime` attribute parseable by `Date.parse`
- every `<img>` has a non-empty `alt`
- heading levels never skip in document order
- at least one in-site link, and every in-site link resolves to a file the build emitted
- zero `<script>` tags

Plus, over the whole output: emitted article count equals `listPosts().length`; one file per public
tag; one file per author; `dist/404.html` exists.

## Acceptance criteria

- [x] `npm run test` runs the suite against a real `dist/` produced from fixtures and passes.
- [x] Each assertion has a negative test: a deliberately broken HTML fixture (two `<h1>`s, an
      `<img>` with no alt, an h2-to-h4 skip, a dangling internal link) fails the specific
      assertion, with the failing file path in the message.
- [x] The suite exits non-zero if `dist/` is missing, rather than passing vacuously.
- [x] The file-walking helper is exported for reuse by Spec 02.

## Status

**Done** — commit on `feat/everyware-blog-platform`. 184 tests across the workspace.

### Notes

- **The suite runs over the merged `dist/`**, not `apps/blog/dist`, so it grades
  the exact bytes a crawler would receive from the deployed site — both apps
  joined, cross-app links included.
- **The file walker lives in `packages/seo-core/src/dist-files.ts`**, not in the
  test folder, because spec 02's `DistPageSource` is built on it. The rule engine
  and this suite have to agree on what "the emitted pages" means; two
  implementations would eventually disagree about, for instance, whether
  `404.html` counts.
- **Every assertion has a negative test** in `structure-negative.test.ts`. An
  assertion never observed failing is a comment with a green tick next to it, so
  each one is given the defect it exists to catch — two `h1`s, an h2→h4 skip, a
  whitespace-only `alt`, an unparseable `datetime`, a dangling `/blog/typo-slug`,
  an orphan page, a stray `<script>` — plus the "no build" case, which throws
  rather than passing vacuously.
- `parseHTML` from **linkedom** does the parsing, which is what spec 02's rule
  engine also uses, so a rule written there will behave identically here.
