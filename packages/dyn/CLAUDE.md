# @asmartbear/dyn

## Summary

Foundational, dependency-free collection of small TypeScript helpers for working with arrays, iterables, objects, Maps/Sets, and conditional/async control flow. Every helper is designed to gracefully accept `null`/`undefined` and to produce well-narrowed TypeScript types. Consumed widely by other packages in this monorepo as a base utility layer; treat it like a "stdlib extension" and avoid introducing churn in its public API.

## Key Concepts

- **Uppercase function names** (`ARRAY`, `MAP`, `FOREACH`, `LEN`, `IF`, `WITH`, ...) are the convention here. They read as "macros" / language-level primitives at call sites. Keep that style for any new export.
- **`a` prefix** marks async variants (`aMAP`, `aFIND`, `aIFELSE`, `aJOIN`, `aWITH`, `aANY`, `aMAX`) — they accept `MaybePromise<T>` callbacks. `THEN`/`THEN2`/`THEN3` are the building blocks that avoid wrapping non-promises in a Promise.
- **`ArrayLike<T>` (local type)** = `T[] | Iterable<T> | Nullish`. Most functions accept it and silently treat nullish as empty. This is the central design choice: callers never have to null-check.
- **Type-narrowing helpers**: `FALSEY`/`TRUTHY` (with `Falsey<T>`/`Truthy<T>` mapped types), `NOT_EMPTY` (is-narrowing), `NARROW` (filter that preserves a `x is U` predicate), `isIterable`/`isIterator`, `NEVER` (exhaustiveness assertion).
- **Generic inference tricks**: `FROM_ENTRIES` uses `const PAIRS extends readonly (readonly [string, any])[]` plus a mapped type to produce a precise object type from a tuple literal. `FOREACH` uses overload stacks to specialize iteration over `Map`, `Iterable`, `Record`, and plain objects. Be careful changing overload order — it affects inference.

## Code Organization

Single file: `src/index.ts` (~666 lines). Tests in `test/index.test.ts`. There is intentionally no module split — keep additions in `index.ts` unless it grows significantly larger. The package.json's `coveragePathIgnorePatterns` references `/src/util.ts`, which doesn't currently exist (harmless leftover).

Rough sections inside `index.ts`:
- Type aliases: `Nullish`, `FalseyValue`, `Falsey`/`Truthy`, `Comparable`, `MaybePromise`, `Callable`, `NotFunction`, `KeysOf`, `ValuesOf`, `ClassOf`.
- Predicates / coercion: `isCallable`, `isIterator`, `isIterable`, `FALSEY`, `TRUTHY`, `ARRAY`, `ITER`, `LEN`, `NOT_EMPTY`, `AT`.
- Object/Map helpers: `KEYS`, `VALUES`, `ENTRIES`, `FROM_ENTRIES`, `OMAP`, `FIELD`, `FIELD_DOT`, `fieldListFromDotString`.
- Iteration / transform: `FOREACH`, `MAP`/`aMAP`, `JOIN`/`aJOIN`, `FILTER`, `NARROW`, `SORT`, `DEDUP`, `AVERAGE`.
- Search / aggregate: `FIND`/`aFIND`, `FIND_LAST`, `FIRST`, `EVERY`, `ANY`/`aANY`, `MAX`/`aMAX`, `MIN`, `MIN_N`, `FIND_SMALLEST`.
- Control-flow: `IF`, `IFELSE`/`aIFELSE`, `WHILE`, `WITH`/`aWITH`, `THEN`/`THEN2`/`THEN3`, `ALL`, `NOOP`, `NEVER`, `ARRAY_OF`, `ARRAY_OF_DYN`.

## Implementation Notes / Gotchas

- **Nullish-tolerance is non-negotiable.** Every public function that accepts a collection must handle `null`/`undefined` as an empty input. Don't add helpers that throw on nullish.
- **Iterables, not arrays, in signatures** when reading: lets callers pass `Set`/`Map`/generators without realizing them into arrays. Only materialize (`ARRAY(...)`) when the algorithm genuinely needs random access or sorting (see `SORT`, `FILTER`, `MIN_N`).
- **`MAP` filters `undefined` outputs.** This is intentional — combines map+filter. Returning `null` does NOT filter. Same convention in `aMAP`, `JOIN`, `aJOIN`, `OMAP`-adjacent helpers.
- **`EVERY` takes an explicit `resultIfEmpty`** because the set-theoretic `true` is rarely what callers want. Don't default it.
- **`FOREACH` overload caveat**: with a `Map`, callback is `(value, key)`; with a plain object, callback is `(value, key)` with `key: keyof T`; with an `Iterable`, the "key" is a numeric index. The runtime branch keys off `Array.isArray` / `instanceof Map` / `isIterable` / else-object. Adding new container shapes means extending both overloads and runtime.
- **`AT` overloads** exist primarily so passing a nullish array narrows the result to `undefined`. Preserve the overload order.
- **`LEN` on a bare iterable** must materialize it (`Array.from`) — O(n) and consumes the iterator. Document at the call site if perf-sensitive.
- **`FIND_LAST`** uses `Array.prototype.findLast` fast path on arrays; on iterables it must walk the entire sequence.
- **`istanbul ignore next`** is used on `NEVER` and the `THEN*` helpers to keep coverage clean — these branches are exercised only in error paths or via Promise vs sync split.
- **No imports in src/index.ts.** The package.json declares runtime deps (`sqlite`, `sqlite3`, `gray-matter`, `js-yaml`, `async-mutex`, `tiny-invariant`, `@asmartbear/filesystem`, `@asmartbear/simplified`) that this code does not actually use. Treat these as vestigial — do not start importing them here; if you need any of that functionality, it belongs in a different package. Cleaning them up is a separate task that would shrink the install footprint for every downstream consumer.

## Public API

Everything is exported from `src/index.ts` (which becomes the package root). Consumers idiomatically do `import * as D from "@asmartbear/dyn"` and call `D.MAP(...)`, `D.IF(...)`, etc. Because this package sits at the bottom of the dep graph, API breakage cascades widely — prefer additive changes and new overloads over renaming or changing signatures.

## Dependencies

The only dev-time dep used in practice is `@asmartbear/testutil` (test helpers). See the gotcha above about unused runtime deps. There is a `benchmark` devDep but no benchmark scripts are currently wired up.

## Testing

- Single test file `test/index.test.ts` (~554 lines) exercises each helper. When adding a new export, add a matching `describe` block — tests here are the de-facto spec.
- Jest config in `package.json` overrides `tsconfig.composite=false` so ts-jest can run against this composite-project tsconfig. Don't remove that override.
- `moduleNameMapper` rewrites `@asmartbear/*` to sibling `packages/*/src` so tests pick up live source from other workspace packages without a build step.
