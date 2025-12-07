"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimplifiedWalker = void 0;
exports.isClassObject = isClassObject;
exports.isPlainObject = isPlainObject;
exports.getClassOf = getClassOf;
exports.isIterable = isIterable;
exports.isSimple = isSimple;
exports.simplify = simplify;
exports.simplifyOpaqueType = simplifyOpaqueType;
exports.simplifiedAwait = simplifiedAwait;
exports.simplifiedCompare = simplifiedCompare;
exports.simplifiedToJSON = simplifiedToJSON;
exports.simplifiedToDisplay = simplifiedToDisplay;
exports.simplifiedJoin = simplifiedJoin;
exports.simplifiedToHash = simplifiedToHash;
const crypto_1 = require("crypto");
const types_1 = require("util/types");
/** True if the given variable is itself a class. */
function isClassObject(x) {
    if (typeof x !== 'function')
        return false; // not possible
    const proto = x.prototype;
    if (!proto)
        return false; // plain function
    if (/^\s*class\b/.test(Function.prototype.toString.call(x)))
        return true; // user-created classes
    return proto.constructor !== x || Object.getOwnPropertyNames(proto).length > 1; // built-ins
}
/** True if the given thing is a plain object -- no constructor or parent class -- though fields can be anything, including functions. */
function isPlainObject(x) {
    var _a;
    if (!x || typeof x !== "object")
        return false;
    // istanbul ignore next
    const name = (_a = x.constructor) === null || _a === void 0 ? void 0 : _a.name;
    return name === undefined || name === "Object";
}
/** Returns the class object that this object instantiated from, or `undefined` if it wasn't that kind of object */
function getClassOf(x) {
    var _a;
    if (!x || typeof x !== "object")
        return undefined;
    // istanbul ignore next
    const name = (_a = x.constructor) === null || _a === void 0 ? void 0 : _a.name;
    return (name === undefined || name === "Object") ? undefined : x.constructor;
}
/** True if the given variable is iterable */
function isIterable(x) {
    return typeof x === 'object' && x != null && (typeof x[Symbol.iterator]) === 'function';
}
;
function isISimplifiable(x) {
    return x && typeof x === "object" && typeof x.toSimplified === 'function';
}
/** True if the argument is a simple value, and tells Typescript as well */
function isSimple(x) {
    switch (typeof x) {
        case 'undefined':
        case 'boolean':
        case 'string':
        case 'number':
            return true;
        case 'object':
            if (x === null)
                return true;
            if (Array.isArray(x))
                return x.every(isSimple);
            if (isPlainObject(x))
                return Object.values(x).every(isSimple);
    }
    return false;
}
/**
 * Simplify any data, with Typescript inference as best as possible.
 *
 * Types that adhere to `Simplifiable` will be translated exactly and reliable, otherwise
 * they're still translated but it's best-effort, e.g. introspecting fields in classes.
 *
 * The result is nearly always `Simple`; exceptions are things like `Promise<Simple>`, but this
 * can arise only if the input was a Promise, which Typescript already knows.
 *
 * @param x the value to simplify
 * @param skip if given, this is a set of objects to report as `null` rather than simplify, often to prevent infinite descent.
 */
