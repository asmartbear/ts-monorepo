import 'jest';      // Ref: https://jestjs.io/docs/en/expect#reference
import { Task, TaskRunner, TaskState } from '../src/index'

/** The tags used by these tests: `p` is the limited tag, `q` is never limited. */
type TestTag = "p" | "q"

/** Worker count for every runner here; more than any tag limit, so only the tag limits hold tasks back. */
const CONCURRENCY_LEVEL = 4

/** How long `waitUntil` polls before it fails the test. */
const WAIT_TIMEOUT_MS = 2000

/** How long to wait before asserting that something did NOT happen. */
const SETTLE_MS = 20

/**
 * Waits the given number of milliseconds.
 *
 * @param ms Milliseconds to wait.
 * @returns A promise that resolves after the wait.
 */
function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Waits until a condition is true, polling every millisecond.
 *
 * @param condition The condition to wait for.
 * @param what A description of the condition, for the failure message.
 * @returns A promise that resolves when the condition is true.
 * @throws Error when the condition is still false after `WAIT_TIMEOUT_MS`.
 */
async function waitUntil(condition: () => boolean, what: string): Promise<void> {
  const tEnd = Date.now() + WAIT_TIMEOUT_MS
  while (!condition()) {
    if (Date.now() > tEnd) throw new Error(`Timed out waiting for: ${what}`)
    await wait(1)
  }
}

/** A promise that a test opens by hand, so a task runs until the test lets it finish. */
type Gate = {
  readonly opened: Promise<void>,
  open: () => void,
}

/**
 * Makes a closed gate.
 *
 * @returns A gate whose `opened` promise resolves when `open()` is called.
 */
function makeGate(): Gate {
  let open: () => void = () => { }
  const opened = new Promise<void>(resolve => { open = resolve })
  return { opened, open }
}

/**
 * Makes a running runner with tasks that wait on gates, and records which tasks started.
 *
 * @param concurrencyPerTag Tag limits given to the runner's constructor.
 * @returns The runner, helpers to add gated tasks, and `finish()` to end the run and check it had no error.
 */
function startGatedRunner(concurrencyPerTag: Partial<Record<TestTag, number>> = {}) {
  const runner = new TaskRunner<TestTag>({ concurrencyLevel: CONCURRENCY_LEVEL, showStatus: false, concurrencyPerTag })
  runner.setStayAlive(true)
  const started: string[] = []
  const gates = new Map<string, Gate>()
  let maxRunningP = 0

  /** Adds a task tagged `p` that records its start and runs until its gate opens. */
  const addGated = (title: string, priority: number): Task<TestTag> => {
    const gate = makeGate()
    gates.set(title, gate)
    return runner.addTask({ title, tags: ["p"], priority }, async () => {
      started.push(title)
      maxRunningP = Math.max(maxRunningP, runner.numRunningTasksByTag.get("p") ?? 0)
      await gate.opened
    })
  }

  const running = runner.run()

  /** Opens every gate, ends the run, and checks it had no error. */
  const finish = async (): Promise<void> => {
    for (const gate of gates.values()) gate.open()
    runner.setStayAlive(false)
    await running
    expect(runner.error).toBeNull()
  }

  return {
    runner, running, started, addGated, finish,
    open: (title: string): void => gates.get(title)!.open(),
    maxRunningP: (): number => maxRunningP,
    runningP: (): number => runner.numRunningTasksByTag.get("p") ?? 0,
  }
}

test("construction", () => {
  const m = new TaskRunner({});
});

describe("Task key", () => {

  test("round-trips, and the title's tag suffix does not change it", () => {
    const runner = new TaskRunner<TestTag>({ concurrencyLevel: CONCURRENCY_LEVEL })
    const task = runner.addTask({ title: "Card", key: "root|proc|Cards/Card.md", tags: ["p", "q"] }, () => { })
    expect(task.key).toBe("root|proc|Cards/Card.md")
    expect(task.title).toBe("Card [p, q]")
  })

  test("is undefined when not given", () => {
    const runner = new TaskRunner<TestTag>({ concurrencyLevel: CONCURRENCY_LEVEL })
    const task = runner.addTask({ title: "Card", tags: ["p"] }, () => { })
    expect(task.key).toBeUndefined()
  })
})

