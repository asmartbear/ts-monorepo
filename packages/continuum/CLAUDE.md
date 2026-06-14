# @asmartbear/continuum

Generates compact strings that form an ordered continuum: between any two strings produced by this package, another can always be produced. Used for distributed/multi-writer ordered arrays, CRDT-style ordering keys, time-orderable GUIDs, and any "insert between two items without renumbering" problem (the same niche as LOGOOT/WOOT/Treedoc, but more space- and time-efficient). It is a leaf library with no runtime dependencies; consumers import it as `@asmartbear/continuum`.

## Key Concepts

- **Alphabet** (`ALPHABET`): `A-Z` then `a-z` (52 chars), ordered by ASCII codepoint. All operations stay within this set so output is safe in any key/value store.
- **Well-formed string**: non-empty, only alphabet chars, and **does not end with `A`** (the first letter). This is enforced because `S` vs `S + "A"` has no valid string between them — see README "rule of the last letter". `isWellFormed()` checks via `/^[A-Za-z]*[B-Za-z]$/`.
- **`between(s1, s2)`**: skip common prefix, then split at the midpoint of the differing alphabet indices. If the two chars are adjacent (`m <= a`), we must extend by scanning forward in `lo` for a character that has room above it (`< LAST_IDX - 1`), so the appended midpoint character is still strictly less than `hi`. Order of args doesn't matter; the function swaps internally.
- **Integer encoding** (`fromInteger` / `toInteger`): base-50 (alphabet minus first/last char as "digits"), big-endian, prefixed with a single char that encodes the digit count (`a`=1 digit, `b`=2, ...). Negatives use "50's complement" (digit `d` becomes `50-1-d`) with a prefix counting backward from `Z`. `0` is the single char `"a"`, which sorts between negatives (start with `Z` or earlier) and positives (start with `b` or later). Max ~26 base-50 digits (~7e45). `IDX_DIGIT_0 = 1`, `IDX_EXPONENT_0 = 26`, `BASE = 50`.
- **`fromString`**: maps each codepoint via `fromInteger` and joins with `ALPHABET[0]` (`"A"`) — joining with the lowest char ensures different-length encodings still sort correctly. Output is ~4-5x the input length; the exact format is intentionally undocumented (don't rely on it).
- **`next(s, increment=2)`**: treats `s` as a little-endian base-50 bigint, adds `increment` (clamped to min 2 so future inserts fit), and re-encodes. On overflow it doesn't simply append one char (that gets eaten quickly by repeated `next` calls); instead it returns `"z" * s.length + "B" * max(3, ceil(s.length/2))`, growing by ~50% to amortize future growth. Negative increments are mentioned in the README but the implementation clamps to 2 — verify before relying on "previous".
- **`getStarterForNext(n)`**: returns a string of `"B"`s long enough that `n` `next()` calls won't grow it. Formula: `ceil(log(n*2) / log(LAST_IDX - 1))`, min length 2.

## Code Organization

Everything lives in a single file: `src/index.ts` (~270 lines). There are no submodules — all exported functions, the `ALPHABET` constant, internal helpers (`alphabetCharToIdx`, `_cstring_to_faux_bigint`, `_integer_to_faux_bigint`), and the base-50/exponent constants are colocated. Tests are in `test/index.test.ts`. Benchmarks (run manually with `node`) are in `benchmark/between.js` and `benchmark/random.js` using the `benchmark` library.

## Public API Surface

Exported from `src/index.ts`:
- `ALPHABET` — the 52-char ordered alphabet (reference this, don't hardcode).
- `alphabetCharToIdx(str, offset)` — char → 0-51 index; throws on out-of-alphabet chars.
- `isWellFormed(s): s is string` — type guard.
- `between(s1, s2)` — string strictly between two well-formed strings.
- `next(s, increment?)` — next-ish string, leaving gap for future inserts.
- `getStarterForNext(n)` — pre-sized seed to amortize many `next()` calls.
- `random(len)` — random well-formed string; avoids first and last alphabet chars so future inserts stay short. Not cryptographically secure.
- `fromInteger(x)` / `toInteger(s)` — bijection for integers (within the 26-digit limit). `toInteger` is only defined for outputs of `fromInteger`; strings produced by `between`/`next` are not guaranteed to round-trip.
- `fromString(input)` — order-preserving encoding of arbitrary JS strings (no inverse exported).

## Gotchas

- `between(s, s)` (equal inputs) is undefined behavior — the prefix-skip loop falls through and produces garbage; callers must ensure inputs are unequal.
- `between` requires inputs already conforming to the alphabet; non-alphabet chars throw inside `alphabetCharToIdx`.
- `next` with overflow loses information about the original `increment` (the FIX ME comment notes this); after a wrap, repeated calls with growing increments return the same string. The test `generates 'next' strings of varying intervals` documents this plateau behavior at the `zzzBBB` wrap.
- The "last char can't be `A`" rule must be preserved by any new generator function you add; otherwise `between` calls on its output can fail to find a midpoint.
- `random` deliberately excludes `A` and `z` so inserts on either side don't immediately need to lengthen the string.
- When editing `between`, the `LAST_IDX - 1` bound (not `LAST_IDX`) is load-bearing: we need a char strictly greater than what we pick as the midpoint, so a character at `LAST_IDX - 1` (`y`) has no room above it for the average.

## Testing Notes

Tests in `test/index.test.ts` use `@asmartbear/testutil` for `T.gt`/`T.lt` ordering assertions and a local `bt(lo, hi)` helper that asserts the result is well-formed, strictly between, within `+1` of the longer input's length, and symmetric (`between(hi, lo) === between(lo, hi)`). Coverage includes property-style loops: 2,600 chained `next()` calls across several seeds (verifying length stays bounded and `between` still works mid-chain), and 10,000-sample uniqueness checks for `random(16)`. There is one commented-out test about repeated `between()` not growing strings — be aware that this property isn't currently guaranteed if you change the algorithm.
