# ts-monorepo — Shared TypeScript Libraries

A monorepo of independently-versioned TypeScript packages published to npm under the `@asmartbear/*` scope. Every package is a small, focused library reused across Jason's projects — anything from a SQLite wrapper to a string-continuum generator to a CLI status display.

**Single-author project.** This repo is Jason's. Project-scoped Claude Code configuration here (`.claude/skills/`, `.claude/agents/`, settings, this file, per-package `CLAUDE.md`s) is the right home for tooling — prefer it over `~/.claude/` unless something is genuinely cross-project.

## Monorepo Mechanics

This is an **npm workspaces + Turborepo + Changesets** monorepo. The three tools each own one concern:

- **npm workspaces** (root `package.json` → `"workspaces": ["packages/*"]`) — installs all package dependencies into a single hoisted `node_modules`. Cross-package deps are linked via symlinks, not registry installs. Inside a `@asmartbear/*` package, dependencies on other `@asmartbear/*` packages are declared with version `"*"` so they always resolve to the local workspace copy.
- **Turborepo** (`turbo.json`) — orchestrates `build` and `test` across packages, respecting the dependency graph (`^build` means "build my deps first") and caching results. `concurrency: 50%` runs roughly half the CPU cores in parallel.
- **Changesets** (`.changeset/`) — per-package semver bumping and changelog generation. Each user-facing change should add a changeset declaring which packages bumped and at what level (patch/minor/major).

Every package is **TypeScript composite project** (`"composite": true` in `tsconfig.json`) so cross-package type-checking and incremental builds work correctly. Build outputs go to `packages/<name>/dist/` and are what's published to npm; source lives in `packages/<name>/src/`.

Test runner is **Jest** (with `ts-jest`), not Vitest. Each package has its own `jest` config block in its `package.json`, and `moduleNameMapper` rewrites `@asmartbear/<pkg>` imports to the sibling package's `src/` directory so tests run against current source (not stale `dist/`).

## Repository Layout

```
packages/                  # all workspace packages (see Package Index below)
  <name>/
    src/                   # TypeScript source
    test/                  # Jest tests (or test files alongside src/)
    dist/                  # compiled output (gitignored, published to npm)
    package.json
    tsconfig.json
    CLAUDE.md              # per-package guidance — READ THIS before editing the package
.changeset/                # pending changesets + config
turbo.json                 # Turborepo task graph
import.sh                  # script for importing a standalone package into this monorepo
package.json               # workspaces root + release scripts
```

## Package Index

Read the package's own `CLAUDE.md` before editing it — these one-liners are just for orientation.

| Package | Purpose |
|---|---|
| **beardb** | Document-database backed by Bear (the macOS notes app) over its SQLite store. Depends on `filesystem`, `simplified`, `smarttype`, `sqlight`. |
| **citation** | Parse and load bibliographic citations (DOI, ISBN, URL metascraping) using `@citation-js`. |
| **continuum** | Generate strings that sort lexicographically between any two other strings — useful for ordered-list reordering without renumbering. |
| **distributed-logical-time** | Distributed logical-time / vector-clock algorithm in TypeScript. No deps. |
| **dyn** | Dynamic array / iterable / list / map utilities with strong TypeScript inference. |
| **env** | Environment-variable parsing and config utilities. |
| **filesystem** | Class-based filesystem access with Promise-based ergonomics over `fs`. |
| **jobs** | In-process job runner with priorities, dependencies, and tag-grouping. |
| **objectid** | Tiny library to attach unique IDs to JS objects without side-effects (uses `WeakMap`). |
| **packed** | Serialize structured data to a compact byte buffer. Depends on `continuum`. |
| **proxy-object** | Objects that quack like `Array`/`Set`/etc. by delegating basic operations. Depends on `dyn`. |
| **simplified** | Simplify and walk arbitrary JSON-like data structures. |
| **smarttype** | Data types that parse, validate, transform, marshal, compare, and hash — the project's typed-data backbone. Depends on `simplified`. |
| **sqlight** | TypeScript-safe SQL builder for SQLite. Depends on `dyn`, `filesystem`. |
| **status** | Multi-job status display for the command line (live-updating terminal UI). |
| **testutil** | Jest test utilities used across the other packages. Depends on `simplified`. |

