import LogicalTime from '../src/index'

const TEST_UNIX_MILLIS = 1766137648000

test("basic increment", () => {
  const lt = new LogicalTime()
  let t1 = lt.now
  for (let i = 0; i < 10; i++) {
    const t2 = lt.now
    expect(t2).toEqual(t1 + 1)    // because we're in counter mode
    t1 = t2
  }
});

test("refresh system time", async () => {
  const lt = new LogicalTime({ backoffPeriod: 100 })
  const t1 = lt.now
  await new Promise((resolve) => setTimeout(resolve, 50))
  const t2 = lt.now
  expect(t2).toEqual(t1 + 1)    // still in incremental period
  lt.useSystemTimeNext()
  const t3 = lt.now
  expect(t3).toBeGreaterThan(t2)    // should be greater than last time
  expect(t3).toBeGreaterThan(t2 + 1)    // and greater than just increment
});

test("disabling backoff period", async () => {
  let rt = TEST_UNIX_MILLIS
  const lt = new LogicalTime({ backoffPeriod: 0, fSystemMillis: () => rt })
  const t1 = lt.now
  const t2 = lt.now
  expect(t2).toEqual(t1 + 1)    // still in incremental period because system clock hasn't ticked over
  rt += 100  // move system time forward
  const t3 = lt.now
  expect(t3).toBeGreaterThan(t2)    // should be greater than last time
  expect(t3).toBeGreaterThan(t2 + 1)    // and greater than just increment
});

test("update", async () => {
  let rt1 = TEST_UNIX_MILLIS
  let rt2 = TEST_UNIX_MILLIS + 30000    // 30s seconds ahead
  const lt1 = new LogicalTime({ backoffPeriod: 0, fSystemMillis: () => rt1 })
  const lt2 = new LogicalTime({ backoffPeriod: 0, fSystemMillis: () => rt2 })

  const t1 = lt1.now
  const t2 = lt2.now
  expect(t1).toBeLessThan(t2)    // t1 is behind t2

  // Updating later-time from earlier-time has no appreciable effect
  lt2.update(t1)
  const t2a = lt2.now
  expect(t2a).toEqual(t2 + 1)    // only incremented because there was no update

  // Updating with self-time has no effect; just increments
  lt2.update(t2a)
  const t2b = lt2.now
  expect(t2b).toEqual(t2a + 1)    // only incremented because there was no update

  // Updating earlier-time from later-time updates, plus a random amount more
  lt1.update(t2b)
  const t1a = lt1.now
  expect(t1a).toBeGreaterThan(t1)    // should be greater than last time
  expect(t1a).toBeGreaterThan(t1 + 1)    // and greater than just increment
  expect(t1a).toBeGreaterThan(t2b)    // also exceeds where lt2 got to
  expect(t1a).toBeGreaterThan(t2b + 1)    // and greater than just increment
});
