"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ARRAY = ARRAY;
const simplified_1 = require("@asmartbear/simplified");
const common_1 = require("./common");
class SmartArray extends common_1.SmartType {
    // We carry along the smart type belonging to the array elements.
    constructor(elementType) {
        super(elementType.description + '[]');
        this.elementType = elementType;
    }
    get constructorArgs() { return [this.elementType]; }
    input(x, strict) {
        if (!(0, simplified_1.isIterable)(x))
            throw new common_1.ValidationError(this, x);
        const result = [];
        for (const y of x) {
            const z = this.elementType.inputReturnError(y, strict);
            if (z instanceof common_1.ValidationError) {
                z.addPath(result.length);
                throw z;
            }
            result.push(z);
        }
        return result;
    }
    isOfType(x, deep) {
        if (!Array.isArray(x))
            return false;
        if (deep) {
            for (const y of x) {
                if (!this.elementType.isOfType(y, deep))
                    return false;
            }
        }
        return true;
    }
    visit(visitor, x) {
        return visitor.visitArray(x.map(y => this.elementType.visit(visitor, y)));
    }
    toJSON(x) {
        return x.map(el => this.elementType.toJSON(el));
    }
    fromJSON(x) {
        return x.map(el => this.elementType.fromJSON(el));
    }
    /** Validate that the array has at least this elements. */
    minLen(min) {
        return this.transformSameType(`minLen=${min}`, (a) => {
            if (a.length < min)
                throw new common_1.ValidationError(this, a);
            return a;
        });
    }
}
/** Generic string */
function ARRAY(elementType) {
    return new SmartArray(elementType);
}
//# sourceMappingURL=array.js.map