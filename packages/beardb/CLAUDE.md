## Purpose

`@asmartbear/beardb` is a thin document-database abstraction whose primary backend is the [Bear](https://bear.app) notes app's SQLite store (via `@asmartbear/sqlight`). Each "document" is a note with YAML-style front matter (typed via `@asmartbear/smarttype`) plus a free-form text body, addressed by either a globally-unique ID or a `(namespace, name)` pair. Consumers are internal tools that want to treat Bear as a persistent, structured document store; an `InMemoryDriver` is provided mainly so consumers can unit-test against the same API without a real Bear database.

## Key Concepts

- **Document**: front matter (typed object) + body text + `uniqueId` + `(ns, name)`. Tracks dirtiness against the state at construction time.
- **Driver (`IDriver<DD>`)**: pluggable storage backend with `loadById` / `loadByName` / `save` / `create`. The `DD` type parameter is opaque driver-private data carried per document in memory (e.g. the underlying `BearSqlNote`).
- **Database**: caching front-end over a driver. Holds two maps (by-id and by-name) so repeat loads return the *same* `Document` instance — this is load-bearing, since callers mutate `frontMatter`/`text` in place and then call `db.save()` to flush all dirty docs.
- **Namespace (`ns`)**: in the Bear driver, this maps to a Bear tag; `name` maps to the note's title/H1.

## Code Organization

- `src/doc.ts` — `Document<ST>` class. Computes dirtiness by hashing front matter via `SmartType.toHash` and comparing original vs current text.
- `src/driver.ts` — `IDriver<DD>` interface plus the `DocumentStorageData<DD>` / `NewDocumentStorageData` shapes that flow across the boundary.
- `src/db.ts` — `Database` class with the dual-key cache, `loadById` / `loadByName` / `create` / `loadByNameOrCreate` / `save`, and the `disconnectedDocument` load option.
- `src/bear.ts` — `BearDriver` implementing `IDriver<BearSqlNote>` against `BearSqlDatabase`.
- `src/memory.ts` — `InMemoryDriver` for tests; uses `crypto.randomUUID()` for IDs and deep-copies on every read/write to mimic round-tripping through real storage.
- `src/go.ts` — manual scratch entry point (`npm run go`), not part of the public API; talks to a real Bear database via `BearSqlDatabase.singleton()`.
- `src/index.ts` — re-exports `doc`, `driver`, `db` (everything) plus only `InMemoryDriver` and `BearDriver` by name.

## Implementation Notes / Gotchas

- **Identity caching is the contract.** `Database.loadById` and `loadByName` return the cached `Document` object on repeat calls; tests assert object identity with `T.be(...)`. Callers rely on mutating that single instance and then calling `db.save()` later. Do not introduce code paths that bypass the cache silently.
- **Type guard on cache hit.** When a cached doc is returned, `assertFrontMatterType` compares `SmartType.description` strings — if a caller loads the same doc with a different schema, this throws. Keep schemas consistent per `(ns, name)`.
- **`disconnectedDocument: true`** skips both reading from and writing to the cache, yielding a doc that will never be saved by `db.save()`. Use for read-only views.
- **Dirty detection** rehashes front matter on every `isDirty` read — fine for small objects but a perf trap on bulk scans.
- **BearDriver `loadByName`** queries by `titleExact` + `tagsInclude:[ns]` ordered `newest`, so if multiple Bear notes share the same title under the same tag, only the most recent is returned silently.
- **BearDriver `bearNoteToDocumentData`** chooses `ns` as the *longest* tag on the note (falling back to `"na"`), which is a heuristic — it does not necessarily round-trip the `ns` the document was created with if the note has multiple tags.
- **`InMemoryDriver` copies via `Object.assign({}, data)`** (shallow) — nested objects in `frontMatter` are still shared by reference. Tests work because they immediately call `save` after mutation, but be aware.
- **`BearDriver.create`** issues two writes: `database.createNote` then `save` to populate title/body/front-matter. There's no rollback if the second fails.

## Public API

From `index.ts`: everything in `doc.ts` (`Document`), `driver.ts` (`IDriver`, `DocumentStorageData`, `NewDocumentStorageData`), and `db.ts` (`Database`, `LoadOptions` is *not* exported — it's an internal type), plus the two driver classes `InMemoryDriver` and `BearDriver`.

## Dependencies

- `@asmartbear/smarttype` — runtime-typed front-matter schema; `toHash` powers dirty detection, `toJSON`/`fromJSON` cross the storage boundary.
- `@asmartbear/sqlight` — provides `BearSqlDatabase` and `BearSqlNote`; `BearDriver` is a thin shim over it.
- `@asmartbear/filesystem`, `@asmartbear/simplified` — declared as deps but not directly imported by `src/`; likely transitive needs of the Bear driver path.
- `tiny-invariant` — imported in `db.ts` but currently unused in the visible code paths.
- `@asmartbear/testutil` (dev) — assertion helpers (`T.eq`, `T.be`, `T.undef`, `T.len`) used throughout the test suite.

## Testing Notes

- All three test files (`db.test.ts`, `doc.test.ts`, `memory.test.ts`) run purely against `InMemoryDriver` or construct `Document` directly — **no test touches a real Bear database**. `BearDriver` itself is exercised only manually via `src/go.ts`.
- Tests rely on `Database`'s object-identity caching contract (`T.be(...)`). When changing cache behavior, expect many test failures even if logical state is preserved.
- `jest` is run with `--runInBand` (see `package.json`); presumably future Bear-backed tests would conflict on the singleton database.
