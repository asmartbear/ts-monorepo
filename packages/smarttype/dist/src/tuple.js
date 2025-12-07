"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TUPLE = TUPLE;
const simplified_1 = require("@asmartbear/simplified");
const common_1 = require("./common");
class SmartTuple extends common_1.SmartType {
    // We carry along the smart type belonging to the array elements.
    constructor(types) {
        super('[' + types.map(t => t.description).join(',') + ']');
        this.types = types;
    }
    // istanbul ignore next
    get constructorArgs() { return [this.types]; }
    get keys() {
        // Our numeric indicies are effectively keys.
        return new Set(this.types.map((_, i) => i.toString()));
    }
    input(x, strict = true) {
        if (!(0, simplified_1.isIterable)(x))
            throw new common_1.ValidationError(this, x);
        const a = Array.from(x); // convert to Array even if it isn't already
        if (a.length !== this.types.length)
            throw new common_1.ValidationError(this, x, "Tuple of the wrong length");
        const result = [];
        for (let i = 0; i < this.types.length; ++i) {
            const z = this.types[i].inputReturnError(a[i], strict);
            if (z instanceof common_1.ValidationError) {
                z.addPath(i);
                throw z;
            }
            result.push(z);
        }
        return result;
    }
    isOfType(x, deep) {
        if (!Array.isArray(x) || x.length !== this.types.length)
            return false;
        if (deep) {
            for (let i = 0; i < this.types.length; ++i) {
                if (!this.types[i].isOfType(x[i], deep))
                    return false;
            }
        }
        return true;
    }
    visit(visitor, x) {
        return visitor.visitTuple(x.map((y, i) => this.types[i].visit(visitor, y)));
    }
    toJSON(x) {
        return x.map((y, i) => this.types[i].toJSON(y));
    }
    fromJSON(js) {
        return js.map((x, i) => this.types[i].fromJSON(x));
    }
}
/** An array of fixed length and types */
function TUPLE(...types) {
    return new SmartTuple(types);
}
//# sourceMappingURL=tuple.js.map