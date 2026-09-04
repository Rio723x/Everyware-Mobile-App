# T-01-004 — `packages/seo-core` skeleton: branded primitives and site config

**Spec:** 02-technical-seo §3.1, §7 (`brand.ts`, `config.ts`)
**Depends on:** T-01-003
**Estimate:** ~1h

## What to build

Create the `packages/seo-core` workspace containing **only** its two foundational files.
Spec 02 fills in the rest; this ticket exists here because `packages/ghost` needs the branded
types and cannot depend on a package that does not exist yet.

`src/brand.ts`:

```ts
export type Slug = Brand<string, "Slug">;               // /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export type AbsoluteUrl = Brand<string, "AbsoluteUrl">; // https://, no fragment, no trailing slash
export type IsoDateTime = Brand<string, "IsoDateTime">; // full ISO-8601 with offset

export const toSlug: (value: string) => Slug;
export const toAbsoluteUrl: (value: string) => AbsoluteUrl;
export const toIsoDateTime: (value: Date | string) => IsoDateTime;
export const siteUrl: (path: string) => AbsoluteUrl;
```

Each factory throws an `Error` naming the offending value. `siteUrl` joins `PUBLIC_SITE_URL`
with a path, normalising duplicate and trailing slashes (the site root `/` is the one allowed
trailing slash).

`src/config.ts`: `SITE_URL`, `ORG_ID` (`https://everyware.in/#org`), `WEBSITE_ID`
(`https://everyware.in/#website`), `LOCALE` (`en-IN`), `POSTS_PER_PAGE` (12), and
`AI_USER_AGENTS` — the seven preserved crawler names from `apps/site/public/robots.txt`.

## Acceptance criteria

- [x] `toSlug` accepts `washing-machine-care`; rejects `Washing_Machine`, `-lead`, `trail-`, `a--b`, `""`.
- [x] `toAbsoluteUrl` accepts `https://everyware.in/blog/x`; rejects `http://…`, `/blog/x`,
      `https://everyware.in/blog/x/`, and anything containing `#` or `?`.
- [x] `toIsoDateTime` accepts a `Date` and a valid ISO string with offset; rejects `2026-09-04` and `""`.
- [x] `siteUrl("/blog")`, `siteUrl("blog")` and `siteUrl("//blog")` all return
      `https://everyware.in/blog`; `siteUrl("/")` returns `https://everyware.in/`.
- [x] Every rejection message includes the offending value.
- [x] `AI_USER_AGENTS` matches the current `apps/site/public/robots.txt` exactly — asserted by a
      test that reads that file.
- [x] `npm run typecheck`, `npm run lint`, `npm run test` exit 0.

## Status

**Done** — commit on `feat/everyware-blog-platform`. 36 tests.
