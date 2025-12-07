"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reverseEngineerType = reverseEngineerType;
const simplified_1 = require("@asmartbear/simplified");
const boolean_1 = require("./boolean");
const undef_1 = require("./undef");
const number_1 = require("./number");
const string_1 = require("./string");
const null_1 = require("./null");
const array_1 = require("./array");
const class_1 = require("./class");
const fields_1 = require("./fields");
const date_1 = require("./date");
const regexp_1 = require("./regexp");
const set_1 = require("./set");
const map_1 = require("./map");
const alternation_1 = require("./alternation");
/**
 * Given an instantiated Javascript object, attempts to reverse-engineer the smart-type that matches it.
 *
 * @param x the object to match
 * @param options optional options for creating types
 */
function reverseEngineerType(x, options) {
    switch (typeof x) {
        case 'undefined': return (0, undef_1.UNDEF)();
        case 'boolean': return (0, boolean_1.BOOL)();
        case 'number': return (0, number_1.NUM)();
        case 'string': return (0, string_1.STR)();
        // Mostly no, but catch classes
        case 'function':
            if ((0, simplified_1.isClassObject)(x)) {
                return (0, class_1.CLASS)(x);
            }
            throw new Error(`Unsupported native type for reverse-engineering a data type: ${typeof x}`);
        case 'object':
            // null
            if (x === null)
                return (0, null_1.NIL)();
            // Arrays
            if (Array.isArray(x)) {
                const typ = reverseEngineerSetOfTypes(x, options);
                if (typ == null)
                    throw new Error(`Arrays cannot be empty for reverse-engineering`);
                return (0, array_1.ARRAY)(typ);
            }
            // Sets
            if (x instanceof Set) {
                const typ = reverseEngineerSetOfTypes(x, options);
                if (typ == null)
                    throw new Error(`Arrays cannot be empty for reverse-engineering`);
                return (0, set_1.SET)(typ);
            }
            // Maps
            if (x instanceof Map) {
                const keyType = reverseEngineerSetOfTypes(x.keys(), options);
                const valueType = reverseEngineerSetOfTypes(x.values(), options);
                if (keyType == null || valueType == null)
                    throw new Error(`Maps cannot be empty for reverse-engineering`);
                return (0, map_1.MAP)(keyType, valueType);
            }
            // The known built-in objects
            if (x instanceof Date)
                return (0, date_1.DATE)();
            if (x instanceof RegExp)
                return (0, regexp_1.REGEXP)();
            // Direct class-derived objects are simply validated that they are that type of object
            const derivedClass = (0, simplified_1.getClassOf)(x);
            if (derivedClass) {
                return (0, class_1.CLASS)(derivedClass);
            }
            // Remaining objects are treated as generic fields
            return (0, fields_1.OBJ)(Object.fromEntries(Object.entries(x).map(([k, v]) => [k, reverseEngineerType(v, options)])), options);
        default:
            throw new Error(`Unsupported native type for reverse-engineering a data type: ${typeof x}`);
    }
}
/**
 * Given a set of types to reverse-engineer, e.g. from an array or set, returns the single
 * reverse-engineered type for the whole set.  This is a concrete type if they're all of
 * the same type, or some alternation if there are distinct sets of types.
 *
 * Returns `null` if the list is empty, and therefore no type can be identified.
 */
function reverseEngineerSetOfTypes(x, options) {
    // Create a list of unique types
    const types = []; // running list of all types we've seen
    for (const y of x) {
        // If we've seen this before, don't add another type to the list
        let sawTypeBefore = false;
        for (const t2 of types) {
            if (t2.isOfType(y, true)) {
                sawTypeBefore = true;
                break;
            }
        }
        if (!sawTypeBefore) {
            types.push(reverseEngineerType(y, options));
        }
    }
    // Special case: No types
    if (types.length == 0)
        return null;
    // If one type, it's easy
    if (types.length == 1)
        return types[0];
    // Multiple types, so create an alternation
    return (0, alternation_1.OR)(...types);
}
//# sourceMappingURL=reverse.js.map