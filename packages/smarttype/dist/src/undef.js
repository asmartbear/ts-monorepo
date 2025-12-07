"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JS_UNDEFINED_SIGNAL = void 0;
exports.UNDEF = UNDEF;
const common_1 = require("./common");
exports.JS_UNDEFINED_SIGNAL = "__undefined__";
class SmartUndefined extends common_1.SmartType {
    constructor() {
        super("undefined");
    }
    get canBeUndefined() { return true; }
    input(x, strict = true) {
        if (typeof x === "undefined")
            return x;
        throw new common_1.ValidationError(this, x);
    }
    isOfType(x) {
        return x === undefined;
    }
    visit(visitor, x) {
        return visitor.visitUndefined(x);
    }
    toJSON(x) {
        if (x === undefined)
            return exports.JS_UNDEFINED_SIGNAL;
        throw new common_1.ValidationError(this, x);
    }
    fromJSON(x) {
        if (x === exports.JS_UNDEFINED_SIGNAL)
            return undefined;
        throw new common_1.ValidationError(this, x);
    }
}
SmartUndefined.SINGLETON = new SmartUndefined();
/** The `undefined` value */
function UNDEF() {
    return SmartUndefined.SINGLETON;
}
//# sourceMappingURL=undef.js.map