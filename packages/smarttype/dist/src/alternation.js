"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OR = OR;
exports.OPT = OPT;
const common_1 = require("./common");
const undef_1 = require("./undef");
class SmartAlternation extends common_1.SmartType {
    constructor(types) {
        super('(' + types.map(t => t.description).join('|') + ')');
        this.types = types;
    }
    /** Finds the first type that matches this native value, or `undefined` if none match. */
    getTypeForNative(x, deep) {
        for (const t of this.types) {
            if (t.isOfType(x, deep))
                return t;
        }
        return undefined;
    }
    // istanbul ignore next
    get constructorArgs() { return [this.types]; }
    get canBeUndefined() {
        return !!this.types.find(t => t.canBeUndefined); // yes if any of the types is undefined
    }
    input(x, strict = true) {
        for (const t of this.types) {
            const y = t.inputReturnError(x, strict);
            if (y instanceof common_1.ValidationError)
                continue;
            return y;
        }
        throw new common_1.ValidationError(this, x);
    }
    isOfType(x, deep) {
        return this.getTypeForNative(x, deep) !== undefined;
    }
    visit(visitor, x) {
        const t = this.getTypeForNative(x, false);
        if (t)
            return t.visit(visitor, x);
        // istanbul ignore next
        throw new common_1.ValidationError(this, x, "expected validated type for visitor");
    }
    toJSON(x) {
        const t = this.getTypeForNative(x, false);
        if (t)
            return { t: t.description, x: t.toJSON(x) };
        throw new common_1.ValidationError(this, x, "expected validated type for JSON");
    }
    fromJSON(js) {
        // Pick off the type and value, then unwrap recursively
        for (const t of this.types) {
            if (t.description === js.t) {
                return t.fromJSON(js.x);
            }
        }
        throw new common_1.ValidationError(this, js, "expected alternation type for JSON");
    }
}
/** Any of these types are acceptable.  Typescript is a union; JSON is a special structure that specifies which type it is. */
function OR(...types) {
    return new SmartAlternation(types);
}
class SmartOptional extends common_1.SmartType {
    constructor(typ) {
        super(typ.description + "?");
        this.typ = typ;
    }
    // istanbul ignore next
    get constructorArgs() { return [this.typ]; }
    get canBeUndefined() {
        return true;
    }
    input(x, strict = true) {
        if (x === undefined)
            return undefined;
        return this.typ.input(x, strict);
    }
    isOfType(x, deep) {
        if (x === undefined)
            return true;
        return this.typ.isOfType(x, deep);
    }
    visit(visitor, x) {
        if (x === undefined)
            return visitor.visitUndefined(undefined);
        return this.typ.visit(visitor, x);
    }
    toJSON(x) {
        if (x === undefined)
            return undef_1.JS_UNDEFINED_SIGNAL;
        return this.typ.toJSON(x);
    }
    fromJSON(js) {
        if (js === undefined || js === undef_1.JS_UNDEFINED_SIGNAL)
            return undefined;
        return this.typ.fromJSON(js);
    }
}
/**
 * Returns the same type, but where `undefined` is also an acceptable value.
 * If `undefined` is already one of the types it can be, returns the original object unchanged.
 */
function OPT(typ) {
    return typ.canBeUndefined ? typ : new SmartOptional(typ);
}
//# sourceMappingURL=alternation.js.map