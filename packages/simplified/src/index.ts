import { createHash } from 'crypto';
import { isPromise, isSet, isRegExp, isDate } from 'util/types';

type ClassOf<T> = (abstract new (...args: any[]) => T) | (new (...args: any[]) => T);

/** True if the given variable is itself a class. */
export function isClassObject(x: any): x is ClassOf<any> {
    if (typeof x !== 'function') return false        // not possible
    const proto = x.prototype
    if (!proto) return false       // plain function
    if (/^\s*class\b/.test(Function.prototype.toString.call(x))) return true        // user-created classes
    return proto.constructor !== x || Object.getOwnPropertyNames(proto).length > 1      // built-ins
}

/** True if the given thing is a plain object -- no constructor or parent class -- though fields can be anything, including functions. */
export function isPlainObject(x: any): x is object {
    if (!x || typeof x !== "object") return false
    // istanbul ignore next
    const name = x.constructor?.name
    return name === undefined || name === "Object"
}

/** Returns the class object that this object instantiated from, or `undefined` if it wasn't that kind of object */
export function getClassOf<T>(x: T): (T extends object ? ClassOf<T> : undefined) | undefined {
    if (!x || typeof x !== "object") return undefined
    // istanbul ignore next
    const name = x.constructor?.name
    return (name === undefined || name === "Object") ? undefined : x.constructor as any
}

/** True if the given variable is iterable */
export function isIterable<T>(x: any): x is Iterable<T> {
    return typeof x === 'object' && x != null && (typeof x[Symbol.iterator]) === 'function'
}

type Primative = undefined | null | boolean | number | string;

/** Data type after simplification: Like JSON, including undefined. */
export type Simple =
    Primative
    | Simple[]
    | { [key: string | number]: Simple }
    ;

/** Simple data type where some or all could be wrapped in a Promise, including recursively. */
export type PromisedSimple =
    Primative
    | PromisedSimple[]
    | { [key: string | number]: PromisedSimple }
    | Promise<Simple>
    ;

/** If a promise, the inner promised type, else itself. */
export type ResolvedPromiseSimple<T> =
    T extends Primative ? T :
    T extends Promise<infer U> ? U :
    T extends Array<infer U> ? ResolvedPromiseSimple<U>[] :
    T extends object ? { [K in keyof T]: ResolvedPromiseSimple<T[K]> } :
    never;
;

/**
 * Something that knows how to convert itself to a `Simple` type.
 */
export interface ISimplifiable<T extends Simple> {
    toSimplified: () => T
}

function isISimplifiable(x: any): x is ISimplifiable<Simple> {
    return x && typeof x === "object" && typeof x.toSimplified === 'function'
}

/** Transforms a type to its equivalent Simple type, as executed by `simplify()`. */
export type Simplified<T> =
    T extends undefined | null | boolean | number | string ? T :
    T extends symbol ? string :
    T extends bigint ? string | number :
    T extends Function ? never :
    T extends Date ? { t: number } :
    T extends RegExp ? string :
    T extends URL ? string :
    T extends Promise<infer U> ? Promise<Simplified<U>> :
    T extends Array<infer U> ? Simplified<U>[] :
    T extends Set<infer U> ? Simplified<U>[] :
    T extends Map<infer K extends string | number, infer U> ? { [Key in K]: Simplified<U extends undefined ? never : U> } :
    T extends Map<infer K, infer U> ? [[Simplified<K>, Simplified<U extends undefined ? never : U>]] :
    T extends Iterable<infer U> ? Simplified<U>[] :
    T extends ISimplifiable<infer U> ? U :
    T extends object ? { [K in keyof T as K extends symbol ? never : Simplified<T[K]> extends never ? never : K]: Simplified<T[K]> } :
    never;

/** A type that is cleanly and reliably simplifiable, including special cases but excluding the case of the generic class. */
export type Simplifiable =
    undefined | null | boolean | number | string | symbol | bigint
    | Date | RegExp | URL
    | Promise<Simplifiable>
    | Set<Simplifiable> | Map<Simplifiable, Simplifiable> | Iterable<Simplifiable>
    | ISimplifiable<Simple>
    | Simplifiable[]
    | { [K in string | number]: Simplifiable }


