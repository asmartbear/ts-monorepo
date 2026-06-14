# distributed-logical-time

## Summary

Published as `@asmartbear/distributed-logical-time`. Produces monotonically-increasing timestamps that fit in a single JavaScript `number` (safe-integer range, < 2^53) and stay loosely aligned with wall-clock time. Algorithm reference: https://longform.asmartbear.com/distributed-logical-time/. Consumed by other packages that need cheap, monotonic, mergeable timestamps for IDs, ordering, or last-write-wins conflict resolution. No runtime dependencies.

## Algorithm and Invariants

Despite the name, this is **not** a vector clock or full HLC. It is a single-scalar Lamport-style clock with a packed wall-clock prefix:

```
timestamp = (Date.now() - UNIX_MILLIS_EPOCH) * COUNTER_MULTIPLIER + counter
```

- `UNIX_MILLIS_EPOCH = 1764619700000` (a recent epoch — buys headroom in the safe-integer range). Changing it is a breaking change to wire format and ordering across replicas.
- `COUNTER_MULTIPLIER = floor(MAX_SAFE_INTEGER / MAX_UNIX_MILLIS)` — currently allows ~3560 increments per millisecond before the counter "leaks" into the millis area, i.e. sustained ~3.5M `now()` calls/sec stays roughly synced with wall time.

Invariants the code must preserve:
1. **Strict monotonicity within an instance**: every `now()` returns a value strictly greater than every previous `now()` from the same instance.
2. **Cross-instance happens-before via `update(t)`**: after `update(t)`, the next `now()` is strictly greater than `t`. This is the Lamport "receive" step.
3. **Fits in a safe integer**: never multiply or add such that the result can exceed `Number.MAX_SAFE_INTEGER`. `COUNTER_MULTIPLIER` is sized for this; do not increase it.
4. **System time is read sparingly**: the backoff period (default 100ms) avoids hot-path `Date.now()` calls; counter increments fill the gap.

There is no full happens-before partial order across nodes — concurrent events on different instances are totally ordered by their scalar timestamps. `update()` adds a random fuzz of up to `4 * COUNTER_MULTIPLIER` to drastically reduce collision probability between replicas that just synchronized; do not remove the fuzz.

## Code Organization

- `src/index.ts` — the entire implementation: `LogicalTime` default export, `LogicalTimeConfig` type, epoch/multiplier constants. Single file by design.
- `test/index.test.ts` — covers increment-only mode, backoff/refresh, disabled backoff with mocked `fSystemMillis`, and the `update()` merge semantics. README claims 100% coverage; preserve it.

## Public API

`src/index.ts` exports:
- `default class LogicalTime` with `now()`, `update(t)`, `useSystemTimeNext()`, and constructor `(config?: LogicalTimeConfig)`.
- `type LogicalTimeConfig = { backoffPeriod?: number; fSystemMillis?: () => number }`.

`backoffPeriod` defaults to 100ms; pass `0` to consult `fSystemMillis` on every call (useful for tests, or when you want tighter wall-clock tracking at the cost of speed). `fSystemMillis` defaults to `Date.now` — override for deterministic tests.

## Implementation Gotchas

- **`setTimeout` keeps Node alive**: `now()` schedules `setTimeout(useSystemTimeNext, backoffPeriod)` when entering backoff. The timer is intentionally short so an idle process can still exit "soon enough." Do not `.unref()` without thinking — callers may depend on the current behavior; if you change it, document it.
- **`update()` is a no-op when `t <= lastTime`**: it does *not* always advance. This is correct (we're already ahead), but means `update()` cannot be used to inject fuzz on its own.
- **Random fuzz in `update()`** uses `Math.random()` — not cryptographic. Sufficient for collision avoidance, not for unguessability.
- **The counter can outpace wall time** if `now()` is called > ~3.5M times/sec sustained. The packed integer still increases monotonically; it just drifts ahead of `Date.now()` until calls slow down.
- **Single-file, no dependencies** — keep it that way. The package's value proposition is "drop-in, tiny, fast."

## Testing Notes

`test/index.test.ts` patterns worth preserving when adding tests:
- Inject `fSystemMillis: () => rt` and mutate `rt` to simulate the wall clock advancing without `await`s.
- Use `backoffPeriod: 0` for deterministic tests; otherwise you need real `setTimeout` waits (see the "refresh system time" test, which sleeps 50ms).
- The `update` test models two replicas with skewed clocks and checks the merge: updating the *behind* replica from the *ahead* replica's stamp must jump past it (plus fuzz); the reverse is a no-op.
