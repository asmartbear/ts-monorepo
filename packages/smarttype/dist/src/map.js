"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAP = MAP;
const common_1 = require("./common");
class SmartMap extends common_1.SmartType {
    // We carry along the smart type belonging to the array elements.
    constructor(tKey, tValue) {
        super(`{${tKey.description}:${tValue.description}}`);
        this.tKey = tKey;
        this.tValue = tValue;
    }
    // istanbul ignore next
    get constructorArgs() { return [this.tKey, this.tValue]; }
    input(x, strict = true) {
        if (!x || typeof x !== "object" || Array.isArray(x))
            throw new common_1.ValidationError(this, x, "Expected plain object or Map");
        if (x instanceof Map) {
            // Map from map, to process everything through our types
            return new Map(Array.from(x.entries()).map(([k, v]) => [this.tKey.input(k, strict), this.tValue.input(v, strict)]));
        }
        // Map from object
        return new Map(Object.entries(x).map(([k, v]) => [this.tKey.input(k, strict), this.tValue.input(v, strict)]));
    }
    isOfType(x, deep) {
        if (!(x instanceof Map))
            return false;
        if (deep) {
            for (const [k, v] of x.entries()) {
                if (!this.tKey.isOfType(k, deep))
                    return false;
                if (!this.tValue.isOfType(v, deep))
                    return false;
            }
        }
        return true;
    }
    visit(visitor, x) {
        return visitor.visitMap(Array.from(x).sort().map(([k, v]) => [this.tKey.visit(visitor, k), this.tValue.visit(visitor, v)]));
    }
    toJSON(x) {
        return Array.from(x.entries()).map(([k, v]) => [this.tKey.toJSON(k), this.tValue.toJSON(v)]);
    }
    fromJSON(js) {
        if (!Array.isArray(js))
            throw new common_1.ValidationError(this, js, "Expected array");
        return new Map(js.map(pair => {
            if (!Array.isArray(pair) || pair.length != 2)
                throw new common_1.ValidationError(this, js, "Expected array of pairs");
            return [this.tKey.fromJSON(pair[0]), this.tValue.fromJSON(pair[1])];
        }));
    }
}
/** A `Map<K,V>` whether both types are arbitrary. */
function MAP(keyType, valueType) {
    return new SmartMap(keyType, valueType);
}
//# sourceMappingURL=map.js.map