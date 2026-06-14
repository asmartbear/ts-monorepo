# @asmartbear/env

## Summary

Tiny wrapper around [`dotenv`](https://www.npmjs.com/package/dotenv) that loads a `.env` file once per process and reads typed values from `process.env`. Consumed by other packages and apps in the monorepo that need a uniform way to require/default environment variables. The whole public surface is two functions and one sentinel — keep it that way unless there's a real reason to grow it.

## Key Concepts

- **Idempotent load**: `loadEnvironment()` uses a module-level `hasEnvironmentLoaded` flag so repeat calls are no-ops. Callers are expected to invoke it defensively at entry points rather than coordinate.
- **`THROW_IF_MISSING` sentinel**: A unique `Symbol` used in place of a default to signal "this var is required". Chosen over `null`/`undefined` so a caller can legitimately default to those values.
- **Typed defaults**: `getEnv<T>` returns `string | T` (with the sentinel excluded from the return type). The env value is always returned as a `string` if present; the default's type `T` only applies when the var is missing. No coercion happens — callers parse numbers/bools themselves.

## Code Organization

- `src/index.ts` — entire implementation (~50 lines). No subdirectories, no internal modules.
- `test/index.test.ts` — single test file exercising both functions.
- `.env` — committed test fixture (`foo=bar`). Intentionally committed; do not add real secrets here.

## Implementation Notes / Gotchas

- `dotenv` is loaded via `require('dotenv')` inside `loadEnvironment` (not a top-level `import`) so the dependency is only paid when actually used.
- `console.log` is monkey-patched to a no-op around the `dotenv.config()` call to suppress dotenv's startup banner, then restored in a `finally`. If you upgrade dotenv and it stops logging, this dance can be removed.
- The path is hardcoded to `.env` relative to `process.cwd()` — there is no support for `.env.local`, `.env.prod`, or custom paths (see the commented-out block in `loadEnvironment`). If you need env-specific files, extend the signature rather than silently changing behavior.
- `getEnv` treats empty string the same as missing (`if (!x)`), so `FOO=` will return the default. This is intentional but worth knowing.
- `hasEnvironmentLoaded` is module-scoped, so it's per-process. Tests that need to reset it would need a `jest.resetModules()` — currently no test does.

## Public API

Exported from `src/index.ts`:

- `loadEnvironment(): void` — load `.env` into `process.env`, once.
- `getEnv<T>(key: string, def: T | typeof THROW_IF_MISSING): string | T` — read a var; return the default if absent, or throw if `def === THROW_IF_MISSING`.
- `THROW_IF_MISSING: symbol` — sentinel for the required case.

## Testing Notes

- The `.env` fixture in the package root contains `foo=bar` and is what `test/index.test.ts` loads — keep that key/value in sync if you change the test.
- Tests assert the pre-load behavior (defaults / throw) **before** calling `loadEnvironment()`, then the post-load behavior. Order matters because the load flag is sticky for the process.
- `dotenv` resolves `.env` from `cwd`; Jest runs from the package root via `jest --runInBand`, so the fixture is found. If you ever add tests that change `cwd`, account for this.
