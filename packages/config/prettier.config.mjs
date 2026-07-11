/**
 * Shared Prettier configuration for the Ken Arhin Labs monorepo.
 *
 * @see https://prettier.io/docs/configuration
 * @type {import("prettier").Config}
 */
const config = {
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: false,
  trailingComma: "all",
  bracketSpacing: true,
  arrowParens: "always",
  proseWrap: "always",
  endOfLine: "lf",
  overrides: [
    {
      // This editor validates the standalone D1 config as strict JSONC and flags trailing commas.
      files: "packages/db/wrangler.d1.jsonc",
      options: { trailingComma: "none" },
    },
  ],
};

export default config;
