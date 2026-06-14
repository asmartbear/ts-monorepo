# @asmartbear/filesystem

## Summary

Class-based, Promise-first wrapper around Node's `fs`, `path`, and `os` modules. Exposes a single `Path` class that models an absolute filesystem path and provides ergonomic methods for reading, writing, copying, moving, hashing, temp files, atomic writes, and shell-out helpers (open in app, reveal in Finder). It is a foundational dependency consumed by several other packages in this monorepo (beardb, citation, dyn, sqlight), so changes here ripple widely — preserve backward compatibility and existing method signatures unless intentionally bumping.

## Domain Model

- `Path` — the only class. Wraps a single absolute path string (`absPath`). Construction resolves relative inputs against `process.cwd()` via `path.resolve()`, and trailing slashes are stripped. Construction from another `Path` copies the string.
- `Path` is treated as a value type: `toString()`, `valueOf()`, `[Symbol.toPrimitive]`, `toJSON()`, `toSimplified()`, and `util.inspect.custom` all return `absPath`. This enables using `Path` instances as Map keys via string coercion, and lets them interop with `String()` / template literals.
- `PathInfo` — plain object with `lastModifiedMs`, `size`, `isFile`, `isDir`. `getInfo()` / `getInfoSync()` return zeroed `PathInfo` (not throw) when the file is missing — callers distinguish "missing" via `isFile`/`isDir` being `false`.
- `PathCallbacks` — optional hook bag passed to the constructor; currently only `onPathWritten(pth)`. Triggered after every successful `write*`, `copyTo`, `moveTo`, and (transitively) atomic writes. Callbacks propagate through `parent` and `join()` (new `Path` inherits `this.callbacks`).
- Static singletons: `Path.systemTempDir`, `Path.userHomeDir`, `Path.devNull`. Helpers: `Path.cwd()`, `Path.withCliExpansion()` (expands leading `~`), `Path.getTempPath()`, `Path.withTempFile()`, `Path.openUrlInBrowser()`.

## Code Organization

- `src/index.ts` — the entire package. One file, one class, plus the `PathInfo` / `PathCallbacks` types and the `pathInfoFromFsStat` helper. Keep it that way unless there's a strong reason to split.
- `test/index.test.ts` — single test file mirroring the API surface.
- `test/data/` — fixture files used by read-side tests.

## Implementation Notes / Gotchas

- **Absolute-only invariant**: `absPath` is always resolved. `commonParent()` splits on literal `/` (not `path.sep`), so it assumes POSIX-style separators — fine on macOS/Linux but would misbehave on Windows. The whole package is implicitly POSIX/macOS-targeted (e.g. `revealInFinder()` shells out to `open`, `openUrlInBrowser()` hard-codes "Google Chrome", `devNull` is `/dev/null`).
- **`isParentOf` uses `path.sep`** — inconsistent with `commonParent`. A path is its own parent (returns `true` for equal paths).
- **Lazy mkdir on writes**: `write()`, `writeAsString()`, `copyTo()`, `moveTo()` do *not* pre-create parent directories. They attempt the operation first and only `mkdir -p` on `ENOENT`. This is deliberate — the common case is "parent exists" and we save a stat. Preserve this pattern.
- **Copy uses `COPYFILE_FICLONE`** for cheap APFS clone-on-write. Falls back silently if unsupported.
- **`isNewerThan` semantics**: returns `true` when sizes differ, when `this` mtime is later, *or* on any error (including either file missing). Used as the gate for `copyTo(..., onlyIfNewer=true)`. Don't "fix" the error case — callers rely on it.
- **`getInfo` swallows errors** by design; never throws for missing files. Mirror this if adding new info methods.
- **Async vs sync**: most operations have both flavors (`getInfo`/`getInfoSync`, `mkdir`/`mkdirSync`, `unlink`/`unlinkSync`, `isNewerThan`/`isNewerThanSync`). The sync versions exist because local SSD stat is cheap; async is preferred. Don't add sync variants unless there's a clear use case.
- **Atomic writes** (`atomicWrite`, `atomicWriteAsString`, `writeAsStringIfDifferent(..., atomically=true)`) write to a temp file then `rename` into place. `useDestDirectory=true` (the default) keeps the temp file in the same directory so the rename is a same-volume metadata op; `false` uses the system temp dir (cross-volume → copy + delete).
- **`withTempFile`** always cleans up in `finally` — failure to delete logs to `console.error` but does not throw.
- **`touch()`** creates an empty file on `ENOENT` then re-applies the timestamp, since `writeAsString("")` would update the mtime to "now".
- **`readLines()`** trims leading/trailing blank lines and splits on `\r?\n`.

## Public API (from `index.ts`)

Named exports: `PathInfo` (type), `pathInfoFromFsStat`, `PathCallbacks` (type), `Path` (class). There is no default export. Consumers typically `import { Path } from "@asmartbear/filesystem"` or `import * as V from "@asmartbear/filesystem"`.

## Testing Notes

- Tests use `@asmartbear/testutil` (aliased `T`) with assertions like `T.eq`, `T.be`, `T.consoleLog`. Don't introduce raw `expect` unless extending an existing pattern (a few `expect(...)` calls exist for async results).
- Fixture data lives at `test/data/`, accessed via `new Path(__dirname).join("data")`.
- For temp-file tests, prefer `Path.getTempPath()` / `Path.withTempFile()` over hand-rolled paths — the same APIs the production code uses. The OS temp dir is assumed writable.
- `jest --runInBand` is configured because tests touch the real filesystem (including the shared system temp dir); don't introduce test parallelism that races on shared paths.
