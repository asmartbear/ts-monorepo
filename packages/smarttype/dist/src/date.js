"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DATE = DATE;
const common_1 = require("./common");
class SmartDate extends common_1.SmartType {
    constructor() {
        super("date");
    }
    input(x, strict = true) {
        if (x instanceof Date)
            return x;
        if (typeof x === "string") {
            const d = new Date(x);
            if (isNaN(d.getTime()) || x.length < 5)
                throw new common_1.ValidationError(this, x, "Invalid Date string");
            return d;
        }
        throw new common_1.ValidationError(this, x);
    }
    visit(visitor, x) {
        return visitor.visitDate(x);
    }
    isOfType(x) {
        return x instanceof Date;
    }
    toJSON(x) {
        return x.getTime(); // the most efficient representation
    }
    fromJSON(x) {
        return new Date(x);
    }
}
/** `Date` object, can be parsed from a string, encoded as a number in JSON */
function DATE() {
    return new SmartDate();
}
//# sourceMappingURL=date.js.map