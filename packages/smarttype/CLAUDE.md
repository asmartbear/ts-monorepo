# smarttype

## Summary

`@asmartbear/smarttype` is the typed-data backbone for the monorepo. It defines `SmartType<T, J>`, an abstract class that bundles parsing/coercion, validation, JSON marshalling, native type-guards, a visitor pattern, and hashing/display for a single TS type `T` (with an associated JSON wire-shape `J`). Builders like `OBJ`, `ARRAY`, `OR`, `STR`, `NUM` etc. compose into a tree that gives you (a) a runtime validator, (b) an inferred TS type via `NativeFor<>` / `JsonFor<>`, and (c) lossless round-tripping through JSON for values JSON normally can't carry (Dates, NaN/Inf, undefined, RegExp, Map, Set, alternations). Conceptually similar to Zod/io-ts but designed around its own visitor + marshalling model.

## Key Concepts

- `SmartType<T, J extends JSONType>` (in `common.ts`) is THE base class. Every builder returns a subclass instance. `T` is the native TS type; `J` is the JSON-wire type — they often differ (e.g. `Date` <-> `number`, `RegExp` <-> `string`, `number` <-> `number | "NaN" | "Inf" | "-Inf"`).
- Core operations on every `SmartType`:
  - `input(x, strict=true): T` — parse/validate/transform an `unknown`. In non-strict mode types may coerce (e.g. `"42"` -> `42`, `true` -> `1`). Throws `ValidationError`.
  - `isOfType(x, deep?): x is T` — TS type-guard. Cheap by default; pass `deep=true` to recurse.
  - `toJSON(x) / fromJSON(js)` — marshal to/from a JSON-safe shape.
  - `visit(visitor, x)` — walk the type tree alongside data via `SmartTypeVisitor`.
  - `toSimplified(x?)` — uses `@asmartbear/simplified` for normalized display; calling without `x` returns the type's `description`.
  - `toHash(x)` — stable hash that normalizes field order and skips `undefined`.
  - `def(value)` — set a default used when this field is missing in an `OBJ`.
  - `transform(desc, resultType, fn)` and `transformSameType(desc, fn)` — build a new SmartType whose `input()` runs the upstream parse, then `fn`, then the result type's parse again. This is how validators like `STR().minLen(5)` and `NUM().min(0)` are layered — they all go through `transform`.
- Composition is by passing SmartTypes into builders (`ARRAY(STR())`, `OBJ({ id: STR(), n: NUM() })`, `OR(STR(), NUM())`, `OPT(STR())`). TS type inference flows through `NativeFor<>` so `OBJ({...}).input(x)` returns a properly-typed object.

## Code Organization (src/)

- `common.ts` — `SmartType` base class, `ValidationError`, `SmartTypeVisitor`, `NativeFor` / `JsonFor` / `NativeTupleFor` type-level helpers, `__DEFAULT_VALUE` symbol, `JSONType` union.
- Primitives: `undef.ts` (`UNDEF`), `null.ts` (`NIL`), `boolean.ts` (`BOOL`), `number.ts` (`NUM` — with `.min/.max/.clamp/.int`), `string.ts` (`STR`, plus `NONEMPTYSTR`, `JSID`, `WEBID`, `URL` and chainable `.minLen/.trim/.match/.replace/.transformByRegex`).
- `literal.ts` (`LITERAL(...vals)`) — one of a fixed primitive set.
- `alternation.ts` — `OR(...types)` (tagged union; JSON shape is `{t: description, x: ...}`) and `OPT(t)` which adds `undefined` to a type (idempotent — returns same instance if `canBeUndefined` already true).
- `array.ts` (`ARRAY`), `tuple.ts` (`TUPLE`), `set.ts` (`SET`), `map.ts` (`MAP(key, val)` — both keys and values are arbitrary SmartTypes; JSON is array of pairs).
- `fields.ts` — `OBJ(types, options?)` builds structured-record types. Carries `FieldOptions { ignoreExtraFields?: boolean }`. Has `.partial()` to wrap every field in `OPT`.
- `class.ts` — `CLASS(SomeClass)` validates `instanceof`; `toJSON`/`fromJSON` throw (opaque, non-marshallable).
- `date.ts` (`DATE` — JSON is `number` ms), `regexp.ts` (`REGEXP` — accepts `RegExp` or `"/pat/flags"` or plain pattern string; JSON is the string form).
- `reverse.ts` — `reverseEngineerType(x, options?)`: walks a runtime value and returns the matching `SmartType` (used for inferring schemas from sample objects). Uses `OR` for heterogeneous arrays/sets via `reverseEngineerSetOfTypes`.
- `index.ts` — barrel of all public exports.

