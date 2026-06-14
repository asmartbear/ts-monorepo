# @asmartbear/jobs

## Summary

In-process async job queue with a fixed pool of "workers" (concurrency = CPU count by default). Tasks are scheduled with optional manual priority, per-tag concurrency caps, dependencies on specific other tasks, and dependencies on "all tasks with these tags". Built on `async-mutex` (Semaphore + Mutex) and the sibling `@asmartbear/status` package for optional live console status. Single file: `src/index.ts`.

## Domain Model

- **Task**: one unit of work. Wraps a `TaskExecutionFunction` `(fStatus) => Promise|unknown`. Has `title`, `tags`, `dependentTags`, `dependentTasks`, `priority`, and a `TaskState` (`New` -> `Running` -> `Done` | `Error`). A `Mutex` is acquired at construction and released on completion so `waitForCompletion()` can block until done.
- **TaskRunner**: owns the queues, runs N workers, holds tag counters and the first error. Generic over a string-literal union `Tags` so tag names are type-checked.
- **Priority**: lower number runs first. Default `0`. Ties arbitrary. Sorted on every insert into ready queue (see FIXME re: binary insert).
- **Tags / `concurrencyPerTag`**: per-tag running cap (unlimited if absent — coded as `9999`).
- **`dependentTasks`**: hard deps on specific Task instances. A task is unready until all listed tasks are `Done` (note: `Error` does NOT satisfy — the runner stops on error anyway).
- **`dependentTags`**: wait until there are zero queued-or-running tasks with any of these tags. Useful for "run after all 'build' tasks finish". New tasks of that tag added later WILL block this task again.
- **`stayAlive`**: keep workers alive across gaps when no tasks are enqueued. Must be cleared eventually or `run()` never resolves.

## Code Organization

- `src/index.ts` — entire public API: `TaskState`, `TaskError`, `Task`, `TaskRunner`, plus types `TaskConstructor`, `TaskRunnerConstructor`, `TaskExecutionFunction`, `TaskUpdateFunction`. The bottom of the file has a large commented-out `main()` usage example — keep it as living documentation.
- `test/index.test.ts` — currently only a smoke construction test. Coverage is very thin; new behavior changes should add tests.

## Implementation Notes / Gotchas

- **Two queues**: `readyQueue` (sorted by priority) and `waitingQueue` (unsorted). `addTask` calls `isReady()` once to decide where it lands. When any task completes, the worker scans `waitingQueue` backwards and promotes all newly-ready tasks.
- **Re-check on dequeue**: a task pulled from `readyQueue` can have become unready (tag concurrency, new sibling tasks). The worker re-checks `isReady()` and pushes to the front of `waitingQueue` if so. The semaphore can therefore wake a worker that finds nothing to run — the `continue` loop handles that.
- **Error handling**: first task error is stored on `_error`. After that, no new tasks are pulled, but in-flight tasks finish. `TaskError` wraps the original via `.thrown` and keeps a reference to the failing `.task`. Errors do NOT propagate out of `run()`; the caller must check `runner.error` afterward.
- **Cancellation**: there is no per-task cancel. Workers exit by either draining the queues or by `readySemaphore.cancel()` (used on completion and when `setStayAlive(false)` is called with nothing left to do). Cancellation surfaces as `E_CANCELED` inside `worker()` and is swallowed.
- **Worker priority**: `readySemaphore.acquire(1, -statusIdx)` biases dequeues toward lower-indexed workers so high-index workers stay parked and the live status display doesn't claim unused slots.
- **Status output**: gated by `showStatus`. `fStatus` is a no-op until that worker has run at least one task (`hasDoneAnything`) to avoid reserving a status line prematurely. Emoji are intentional in console output.
- **Tag counters**: `numQueuedTasksByTag` and `numRunningTasksByTag` are mutated by static `updateTagCounter`. Both are part of the public surface (read by `isReady` and `waitForTags`).
- **`waitForTags`** polls every 10ms — there is no event signaling. Acceptable for current use; don't add hot loops elsewhere.
- **Title mutation**: constructor appends `" [tag1, tag2]"` to `title` if tags exist. Don't double-apply.

## Public API (from `index.ts`)

`TaskState`, `TaskError`, `Task`, `TaskRunner`, and the type aliases `TaskRunnerConstructor`, `TaskConstructor`, `TaskExecutionFunction`, `TaskUpdateFunction`. Most consumers only touch `TaskRunner` (`addTask`, `run`, `waitForTags`, `setStayAlive`, `error`, `statusControl`) and the returned `Task` (`waitForCompletion`, `addDependentTask`, `state`).

## Testing Notes

- Jest config in `package.json` runs with `--runInBand` (intentional — concurrency/timing behavior is order-sensitive). Preserve that when adding tests.
- The `moduleNameMapper` rewrites `@asmartbear/*` to sibling `packages/*/src`, so the sibling `@asmartbear/status` dep resolves to source, not `dist`.
- When testing scheduling, prefer deterministic execution functions (resolved promises / `await wait(...)` with small fixed delays) over `Math.random` — and remember workers default to `os.cpus().length`, so pass an explicit `concurrencyLevel` in tests.
