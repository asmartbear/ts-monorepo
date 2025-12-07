"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NIL = NIL;
const common_1 = require("./common");
class SmartNull extends common_1.SmartType {
    constructor() {
        super("null");
    }
    input(x, strict = true) {
        if (x === null)
            return null;
        throw new common_1.ValidationError(this, x);
    }
    isOfType(x) {
        return x === null;
    }
    visit(visitor, x) {
        return visitor.visitNull(x);
    }
    toJSON(x) {
        if (x === null)
            return x;
        throw new common_1.ValidationError(this, x);
    }
    fromJSON(x) {
        if (x === null)
            return x;
        throw new common_1.ValidationError(this, x);
    }
}
/** The `null` value */
function NIL() {
    return new SmartNull();
}
//# sourceMappingURL=null.js.map