export type LogicalTimeConfig = {
    /**
     * The number of milliseconds to wait before switching back to system time.
     * This is used to keep the logical time in sync with the system time, but
     * also to prevent the system from running out of memory by generating too many
     * timestamps in a short period of time.
     *
     * Can use `0` to disable the backoff period, accessing system time on every call.
     */
    backoffPeriod?: number;
    /**
     * The function to use to get "the system time."  Must be an integer number of
     * milliseconds since the Unix epoch.  Can be used for clocks of various precision,
     * or for mocking / testing deterministically.
     */
    fSystemMillis?: () => number;
};
/**
 * Creates monotonically-increasing timestamps regardless of the precision and monoticity of the system clock.
 */
export default class LogicalTime {
    private lastTime;
    private inSystemTimeBackoffPeriod;
    private readonly backoffPeriod;
    private readonly fSystemMillis;
    /**
     * Create a new LogicalTime instance, with optional configuration.
     */
    constructor(config?: LogicalTimeConfig);
    /**
     * Returns a new timestamp that is guaranteed to be greater than any previous timestamp,
     * and never strays too far from system time, while also executing extremely quickly.
     */
    get now(): number;
    /**
     * Ensures that the current stamp is at least as late as the given stamp,
     * used to ensure monotonic increases after synchronizing with other systems.
     *
     * Also adds some random fuzz to the counter, to drastically reduce the chance
     * that the two systems would generate identical timestamps.
     */
    update(t: number): void;
    /**
     * Force the use of system time on the next call, even if we were in a backoff period.
     */
    useSystemTimeNext(): void;
}
