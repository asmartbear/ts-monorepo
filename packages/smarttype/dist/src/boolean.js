"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BOOL = BOOL;
const common_1 = require("./common");
/** The native `boolean` type */
class SmartBoolean extends common_1.SmartType {
    constructor() {
        super("boolean");
    }
    input(x, strict = true) {
        if (typeof x === "boolean")
            return x;
        if (!strict) {
            if (!x)
                return false;
            if (typeof x === "object") {
                if (Array.isArray(x))
                    return x.length > 0;
                return Object.keys(x).length > 0;
            }
            return true;
        }
        throw new common_1.ValidationError(this, x);
    }
    isOfType(x) {
        return typeof x === "boolean";
    }
    visit(visitor, x) {
        return visitor.visitBoolean(x);
    }
    toJSON(x) {
        if (typeof x === "boolean")
            return x;
        throw new common_1.ValidationError(this, x);
    }
    fromJSON(x) {
        if (typeof x === "boolean")
            return x;
        throw new common_1.ValidationError(this, x);
    }
}
/** Simple boolean */
function BOOL() {
    return new SmartBoolean();
}
//# sourceMappingURL=boolean.js.map