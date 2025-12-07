"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LITERAL = LITERAL;
const common_1 = require("./common");
class SmartLiteral extends common_1.SmartType {
    constructor(values) {
        super('(' + values.map(String).sort().join('|') + ')');
        this.values = values;
    }
    // istanbul ignore next
    get constructorArgs() { return [this.values]; }
    input(x, strict = true) {
        if ((0, common_1.isPrimative)(x)) {
            const i = this.values.indexOf(x);
            if (i >= 0) {
                return this.values[i]; // found, and use our constant and consistent object
            }
        }
        throw new common_1.ValidationError(this, x);
    }
    isOfType(x) {
        if ((0, common_1.isPrimative)(x)) {
            const i = this.values.indexOf(x);
            if (i >= 0)
                return true;
        }
        return false;
    }
    visit(visitor, x) {
        switch (typeof x) {
            // case 'undefined': return visitor.visitUndefined(x)
            case 'boolean': return visitor.visitBoolean(x);
            case 'number': return visitor.visitNumber(x);
            case 'string': return visitor.visitString(x);
            case 'object': return visitor.visitNull(x);
        }
    }
    toJSON(x) {
        return x;
    }
    fromJSON(js) {
        return this.input(js, true); // check types and normalize
    }
}
/** One of a given specific set of literal, primative values. */
function LITERAL(...values) {
    return new SmartLiteral(values);
}
//# sourceMappingURL=literal.js.map