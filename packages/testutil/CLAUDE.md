# @asmartbear/testutil

## Summary

Thin, type-safe wrappers around Jest's `expect` API designed to be shorter than raw Jest, accept an optional trailing `message` for context on failure, and—critically—use TypeScript `asserts` clauses so that after `T.defined(x)` or `T.isInstance(x, Foo)` the compiler narrows `x` for the rest of the test. Consumed as a devDependency by most other packages in the monorepo; conventionally imported as `import * as T from "@asmartbear/testutil"`.

## Key Concepts

- **Assertion helpers, not custom matchers.** Each function wraps `expect(...)` internally; nothing is registered via `expect.extend`. Callers use `T.be(x, y)` rather than `expect(x).toBe(y)`.
- **Type narrowing via `asserts`.** `be`, `eq`, `len`, `is`, `isInstance`, `defined`, `undef` all have `asserts` return types so subsequent code sees the narrowed type. This is the main ergonomic win over raw Jest.
- **Optional `message` parameter.** Every helper takes a trailing `message?: string`. On failure it's appended to the Jest error message via the catch-rethrow pattern (`e.message = \`${e.message}\n\n${message}\``).
- **Canonical-form comparison via `simplified`.** `isSimple` runs the value through `simplifyOpaqueType` + `simplifiedToDisplay` from `@asmartbear/simplified` so complex objects (including `Map`) compare as a stable, sorted string—this is why `@asmartbear/simplified` is a runtime `dependency`, not a devDependency.

## Code Organization

- `src/index.ts` — the entire package. One flat file of exported helper functions plus two type aliases (`ClassOf<T>`, `InstanceOf<C>`). No subdirectories.
- `test/index.test.ts` — meta-tests: the package's own helpers are tested by calling them on themselves (e.g. `T.throws(() => T.len(null, 0))`).
- `index.ts` at the package root does **not** exist — `main`/`types` point at `dist/index.js` / `dist/index.d.ts`.

## Implementation Notes / Gotchas

- **Jest is a peer dependency** (`>=29.0.0`, non-optional). The helpers reference the global `expect` directly; there is no import. Any consuming package must have Jest configured, or the helpers will throw `ReferenceError` at runtime.
- **`@asmartbear/simplified` is a runtime dep**, used only by `isSimple`. Don't move it to devDependencies even though it looks test-only — it ships in the published API.
- **Catch-rethrow pattern is repeated by hand** in every function. If adding a new helper, follow the same shape: `try { expect(...) } catch (e: any) { if (message) { e.message = \`${e.message}\n\n${message}\` } throw e }`. There is no shared wrapper.
- **`throws` distinguishes its own sentinel error via `cause: "unit test"`** so that the "expected to throw but didn't" error is rethrown rather than swallowed by its own catch block. Preserve this if editing.
- **`throwsAsync` currently does not check the error class** (unlike `throws`)—it only asserts that *something* threw. This is a known asymmetry, not a bug to fix unprompted.
- **`nearFields` falls back to `eq` on mismatch** so the failure message shows the whole object, not just one field.
- **`consoleLog` monkey-patches both `console.log` and `process.stdout.write`** because ts-jest replaces `console.log` with its own buffered version; restoring both in `finally` is required.
- **Jest config lives inline in `package.json`** with `moduleNameMapper` rewriting `@asmartbear/*` to sibling `src/` dirs—so meta-tests run against TypeScript source, not `dist/`.

## Public API

Comparisons (narrowing): `be`, `eq`, `ne`
Ordering (on `boolean | number | string | bigint`): `lt`, `le`, `gt`, `ge`
Existence / truthiness (narrowing): `is`, `defined`, `undef`, `isInstance`
Numbers: `near`, `nearFields`, `isInteger`
Collections / objects: `len` (works on `length` or `size`), `includes` (partial match)
Throwing: `throws`, `throwsAsync`
Display: `isSimple` (canonical-form comparison), `consoleLog` (captures stdout)
Types: `ClassOf<T>`, `InstanceOf<C>`

## Testing Notes

- `test/index.test.ts` is intentionally self-referential: helpers are used to test helpers (e.g. `T.throws(() => T.includes({}, { a: 1 }))` validates that `includes` actually throws on a missing key).
- When adding a new helper, add a meta-test that exercises both the success and failure paths via `T.throws(() => ...)`.
- Run via `npm test` from this directory (uses `jest --runInBand`); the monorepo's Turborepo `test` task also picks it up.