## Implementation Notes & Gotchas

- **Error messages matter.** `ValidationError` carries `myMessage` plus a `path: string[]` that container types push to via `addPath()` on the way up the stack, yielding messages like `At key [user.address.zip]: Expected number but got string: "abc"`. When throwing inside a builder, pass `this` (the type) and the offending value so the error gets a `description`-based prefix. Recent commit "smart type error messages" — preserve that quality. Note the `simplifiedToDisplay(valueEncountered)` guarded by `isSimple()` — complex objects fall back to `String(x)` to avoid blow-ups.
- **`fromJSON` and `ignoreExtraFields`.** `OBJ` has TWO places that respect this option (see `fields.ts`):
  - `input()`: when `ignoreExtraFields === false` (strict), throws on unknown fields. Default (`undefined`/`true`) silently drops them.
  - `fromJSON()`: when `ignoreExtraFields` is truthy, unknown JSON fields are skipped; otherwise they throw. This was the focus of a recent commit ("Support 'ignoreExtraFields' with fromJSON() on an object") — keep both code paths in sync.
- **`transform` vs `toJSON`/marshalling.** `transform` produces a new `SmartType` by subclassing the result type and overriding `input()` only. It does NOT change `toJSON`/`fromJSON` — those still come from the result type. So `STR().minLen(5)` still serializes as a plain string. Marshalling is purely about the wire shape; transforms are validation/coercion of `input()`.
- **Defaults via `def()`.** Stored on the symbol `__DEFAULT_VALUE`. `OBJ.input()` applies defaults only when the field is missing AND the type is not `canBeUndefined`. Defaults are forwarded across `transform()` via the `[__DEFAULT_VALUE] = upstream[__DEFAULT_VALUE]` in the wrapped subclass.
- **Optional fields.** `OPT(t)` flips `canBeUndefined`, which in turn makes `OBJ.input()` tolerate missing keys and flows through to the `NativeFor<>` mapped type to make the field optional in TS. JSON-side uses the sentinel string `JS_UNDEFINED_SIGNAL = "__undefined__"` since JSON has no `undefined`.
- **Numbers in JSON.** `NUM` serializes `NaN`/`±Infinity` as the strings `"NaN"`/`"Inf"`/`"-Inf"` and reverses on `fromJSON`. Don't "fix" this to plain numbers.
- **Alternation JSON shape.** `OR` writes `{t: <description>, x: <inner JSON>}`; `fromJSON` matches by `description`. This means descriptions are load-bearing — changing a `description` string is a wire-format break.
- **`CLASS` is opaque.** No `toJSON` round-trip; throws if you try. Use it for runtime-only objects.
- **Strict vs non-strict.** `strict=true` is the default for `input()`. Non-strict enables coercions like string-to-number, boolean-to-number, `String(x)` fallback for strings, etc. Once inside a `transform`, the inner re-validation always runs `strict=true` to avoid double-coercion.
- **`reverseEngineerType` empty collections.** Throws on empty arrays/sets/maps — there's nothing to infer from.

## Public API

Re-exported from `index.ts`: types `SmartType`, `ValidationError`, `NativeFor`, `JsonFor`, `JSONObject`, `JSONType`; builders `UNDEF`, `NIL`, `BOOL`, `NUM`, `STR`, `NONEMPTYSTR`, `JSID`, `WEBID`, `URL`, `LITERAL`, `OR`, `OPT`, `ARRAY`, `TUPLE`, `OBJ`, `SET`, `MAP`, `CLASS`, `DATE`, `REGEXP`; and `reverseEngineerType`. Convention: builders are SHOUTY_SNAKE because they read like a mini-DSL when nested.

## Testing

- Jest with `ts-jest`; `npm test` runs `jest --runInBand`. Tests live in `test/` (not co-located).
- `test/testutil.ts` provides assertion helpers used throughout: `be`, `eq`, `is`, `defined`, `undef`, `len`, `isInstance`, `throws(fn, ErrClass)`, `near`, `nearFields`, `isInteger`. Prefer these over raw `expect()` — they double as TS assertion functions that narrow types.
- When adding a new builder, cover: strict + non-strict `input()`, `isOfType` shallow + deep, `toJSON` -> `fromJSON` round-trip, visitor dispatch, and `ValidationError` path accumulation inside a containing `OBJ`/`ARRAY`. See `obj.test.ts` for the `ignoreExtraFields` matrix.
