"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NUM = NUM;
const common_1 = require("./common");
/** The native `number` type */
class SmartNumber extends common_1.SmartType {
    constructor() {
        super("number");
    }
    input(x, strict = true) {
        if (typeof x === "number")
            return x;
        if (!strict) {
            if (typeof x === "boolean") {
                return x ? 1 : 0;
            }
            if (typeof x === "string") {
                const y = parseFloat(x); // try the native way
                if (!Number.isNaN(y) && x.match(/^[0-9\.-]+$/)) { // double-check it's not like "12foo"
                    return y;
                }
            }
        }
        throw new common_1.ValidationError(this, x);
    }
    isOfType(x) {
        return typeof x === "number";
    }
    visit(visitor, x) {
        return visitor.visitNumber(x);
    }
    toJSON(x) {
        if (typeof x === "number") {
            if (Number.isNaN(x))
                return "NaN";
            if (x === Number.POSITIVE_INFINITY)
                return "Inf";
            if (x === Number.NEGATIVE_INFINITY)
                return "-Inf";
            return x;
        }
        throw new common_1.ValidationError(this, x);
    }
    fromJSON(x) {
        switch (x) {
            case 'Inf': return Number.POSITIVE_INFINITY;
            case '-Inf': return Number.NEGATIVE_INFINITY;
            case 'NaN': return Number.NaN;
        }
        if (typeof x !== "number")
            throw new common_1.ValidationError(this, x, "Expected number");
        return x;
    }
    /** Validate that the number is at least as large as this, inclusive. */
    min(min) {
        return this.transformSameType(`min=${min}`, (x) => { if (x < min || Number.isNaN(x))
            throw new common_1.ValidationError(this, x, `Minimum threshold is ${min}`); return x; });
    }
    /** Validate that the number is at not larger than this, inclusive. */
    max(max) {
        return this.transformSameType(`max=${max}`, (x) => { if (x > max || Number.isNaN(x))
            throw new common_1.ValidationError(this, x, `Maximum threshold is ${max}`); return x; });
    }
    /** If the input is less or greater than some limit, set it to that limit.  Or `undefined` to ignore that limit. */
    clamp(min, max) {
        return this.transformSameType("clamped", (x) => {
            if (min !== undefined && x < min)
                x = min;
            if (max !== undefined && x > max)
                x = max;
            return x;
        });
    }
    /** Enforce the number is a (safe) integer value. */
    int() {
        return this.transformSameType(`int`, (x) => { if (!Number.isSafeInteger(x))
            throw new common_1.ValidationError(this, x, "Expected an integer"); return x; });
    }
}
/** Simple number */
function NUM() {
    return new SmartNumber();
}
//# sourceMappingURL=number.js.map