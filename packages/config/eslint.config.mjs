// @ts-check

import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * Shared correctness-focused ESLint configuration for backend TypeScript and
 * repository JavaScript. Formatting remains Prettier's responsibility.
 */
export const baseConfig = defineConfig(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.astro/**",
      "**/.wrangler/**",
      "**/coverage/**",
      "**/*.d.ts",
      "**/*.gen.*",
    ],
  },
  {
    files: ["**/*.{js,cjs,mjs,ts,cts,mts}"],
    extends: [js.configs.recommended, tseslint.configs.recommended, tseslint.configs.stylistic],
    languageOptions: {
      ecmaVersion: "latest",
      globals: {
        ...globals.node,
        ...globals.worker,
      },
      sourceType: "module",
    },
    linterOptions: {
      reportUnusedDisableDirectives: "error",
    },
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-duplicate-imports": "error",
      "no-warning-comments": ["warn", { terms: ["fixme"], location: "anywhere" }],
      "prefer-const": "error",
    },
  },
  eslintConfigPrettier,
);

export default baseConfig;
