# @asmartbear/objectid

## Summary

A minimal (~250 byte) utility that assigns a stable, unique integer ID to any JavaScript object (including functions and arrays) without mutating it. Useful as a cheap identity hash for use in `Map` keys, memoization caches, debug logs, or anywhere you need to distinguish object instances by reference. The entire package is one default-exported function backed by a module-level `WeakMap` and an incrementing counter.

## Key concepts

- IDs are stored in a module-level `WeakMap<object, number>`, so attaching an ID does not mutate the object and is invisible to other code (no enumerable property, no symbol, no prototype change).
- Uniqueness is per-process and per-import: IDs are allocated from a single monotonically increasing counter starting at 1. `null` is a special case that always returns `0`.
- Because the `WeakMap` holds weak references to keys, IDs do not pin objects in memory — once the caller drops all references, the entry is GC'd. The counter never decrements, so reclaimed IDs are not reused.

## Code organization

- `src/index.ts` — the entire implementation (one function, ~10 lines of logic). There are no other source files; do not split it without a strong reason.
- `test/index.test.ts` — a single Jest test covering allocation, stability across repeated calls, and the `null` case.

## Implementation notes / gotchas

- Identity, not equality: two structurally-equal objects (`{a:1}` and `{a:1}`) get different IDs. This is by design — if you need value-based hashing, use a different library.
- The `WeakMap` lookup is atomic with GC, so the "check then set" sequence is safe; do not refactor to a pattern that holds the value across an `await` or microtask boundary in a way that assumes the entry still exists.
- Frozen / sealed objects work fine — `WeakMap` storage is external, so `Object.freeze` does not block ID assignment.
- Primitives are not supported. The TypeScript signature is `object | null`; passing a string/number is a type error and would throw at runtime inside `WeakMap.get`. If you ever loosen the signature, add an explicit guard.
- The counter is module-scoped, so each bundled copy of this package has its own ID space. Avoid duplicate installs in consumers that rely on cross-module ID consistency.
- IDs are not stable across process restarts and must not be persisted.

## Public API

```ts
export default function objectId(object: object | null): number
```

- Returns `0` for `null`.
- Returns the same positive integer for every subsequent call with the same object reference.
- Never returns the same positive integer for two distinct live object references.

## Testing notes

- Run with `npm test` from this package directory. The Jest config lives inline in `package.json` and maps `@asmartbear/*` imports to sibling package `src/` dirs.
- The current test relies on ID values `1..5` in a specific order. If you add tests in the same file (or change allocation order), expected IDs will shift because the counter is module-scoped and shared across the test file.
- GC behavior is not exercised by the test suite and is hard to test deterministically in Node; if you need to validate weak-reference behavior, use `--expose-gc` and `global.gc()` in a dedicated test.
