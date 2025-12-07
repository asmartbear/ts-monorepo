"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SET = SET;
const common_1 = require("./common");
class SmartSet extends common_1.SmartType {
    // We carry along the smart type belonging to the set elements.
    constructor(typ) {
        super(`Set(${typ.description})`);
        this.typ = typ;
    }
    // istanbul ignore next
    get constructorArgs() { return [this.typ]; }
    input(x, strict = true) {
        if (x === null || typeof x !== "object")
            throw new common_1.ValidationError(this, x, "Expected Array or Set");
        if (x instanceof Set)
            x = Array.from(x);
        if (Array.isArray(x))
            return new Set(x.map(y => this.typ.input(y, strict)));
        throw new common_1.ValidationError(this, x, "Expected Array or Set");
    }
    isOfType(x, deep) {
        if (!(x instanceof Set))
            return false;
        if (deep) {
            for (const y of x) {
                if (!this.typ.isOfType(y, deep))
                    return false;
            }
        }
        return true;
    }
    visit(visitor, x) {
        return visitor.visitSet(Array.from(x).sort().map(y => this.typ.visit(visitor, y)));
    }
    toJSON(x) {
        return Array.from(x).map(y => this.typ.toJSON(y));
    }
    fromJSON(js) {
        if (!Array.isArray(js))
            throw new common_1.ValidationError(this, js, "Expected array");
        return new Set(js.map(y => this.typ.fromJSON(y)));
    }
}
/** A `Set<T>` with arbitrary types. */
function SET(elementType) {
    return new SmartSet(elementType);
}
//# sourceMappingURL=set.js.map