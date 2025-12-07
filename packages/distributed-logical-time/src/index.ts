// Implementation of: https://longform.asmartbear.com/distributed-logical-time/

/**
 * We subtract this from the system time to get a smaller number.  We want as many bits
 * as possible for our counter.
 */
const UNIX_MILLIS_EPOCH = 1764619700000

/**
 * Because of the epoch subtraction, system time will never exceed this value.
 */
const MAX_UNIX_MILLIS = 4294967295000 - UNIX_MILLIS_EPOCH

/**
 * We can multiply the system time by this much, and still not exceed the 2^53-1
 * limit of safe integer precision in JavaScript.  This leaves maximum space for the counter.
 * This currently allows for 3560 increments before we run into the millisecond area, and
 * about 3.5 million invocations per second to exceed the pace of wall-clock time.
 */
const COUNTER_MULTIPLIER = Math.floor(Number.MAX_SAFE_INTEGER / MAX_UNIX_MILLIS)

export type LogicalTimeConfig = {
  /**
   * The number of milliseconds to wait before switching back to system time.
   * This is used to keep the logical time in sync with the system time, but
   * also to prevent the system from running out of memory by generating too many
   * timestamps in a short period of time.
   * 
   * Can use `0` to disable the backoff period, accessing system time on every call.
   */
  backoffPeriod?: number

  /**
   * The function to use to get "the system time."  Must be an integer number of
   * milliseconds since the Unix epoch.  Can be used for clocks of various precision,
   * or for mocking / testing deterministically.
   */
  fSystemMillis?: () => number
}

/**
 * Creates monotonically-increasing timestamps regardless of the precision and monoticity of the system clock.
 */
export default class LogicalTime {

  private lastTime: number = 0;
  private inSystemTimeBackoffPeriod: boolean = false;
  private readonly backoffPeriod: number;
  private readonly fSystemMillis: () => number;

  /**
   * Create a new LogicalTime instance, with optional configuration.
   */
  constructor(config?: LogicalTimeConfig) {
    this.backoffPeriod = config?.backoffPeriod ?? 100;
    this.fSystemMillis = config?.fSystemMillis ?? Date.now;
  }

  /**
   * Returns a new timestamp that is guaranteed to be greater than any previous timestamp,
   * and never strays too far from system time, while also executing extremely quickly.
   */
  get now(): number {

    // If we're in the backoff period, just increment the counter and don't ask for system time.
    if (this.inSystemTimeBackoffPeriod) {
      return ++this.lastTime;     // super efficient!
    }

    // Generate a new stamp, but be careful that it's actually ahead of the counter we already have.
    let t = (this.fSystemMillis() - UNIX_MILLIS_EPOCH) * COUNTER_MULTIPLIER;
    if (t <= this.lastTime) {
      t = ++this.lastTime;
    } else {
      this.lastTime = t;
    }

    // Create a backoff in case more stamps are about to be generated.  But keep the timeframe small,
    // to stay reasonably current with system time, and because the existence of the timer will prevent
    // Node applications from exiting, so we want this short enough that no one would notice.
    if (this.backoffPeriod > 0) {
      this.inSystemTimeBackoffPeriod = true;
      setTimeout(this.useSystemTimeNext.bind(this), this.backoffPeriod);
    }

    // Done
    return t;
  }

  /**
   * Ensures that the current stamp is at least as late as the given stamp,
   * used to ensure monotonic increases after synchronizing with other systems.
   * 
   * Also adds some random fuzz to the counter, to drastically reduce the chance
   * that the two systems would generate identical timestamps.
   */
  update(t: number): void {
    if (t > this.lastTime) {
      this.lastTime = t + Math.floor(Math.random() * COUNTER_MULTIPLIER * 4)
    }
  }

  /**
   * Force the use of system time on the next call, even if we were in a backoff period.
   */
  useSystemTimeNext(): void {
    this.inSystemTimeBackoffPeriod = false;
  }

}