describe("setTagConcurrency", () => {

  test("a limit of 1 runs three tasks of that tag one at a time", async () => {
    const r = startGatedRunner()
    r.runner.setTagConcurrency("p", 1)
    expect(r.runner.getTagConcurrency("p")).toBe(1)
    r.addGated("A", 0)
    r.addGated("B", 1)
    r.addGated("C", 2)

    await waitUntil(() => r.started.length === 1, "A starts")
    await wait(SETTLE_MS)
    expect(r.started).toEqual(["A"])

    r.open("A")
    await waitUntil(() => r.started.length === 2, "B starts")
    await wait(SETTLE_MS)
    expect(r.started).toEqual(["A", "B"])

    r.open("B")
    await waitUntil(() => r.started.length === 3, "C starts")
    expect(r.started).toEqual(["A", "B", "C"])

    await r.finish()
    expect(r.maxRunningP()).toBe(1)
  })

  test("raising the limit to 2 while two tasks wait starts one more at once", async () => {
    const r = startGatedRunner({ p: 1 })
    r.addGated("A", 0)
    r.addGated("B", 1)
    r.addGated("C", 2)
    await waitUntil(() => r.started.length === 1, "A starts")
    await wait(SETTLE_MS)
    expect(r.started).toEqual(["A"])

    // A still runs: no task finished, so only the new limit can start B.
    r.runner.setTagConcurrency("p", 2)
    await waitUntil(() => r.started.length === 2, "B starts")
    await wait(SETTLE_MS)
    expect(r.started).toEqual(["A", "B"])
    expect(r.runningP()).toBe(2)

    await r.finish()
    expect(r.maxRunningP()).toBe(2)
  })

  test("undefined removes the limit, which starts every waiting task", async () => {
    const r = startGatedRunner({ p: 1 })
    expect(r.runner.getTagConcurrency("p")).toBe(1)
    r.addGated("A", 0)
    r.addGated("B", 1)
    r.addGated("C", 2)
    await waitUntil(() => r.started.length === 1, "A starts")

    r.runner.setTagConcurrency("p", undefined)
    expect(r.runner.getTagConcurrency("p")).toBeUndefined()
    await waitUntil(() => r.started.length === 3, "B and C start")
    expect(r.runningP()).toBe(3)

    await r.finish()
  })

  test("rejects a negative or NaN limit", () => {
    const runner = new TaskRunner<TestTag>({ concurrencyLevel: CONCURRENCY_LEVEL })
    expect(() => runner.setTagConcurrency("p", -1)).toThrow(RangeError)
    expect(() => runner.setTagConcurrency("p", NaN)).toThrow(RangeError)
  })
})

describe("unfinishedTasks", () => {

  test("lists ready, waiting and running tasks, and drops finished and errored ones", async () => {
    const r = startGatedRunner({ p: 1 })

    // Before the workers take them, both tasks are in the ready queue.
    const a = r.addGated("A", 0)
    const b = r.addGated("B", 1)
    expect(r.runner.unfinishedTasks()).toEqual(expect.arrayContaining([a, b]))
    expect(r.runner.unfinishedTasks()).toHaveLength(2)

    // A runs, B waits for the tag limit, and a quick untagged task finishes.
    const quick = r.runner.addTask({ title: "Quick", tags: ["q"] }, () => { })
    await waitUntil(() => quick.state === TaskState.Done && a.state === TaskState.Running, "Quick done and A running")
    expect(b.state).toBe(TaskState.New)
    const unfinished = r.runner.unfinishedTasks()
    expect(unfinished).toHaveLength(2)
    expect(unfinished).toEqual(expect.arrayContaining([a, b]))
    expect(r.runner.unfinishedTasks()).not.toBe(unfinished)    // a new array each call

    // A and B finish.
    r.open("A")
    r.open("B")
    await waitUntil(() => b.state === TaskState.Done, "B done")
    expect(r.runner.unfinishedTasks()).toEqual([])

    // A task that throws is dropped too; a task still running stays.
    const slow = r.addGated("Slow", 0)
    await waitUntil(() => slow.state === TaskState.Running, "Slow running")
    const bad = r.runner.addTask({ title: "Bad" }, () => { throw new Error("boom") })
    await waitUntil(() => bad.state === TaskState.Error, "Bad errored")
    expect(r.runner.unfinishedTasks()).toEqual([slow])

    r.open("Slow")
    r.runner.setStayAlive(false)
    await waitUntil(() => slow.state === TaskState.Done, "Slow done")
    await r.running
    expect(r.runner.unfinishedTasks()).toEqual([])
    expect(r.runner.error?.task).toBe(bad)
  })
})
