"use strict";
// Implementation of: https://longform.asmartbear.com/distributed-logical-time/
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * We subtract this from the system time to get a smaller number.  We want as many bits
 * as possible for our counter.
 */
var UNIX_MILLIS_EPOCH = 1764619700000;
/**
 * Because of the epoch subtraction, system time will never exceed this value.
 */
var MAX_UNIX_MILLIS = 4294967295000 - UNIX_MILLIS_EPOCH;
/**
 * We can multiply the system time by this much, and still not exceed the 2^53-1
 * limit of safe integer precision in JavaScript.  This leaves maximum space for the counter.
 * This currently allows for 3560 increments before we run into the millisecond area, and
 * about 3.5 million invocations per second to exceed the pace of wall-clock time.
 */
var COUNTER_MULTIPLIER = Math.floor(Number.MAX_SAFE_INTEGER / MAX_UNIX_MILLIS);
/**
 * Creates monotonically-increasing timestamps regardless of the precision and monoticity of the system clock.
 */
var LogicalTime = /** @class */ (function () {
    /**
     * Create a new LogicalTime instance, with optional configuration.
     */
    function LogicalTime(config) {
        var _a, _b;
        this.lastTime = 0;
        this.inSystemTimeBackoffPeriod = false;
        this.backoffPeriod = (_a = config === null || config === void 0 ? void 0 : config.backoffPeriod) !== null && _a !== void 0 ? _a : 100;
        this.fSystemMillis = (_b = config === null || config === void 0 ? void 0 : config.fSystemMillis) !== null && _b !== void 0 ? _b : Date.now;
    }
    Object.defineProperty(LogicalTime.prototype, "now", {
        /**
         * Returns a new timestamp that is guaranteed to be greater than any previous timestamp,
         * and never strays too far from system time, while also executing extremely quickly.
         */
        get: function () {
            // If we're in the backoff period, just increment the counter and don't ask for system time.
            if (this.inSystemTimeBackoffPeriod) {
                return ++this.lastTime; // super efficient!
            }
            // Generate a new stamp, but be careful that it's actually ahead of the counter we already have.
            var t = (this.fSystemMillis() - UNIX_MILLIS_EPOCH) * COUNTER_MULTIPLIER;
            if (t <= this.lastTime) {
                t = ++this.lastTime;
            }
            else {
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
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Ensures that the current stamp is at least as late as the given stamp,
     * used to ensure monotonic increases after synchronizing with other systems.
     *
     * Also adds some random fuzz to the counter, to drastically reduce the chance
     * that the two systems would generate identical timestamps.
     */
    LogicalTime.prototype.update = function (t) {
        if (t > this.lastTime) {
            this.lastTime = t + Math.floor(Math.random() * COUNTER_MULTIPLIER * 4);
        }
    };
    /**
     * Force the use of system time on the next call, even if we were in a backoff period.
     */
    LogicalTime.prototype.useSystemTimeNext = function () {
        this.inSystemTimeBackoffPeriod = false;
    };
    return LogicalTime;
}());
exports.default = LogicalTime;
//# sourceMappingURL=index.js.map