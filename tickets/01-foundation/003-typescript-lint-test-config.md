# T-01-003 — Shared TypeScript, lint and test configuration

**Spec:** 01-foundation D3, §9
**Depends on:** T-01-001
**Estimate:** ~1h

## What to build

The toolchain every new package inherits. No feature code.

1. `tsconfig.base.json` at the root: `strict: true`, **`noUncheckedIndexedAccess: true`**,
   `exactOptionalPropertyTypes: true`, `moduleResolution: "bundler"`, `target: "ES2022"`,
   `composite: true`, `declaration: true`, `verbatimModuleSyntax: true`.
2. Root ESLint flat config covering `**/*.ts`, `**/*.tsx`, `**/*.astro`, with
   `@typescript-eslint/no-explicit-any`, `@typescript-eslint/no-non-null-assertion` and
   `@typescript-eslint/consistent-type-assertions` (`assertionStyle: "never"`) at **error**.
   `apps/site/**` is excluded — it stays plain JSX and is not migrated.
3. Vitest at the root with a workspace-aware config so `npm run test` runs every package's tests.
4. Root scripts: `typecheck` (`tsc -b`), `lint`, `test`.
5. `.env.example` listing `GHOST_CONTENT_API_URL`, `GHOST_CONTENT_API_KEY`, `PUBLIC_SITE_URL`.

## Acceptance criteria

- [ ] `npm run typecheck` exits 0 on the empty workspace.
- [ ] `npm run lint` exits 0.
- [ ] `npm run test` exits 0 (no tests yet is a pass).
- [ ] A scratch file containing `const x: any = 1` fails `npm run lint` with `no-explicit-any`;
      one containing `foo!.bar` fails with `no-non-null-assertion`. Delete the scratch file after proving it.
- [ ] `apps/site/**` is untouched by lint and typecheck.

## Status

Not started