Dependency direction (rough): `simplified` and `dyn` are at the bottom; `smarttype`, `filesystem`, `sqlight` build on those; `beardb` sits on top of much of the stack.

## Common Operations

All commands run from the repo root unless noted.

```bash
# Install everything (one hoisted node_modules)
npm install

# Build / test / clean ALL packages (Turborepo handles graph + cache)
npm run build
npm run test
npm run clean

# Operate on ONE package
npm run build --workspace=packages/<name>
npm test  --workspace=packages/<name>
npm run type-check --workspace=packages/<name>

# Operate on SEVERAL packages
npm test --workspace=packages/beardb --workspace=packages/sqlight

# Add a dependency to a single package
npm install <dep> --workspace=packages/<name>

# Run a TS file directly from a package (no compile step)
cd packages/<name> && npx tsx src/<file>.ts

# Re-run with Turbo cache cleared (force rebuild)
npx turbo run build --force
```

### Importing an existing package into the monorepo

`./import.sh /path/to/some-standalone-pkg` copies a sibling TypeScript repo into `packages/<name>/`, rewrites its `package.json` to monorepo conventions (repo URLs, devDependencies, `@asmartbear/*` deps → `"*"`, jest moduleNameMapper, composite tsconfig), then installs / builds / tests it. Use this only when bringing a new external package in — not for ongoing edits.

## Release / Deploy

Releases are driven by **Changesets**. There is no CI publish — `npm run publish` from a clean working tree on `main` is how things ship.

```bash
# 1. As you make user-facing changes, record what bumped
npx changeset add
#    Choose affected packages and patch / minor / major. This writes a markdown
#    file under .changeset/ that travels with the PR/commit.

# 2. Cut versions (builds + tests everything first; only bumps if green)
npm run version
#    Runs: turbo run build && turbo run test && changeset version
#    `changeset version` consumes pending .changeset/*.md files, bumps each
#    package.json, updates CHANGELOGs, and deletes the consumed changesets.

# 3. Review and commit the version bump
git add .
git commit -m "Version packages"

# 4. Publish to npm + push tags
npm run publish
#    Runs: changeset publish && git push --follow-tags
#    `changeset publish` publishes each newly-versioned package to npm
#    (access is "restricted" per .changeset/config.json — published as private
#    scoped packages unless individual package.json overrides).
```

If a build or test fails during `npm run version`, fix it before re-running — never bypass.

## Planning

- Enter plan mode for any non-trivial task (3+ steps or architectural decisions).
- Use plan mode for verification steps, not just building.
- Track progress: mark items complete as you go, explain changes at each step.

## Subagent Strategy

- Use subagents liberally to keep the main context window clean.
- Offload research, exploration, and parallel analysis to subagents.
- For complex problems, throw more compute at it via subagents.
- One task per subagent for focused execution.

## Memory

- You remember nothing across sessions unless you write it down — "I'll remember" is a lie. "Write it down" means a tracked file in this repo, **never** the auto-memory system (`MEMORY.md` and the files it indexes — outside the codebase, not reviewable).
- On ANY correction, preference, or surprising discovery: write it down NOW, before responding. The right home:
  - Rules about how to work in this monorepo as a whole → root `CLAUDE.md` (this file).
  - Rules specific to one package → that package's `packages/<name>/CLAUDE.md`.
  - Why a specific piece of code is the way it is → a code comment next to the code (TSDoc for the contract, inline `//` for the reasoning).
- If corrected for not following an existing instruction, fix the source instruction — don't add a parallel note.
- Write short, rule-like entries. After writing, tell the user what file you updated.
- **In plan mode, never plan to write to the auto-memory system.** Every plan's "where this lives" answer must be a tracked file.

## Git

- **Never commit unless explicitly asked.** Make the edits, report what changed, and stop. "Save and report" is the default; committing requires a direct instruction in the current turn. A standing preference for clean history, or having committed earlier in the session, is not authorization for the next commit. When in doubt, don't commit and ask.
- Commit messages: imperative mood, concise summary line.
- One logical change per commit.
- **No `Co-Authored-By: Claude` trailer** (private, single-author repo).
- **Don't commit without a changeset** when the change is user-facing — run `npx changeset add` first so the next `npm run version` knows what to bump.

---

# TypeScript Rules (apply to every package)

