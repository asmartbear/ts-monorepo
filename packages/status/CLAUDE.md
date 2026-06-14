# @asmartbear/status

## Summary

A small, zero-dependency package that maintains a "status block" pinned to the bottom of a terminal: a set of keyed lines that update in place via ANSI cursor movement while regular `console.log`/`warn`/`error` continue to scroll above untouched. Clients create a `StatusManager<K>`, call `start()`, then `update(key, content)` from anywhere; the manager intercepts the console functions so logging interleaves cleanly with the live status area.

## Key Concepts

- **Status block**: a contiguous group of lines anchored to the bottom of the terminal. Number of lines equals `statusLines.size`; new keys grow the block downward (by writing a newline at the bottom, which scrolls the rest of the screen up).
- **Line addressing**: each key gets a stable `lineNumber` in `lineNumbers`. Block-line `n` maps to terminal row `process.stdout.rows - n - 1` (line 0 is the bottom).
- **ANSI used**: `ESC[6n` (cursor position query, only in `getCursorPosition` which is currently unused), `ESC[row;colH` (move), `ESC[2K` (clear line), `ESC[0K` (clear to end of line).
- **Live updates via console interception**: `start()` replaces `console.log/warn/error` with wrappers that, on first call after a clean state, clear the block and set `dirty=true`. The original log runs, scrolling its output above; the next `update()` redraws the whole block.
- **Backoff / refresh batching**: every update starts a `setTimeout(screenRefreshRateMs)` (default 50ms). Updates arriving during the window are stashed in `backoffUpdates` and flushed on timer (or opportunistically if `Date.now() > nextBackoffRefresh`, which guards against starved event loops). Tunable at any time via `cm.screenRefreshRateMs`.
- **No TTY-detection guard**: the code assumes a real TTY (uses `process.stdout.rows`/`columns` and raw mode). See gotchas.

## Code Organization

Everything lives in `src/index.ts`:
- `StatusManager<K extends number | string>` — the public class. Generic key type lets callers use ints (job slots) or strings (named jobs).
- `getCommonPrefixLength(a, b)` — exported helper used to skip redrawing the unchanged prefix of a line (reduces flicker and bytes written).
- `getCursorPosition()` — defined but **not currently called** anywhere; leftover/future use. It puts stdin into raw mode and parses the `ESC[r;cR` response.
- Commented-out example at the bottom of the file demonstrates intended usage.

## Implementation Notes / Gotchas

- **Truncation uses byte/code-unit offsets**, not display width: `substring(offset, (process.stdout.columns || 80) - 1)`. Wide chars (CJK, most emoji) will visually overflow or under-fill. The `column` calculation for partial-line updates does count grapheme clusters via `Array.from(content)` to advance correctly past surrogate pairs.
- **No color/ANSI awareness in content**: if callers embed color escapes, prefix-matching in `getCommonPrefixLength` works on raw chars and will happily split an escape sequence — colors may bleed. Truncation can also chop mid-escape.
- **Dumb terminals / non-TTY**: not handled. `process.stdout.rows` is `undefined` when piped, which makes `getTerminalRow` return `NaN` and the cursor-move write a malformed sequence. If you add piped-output support, gate on `process.stdout.isTTY` and degrade to plain `console.log` of each update.
- **Window resize**: `SIGWINCH` is not handled. Resizing during a run will misplace lines until the next full redraw caused by a `console.log`.
- **Process exit**: `stop()` must be called for the console functions to be restored and the cursor parked below the block. There is no `process.on('exit'|'SIGINT')` hook — wire one up in the host app if needed.
- **Re-entrancy**: `interceptConsole` calls the original log, which can itself produce output that fights with a redraw in progress. Updates are single-threaded by Node's event loop, so this is fine in practice, but don't call `update()` from inside a `console.log` formatter.
- **`update()` overloads**: the third `always` parameter is tri-state — `false` (default, honor backoff), `true` (force immediate draw, remove from backoff), `null` (internal marker used by `flushBackoffUpdates`; don't pass from user code).
- **Identical-content short-circuit**: `update()` returns early if `prev === content`, so spammy idempotent updates are cheap.

## Public API

```ts
class StatusManager<K extends number | string> {
  screenRefreshRateMs: number  // default 50, mutable any time
  constructor()
  start(): void                // intercepts console.{log,warn,error}
  stop(): void                 // flushes, restores console, parks cursor below block
  update(key: K, content: string, always?: boolean | null): void
}
export function getCommonPrefixLength(a: string, b: string): number
```

There is no `remove(key)` / `clear()` method — once a key is added the line stays for the lifetime of the manager.

## Testing Notes

- Tests live in `test/index.test.ts`, run via `jest --runInBand` (serial — important since this code mutates global `console`).
- Current tests only cover construction and `getCommonPrefixLength`. The terminal-drawing path is **not** unit-tested.
- To test drawing, mock `process.stdout.write`, `process.stdout.rows`, `process.stdout.columns` and assert on the emitted ANSI sequences. Remember to restore `console.log/warn/error` after any test that calls `start()` (or always pair with `stop()` in a `finally`), otherwise later tests will print through the interceptor of a dead manager.
- Use fake timers (`jest.useFakeTimers()`) to drive the backoff/refresh logic deterministically; advance by `screenRefreshRateMs` to trigger flushes.
