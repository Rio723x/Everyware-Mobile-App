import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

/**
 * Flat config for the Everyware monorepo.
 *
 * apps/site is deliberately excluded: it stays plain JSX and is never migrated
 * to TypeScript (spec 01, D3). Linting it here would produce noise on code this
 * project is contractually not changing.
 */
export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/.astro/**",
      "**/.vercel/**",
      "apps/site/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.mts"],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      // Spec 01 D3: untrusted input enters as `unknown` and is parsed with zod.
      "@typescript-eslint/no-explicit-any": "error",
      // Invariants are checked at runtime, not asserted away.
      "@typescript-eslint/no-non-null-assertion": "error",
      // Type assertions are reserved for branded-type factories, which use
      // an eslint-disable with a stated invariant.
      "@typescript-eslint/consistent-type-assertions": [
        "error",
        { assertionStyle: "never" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["**/*.js", "**/*.mjs"],
    languageOptions: { globals: { ...globals.node } },
  },
);
