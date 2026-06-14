# sqlight

## Summary

`@asmartbear/sqlight` is a TypeScript-safe SQL builder targeting SQLite (via `sqlite` + `sqlite3`). You declare a schema as a plain TS object literal (`SCHEMA({ tables: { ... } })`), and from that schema you get strongly-typed table/column references, SELECT builders, INSERT/UPDATE/DELETE helpers, and result rows whose TS types are derived from the column definitions (including `nullable`). It is consumed primarily by `beardb` (the `bear.ts` file in this package is itself a domain-specific consumer wrapping Bear.app's SQLite database).

## Key concepts

- **Schema as data**: `SCHEMA({ tables: { tableName: { columns: { col: { type: 'INTEGER', pk: true, nullable: true, unique: true } } } } })` returns a `SqlSchema<TABLES>`. Types like `NativeForRowColumns<...>`, `PrimaryKeyForSchemaColumns<...>`, and `NativeUpdateForSchemaColumns<...>` (in `types.ts`) map column defs to native row shapes — `pk` columns are required for updates/deletes, others become `Partial`.
- **Expression tree, not template tags**: There is no SQL template-literal API. Queries are built from `SqlExpression<D, NULLABLE>` subclasses. Use factories `EXPR(value)`, `LITERAL(type, value)`, `INT/STR/FLOAT/BOOL/DATE/BLOB`, combinators `AND/OR/NOT/CONCAT/COALESCE/CASE`, and methods on expressions (`.eq .ne .lt .gt .add .sub .includes .inList .inSubquery .isNull .isNotNull`). Each expression carries its SQL type and a `'sometimes' | 'never'` nullability flag that propagates through combinators (`anySometimesNullable`, `anyNeverNullable`).
- **SELECT builder**: `schema.select()` returns `SqlSelect<TABLES, NATIVEROW>`. Chain `.from(alias, tableName, joinType?, fJoin?)` (returns a `SqlFromTable` exposing `.col.<columnName>` as typed expressions), then `.select(alias, expr)` / `.passThrough(col)` accumulates the result row type in `NATIVEROW`, plus `.where`, `.orderBy`, `.setLimit`, `.setOffset`. `.toSql()` emits the final string; `.asSubquery(alias)` wraps it as a single-column expression.
- **No prepared statements / parameter binding**: Despite the name "SQL builder," literals are rendered inline via each expression's `toSql()` (e.g. strings get `'…'` with `'` doubled, blobs as `x'…'`, dates as `toISOString()`). The `sqlite` driver is called with `db.exec/all/get(sql)` — no `?`/`$` bind parameters. This means SQL injection safety relies entirely on `LITERAL`/`EXPR` doing the escaping; raw string concatenation into `queryAll(sql)` is unsafe.
- **Connection lifecycle**: `SqlightDatabase` lazy-opens on first use, since SQLite isn't thread-safe (multi-process). All DB calls go through a single `async-mutex` `Mutex.runExclusive` — including a careful double-check inside `close()` to handle concurrent closers. `withTemporaryDatabase(schema, f)` uses `Path.withTempFile` to create/open/run/close/delete a scratch DB and is the standard test harness.

## Code organization (src/)

- `index.ts` — barrel: re-exports `types`, `expr`, `bear`, plus `SCHEMA`, `SqlJoinType`, `SqlSelect` from `schema`, and `SqlightDatabase` from `db`.
- `types.ts` — pure TS type-level machinery: `SqlType`, `SqlBoolean` (`0|1`), `SqlNullable`, `NativeFor<D>`, `SqlTypeFor<T>`, `RowColumn`, `SchemaColumn`, `SchemaTable`, `SchemaDatabase`, plus the `NativeForRowColumns` / `PrimaryKeyForSchemaColumns` / `NativeUpdateForSchemaColumns` mapped types.
- `expr.ts` — `SqlExpression` base class and all concrete subclasses (literals, unary/multi operators, functions, `IN`, `IN (subquery)`, `CASE`), plus factory functions and the type-level `NativeForExpression`, `SqlExprFromNative`.
- `schema.ts` — `SqlSchema`, `SqlSelect` builder, `SqlFromTable`, `SqlColumn`, `RowFormatter`. Owns DDL/DML generation: `getCreateTableSql`, `getInsertRowsSql`, `getUpdateRowsByPkSql` (wraps multi-row updates in `BEGIN TRANSACTION;` / `COMMIT;`), `getDeleteRowsByPkSql`.
- `db.ts` — `SqlightDatabase<TABLES>`: connection mgmt + the typed query methods (`selectAll/selectOne/selectCol`, `insert/updateByPrimaryKey/deleteByPrimaryKey`, `createTable(s)`, raw `queryAll/queryOne/queryCol/queryStatement`, `getTables`).
- `bear.ts` — concrete consumer: `BearSchema` for the Bear.app SQLite DB, `BearSqlDatabase extends SqlightDatabase<TablesOf<typeof BearSchema>>`, `BearSqlNote`, `BearSqlAttachment`, `BearNoteQueryOptions`, plus Bear epoch conversion (`bearTimestampToDate` / `dateToBearTimestamp` — Bear uses 2001-01-01 epoch, stored as `REAL`). Also shells out via `bear://x-callback-url/…` through `open -g`.
- `yaml.ts` — `parseYaml` (uses `gray-matter` for front-matter) and `toYamlString` (js-yaml dump with `lineWidth: 99999, noRefs: true`). Used by `bear.ts` for note front-matter.
- `util.ts` — `betterEncodeUriComponent` (UTF-8 byte-wise URI encoding for `x-callback-url`), `busyWait`, `removeParentTags`, `isNonEmptyArray`, `objectLength`. Excluded from coverage (see `package.json` jest config).
- `go.ts` — **ad-hoc runner** invoked via `npm run go` (= `tsx src/go.ts`). Currently exercises `BearSqlDatabase.singleton()` against a real Bear DB; edit freely when manually probing behavior. Not part of the public API.

## Implementation notes / gotchas

- **No JSON1, no WAL setup, no PRAGMAs**: the driver is opened with defaults — `open({ filename, driver: sqlite3.Database })`. If a caller needs WAL mode, foreign keys, etc., they must issue `PRAGMA`s via `queryStatement`.
- **Integer vs REAL inference**: `EXPR(n)` on a `number` checks `Number.isInteger` at runtime and picks `INT` or `FLOAT`. At the type level `SqlTypeFor<T>` returns `'INTEGER' | 'REAL'` for generic `number` (a union), so prefer `INT(n)` / `FLOAT(n)` / `LITERAL('INTEGER', n)` when the column type matters. There is no `bigint` support — SQLite integers come back as JS `number` and will silently lose precision above `Number.MAX_SAFE_INTEGER`.
- **Booleans are `0|1`**: `SqlBoolean = 0 | 1`. Row data uses `0/1`, not `true/false`. `BOOL(true)` renders as `1`.
- **Date storage is by `toISOString()`**, no quoting. That isn't a valid SQL literal on its own (it's not quoted) — only meaningful as part of an expression that already quotes. Watch out when using `DATE`/`TIMESTAMP` literals; Bear stores dates as `REAL` Bear-epoch seconds instead, handled manually.
- **String escaping**: `SqlStringLiteral.toSql` only doubles `'`. No `\0`/control-char handling — fine for SQLite TEXT but don't assume general SQL-safety.
- **Mutex discipline**: `db()` MUST be called inside `mutex.runExclusive`. Adding any new public DB method requires wrapping the body in the mutex; otherwise you'll race lazy-open and `close()`.
- **`updateByPrimaryKey` builds a multi-statement string** (`BEGIN TRANSACTION; ... COMMIT;`) executed via `db.exec`. Don't call it concurrently with other mutators outside the mutex — and don't try to compose it inside another transaction.
- **Empty inputs are no-ops**: `insert/update/delete` accept `Nullish` and produce `""`, which `queryStatement` skips. Tests rely on this.
- **`SqlSelect.toSql({ limitMax })`**: `selectOne` passes `limitMax: 1`. The min of `this.limit` and `limitMax` wins. Empty select clauses emit `SELECT 1` as a corner case.
- **`fromJSON`/`ignoreExtraFields`** referenced in recent monorepo commits do not live here — that's beardb.

