# @asmartbear/packed

## Summary

A zero-dependency (runtime-wise) serializer that packs JavaScript values into a compact `Uint8Array` byte buffer. The single `PackedBuffer` class exposes both low-level primitive writers (varints, fixed-width ints, byte arrays, strings) and high-level encoders for JSON, repeated-string "tokens", and a generic tagged `Serializable` codec covering all JS primitives plus `Date`, `Array`, `Set`, plain objects, array holes, and user-registered class types. The encoding is tuned to be small *and* fast for the common cases (small non-negative integers, short strings, repeated object keys).

## Key concepts

- **Wire format is schemaless and self-describing for `writeSerializable` / `writeJson`** — a leading type tag byte tells the reader what follows. The lower-level writers (`writeByte`, `writeUInt16/24/32`, `writeInteger`, `writeSmallNonNegativeInteger`, `writeString`, `writeByteArray`, `writeArray`) are **schema-driven**: the caller must read back with the matching reader in the same order. Mix accordingly.
- **Varint encoding** (`writeSmallNonNegativeInteger`) is little-endian 7-bits-per-byte with the high bit as a continuation flag — the standard "LEB128-style" varint. Capped at `2^31 - 1` (throws above). Used everywhere lengths are encoded.
- **`writeInteger`** uses a 1-byte header: bit 7 = sign, low 5 bits = byte count of magnitude (little-endian). Handles up to `Number.MAX_SAFE_INTEGER`; has a slow path above `2^31` using `Math.floor` division to stay accurate.
- **Fixed-width ints (`UInt16/24/32`) are big-endian.** This is the opposite of `writeInteger`'s body, so don't confuse them.
- **Type tags** for `writeSerializable` are small ints (see `TYPE_*` constants at the top of `src/index.ts`). Tags 100..250 are reserved as an inline "small int" encoding: a single byte simultaneously carries the tag and the integer value 0..149 — this is the hot path for tiny numbers and saves a varint byte.
- **Tokens** (`writeToken` / `readToken`) implement a per-buffer interning table: the first occurrence of a string emits an index plus the string; subsequent occurrences emit just the index. The token table is **stateful on the buffer** and is cleared by `rewind()` so reads start fresh.
- **`@asmartbear/continuum` dependency** is used only for `writeContinuumString` / `readContinuumString`, which pack a 52-char alphabet (`ALPHABET`, `alphabetCharToIdx`) at 4 chars per 3 bytes via `UInt24`. This is purely a space optimization for Continuum-format IDs.
- **Registered serializers** (`registerSerializer`, `ISerializeInstructions<T>`, `ISerializable<T>`) let user types round-trip through `writeSerializable`. The type's `name` is written as a token; the reader-side `PackedBuffer` must have the same name registered before reading.

## Code organization

- `src/index.ts` — the entire package (one file, ~580 lines): `PackedBuffer` class, `Serializable` / `JsonType` types, `ISerializable` / `ISerializeInstructions` interfaces, `SYMBOL_ARRAY_HOLE` sentinel for sparse-array holes.
- `test/index.test.ts` — exhaustive round-trip tests (~440 lines); README claims 100% coverage.
- No subdirectories, no barrel; `package.json` `main` is `dist/index.js`.

## Implementation notes / gotchas

- **Buffer growth:** `ensureMoreSpace(n)` doubles, then takes `max(2*len, 1.5*needed)`, allocating a new `Uint8Array` and `.set()`-copying the used prefix. Writers typically over-request (e.g. `writeByte` asks for 4, `writeString` asks for `len*3 + 10`) to amortize the check.
- **`idx` is a public mutable cursor.** `getByteArray()` returns `buf.subarray(0, idx)` — a *view*, not a copy. `getBuffer()` copies into a Node `Buffer`. `readByteArray` also returns a subarray view; callers that need to retain it past further writes must copy.
- **`rewind()` resets `idx` to 0 AND clears `tokenList`** (but not `tokenMap` — that's fine because it's only used while writing). This makes the buffer reusable for a fresh read pass over freshly written data.
- **String encoding is NOT UTF-8.** `writeString` writes the JS `.length` (UTF-16 code units) as a varint, then writes each `charCodeAt(k)` as a varint. The commented-out UTF-8 path was abandoned for perf. Surrogate pairs round-trip correctly because each code unit is written independently, but the byte count is *not* the UTF-8 byte length.
- **`writeJson` is just `writeString(JSON.stringify(x))`** — used as a fallback for non-safe-integer floats inside `writeSerializable`. Floats are not bit-encoded.
- **`writeSerializable` order matters:** `Date` check is before `Array.isArray`, `isObjectSerializable` is before the generic object fallback. When adding a new type, mind the dispatch order.
- **`Map` is NOT supported** by `writeSerializable` (only `Set`). Adding it would require a new `TYPE_MAP` tag and matching read case.
- **Profiler hotspot comments** (e.g. `// istanbul ignore next` around the `idx + 10 >= length` precheck in `writeSerializable`) reflect real perf tuning — preserve micro-optimizations when refactoring.
- **`writeContinuumString` chunk loop** processes 4 chars at a time but reads them right-to-left into a base-52 accumulator; the reader unwinds in the same order. The space estimate `1 + s.length / 3` looks under-budgeted but `writeUInt24` itself calls `ensureMoreSpace(4)` per chunk.

## Public API

Exported from `src/index.ts`:

- Class: `PackedBuffer` (constructor optionally takes a `Uint8Array` to read from)
- Types: `JsonType`, `Serializable`, `ISerializable<T>`, `ISerializeInstructions<T>`
- Constant: `SYMBOL_ARRAY_HOLE`

Method families on `PackedBuffer`:

- Buffer mgmt: `idx`, `buf`, `length`, `getByteArray()`, `getBuffer()`, `rewind()`, `ensureMoreSpace(n)`, `toBase64()`, `PackedBuffer.fromBase64(s)`
- Primitives: `writeByte` / `readByte`, `writeUInt16/24/32` / `readUInt16/24/32`, `writeInteger` / `readInteger`, `writeSmallNonNegativeInteger` / `readSmallNonNegativeInteger`, `writeByteArray` / `readByteArray` (optional `fixedLength`), `writeString` / `readString`, `writeContinuumString` / `readContinuumString`
- High-level: `writeJson` / `readJson`, `writeArray` / `readArray` (callback-based), `writeToken` / `readToken`, `registerSerializer`, `writeRegisteredSerializable` / `readRegisteredSerializable`, `writeSerializable` / `readSerializable`

## Testing notes

- Tests are exhaustive round-trip: write a value, `rewind()`, read it back, assert equality. The `if (result !== x) expect(...)` pattern is intentional — bypassing Jest's matcher on the hot path makes the sweep tests ~100x faster (per inline comments).
- Coverage sweeps include all integers `[0, 2^20)`, Fibonacci numbers up to `2^31`, edge cases at the varint/integer boundaries, and explicit `toThrow()` checks above the `2^31 - 1` cap and at `Number.MAX_SAFE_INTEGER`.
- When adding a new `TYPE_*` tag or `Serializable` variant, add both a direct round-trip test and an embedded test (inside arrays / sets / objects) to exercise recursive dispatch.
- `jest.config` is inline in `package.json`; `moduleNameMapper` rewrites `@asmartbear/*` to sibling `packages/*/src` so tests run against live source of `continuum` (no build step needed).
