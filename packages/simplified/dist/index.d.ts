type ClassOf<T> = (abstract new (...args: any[]) => T) | (new (...args: any[]) => T);
/** True if the given variable is itself a class. */
export declare function isClassObject(x: any): x is ClassOf<any>;
/** True if the given thing is a plain object -- no constructor or parent class -- though fields can be anything, including functions. */
export declare function isPlainObject(x: any): x is object;
/** Returns the class object that this object instantiated from, or `undefined` if it wasn't that kind of object */
export declare function getClassOf<T>(x: T): (T extends object ? ClassOf<T> : undefined) | undefined;
/** True if the given variable is iterable */
export declare function isIterable<T>(x: any): x is Iterable<T>;
type Primative = undefined | null | boolean | number | string;
/** Data type after simplification: Like JSON, including undefined. */
export type Simple = Primative | Simple[] | {
    [key: string | number]: Simple;
};
/** Simple data type where some or all could be wrapped in a Promise, including recursively. */
export type PromisedSimple = Primative | PromisedSimple[] | {
    [key: string | number]: PromisedSimple;
} | Promise<Simple>;
/** If a promise, the inner promised type, else itself. */
export type ResolvedPromiseSimple<T> = T extends Primative ? T : T extends Promise<infer U> ? U : T extends Array<infer U> ? ResolvedPromiseSimple<U>[] : T extends object ? {
    [K in keyof T]: ResolvedPromiseSimple<T[K]>;
} : never;
/**
 * Something that knows how to convert itself to a `Simple` type.
 */
export interface ISimplifiable<T extends Simple> {
    toSimplified: () => T;
}
/** Transforms a type to its equivalent Simple type, as executed by `simplify()`. */
export type Simplified<T> = T extends undefined | null | boolean | number | string ? T : T extends symbol ? string : T extends bigint ? string | number : T extends Function ? never : T extends Date ? {
    t: number;
} : T extends RegExp ? string : T extends URL ? string : T extends Promise<infer U> ? Promise<Simplified<U>> : T extends Array<infer U> ? Simplified<U>[] : T extends Set<infer U> ? Simplified<U>[] : T extends Map<infer K extends string | number, infer U> ? {
    [Key in K]: Simplified<U extends undefined ? never : U>;
} : T extends Map<infer K, infer U> ? [[Simplified<K>, Simplified<U extends undefined ? never : U>]] : T extends Iterable<infer U> ? Simplified<U>[] : T extends ISimplifiable<infer U> ? U : T extends object ? {
    [K in keyof T as K extends symbol ? never : Simplified<T[K]> extends never ? never : K]: Simplified<T[K]>;
} : never;
/** A type that is cleanly and reliably simplifiable, including special cases but excluding the case of the generic class. */
export type Simplifiable = undefined | null | boolean | number | string | symbol | bigint | Date | RegExp | URL | Promise<Simplifiable> | Set<Simplifiable> | Map<Simplifiable, Simplifiable> | Iterable<Simplifiable> | ISimplifiable<Simple> | Simplifiable[] | {
    [K in string | number]: Simplifiable;
};
/** True if the argument is a simple value, and tells Typescript as well */
export declare function isSimple(x: any): x is Simple;
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
export declare function simplify<T>(x: T, skip?: Set<any>): Simplified<T>;
/**
 * The same as `simplify()` for when Typescript gets confused about types so you need something
 * that returns the correct parent type without any detail that Typescript would otherwise supply.
 *
 * Typescript is still invoked for Promises, keeping them as Promises.
 */
export declare function simplifyOpaqueType<T extends Promise<any>>(x: T): Promise<Simple>;
export declare function simplifyOpaqueType<T>(x: T): Simple;
/**
 * If we simplified something that includes promises (itself, or recursively), waits for all those
 * promises recursively, returning a promise that completely resolves all promises into a realized `Simple` object.
 */
export declare function simplifiedAwait<T extends Primative>(x: T): T;
export declare function simplifiedAwait<T extends Promise<Simple>>(x: T): T;
export declare function simplifiedAwait<T extends PromisedSimple>(x: T): Promise<ResolvedPromiseSimple<T>>;
/**
 * Can subclass this to create a walker that receives a `Simple` type, being invoked on every item,
 * returning the results of invocation to each step.
 */
export declare abstract class SimplifiedWalker<T, TUndefined extends T = T, TNull extends T = T, TBoolean extends T = T, TNumber extends T = T, TString extends T = T, TArray extends T = T, TObject extends T = T> {
    /**
     * Walks the given type recursively, calling the call-backs.
     */
    walk(x: undefined): TUndefined;
    walk(x: null): TNull;
    walk(x: boolean): TBoolean;
    walk(x: number): TNumber;
    walk(x: string): TString;
    walk(x: Simple[]): TArray;
    walk(x: Simple): TUndefined | TNull | TBoolean | TNumber | TString | TArray | TObject;
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
export declare function simplifiedCompare(a: Simple, b: Simple): number;
/** Returns the JSON representation of a simplified data type */
export declare function simplifiedToJSON(x: Simple, compact?: boolean): string;
/**
 * Converts a simplified value to a human-readable string which isn't useful either
 * for hashing or for machine-consumption.  It trades fewer characters for clarity.
 *
 * @param x the thing to convert
 * @param depth the recursion depth
 */
export declare function simplifiedToDisplay(x: Simple, depth?: number): string;
/**
 * Like `String.join()`, but with any simple object.  Converts each to a string using simplifiedToDisplay(),
 * joining with the given string.  If the original is an array, that's the unit.  If the original is primiative, returns only that.
 */
export declare function simplifiedJoin(x: Simple, joiner?: string): string;
/**
 * Hashes a simplified value.  This can be faster than converting to a string and then hashing.
 */
export declare function simplifiedToHash(x: Simple): string;
export {};
