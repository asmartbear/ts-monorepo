# @asmartbear/proxy-object

## Summary

Provides drop-in replacements for `Array`, `Set`, `Map`, and plain `object` that look and behave exactly like the natives (per the TypeScript / ECMAScript spec, including edge cases) but delegate mutating operations to a small user-supplied implementation interface. This lets an alternative backing store (CRDT, opcode log, event emitter, sync engine, etc.) sit underneath without forcing callers off familiar built-in APIs.

## Key Concepts

- **Delegation, not inheritance**: each Proxy* class wraps an `IXxxImplementation` interface with a minimal mutation vocabulary (`add` / `delete` / `update` / `insert` / `set` / `append` / `elements`). The Proxy class handles the messy parts of the JS spec (index normalization, out-of-bounds checks, has-before-delete, init-from-iterable) and only calls the impl for the few primitive operations it actually needs.
- **Why**: callers want to write idiomatic `arr.push(x)`, `set.add(x)`, `obj.foo = 1`, `delete obj.foo` while the library author needs hooks for every mutation. Native subclassing alone doesn't catch property assignment / deletion on plain objects, hence the JS `Proxy`.
- **Mimicked built-ins**: `Array` (full and append-only variants), `Set`, `Map`, and generic `object`.

## Code Organization (`src/`)

- `index.ts` — re-exports all public symbols.
- `array.ts` — `ProxyArrayAppendOnly` (push-only) and `ProxyArray` (full mutation), plus their `IArrayAppendOnlyImplementation` / `IArrayImplementation` interfaces. Uses both `extends Array` AND a JS `Proxy` (the class instance doubles as the proxy handler via `set` trap).
- `set.ts` — `ProxySet extends Set` with `ISetImplementation`. No JS Proxy needed; just overrides `add` / `delete` / `clear`.
- `map.ts` — `ProxyMap extends Map` with `IMapImplementation` (note `add` vs `update` distinction). Overrides `set` / `delete` / `clear`.
- `obj.ts` — `ProxyObject` uses a JS `Proxy` with `defineProperty` and `deleteProperty` traps; not a class instance returned to caller (a Proxy over `{}` is returned by `ProxyObject.from(impl)`).

## Implementation Notes / Gotchas

- **Array uses BOTH `extends Array` and JS `Proxy`**: the class instance is its own proxy handler (passed as second arg to `new Proxy`). The handler's `set` trap distinguishes user assignment (`arr[i] = x`, must notify impl) from internal writes done by `super.push/pop/splice` (which must NOT re-notify). This is gated by a shared `state.proxyActive` flag toggled around each `super.*` call. Preserve this pattern when adding new mutators.
- **`Symbol.species` returns `Array`** on `ProxyArrayAppendOnly` so `map`/`filter`/`slice` return plain arrays, not wrapped ones — important to avoid leaking the proxy to derived results.
- **`ProxyArrayAppendOnly` rejects any non-push mutation** in its `set` trap; `ProxyArray` overrides `set` to permit in-bounds index assignment (calls `impl.set(idx, x)`) and rejects out-of-bounds / non-numeric keys.
- **Index parsing**: `ProxyArray.asIndex` uses `parseInt`; `normalizeStart` / `normalizeSpan` implement spec-compliant `splice` clamping (negative start from end, undefined deleteCount = "to end").
- **Set / Map / Object init**: constructors / `from()` populate from `impl.elements()` first. During this initial population on Set/Map, `this.impl` may be undefined while `super()` calls `add`/`set` (because `super()` runs before field assignment) — hence the `this.impl?.add(...)` optional chains. Do not "fix" these to non-optional calls.
- **Set/Map `delete` and `clear`** check membership before delegating, so impl is never asked to delete what isn't there.
- **`ProxyObject.from`** seeds the target via `Object.defineProperty` (enumerable/writable/configurable) so subsequent assignments hit the `defineProperty` trap consistently. Trap distinguishes add vs update via `Reflect.has(target, property)`.
- **`instanceof`**: `ProxySet`/`ProxyMap`/`ProxyArray*` instances pass `instanceof Set`/`Map`/`Array` because they actually extend those. `ProxyObject` returns a proxied plain object, so `instanceof ProxyObject` is false — only structural typing applies.

## Public API

Exported from `index.ts`:

- `ProxySet<T>`, `ISetImplementation<T>` — `new ProxySet(impl)`.
- `ProxyMap<K,V>`, `IMapImplementation<K,V>` — `new ProxyMap(impl)`.
- `ProxyObject<T>`, `IObjectImplementation<T>` — `ProxyObject.from(impl): T` (constructor is private).
- `ProxyArrayAppendOnly<T, IMPL>`, `IArrayAppendOnlyImplementation<T>` — `ProxyArrayAppendOnly.createAppendOnly(impl): T[]`.
- `ProxyArray<T>`, `IArrayImplementation<T>` — `ProxyArray.create(impl): T[]` (constructors protected/private; always use the static factories so the JS `Proxy` wrapper is applied).

## Testing Notes

- One test file per source file in `test/`. Each defines a `Unit*Impl` class that records per-method call counters (`appends`, `inserts`, `deletes`, `sets`, `updates`) and maintains a shadow array/map/set. Tests assert both observable behavior on the proxy AND that the impl received the expected calls in the expected counts — this is how spec compliance is verified.
- Uses `@asmartbear/testutil` (`T.is`, `T.eq`, `T.len`, `T.includes`, etc.), not bare Jest matchers.
- When adding a mutator, add a counter to the test impl and assert call counts for trivial / boundary / bulk cases (the array tests in particular exercise empty-input no-ops and negative-index splice math).