Every package in this repo is TypeScript. These rules are the baseline; a package's own `CLAUDE.md` may tighten them but not relax them.

## Build & Run (per-package)

```bash
# From a package directory (packages/<name>/)
npm run build           # tsc
npm run type-check      # tsc --noEmit
npm test                # jest
npm run watch           # jest --watchAll
npm run coverage        # jest --coverage
npm run clean           # rimraf dist *.tsbuildinfo coverage

# Or from the repo root
npm run build --workspace=packages/<name>
npm test  --workspace=packages/<name>
```

Use `npx tsx src/<file>.ts` from inside a package to run a TypeScript file directly (no compile step). Some packages expose a `go` script (`npm run go`) wired to `tsx src/go.ts` for ad-hoc experiments — feel free to use it.

## TypeScript

- Strict mode — no `any` unless absolutely necessary.
- Explicit types on all function parameters and return values; never rely on inference for signatures.
- Prefer `type` over `interface` unless declaration merging is needed.
- Use named exports, not default exports.
- `const` by default; `let` only when reassignment is needed.
- Prefer explicit error types over thrown exceptions where practical.
- Keep functions small and focused; prefer pure functions.
- Never duplicate logic across functions — if two functions share the same traversal, filtering, or computation pattern, extract it into a single shared helper immediately. When you spot existing duplication during any task, refactor it before moving on.
- Use descriptive names — no abbreviations except widely understood ones (`id`, `url`).
- Define magic numbers and configuration values as named constants near the top of the file.
- Never create parallel tables/records keyed by the same identifier — consolidate into a single registry of structured entries so adding an item means one edit, not N.
- Cross-package imports use the package name (`@asmartbear/dyn`), not relative paths into a sibling package's `src/`. The workspace symlink + jest `moduleNameMapper` handles the rest.

## Elegance

- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: rethink and implement the elegant solution.
- Skip this for simple, obvious fixes — don't over-engineer.
- Challenge your own work before presenting it.

## Documentation

- TSDoc (`/** ... */`) on every function: purpose, `@param`, `@returns`, `@throws`.
- One-line TSDoc (`/** ... */`) on every exported constant (not `//` — IDEs ignore plain comments).
- TSDoc describes **what it does**, never **how it works** — callers need the contract, not the implementation. "Fetches the note by ID" not "queries the SQLite database and decodes the protobuf blob".
- Implementation details go in module-level comments at the top of the file or as inline comments inside the function body — never in TSDoc.
- This applies to all externally-visible documentation: function TSDoc, type/constant TSDoc, `@param`/`@returns` descriptions.
- **Capture future-editor knowledge in comments, always.** When you make a non-obvious decision, choose an opinionated default, work around a gotcha, or learn something that would help whoever edits this code next, write it down as a code comment right then — even unprompted. Put the *why* (and what to change if the assumption breaks) next to the code: module-level comment for cross-cutting context, inline comment for a single tricky line, TSDoc only for caller-facing contract. The test: if you'd have wanted to know it before this edit, the next editor will too.
- Because these packages are **published to npm**, exported TSDoc is the public API documentation. Treat it accordingly.

## Testing & Verification

- **Jest** (not Vitest), via `ts-jest`. Most packages run with `--runInBand` for deterministic ordering.
- Test files live in `test/` (mirroring `src/`) or alongside source as `*.test.ts` — follow whatever the package already does.
- **Bug fixes and behavior changes to existing code → TDD (mandatory):**
  1. Write tests FIRST that reproduce the bug or document the new desired behavior.
  2. Run tests — confirm they FAIL (this validates the test catches the real issue).
  3. Write the fix / implementation.
  4. Run tests — loop on the code (not the tests) until green.
- **Brand-new code** (new files, new functions with no prior behavior): tests can be written alongside or after, but must exist before the task is complete.
- Use real data from bug reports, patch files, or logs as test fixtures when available.
- After any code change, run `npm test` and `npm run type-check` in the affected package(s) to verify correctness.
- For cross-package changes, run `npm run build && npm test` at the repo root so Turborepo verifies the whole graph.
- Loop (fix → re-run) until both tests and type-checking pass before returning to the user.
- Never mark a task complete without proving it works.
- Diff behavior between main and your changes when relevant.
- Ask yourself: "Would a senior staff engineer approve this?"