function simplify(x, skip) {
    // istanbul ignore next
    switch (typeof x) {
        // Primative pass-through
        case 'undefined':
        case 'boolean':
        case 'string':
            return x;
        // Numbers are mostly pass-through, but rounded floats
        case 'number':
            if (Number.isNaN(x))
                return Number.NaN;
            if (!x)
                return 0; // not -0
            if (!Number.isInteger(x)) {
                let y = Math.round(x * 10000) / 10000;
                return (y ? y : 0);
            }
            return x;
        // Symbols are just their string representations
        case 'symbol':
            return x.description;
        // Big integers are converted back to numbers if they fit, else strings.
        case 'bigint':
            if (x >= Number.MIN_SAFE_INTEGER && x <= Number.MAX_SAFE_INTEGER)
                return Number(x);
            return x.toString();
        // Functions are mostly unsupported, but e.g. classes are functions
        case 'function':
            if (isClassObject(x))
                return x.name;
            return `${x.name}()`;
        // throw new Error(`cannot simplify function: ${x.name}`)
        // Last choice!
        case 'object':
            // Trivial
            if (x === null)
                return null;
            // Object that we understand, overriding standard algorithm
            if ((0, types_1.isDate)(x))
                return { t: x.getTime() };
            if ((0, types_1.isRegExp)(x))
                return x.toString();
            if (isISimplifiable(x))
                return x.toSimplified();
            if (x instanceof URL)
                return x.toString();
            // No infinite descent
            if (skip && skip.has(x))
                return null;
            if (!skip)
                skip = new Set();
            skip.add(x);
            // Promises get chained onto and then returned as-is for final resolution.
            if ((0, types_1.isPromise)(x))
                return x.then(y => simplify(y, skip));
            // Array-like
            if (Array.isArray(x))
                return x.map(y => simplify(y, skip));
            if ((0, types_1.isSet)(x))
                return simplify(Array.from(x), skip).sort(simplifiedCompare); // simplify before sort!
            // Map, which can have non-primative keys which means we need an alternative format.
            if (x instanceof Map) {
                let onlyPrimativeFields = true;
                const result = [];
                for (const [f, v] of x.entries()) {
                    if (v === undefined)
                        continue; // no undefined fields
                    result.push([simplify(f, skip), simplify(v, skip)]);
                    switch (typeof f) {
                        case 'string':
                        case 'number':
                            break;
                        default:
                            onlyPrimativeFields = false;
                    }
                }
                result.sort(simplifiedCompare); // sorts by complex keys in a more consistent way
                if (onlyPrimativeFields)
                    return Object.fromEntries(result);
                return result;
            }
            // Catch-all for all other iterable things -- generators, buffer arrays, etc..
            if (isIterable(x))
                return Array.from(x).map(y => simplify(y, skip));
            // Normal object, which means primative keys that don't need to be transformed and always fit into another object.
            const entries = [];
            const cls = getClassOf(x);
            if (cls)
                entries.push(["__class__", cls.name]);
            for (const [k, v] of Object.entries(x).sort(simplifiedCompare)) {
                if (v === undefined)
                    continue;
                if (typeof v === "function")
                    continue;
                else
                    entries.push([k, simplify(v, skip)]);
            }
            return Object.fromEntries(entries);
        // Cannot get here because we exhausted the `typeof`, but this way Typescript doesn't winge about lacking a return result.
        default: // istanbul ignore next
            throw new Error(`cannot simplify: ${x}`);
    }
}
function simplifyOpaqueType(x) {
    return simplify(x);
}
function simplifiedAwait(x) {
    switch (typeof x) {
        case "undefined":
        case "boolean":
        case "number":
        case "string":
            return x;
        case "object":
            if (x === null)
                return x;
            if ((0, types_1.isPromise)(x))
                return x; // it's a promise already, so pass it on through
            if (Array.isArray(x))
                return Promise.all(x.map(simplifiedAwait));
            // Object; do it as an array of pairs.
            return simplifiedAwait(Object.entries(x)).then(pairs => Object.fromEntries(pairs));
    }
}
/**
 * Can subclass this to create a walker that receives a `Simple` type, being invoked on every item,
 * returning the results of invocation to each step.
 */
class SimplifiedWalker {
    walk(x) {
        switch (typeof x) {
            case "undefined":
                return this.doUndefined();
            case "boolean":
                return this.doBoolean(x);
            case "number":
                return this.doNumber(x);
            case "string":
                return this.doString(x);
            case "object":
                if (x === null)
                    return this.doNull();
                if (Array.isArray(x))
                    return this.doArray(x.map(y => this.walk(y)));
                return this.doObject(Object.entries(x).map(([f, v]) => [f, this.walk(v)]));
        }
    }
}
exports.SimplifiedWalker = SimplifiedWalker;
/**
 * Comparison function of two already-simplified things.
 *
 * Ordered first by type.  Arrays are item-by-item, like strings.
 * Objects are field-by-field, assumed already sorted as `simplified()` does.
 */
