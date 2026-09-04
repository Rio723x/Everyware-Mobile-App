# T-02-013 — Rules: title, description, canonical, robots

**Spec:** 02-technical-seo §6.3
**Depends on:** T-02-012
**Estimate:** ~2h

## What to build

The first twelve rules, in `packages/seo-core/src/audit/rules/head.ts`:

`title-present`, `title-length` (10-70), `title-optimal` (15-60, warning), `title-unique`,
`description-present`, `description-length` (50-170), `description-optimal` (70-160, warning),
`description-unique`, `canonical-present`, `canonical-absolute`, `canonical-self`,
`canonical-no-trailing-slash`, `robots-not-noindex`, `robots-directives` (warning).

`title-unique` and `description-unique` are cross-page checks: they need the whole page set, so
they run in the site pass and attribute their failure to **both** colliding URLs.

Every failure message must state the **observed value** ("title is 74 characters: '...'"), because a
message that only says "title-length failed" costs the next engineer a debugging session.

## Acceptance criteria

- [ ] Each of the 14 rules has a passing fixture and at least one failing fixture.
- [ ] Boundary tests: a 10-character title passes `title-length`, a 9-character one fails; 70 passes,
      71 fails. Same for description at 50/49 and 170/171.
- [ ] `canonical-self` fails when the canonical differs from the page's own URL, and the message
      shows both values.
- [ ] `canonical-no-trailing-slash` fails on `https://everyware.in/blog/x/` and passes on the root.
- [ ] `robots-not-noindex` detects `noindex` in a `<meta name="robots">` regardless of casing,
      spacing, or its position in a comma-separated list.
- [ ] Two pages with the same title both fail `title-unique`, and both URLs appear in the messages.
- [ ] Every failure message contains the observed value — asserted generically across the group.

## Status

Not started
