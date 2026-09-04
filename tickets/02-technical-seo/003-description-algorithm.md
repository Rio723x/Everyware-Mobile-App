# T-02-003 — Deterministic description algorithm

**Spec:** 02-technical-seo §3.4 (Description)
**Depends on:** T-02-001
**Estimate:** ~1h

## What to build

`packages/seo-core/src/metadata/description.ts` implementing the five-step fallback chain:

1. Ghost `meta_description` when set and non-empty.
2. `custom_excerpt`.
3. `excerpt`.
4. The first 155 characters of `plaintext`, cut at the last word boundary, ellipsis appended.
5. Collapse whitespace, strip newlines, trim.

If the final result is shorter than 50 characters, **throw** with the slug in the message. A
20-character description is a content defect, and papering over it hides the defect from the editor.

Listing, category and author pages get their own deterministic descriptions built from the tag or
author name and the post count.

## Acceptance criteria

- [ ] Unit tests cover all five steps in order, each proven by a fixture that has the higher-priority
      fields empty.
- [ ] Whitespace collapsing: a source containing newlines and double spaces yields a single-spaced
      one-line string.
- [ ] Step 4 never splits a word and produces at most 160 characters including the ellipsis.
- [ ] A post whose every source is empty or too short throws an error containing its slug.
- [ ] Every non-throwing result is between 50 and 170 characters (Spec 02 rule `description-length`).
- [ ] Deterministic across repeated calls.

## Status

Not started