function simplifiedCompare(a, b) {
    // Total equality is a quick, common result.
    if (a === b)
        return 0;
    // Undefined
    if (a === undefined)
        return -1;
    if (b === undefined)
        return 1;
    // null
    if (a === null)
        return -1;
    if (b === null)
        return 1;
    // Boolean
    if (typeof a === "boolean") {
        if (typeof b == "boolean") {
            return a ? 1 : -1; // because they're unequal
        }
        return -1;
    }
    else if (typeof b == "boolean") {
        return 1;
    }
    // Numbers
    if (typeof a === "number") {
        if (typeof b === "number") {
            if (Number.isNaN(a))
                return Number.isNaN(b) ? 0 : -1; // because NaN isn't == and won't be caught above
            if (Number.isNaN(b))
                return 1;
            return (a < b) ? -1 : 1;
        }
        return -1;
    }
    else if (typeof b === "number") {
        return 1;
    }
    // Strings
    if (typeof a === "string") {
        if (typeof b === "string") {
            return a.localeCompare(b);
        }
        return -1;
    }
    else if (typeof b === "string") {
        return 1;
    }
    // Arrays
    if (Array.isArray(a)) {
        if (Array.isArray(b)) {
            const len = Math.min(a.length, b.length);
            for (let k = 0; k < len; ++k) {
                const cmp = simplifiedCompare(a[k], b[k]);
                if (cmp !== 0)
                    return cmp;
            }
            return a.length - b.length;
        }
        return -1;
    }
    else if (Array.isArray(b)) {
        return 1;
    }
    // If we got here, both `a` and `b` must be non-null objects.
    const ak = Object.keys(a), bk = Object.keys(b);
    const len = Math.min(ak.length, bk.length);
    for (let k = 0; k < len; ++k) {
        let cmp = ak[k].localeCompare(bk[k]);
        if (cmp !== 0)
            return cmp;
        cmp = simplifiedCompare(a[ak[k]], b[bk[k]]);
        if (cmp !== 0)
            return cmp;
    }
    return ak.length - bk.length;
}
/** Returns the JSON representation of a simplified data type */
function simplifiedToJSON(x, compact = true) {
    if (x === undefined)
        return "null"; // weird special case
    return compact ? JSON.stringify(x) : JSON.stringify(x, null, 2);
}
/**
 * Converts a simplified value to a human-readable string which isn't useful either
 * for hashing or for machine-consumption.  It trades fewer characters for clarity.
 *
 * @param x the thing to convert
 * @param depth the recursion depth
 */
function simplifiedToDisplay(x, depth = 0) {
    switch (typeof x) {
        case 'string':
            x = x.replaceAll('\t', '\\t').replaceAll('\n', '\\n');
            if (x.length > 120)
                x = x.substring(0, 120) + '…';
            return x;
        case 'object':
            if (x === null)
                return "null";
            // Arrays
            if (Array.isArray(x)) {
                return '[' + x.map(y => simplifiedToDisplay(y, depth + 1)).join(',') + ']';
            }
            // Objects, checking for class names
            const entries = Object.entries(x);
            let prefix = '';
            if (entries.length > 0 && entries[0][0] === '__class__') {
                prefix = `${entries[0][1]}: `;
                entries.shift();
            }
            const txt = prefix + entries.map(([k, v]) => `${simplifiedToDisplay(k)}=${simplifiedToDisplay(v, depth + 1)}`).join(', ');
            return (depth > 0 || prefix || !txt) ? `[${txt}]` : txt;
    }
    return String(x); // default for undefined, boolean, and numbers
}
/**
 * Like `String.join()`, but with any simple object.  Converts each to a string using simplifiedToDisplay(),
 * joining with the given string.  If the original is an array, that's the unit.  If the original is primiative, returns only that.
 */
function simplifiedJoin(x, joiner = ',') {
    if (Array.isArray(x)) {
        return x.map(y => simplifiedToDisplay(y, 1)).join(joiner);
    }
    return simplifiedToDisplay(x);
}
/**
 * Hashes a simplified value.  This can be faster than converting to a string and then hashing.
 */
function simplifiedToHash(x) {
    // Convert to a string; optimize if already a string; a common use-case
    const s = typeof x === "string" ? x : simplifiedToJSON(x);
    // For now, just convert to JSON and hash
    return (0, crypto_1.createHash)('md5').update(s).digest('hex');
}
//# sourceMappingURL=index.js.map