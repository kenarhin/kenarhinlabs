## Code Documentation Standards

Whenever you generate, refactor, or explain code, you must include clear, meaningful, and structured comments. Follow these specific guidelines for all code blocks:

1. **Document Purpose:** Begin every major function, class, or script with a concise docstring or block comment explaining its overall purpose, inputs (parameters), and outputs (return values).
2. **Inline Explanations:** Place inline comments before complex logic, mathematical formulas, conditional branches, or non-obvious algorithms to explain *why* the code is written that way, not just *what* it does.
3. **Keep it Clean:** Avoid commenting on self-explanatory or trivial lines of code (e.g., do not comment `x = 5 // sets x to 5`). Focus on readability and logic flow.
4. **Consistency:** Match the native commenting conventions of the programming language being used (e.g., JSDoc for JavaScript, PEP 257 for Python, standard summary tags for C#/.NET).

## Package Runner Usage

Avoid using `npx` for any command. In this environment, `npx` can fail with `EBADDEVENGINES` because the required package manager is `pnpm`, so use `pnpm dlx` instead for any on-demand package execution.

## Command Line Tool Usage

When using the Wrangler CLI tool, always use `pnpm dlx wrangler` as the command prefix instead of alternative approaches like `node wrangler exec`. This ensures proper dependency resolution and consistent behavior across different environments.

Examples:
- ✅ `pnpm dlx wrangler deploy`
- ✅ `pnpm dlx wrangler dev`
- ❌ `node wrangler exec`
- ❌ `wrangler exec`