## Public API (re-exported from `index.ts`)

- Types: everything in `types.ts`; everything in `expr.ts` (the `SqlExpression` hierarchy, `EXPR/LITERAL/INT/FLOAT/STR/BOOL/DATE/BLOB`, `AND/OR/NOT/CONCAT/COALESCE/CASE`, `EXPRs`, `TYPE`, `NativeForExpression`).
- From `schema.ts`: `SCHEMA`, `SqlJoinType`, `SqlSelect` (and via type inference `TablesOf`, `NativeSelectRow`, `SelectKeys`, though only the first three are named in the barrel — the others are reachable through `expr`/`bear` re-exports).
- From `db.ts`: `SqlightDatabase`.
- All of `bear.ts`: `BearSqlDatabase`, `BearSqlNote`, `BearSqlAttachment`, `BearNoteQueryOptions`, `BearTag`, `BearNoteSqlRowData`, `bearTimestampToDate`, `dateToBearTimestamp`.

## Testing notes

- Tests live in `test/*.test.ts` (Jest + ts-jest, `--runInBand` because tests share real SQLite file I/O). `jest.moduleNameMapper` rewrites `@asmartbear/<pkg>` to `../<pkg>/src` so monorepo source is used directly, no build step.
- `db.test.ts` exercises a real SQLite via `SqlightDatabase.withTemporaryDatabase(schema, async db => { ... })` — the canonical pattern. No fixture DB files; each test creates and tears down its own temp file.
- `schema.test.ts` and `expr.test.ts` are pure SQL-string assertions (call `.toSql()` and compare). When adding new operators/literals, add string-output tests there before any DB-level test.
- `@asmartbear/testutil` provides `T.eq`, `T.be`, `T.throws`. Match existing tests' style.
- `src/util.ts` is excluded from coverage (`coveragePathIgnorePatterns`).
- There is no Bear-DB integration test — `bear.ts` is exercised manually via `npm run go`.