/** True if the argument is a simple value, and tells Typescript as well */
export function isSimple(x: any): x is Simple {
    switch (typeof x) {
        case 'undefined':
        case 'boolean':
        case 'string':
        case 'number':
            return true
        case 'object':
            if (x === null) return true
            if (Array.isArray(x)) return x.every(isSimple)
            if (isPlainObject(x)) return Object.values(x).every(isSimple)
    }
    return false
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
export function simplify<T>(x: T, skip?: Set<any>): Simplified<T> {

    // istanbul ignore next
    switch (typeof x) {

        // Primative pass-through
        case 'undefined':
        case 'boolean':
        case 'string':
            return x as any

        // Numbers are mostly pass-through, but rounded floats
        case 'number':
            if (Number.isNaN(x)) return Number.NaN as any
            if (!x) return 0 as any         // not -0
            if (!Number.isInteger(x)) {
                let y = Math.round(x * 10000) / 10000
                return (y ? y : 0) as any
            }
            return x as any

        // Symbols are just their string representations
        case 'symbol':
            return x.description as any

        // Big integers are converted back to numbers if they fit, else strings.
        case 'bigint':
            if (x >= Number.MIN_SAFE_INTEGER && x <= Number.MAX_SAFE_INTEGER) return Number(x) as any
            return x.toString() as any

        // Functions are mostly unsupported, but e.g. classes are functions
        case 'function':
            if (isClassObject(x)) return x.name as any
            return `${x.name}()` as any
        // throw new Error(`cannot simplify function: ${x.name}`)

        // Last choice!
        case 'object':
            // Trivial
            if (x === null) return null as any

            // Object that we understand, overriding standard algorithm
            if (isDate(x)) return { t: x.getTime() } as any
            if (isRegExp(x)) return x.toString() as any
            if (isISimplifiable(x)) return x.toSimplified() as any
            if (x instanceof URL) return x.toString() as any

            // No infinite descent
            if (skip && skip.has(x)) return null as any
            if (!skip) skip = new Set()
            skip.add(x)

            // Promises get chained onto and then returned as-is for final resolution.
            if (isPromise(x)) return x.then(y => simplify(y, skip)) as any

            // Array-like
            if (Array.isArray(x)) return x.map(y => simplify(y, skip)) as any
            if (isSet(x)) return simplify(Array.from(x), skip).sort(simplifiedCompare) as any     // simplify before sort!

            // Map, which can have non-primative keys which means we need an alternative format.
            if (x instanceof Map) {
                let onlyPrimativeFields = true
                const result: [Simple, Simple][] = []
                for (const [f, v] of x.entries()) {
                    if (v === undefined) continue       // no undefined fields
                    result.push([simplify(f, skip), simplify(v, skip)])
                    switch (typeof f) {
                        case 'string':
                        case 'number':
                            break;
                        default:
                            onlyPrimativeFields = false;
                    }
                }
                result.sort(simplifiedCompare)      // sorts by complex keys in a more consistent way
                if (onlyPrimativeFields) return Object.fromEntries(result)
                return result as any
            }

            // Catch-all for all other iterable things -- generators, buffer arrays, etc..
            if (isIterable(x)) return Array.from(x).map(y => simplify(y, skip)) as any

            // Normal object, which means primative keys that don't need to be transformed and always fit into another object.
            const entries: [string, Simple][] = []
            const cls = getClassOf(x)
            if (cls) entries.push(["__class__", cls.name])
            for (const [k, v] of Object.entries(x).sort(simplifiedCompare)) {
                if (v === undefined) continue
                if (typeof v === "function") continue
                else entries.push([k, simplify(v, skip)])
            }
            return Object.fromEntries(entries) as any

        // Cannot get here because we exhausted the `typeof`, but this way Typescript doesn't winge about lacking a return result.
        default: // istanbul ignore next
            throw new Error(`cannot simplify: ${x}`)
    }
}

/**
 * The same as `simplify()` for when Typescript gets confused about types so you need something
 * that returns the correct parent type without any detail that Typescript would otherwise supply.
 * 
 * Typescript is still invoked for Promises, keeping them as Promises.
 */
export function simplifyOpaqueType<T extends Promise<any>>(x: T): Promise<Simple>;
export function simplifyOpaqueType<T>(x: T): Simple;
export function simplifyOpaqueType(x: any): Simple | Promise<Simple> {
    return simplify(x)
}

/**
 * If we simplified something that includes promises (itself, or recursively), waits for all those
 * promises recursively, returning a promise that completely resolves all promises into a realized `Simple` object.
 */
export function simplifiedAwait<T extends Primative>(x: T): T;
export function simplifiedAwait<T extends Promise<Simple>>(x: T): T;
export function simplifiedAwait<T extends PromisedSimple>(x: T): Promise<ResolvedPromiseSimple<T>>;
export function simplifiedAwait<T extends PromisedSimple>(x: T): Promise<ResolvedPromiseSimple<T>> | T {
    switch (typeof x) {
        case "undefined":
        case "boolean":
        case "number":
        case "string":
            return x
        case "object":
            if (x === null) return x
            if (isPromise(x)) return x      // it's a promise already, so pass it on through
            if (Array.isArray(x)) return Promise.all(x.map(simplifiedAwait)) as any
            // Object; do it as an array of pairs.
            return simplifiedAwait(Object.entries(x)).then(pairs => Object.fromEntries(pairs))
    }
}

/**
 * Can subclass this to create a walker that receives a `Simple` type, being invoked on every item,
 * returning the results of invocation to each step.
 */
export abstract class SimplifiedWalker<T, TUndefined extends T = T, TNull extends T = T, TBoolean extends T = T, TNumber extends T = T, TString extends T = T, TArray extends T = T, TObject extends T = T> {

    /**
     * Walks the given type recursively, calling the call-backs.
     */
    public walk(x: undefined): TUndefined;
    public walk(x: null): TNull;
    public walk(x: boolean): TBoolean;
    public walk(x: number): TNumber;
    public walk(x: string): TString;
    public walk(x: Simple[]): TArray;
    public walk(x: Simple): TUndefined | TNull | TBoolean | TNumber | TString | TArray | TObject;
    public walk(x: Simple): TUndefined | TNull | TBoolean | TNumber | TString | TArray | TObject {
        switch (typeof x) {
            case "undefined":
                return this.doUndefined()
            case "boolean":
                return this.doBoolean(x)
            case "number":
                return this.doNumber(x)
            case "string":
                return this.doString(x)
            case "object":
                if (x === null) return this.doNull()
                if (Array.isArray(x)) return this.doArray(x.map(y => this.walk(y)))
                return this.doObject(Object.entries(x).map(([f, v]) => [f, this.walk(v)]))
        }
    }

    /** Visits an `undefined` value */
    abstract doUndefined(): TUndefined;

    /** Visits a `null` value */
    abstract doNull(): TNull;

    /** Visits a `boolean` value */
    abstract doBoolean(x: boolean): TBoolean;

    /** Visits a `number` value */
    abstract doNumber(x: number): TNumber;

    /** Visits a `string` value */
    abstract doString(x: string): TString;

    /** Visits an array, after visiting children */
    abstract doArray(x: T[]): TArray;

    /** Visits an object as field/value pairs, after visiting children */
    abstract doObject(x: [string | number, T][]): TObject;
}

/**
 * Comparison function of two already-simplified things.
 * 
 * Ordered first by type.  Arrays are item-by-item, like strings.
 * Objects are field-by-field, assumed already sorted as `simplified()` does.
 */
export function simplifiedCompare(a: Simple, b: Simple): number {

    // Total equality is a quick, common result.
    if (a === b) return 0;

    // Undefined
    if (a === undefined) return -1;
    if (b === undefined) return 1;

    // null
    if (a === null) return -1;
    if (b === null) return 1;

    // Boolean
    if (typeof a === "boolean") {
        if (typeof b == "boolean") {
            return a ? 1 : -1;      // because they're unequal
        }
        return -1
    } else if (typeof b == "boolean") {
        return 1
    }

    // Numbers
    if (typeof a === "number") {
        if (typeof b === "number") {
            if (Number.isNaN(a)) return Number.isNaN(b) ? 0 : -1        // because NaN isn't == and won't be caught above
            if (Number.isNaN(b)) return 1
            return (a < b) ? -1 : 1
        }
        return -1
    } else if (typeof b === "number") {
        return 1
    }

    // Strings
    if (typeof a === "string") {
        if (typeof b === "string") {
            return a.localeCompare(b);
        }
        return -1
    } else if (typeof b === "string") {
        return 1
    }

    // Arrays
    if (Array.isArray(a)) {
        if (Array.isArray(b)) {
            const len = Math.min(a.length, b.length);
            for (let k = 0; k < len; ++k) {
                const cmp = simplifiedCompare(a[k], b[k]);
                if (cmp !== 0) return cmp;
            }
            return a.length - b.length;
        }
        return -1;
    } else if (Array.isArray(b)) {
        return 1;
    }

    // If we got here, both `a` and `b` must be non-null objects.
    const ak = Object.keys(a), bk = Object.keys(b);
    const len = Math.min(ak.length, bk.length);
    for (let k = 0; k < len; ++k) {
        let cmp = ak[k].localeCompare(bk[k]);
        if (cmp !== 0) return cmp;
        cmp = simplifiedCompare(a[ak[k]], b[bk[k]]);
        if (cmp !== 0) return cmp;
    }
    return ak.length - bk.length;
}


/** Returns the JSON representation of a simplified data type */
export function simplifiedToJSON(x: Simple, compact: boolean = true): string {
    if (x === undefined) return "null"      // weird special case
    return compact ? JSON.stringify(x) : JSON.stringify(x, null, 2)
}

/**
 * Converts a simplified value to a human-readable string which isn't useful either
 * for hashing or for machine-consumption.  It trades fewer characters for clarity.
 * 
 * @param x the thing to convert
 * @param depth the recursion depth
 */
export function simplifiedToDisplay(x: Simple, depth: number = 0): string {
    switch (typeof x) {
        case 'string':
            x = x.replaceAll('\t', '\\t').replaceAll('\n', '\\n')
            if (x.length > 120) x = x.substring(0, 120) + '…'
            return x
        case 'object':
            if (x === null) return "null"
            // Arrays
            if (Array.isArray(x)) {
                return '[' + x.map(y => simplifiedToDisplay(y, depth + 1)).join(',') + ']'
            }
            // Objects, checking for class names
            const entries = Object.entries(x)
            let prefix = ''
            if (entries.length > 0 && entries[0][0] === '__class__') {
                prefix = `${entries[0][1]}: `
                entries.shift()
            }
            const txt = prefix + entries.map(([k, v]) => `${simplifiedToDisplay(k)}=${simplifiedToDisplay(v, depth + 1)}`).join(', ')
            return (depth > 0 || prefix || !txt) ? `[${txt}]` : txt
    }
    return String(x)        // default for undefined, boolean, and numbers
}

/**
 * Like `String.join()`, but with any simple object.  Converts each to a string using simplifiedToDisplay(),
 * joining with the given string.  If the original is an array, that's the unit.  If the original is primiative, returns only that.
 */
export function simplifiedJoin(x: Simple, joiner: string = ','): string {
    if (Array.isArray(x)) {
        return x.map(y => simplifiedToDisplay(y, 1)).join(joiner)
    }
    return simplifiedToDisplay(x)
}

/**
 * Hashes a simplified value.  This can be faster than converting to a string and then hashing.
 */
export function simplifiedToHash(x: Simple): string {
    // Convert to a string; optimize if already a string; a common use-case
    const s = typeof x === "string" ? x : simplifiedToJSON(x)
    // For now, just convert to JSON and hash
    return createHash('md5').update(s).digest('hex');
}

/**
 * Converts a simplified value to a string-typed 'key' suitable for maps or sets.
 * Similar to `simplifiedToHash()` but much faster for simple types, as things like
 * `boolean` and `number` can be converted directly to a string, and short strings can
 * be used as-is.  Long strings are hashed so keys don't get too long, trivial structured
 * content can be a string (e.g. `[]`), but generally is fully hashed.
 */
export function simplifiedToKey(x: Simple | symbol | bigint): string {
    switch (typeof x) {
        // Many primative types can be just converted to a string
        case 'boolean':
        case 'number':
        case 'bigint':
        case 'symbol':
            return String(x)
        // Short strings are as-is; long ones still need to be hashed.
        case 'string': return x.length <= 32 ? x : simplifiedToHash(x)
        // Undefined is its own thing
        case 'undefined': return "__undefined__"
        // Objects are hashed, except for a few special cases
        case 'object':
            if (x === null) return "__null__"
            return simplifiedToHash(x)
    }
}