# T-02-014 — Rules: document and heading structure

**Spec:** 02-technical-seo §6.3
**Depends on:** T-02-012
**Estimate:** ~1.5h

## What to build

`packages/seo-core/src/audit/rules/structure.ts`:

`html-lang`, `charset-viewport`, `h1-single`, `h1-non-empty`, `heading-order`, `img-alt`.

`heading-order` walks headings in document order and fails on any skipped level. `img-alt` requires
a non-empty `alt` unless the element carries `role="presentation"` or `aria-hidden="true"`.

This group overlaps T-01-017's structural suite deliberately: those assertions move here so there is
**one** implementation. Delete the duplicated assertions from T-01-017 and have it call the rule
engine instead.

## Acceptance criteria

- [ ] Each rule has a passing and a failing fixture.
- [ ] `heading-order` passes h1-h2-h3-h2-h3, fails h2-h4, and fails h1-h3.
- [ ] `img-alt` fails a missing `alt` and an empty `alt`, and passes an empty `alt` when
      `role="presentation"` is set.
- [ ] `h1-non-empty` fails an `<h1>` containing only whitespace or only an image with no alt.
- [ ] `charset-viewport` fails when either meta is absent.
- [ ] T-01-017's suite no longer contains its own copies of these checks — grep-asserted — and still
      passes by delegating to the rule engine.

## Status

Not started
