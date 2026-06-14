# @asmartbear/simplified

## Summary

Recursively reduces arbitrary JavaScript values to a normalized, JSON-like form (`Simple`) suitable for stable comparison, hashing, display, and serialization. This is a foundational, zero-runtime-dependency package (uses only Node's `crypto` and `util/types`); changes here ripple to `smarttype`, `dyn`, `filesystem`, and `testutil`, so be conservative with semantics.

## Key Concepts

- **`Simple`** is the target type: `undefined | null | boolean | number | string | Simple[] | { [key: string|number]: Simple }`. Note `undefined` is permitted as a value (unlike strict JSON) but is stripped from object/Map entries during simplification.
- **`Simplified<T>`** is a TypeScript-level mapping that mirrors what `simplify()` does at runtime, so callers get precise inferred output types. Self-referential types may not infer; use `simplifyOpaqueType()` to fall back to `Simple`.
- **`Simplifiable`** is the input-shape type that is guaranteed to round-trip cleanly.
- **Normalization rules** (all enforced by `simplify()`):
  - `number`: rounded to 4 decimal places; `-0` becomes `0`; `NaN` preserved.
  - `bigint`: becomes a `number` if within safe-integer range, otherwise a `string`.
  - `symbol`: becomes its `description` string.
  - `Date`: becomes `{ t: number }` (epoch ms).
  - `RegExp`, `URL`: become their `toString()`.
  - `Set`: simplified then sorted via `simplifiedCompare`.
  - `Map`: keys sorted; if all keys are string/number it becomes a plain object, otherwise an array of `[key, value]` pairs.
  - Plain objects: keys sorted; class instances get a `__class__: <ClassName>` field prepended.
  - `function`: encoded as `"<name>()"` on its own; silently dropped from object fields; class objects become their class name.
  - `Iterable` / generators / typed arrays: converted to arrays.

## Code Organization

Single-file implementation: `src/index.ts`. No subdirectories, no internal modules — everything is exported from the one file. Tests live in `test/index.test.ts`.

## Implementation Notes & Gotchas

- **Cycles**: `simplify()` takes an optional `skip: Set<any>` and threads it through recursion; any already-visited object is replaced with `null`. When editing, never bypass `skip.add(x)` before recursing into a container.
- **Promises throw**: `simplify()` deliberately throws on `Promise` inputs (the commented-out `simplifiedAwait` branch is intentionally disabled). Don't re-enable without coordinating with downstream packages.
- **`ISimplifiable`**: any object with a `toSimplified(): Simple` method overrides default handling. Checked before the generic object branch.
- **Sorting determinism**: `simplifiedCompare` orders by type first (undefined < null < boolean < number < string < array < object), then by value/length. Object key order in the output relies on JS preserving insertion order, and `simplify()` inserts entries already sorted — do not re-sort downstream consumers.
- **`__class__` field**: added for any non-plain object. Anything reading simplified output (e.g. `simplifiedToDisplay`) special-cases this key; keep that contract intact.
- **Hashing**: `simplifiedToHash` is MD5 of the JSON form. `simplifiedToKey` short-circuits for primitives and short (<=32 char) strings — change with care, as map/set semantics elsewhere depend on stability.
- **`simplifiedToJSON(undefined)`** intentionally returns `"null"`.

## Public API

Type helpers: `Simple`, `Simplified<T>`, `Simplifiable`, `ISimplifiable<T>`.

Predicates: `isSimple`, `isPlainObject`, `isClassObject`, `isIterable`, `getClassOf`.

Core: `simplify<T>(x, skip?)`, `simplifyOpaqueType(x)`.

Operations on `Simple`: `simplifiedCompare`, `simplifiedToJSON`, `simplifiedToDisplay`, `simplifiedJoin`, `simplifiedToHash`, `simplifiedToKey`.

Visitor: `abstract class SimplifiedWalker<T, ...>` — subclass and implement `doUndefined / doNull / doBoolean / doNumber / doString / doArray / doObject`; call `walk(x)`.

## Testing Notes

- Single Jest file `test/index.test.ts` (~460 lines) covers each predicate, every `simplify()` branch, the walker, comparison, JSON/display/join/hash/key conversions. When adding a normalization rule, add a case to the corresponding test block and a `simplifiedCompare` case if ordering is affected.
- Run with `npm test` from this dir; `npm run watch` for live coverage. Jest config is inline in `package.json`.
