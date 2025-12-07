"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartType = exports.__DEFAULT_VALUE = exports.SmartTypeVisitor = exports.ValidationError = void 0;
exports.isPrimative = isPrimative;
const simplified_1 = require("@asmartbear/simplified");
/**
 * True if the argument is a `Primative`, and tells Typescript.
 */
function isPrimative(x) {
    switch (typeof x) {
        case 'boolean':
        case 'number':
        case 'string':
            return true;
        case 'object':
            return x === null;
    }
    return false;
}
/**
 * The exception thrown when `input()` goes wrong.  Includes the fundamental problem,
 * and a full path to where the issue lies.
 */
class ValidationError extends Error {
    constructor(type, valueEncountered, expectedPrefix, path = []) {
        let msg = expectedPrefix !== null && expectedPrefix !== void 0 ? expectedPrefix : "Expected " + type.description;
        msg += ` but got ${typeof valueEncountered}: ${String(valueEncountered)}`;
        super(msg);
        this.path = path;
        this.name = 'ValidationError';
        this.myMessage = msg;
    }
    addPath(segment) {
        this.path.push(String(segment));
        this.message = this.fullMessage;
    }
    get fullMessage() {
        const pathStr = this.path.length
            ? `At key [${this.path.reverse().join('.')}]: `
            : '';
        return pathStr + this.myMessage;
    }
    toSimplified() {
        return this.fullMessage;
    }
}
exports.ValidationError = ValidationError;
/**
 * Callbacks for walking a type tree alongside parsed data, optionally accumulating some return value.
 *
 * Some default implementations are given for built-in types, in case you don't care about how they are visited,
 * for example many built-in objects are visited as opaque objects, tuples are visited as arrays, maps are visited
 * as arrays of pairs.
 */
class SmartTypeVisitor {
    visitTuple(x) { return this.visitArray(x); }
    visitDate(x) { return this.visitOpaqueObject(x); }
    visitRegExp(x) { return this.visitOpaqueObject(x); }
    visitSet(x) { return this.visitArray(x); }
    visitMap(x) { return this.visitArray(x.map(pair => this.visitArray(pair))); }
    visitFields(x) { return this.visitMap(x); }
}
exports.SmartTypeVisitor = SmartTypeVisitor;
/** Visitor that converts like `simplify()` except we don't look into opaque objects and stuff like that. */
class SmartTypeToSimplifiedVisitor extends SmartTypeVisitor {
    // istanbul ignore next
    visitUndefined(x) { return x; }
    visitNull(x) { return x; }
    visitBoolean(x) { return x; }
    visitNumber(x) { return x; }
    visitString(x) { return x; }
    visitArray(x) { return x; }
    visitDate(x) { return `Date(${x.getTime()})`; }
    visitFields(x) { return Object.fromEntries(x); }
    visitRegExp(x) { return String(x); }
    visitOpaqueObject(x) {
        var _b, _c;
        // istanbul ignore next
        return ((_c = (_b = (0, simplified_1.getClassOf)(x)) === null || _b === void 0 ? void 0 : _b.name) !== null && _c !== void 0 ? _c : "Object") + "()";
    }
}
SmartTypeToSimplifiedVisitor.INSTANCE = new SmartTypeToSimplifiedVisitor();
/** Symbol used for the configured default value for the type, if any. */
exports.__DEFAULT_VALUE = Symbol('__DEFAULT_VALUE');
/**
 * A type capable of parsing, validating, conversion, marshalling, and more.
 * Represents a specific Typescript type on input and output.
 */
class SmartType {
    constructor(description) {
        this.description = description;
        /** If not `undefined`, a default value to use in things like structured fields, if it is missing. */
        this[_a] = undefined;
    }
    /**
     * Same as `input()` but returns errors as objects rather than throwing them.
     */
    inputReturnError(x, strict = true) {
        try {
            return this.input(x, strict);
        }
        catch (e) {
            // istanbul ignore next
            if (e instanceof ValidationError)
                return e;
            // istanbul ignore next
            throw e;
        }
    }
    /** Sets the default value to use if this type isn't represent in a parent object or other structure. */
    def(x) {
        this[exports.__DEFAULT_VALUE] = x;
        this.description += '=' + (0, simplified_1.simplifiedToDisplay)(this.toSimplified(x));
        return this;
    }
    /**
     * Gets the simplified version of this data (a la `@asmartbear/simplified`), or a description of self if no argument is provided.
     *
     * This is different from just calling `simplify()`, which of course you could do, because it handles cases like not recursing
     * into opaque objects.
     */
    toSimplified(x) {
        if (x === undefined)
            return this.description;
        return this.visit(SmartTypeToSimplifiedVisitor.INSTANCE, x);
    }
    /** Gets a hash value for the object, normalized for things like field-ordering and ignoring undefined fields */
    toHash(x) {
        return (0, simplified_1.simplifiedToHash)(this.toSimplified(x));
    }
    /**
     * Transforms something of this type into another type, including validation and arbitrary additional logic.
     *
     * @param description human-readable description to add to the overall type definition
     * @param resultType the type definition of the result of the transformation
     * @param fTransform the function that transforms a validated value of the current type into the value needed by `resultType`.
     */
    transform(description, resultType, fTransform) {
        var _b, _c;
        const upstream = this; // make local copy of this value
        const suffix = resultType.description != this.description ? '>>' + resultType.description : ''; // say, if there's a new type
        const newDescription = this.description + '>>' + description + suffix;
        const ResultClass = resultType.constructor;
        const cls = (_c = class extends ResultClass {
                constructor() {
                    super(...arguments);
                    this.description = newDescription;
                    // Carry state forward
                    this[_b] = upstream[exports.__DEFAULT_VALUE];
                }
                // Wrap input in the transformation
                input(x, strict = true) {
                    return resultType.input(fTransform(upstream.input(x, strict)), true); // reinterpret the transformation for more validation
                }
            },
            _b = exports.__DEFAULT_VALUE,
            _c);
        return new cls(...resultType.constructorArgs);
    }
    /**
     * Like `transform()` where the resulting type is the same, and thus the function signature is simpler.
     */
    transformSameType(description, fTransform) {
        return this.transform(description, this, fTransform);
    }
    get constructorArgs() { return [this.description]; }
    /** If true, this type can potentially be `undefined`, otherwise it is never undefined. */
    get canBeUndefined() { return false; }
    /** If this type has an index-like structure, like fields, this is the set of keys in that structure, otherwise it is `undefined`. */
    get keys() {
        return undefined;
    }
}
exports.SmartType = SmartType;
_a = exports.__DEFAULT_VALUE;
//# sourceMappingURL=common.js.map