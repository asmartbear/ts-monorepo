"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OBJ = OBJ;
const common_1 = require("./common");
const alternation_1 = require("./alternation");
const simplified_1 = require("@asmartbear/simplified");
class SmartFields extends common_1.SmartType {
    // We carry along the smart type belonging to the field elements.
    constructor(types, options) {
        super('{' + Object.entries(types).map(([k, t]) => `${k}:${t.description}`).join(',') + '}');
        this.types = types;
        this.options = options;
    }
    // istanbul ignore next
    get constructorArgs() { return [this.types, this.options]; }
    get keys() {
        return new Set(Object.keys(this.types));
    }
    input(x, strict = true) {
        if (typeof x !== "object")
            throw new common_1.ValidationError(this, x, "Expected object");
        if (!x)
            throw new common_1.ValidationError(this, x, "Got null instead of object");
        // Copy all known fields into our resulting pairs
        const ent = [];
        for (const [k, t] of Object.entries(this.types)) {
            // Load this field
            const y = x[k];
            // Field missing?
            if (y === undefined) {
                // If it's optional anyway, we're fine
                if (!t.canBeUndefined) {
                    // If there's a default value, it's time to use it
                    if (t[common_1.__DEFAULT_VALUE] !== undefined) {
                        ent.push([k, t[common_1.__DEFAULT_VALUE]]);
                    }
                    // No recourse; you're missing a required, non-default field.
                    else {
                        throw new common_1.ValidationError(this, x, `Missing required field [${k}]`);
                    }
                }
            }
            // Field was present; convert it.  Upon failure, accumulate our path
            else {
                const z = t.inputReturnError(y, strict);
                if (z instanceof common_1.ValidationError) {
                    z.addPath(k);
                    throw z;
                }
                ent.push([k, z]);
            }
        }
        // If we're not allowed to ignore extra fields, check for their existence and throw if found
        if (this.options.ignoreExtraFields === false) {
            for (const k of Object.keys(x)) {
                if (!(k in this.types)) {
                    throw new common_1.ValidationError(this, x, `Found spurious field [${k}].  Valid fields are: [${this.fields.join('|')}]`);
                }
            }
        }
        return Object.fromEntries(ent);
    }
    isOfType(x, deep) {
        if (!(0, simplified_1.isPlainObject)(x))
            return false;
        if (deep) {
            for (const [k, t] of Object.entries(this.types)) {
                const y = x[k];
                if (y === undefined) { // if missing or undefined, that's ok exactly if this type is allowed to be undefined
                    if (!t.canBeUndefined)
                        return false;
                }
                else {
                    if (!t.isOfType(y, deep))
                        return false; // value is present, so much be of the correct type
                }
            }
        }
        return true;
    }
    visit(visitor, x) {
        return visitor.visitFields(Object.entries(x).map(([k, v]) => [visitor.visitString(k), this.types[k].visit(visitor, v)]));
    }
    toJSON(x) {
        return Object.fromEntries(Object.entries(x).map(([k, y]) => [k, this.types[k].toJSON(y)]));
    }
    fromJSON(js) {
        return Object.fromEntries(Object.entries(js).map(([k, y]) => [k, y === undefined ? undefined : this.types[k].fromJSON(y)]));
    }
    /** Makes all fields optional */
    partial() {
        const newTypes = Object.fromEntries(Object.entries(this.types).map(([k, t]) => [k, (0, alternation_1.OPT)(t)]));
        return new SmartFields(newTypes, this.options);
    }
    /** Gets the sorted list of fields in this type. */
    get fields() {
        return Object.keys(this.types).sort();
    }
}
/** An array of fixed length and types */
function OBJ(types, options = {}) {
    return new SmartFields(types, options);
}
//# sourceMappingURL=fields.js.map