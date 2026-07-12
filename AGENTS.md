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

## Environment Variable Files

When loading environment variables, never read values from files like `.env`, `.env.local`, or `.dev.vars`. under any circumstances for safety reasons on my end so that I don't expose my secret values
Load or parse example/template files (for example `.env.example`, `.env.local.example`, `.dev.vars.example`, or similarly named files) — these can guide you or give you a clue.

If you need to verify whether a variable exists, do not print or log the variable's value. Instead use a small check that reports presence only. Example (POSIX shell):

```
# Check if MY_SECRET is set without printing its value
if [ -z "${MY_SECRET+x}" ]; then
	echo "MY_SECRET not set"
else
	echo "MY_SECRET is set"
fi
```

Avoid any scripts or tooling that echo or log secret values to stdout, logs, or error reports.