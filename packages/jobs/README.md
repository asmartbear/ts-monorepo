# Jobs

Simple job-runner with features:

* Max simultaneous threads, but also max-per-tag (changeable while running)
* Tasks dependent on specific other tasks being complete
* Tasks dependent on all tagged tasks being complete
* Wait for a specific task to complete
* Optional manual prioritization
* Optional caller-chosen key per task, to find unfinished tasks again

## Execution queue

* All else being equal, tasks are started in the order they were enqueued.
* Tasks are started by an optional priority ordering number.
* Tasks will not start based on (regardless of priority):
    * max running tasks per tag
    * dependency on specific other tasks
    * dependency on all tasks tagged by a given set of tags
* Tasks that have to wait maintain their position in the queue.
* Any error stops kicking off new tasks, allows existing tasks to complete, and the error is available.

## Tag limits and task keys

```typescript
const runner = new TaskRunner<"import" | "export">({ concurrencyPerTag: { import: 2 } })

// Change a tag's limit at any time; `undefined` removes it.
// Raising a limit starts waiting tasks at once.
runner.setTagConcurrency("export", 1)
runner.getTagConcurrency("import")    // 2

// `key` is yours: the runner never changes it (unlike `title`, which gets " [tags]" appended).
runner.addTask({ title: "Import a.csv", key: "a.csv", tags: ["import"] }, async () => { /* ... */ })

// Every task that is ready, waiting, or running — e.g. to avoid adding a second task for the same key.
const busy = new Set(runner.unfinishedTasks().map(task => task.key))
```

## Development Usage

Build:

```bash
npm run build
```

Unit tests:

```bash
npm run test
```

Unit tests, refreshed live:

```bash
npm run watch
```

Prepare for release (e.g. run tests and bump version number), then publish to npm:

```bash
npm run release && npm publish
```
