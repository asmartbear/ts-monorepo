
/**
 * Either `null` or `undefined`.
 */
export type Nullish = null | undefined

/**
 * A type that that would definitely evaluate as `true` under `FALSEY`.
 */
export type FalseyValue = null | undefined | false | 0 | ""

/**
 * Narrowing a value to the options that would definitely evaluate as `true` under `FALSEY`.
 */
export type Falsey<T> = Exclude<T & FalseyValue, object | string | true | number>

/**
 * Narrowing a value to the options that would definitely evaluate as `false` under `FALSEY`.
 */
export type Truthy<T> = Exclude<T, FalseyValue>

/**
 * A type that can be compared with `>`, `<`, `>=`, `<=`, `==`, and `!=`.
 */
export type Comparable = boolean | number | string | bigint;

/**
 * Things that we can treat as an array.
 */
type ArrayLike<T> = T[] | Iterable<T> | Nullish

/**
 * A type that might be itself, or a promise of itself.
 */
export type MaybePromise<T> = T | Promise<T>

/**
 * A function that returns a given value.
 */
export type Callable<R> = (...args: any[]) => R

/**
 * A type that is not a function.
 */
export type NotFunction<T> = T extends (...args: any[]) => any ? never : T;

/**
 * Type of the string-valued keys of an object, or `never` if it's not an object.
 */
export type KeysOf<T> = T extends object ? (keyof T & string) : never

/**
 * Type of the values of an object, or `never` if it's not an object.
 */
export type ValuesOf<T> = T extends object ? T[keyof T] : never

/**
 * Given a type, returns the Class of that type.
 */
export type ClassOf<T> = (abstract new (...args: any[]) => T) | (new (...args: any[]) => T);

/**
 * A trivial function; can be useful to put in places that require a callback where you don't care about the result.
 */
export const NOOP = () => { }

/**
 * True if the given value is a function, and then narrows the type.
 */
function isCallable<R>(value: unknown): value is Callable<R> {
    return typeof value === 'function';
}

/** True if this value is an iterator. */
export function isIterator<T>(x: any): x is Iterator<T> {
    return typeof x === 'object' && x && typeof x.next === 'function'
}

/** True if this value is an iterable, that can produce an iterator. */
export function isIterable<T>(x: any): x is Iterable<T> {
    return typeof x === 'object' && x && typeof x[Symbol.iterator] === 'function'
}

/**
 * Utility to split `'foo.bar'` into `['foo', 'bar']`, ignoring whitespace and blank fields.
 */
export function fieldListFromDotString(fieldPath: string): string[] {
    return fieldPath.split('.').map(f => f.trim()).filter(f => !!f)
}

/**
 * Asserts that a given value never happens, which throws an error at run-time and tells Typescript it doesn't happen.
 */
export function NEVER(value: never): never {
    // istanbul ignore next
    throw new Error(`FATAL: assertNever(): Shouldn't get here: ${value}`);
}

/**
 * Use like `then()` but when the input is a `MaybePromise<T>` instead of a `Promise<T>`.
 * 
 * Specifically: Given a value that is either a Promise or not, and the (maybe promise, maybe not!)
 * function that you would use for `.then( (x) => y )`, it either runs `then` on the promise or,
 * if the input wasn't a promise, it creates the "then" promise function directly.
 */
export function THEN<T, R>(input: MaybePromise<T>, fThen: (x: T) => MaybePromise<R>): MaybePromise<R> {
    // istanbul ignore next
    return (input instanceof Promise) ? input.then(fThen) : fThen(input)
}

/**
 * Same as `THEN` but chaining two functions
 */
export function THEN2<T, R1, R2>(input: MaybePromise<T>, fThen1: (x: T) => MaybePromise<R1>, fThen2: (x: R1) => MaybePromise<R2>): MaybePromise<R2> {
    // istanbul ignore next
    return THEN(THEN(input, fThen1), fThen2)
}

/**
 * Same as `THEN` but chaining three functions
 */
export function THEN3<T, R1, R2, R3>(input: MaybePromise<T>, fThen1: (x: T) => MaybePromise<R1>, fThen2: (x: R1) => MaybePromise<R2>, fThen3: (x: R2) => MaybePromise<R3>): MaybePromise<R3> {
    // istanbul ignore next
    return THEN(THEN(THEN(input, fThen1), fThen2), fThen3)
}

/**
 * Waits for all of the promises to resolve, even when they are maybe-promises, and then returns the array of results.
 */
export function ALL<T>(promises: ArrayLike<MaybePromise<T>>): MaybePromise<T[]> {
    if (!promises) return []
    return Promise.all(promises)
}

/**
 * True if X is `null` or `undefined` or `0` or `[]` or `""`.
 * 
 * Also scopes down the type for Typescript.
 */
export function FALSEY<T>(x: T): x is Falsey<T> {
    return !x || (Array.isArray(x) && x.length === 0)
}

/**
 * The opposite of `FALSEY` but might have better type implications if this is what you really mean.
 */
export function TRUTHY<T>(x: T): x is Truthy<T> {
    return !FALSEY(x)
}

/**
 * Convert something array-like to an actual array.  `Nullish` becomes an empty array.  Actual arrays are returned as-is.
 * Sets and Maps return their entries as an array.
 */
export function ARRAY<T>(a: ArrayLike<T>): T[] {
    return !a ? [] : Array.isArray(a) ? a : Array.from(a)
}

/**
 * Returns a new array of the given length, filled with the given value.
 */
export function ARRAY_OF<T>(length: number, value: T): T[] {
    return length <= 0 ? [] : Array.from({ length }, (_, i) => value)
}

/**
 * Returns a new array of the given length, filled with the values given by a function which is provided the index number.
 */
export function ARRAY_OF_DYN<T>(length: number, fValue: (i: number) => T): T[] {
    return length <= 0 ? [] : Array.from({ length }, (_, i) => fValue(i))
}

/**
 * Converts something array-like to an `Iterable`.  Nullish things become a trivial iterator.
 * Arrays use a built-in for efficiency.  If it was already an iterable, returns it as-is.
 * Sets and Maps iterate their entries.
 */
export function ITER<T>(a: ArrayLike<T>): Iterable<T> {
    if (!a) return [][Symbol.iterator]()
    if (Array.isArray(a)) return a[Symbol.iterator]()
    return a
}

/**
 * The length of the array-like or string-like thing or Maps or Sets or number of keys in an object.  `Nullish` is `0`.
 */
export function LEN(a: ArrayLike<any> | Map<any, any> | Set<any> | Record<any, any> | string): number {
    if (!a) return 0
    if (Array.isArray(a) || typeof a === "string") return a.length
    if (a instanceof Map || a instanceof Set) return a.size
    if (isIterable(a)) return Array.from(a).length         // have to actualize the iterable
    return Object.keys(a).length            // number of keys in the record
}

/**
 * True if this object is not `Nullish` and not empty; tells Typescript it's not `Nullish` at least.
 */
export function NOT_EMPTY<T extends Array<any> | Iterable<any> | Map<any, any> | Set<any> | Record<any, any> | string>(a: T | Nullish): a is T {
    return LEN(a) > 0
}

/**
 * Returns the `i`th element, or negative to index from the end, undefined if out of range or Nullish
 */
export function AT(a: null | undefined, i: number): undefined
export function AT<T>(a: T[], i: number): T | undefined
export function AT<T>(a: T[] | null | undefined, i: number): T | undefined;
export function AT<T>(a: T[] | null | undefined, i: number): T | undefined {
    return a ? a[i < 0 ? (a.length + i) : i] : undefined
}

/**
 * Returns the keys of an object or `Map`, or an empty array if it is `null` or `undefined`,
 * or if it's an array and not an object.
 */
export function KEYS<K>(obj: Map<K, unknown> | Nullish): K[];
export function KEYS<T extends Record<string, any>>(obj: T | Nullish): KeysOf<T>[];
export function KEYS(obj: any): any[] {
    if (!obj || Array.isArray(obj)) return []
    if (obj instanceof Map) return Array.from(obj.keys())
    return Object.keys(obj)
}

/**
 * Returns the values of an object or `Map`, or an empty array if it is `null` or `undefined`,
 * or if it's an array and not an object.
 */
export function VALUES<V, T extends Record<any, V>>(obj: T | Nullish): ValuesOf<T>[];
export function VALUES<V>(obj: Map<any, V> | Nullish): V[];
export function VALUES(obj: any): any[] {
    if (!obj || Array.isArray(obj)) return []
    if (obj instanceof Map) return Array.from(obj.values())
    return Object.values(obj)
}

/**
 * Returns an array of `[key,value]` pairs based on an object or Map.
 */
export function ENTRIES<K extends string | number, V>(obj: Record<K, V> | Nullish): [K, V][];
export function ENTRIES<K, V>(obj: Map<K, V> | Nullish): [K, V][];
export function ENTRIES(obj: any): [any, any][] {
    if (!obj) return []
    if (obj instanceof Map) return Array.from(obj.entries())
    return Object.entries(obj)
}

/**
 * Like `Object.entries()` but much better Typescript support.
 */
export function FROM_ENTRIES<const PAIRS extends readonly (readonly [key: string, value: any])[]>(entries: PAIRS | Nullish): { [P in PAIRS[number]as P[0]]: P[1] } {
    if (!entries) return {} as any
    return Object.fromEntries(entries as readonly (readonly [string, any])[]) as any
}

/**
 * Like `Array.forEach()` but not only with any iterable, but also the "index" is the key for
 * things like object fields, record fields, and Maps.
 * If given `null` or `undefined`, silently does nothing.
 */
export function FOREACH(a: Nullish, f: (...args: any[]) => void): void
export function FOREACH<K, V>(a: Map<K, V> | Nullish, f: (v: V, k: K) => void): void
export function FOREACH<V>(a: Iterable<V> | Nullish, f: (v: V, k: number) => void): void
export function FOREACH<T extends object>(a: T | Nullish, f: (v: T[keyof T], k: keyof T) => void): void
export function FOREACH<K extends string | number | symbol, V>(a: Record<K, V> | Nullish, f: (v: V, k: K) => void): void
export function FOREACH<K, V>(a: Map<K, V> | Record<K & (string | number | symbol), V> | Iterable<V> | Nullish, f: (v: V, k: K) => void): void {
    if (!a) return
    if (Array.isArray(a) || a instanceof Map) {
        a.forEach(f as any)
    } else if (isIterable(a)) {
        let i = 0
        for (const x of a) {
            f(x, i as K)
            ++i
        }
    } else {
        for (const pair of Object.entries(a)) {
            f(pair[1] as any, pair[0] as any)
        }
    }
}

/**
 * Same as `Array.map()`, but also works on iterables which includes `Set` and `Map` objects,
 * and returns empty arrays for `null` and `undefined`, and also skips any function outputs that are `undefined`.
 * 
 * @param arr the array or iterable or `null` or `undefined` to map
 * @param f the function that transforms each element, or `undefined` to filter out an element
 * @returns the mapped array, which might have fewer elements than the input if `f()` filtered anything out
 */
export function MAP<T, V>(arr: ArrayLike<T>, f: (x: T) => V | undefined): Exclude<V, undefined>[] {
    if (!arr) return []
    const result: Exclude<V, undefined>[] = []
    for (const x of arr) {
        const y = f(x)
        if (y !== undefined) result.push(y as any)      // not sure why Typescript needs this hint
    }
    return result
}

/**
 * Same as `MAP` but with asynchronous callbacks.  All of them are executed simultaneously.
 * 
 * @param arr the array or iterable or `null` or `undefined` to map
 * @param f the function that transforms each element, or `undefined` to filter out an element
 * @returns the mapped array, which might have fewer elements than the input if `f()` filtered anything out
 */
export async function aMAP<T, V>(arr: ArrayLike<T>, f: (x: T) => MaybePromise<V | undefined>): Promise<Exclude<V, undefined>[]> {
    const r = await Promise.all(MAP(arr, f));
    return r.filter(y => y !== undefined) as any;
}

/**
 * Like `MAP` but with objects, iterating over key/values, emitting a new object with the same keys but transformed values.
 */
export function OMAP<T extends object, R>(obj: T | Nullish, f: <K extends keyof T>(x: T[K], k: K) => R): { [K in keyof T]: R } {
    if (!obj) return {} as any
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, f(v, k as any)])) as any
}

/**
 * Similar to `map()`, but expects strings, joining them with something.  Can skip elements by returning `undefined`.
 */
export function JOIN<T extends string>(joiner: string, arr: ArrayLike<T>): string;
export function JOIN<T>(joiner: string, arr: ArrayLike<T>, f: (x: T) => string | undefined): string;
export function JOIN<T>(joiner: string, arr: ArrayLike<T>, f?: (x: T) => string | undefined): string {
    return f ? MAP(arr, f).join(joiner) : ARRAY(arr).join(joiner)     // actually fairly efficient because of joining many strings at once.
}

/**
 * Same as `JOIN` but with asynchronous callbacks.
 */
export function aJOIN<T>(joiner: string, arr: ArrayLike<T>, f: (x: T) => MaybePromise<string | undefined>): Promise<string> {
    return aMAP(arr, f).then(r => r.join(joiner))
}

/**
 * Like `if (C) T else F`, but with functions for `C` and `T`.
 * 
 * Useful both to avoid executing the unused branch, and if the condition is an expression that you
 * want to use, like when regex-matching a string where you want the matcher afterwards, or if you
 * want to be able to "return" a result and use that as the caller.
 * 
 * @param condition the condition to check using `FALSEY`, either a function to invoke or a direct value
 * @param fTrue the function to call if the condition is truthy, and it is given to the function.
 * @param fFalse (optional) the function to call if the condition is falsy, and it is given to the function.
 */
export function IF<C, T>(condition: C | Callable<C>, fTrue: (condition: Truthy<C>) => T, falseValue?: undefined): T | undefined;
export function IF<C, T, F>(condition: C | Callable<C>, fTrue: (condition: Truthy<C>) => T, falseValue: NotFunction<F>): T | NotFunction<F>;
export function IF<C, T, F>(condition: C | Callable<C>, fTrue: (condition: Truthy<C>) => T, falseValue: F): T | F {
    if (isCallable(condition)) condition = condition()
    return FALSEY(condition) ? falseValue : fTrue(condition as Truthy<C>)
}

/**
 * Like `if (c) T else F`, but with functions.
 * 
 * Useful both to avoid executing the unused branch, and if the condition is an expression that you
 * want to use, like when regex-matching a string where you want the matcher afterwards, or if you
 * want to be able to "return" a result and use that as the caller.
 * 
 * @param condition the condition to check using `FALSEY`, either a function to invoke or a direct value
 * @param fTrue the function to call if the condition is truthy, and it is given to the function.
 * @param fFalse the function to call if the condition is falsy, and it is given to the function.
 */
export function IFELSE<C, T, F>(condition: C | Callable<C>, fTrue: (condition: Truthy<C>) => T, fFalse: (condition: Falsey<C>) => F): T | F {
    if (isCallable(condition)) condition = condition()
    return FALSEY(condition) ? fFalse(condition) : fTrue(condition as Truthy<C>)
}

/**
 * Loops while a condition function returns something truthy, and provides that value to the function that runs the loop.
 * 
 * @param condition the condition to check; loop proceeds if it is `TRUTHY`
 * @param fLoop the function to loop.
 */
export function WHILE<C>(condition: () => C, fLoop: (condition: Truthy<C>) => void) {
    let x: C
    while (TRUTHY(x = condition())) {
        fLoop(x)
    }
}

/**
 * Like `IF` but async functions.
 * 
 * @param condition the condition to check using `FALSEY`, either a function to invoke or a direct value
 * @param fTrue the function to call if the condition is truthy, and it is given to the function.
 * @param fFalse the function to call if the condition is falsy, and it is given to the function.
 */
export function aIFELSE<C, T, F>(condition: C | Callable<MaybePromise<C>>, fTrue: (condition: Truthy<C>) => MaybePromise<T>, fFalse: (condition: Falsey<C>) => MaybePromise<F>): MaybePromise<T | F> {
    return THEN(
        isCallable(condition) ? condition() : condition,
        condition => (FALSEY(condition) ? fFalse(condition) : fTrue(condition as Truthy<C>))
    )
}

/**
 * For strings, calls the function with the given argument, but only if the argument is `Truthy`, otherwise returns an empty string.
 * 
 * @param x argument to pass to the function, either a function to invoke or a direct value
 * @param f function to execute
 */
export function WITH<C>(condition: C | Callable<C>, f: (condition: Truthy<C>) => string): string {
    return IF(condition, f, "")
}

/**
 * Same as `WITH` but with asynchronous functions
 * 
 * @param x argument to pass to the function, either a function to invoke or a direct value
 * @param f function to execute
 */
export function aWITH<C>(condition: C | Callable<MaybePromise<C>>, f: (condition: Truthy<C>) => MaybePromise<string>): MaybePromise<string> {
    return aIFELSE(condition, f, () => "")
}

/**
 * Returns the maximum value from a list of objects.
 * 
 * The resulting value does not need to be the object; it can return any other value computed
 * from the object.  If that function returns `undefined`, that element is skipped.
 */
export function MAX<T, V extends Comparable>(min: V, a: ArrayLike<T>, fEvaluator: (x: T) => V | undefined): V {
    if (!a) return min
    let max = min
    for (const x of a) {
        const v = fEvaluator(x)
        if (v !== undefined && v > max) max = v
    }
    return max
}

/**
 * Same as `MAX` but with asynchronous evaluators.
 */
export async function aMAX<T, V extends Comparable>(min: V, a: ArrayLike<T>, fEvaluator: (x: T) => MaybePromise<V | undefined>): Promise<V> {
    if (!a) return min
    let max = min
    for (const v of await aMAP(a, fEvaluator)) {        // evaluate in parallel, and removes `undefined` results
        if (v > max) max = v
    }
    return max
}

/**
 * Returns the minimum value from a list of objects.
 * 
 * The resulting value does not need to be the object; it can return any other value computed
 * from the object.  If that function returns `undefined`, that element is skipped.
 */
export function MIN<T, V extends Comparable>(max: V, a: ArrayLike<T>, fEvaluator: (x: T) => V | undefined): V {
    if (!a) return max
    let min = max
    for (const x of a) {
        const v = fEvaluator(x)
        if (v !== undefined && v < min) min = v
    }
    return min
}

/**
 * Finds the N smallest elements from the list, using the given evaluator to determine the value to compare.
 * Might return fewer than N if there aren't enough elements.  Evaluator can return `undefined` to skip an element.
 */
export function MIN_N<T, V extends Comparable>(n: number, a: ArrayLike<T>, fEvaluator: (x: T) => V | undefined): T[] {
    if (!a) return []
    const evaluations: [T, V][] = MAP(a, el => {
        const v = fEvaluator(el)
        return v === undefined ? undefined : [el, v]
    })
    evaluations.sort((a, b) => a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0)
    return evaluations.slice(0, n).map(pair => pair[0])
}

/**
 * Finds the smallest elements from the list, using the given evaluator to determine the value to compare.
 */
export function FIND_SMALLEST<T, V extends Comparable>(a: ArrayLike<T>, fEvaluator: (x: T) => V): T {
    if (!a) return undefined!
    let best: T = undefined!
    let bestValue: V = undefined!
    for (const x of a) {
        const v = fEvaluator(x)
        if (best === undefined || v < bestValue) {
            best = x
            bestValue = v
        }
    }
    return best
}

/**
 * Accesses nested fields in objects, or `undefined` if anything along the
 * way isn't an object, or if that field isn't on the object. Uses `Map.get()` if
 * that is the type of object.  Works with array indicies, e.g. `"2"` for `[2]`.
 * 
 * If no fields are given, the value itself is returned, regardless of type.
 */
export function FIELD<T>(a: any, ...fields: string[]): T | undefined {
    for (const f of fields) {
        if (!a || typeof a !== 'object') return undefined
        if (a instanceof Map) {
            a = a.get(f)
        } else {
            a = a[f]
        }
    }
    return a
}

/**
 * Same as `FIELD()` but the fields are given as dot-separated names with all whitespace ignored.
 */
export function FIELD_DOT<T>(a: any, fieldPath: string): T | undefined {
    return FIELD<T>(a, ...fieldListFromDotString(fieldPath))
}

/**
 * Scans an array-like object for the first element that matches the given function.
 * 
 * @param a array-like to scan
 * @param f evaluator of whether "we have found it"
 * @returns the first element that matches, or `undefined` if none do
 */
export function FIND<T>(a: ArrayLike<T>, f: (x: T) => boolean): T | undefined {
    if (!a) return undefined
    for (const x of a) {
        if (f(x)) return x
    }
    return undefined
}

/**
 * Scans an array-like object for the last element that matches the given function.
 * 
 * @param a array-like to scan
 * @param f evaluator of whether "we have found it"
 * @returns the first element that matches, or `undefined` if none do
 */
export function FIND_LAST<T>(a: ArrayLike<T>, f: (x: T) => boolean): T | undefined {
    if (!a) return undefined
    // Optimization when it's actually an array.
    if (Array.isArray(a)) {
        return a.findLast(f)
    }
    // Read the iterator, keeping the last one that succeeded
    let lastSuccess: T | undefined = undefined
    for (const x of a) {
        if (f(x)) lastSuccess = x
    }
    return lastSuccess
}

/**
 * Same as `FIND` but an asynchronous evaluation function
 * 
 * @param a array-like to scan
 * @param f evaluator of whether "we have found it"
 * @returns the first element that matches, or `undefined` if none do
 */
export async function aFIND<T>(a: ArrayLike<T>, f: (x: T) => MaybePromise<boolean>): Promise<T | undefined> {
    if (!a) return undefined
    for (const x of a) {
        if (await f(x)) return x
    }
    return undefined
}

/**
 * Scans an array-like object, executing a function on every element which can return any type,
 * stopping as soon as that function returns something non-`undefined`, returning that value.
 * 
 * @param a array-like to scan
 * @param f evaluator of what to return, or `undefined` to go to the next child element.
 * @returns the first element that returns a non-`undefined` value, or `undefined` if none did
 */
export function FIRST<T, V>(a: ArrayLike<T>, f: (x: T) => V | undefined): V | undefined {
    if (!a) return undefined
    for (const x of a) {
        const y = f(x)
        if (y !== undefined) return y
    }
    return undefined
}

/**
 * Returns `true` if every value matches the given boolean evaluator, `false` otherwise.
 * 
 * @param a array-like to scan
 * @param fEvaluator the test function
 * @param resultIfEmpty the return result if the array is empty; in Set Theory it would be `true` but practically we often want `false`.
 */
export function EVERY<T>(a: ArrayLike<T>, fEvaluator: (x: T) => boolean, resultIfEmpty: boolean): boolean {
    if (!a) return resultIfEmpty
    let sawSomething = false
    for (const x of a) {
        if (!fEvaluator(x)) return false
        sawSomething = true
    }
    return sawSomething || resultIfEmpty
}

/**
 * Returns `true` if any values match the given boolean evaluator, `false` otherwise.
 */
export function ANY<T>(a: ArrayLike<T>, fEvaluator: (x: T) => boolean): boolean {
    return FIND(a, fEvaluator) !== undefined
}

/**
 * Same as `ANY` but with asynchronous evaluators.
 */
export function aANY<T>(a: ArrayLike<T>, fEvaluator: (x: T) => MaybePromise<boolean>): MaybePromise<boolean> {
    return THEN(aFIND(a, fEvaluator), x => x !== undefined)
}

/**
 * Returns a new array with only the elements that adhere to the filter function.
 */
export function FILTER<T>(a: ArrayLike<T>, fEvaluator: (x: T) => boolean): T[] {
    return ARRAY(a).filter(fEvaluator)      // for now the behavior isn't special
}

/**
 * Returns either the same array sorted, or converts to an array and sorts that
 */
export function SORT<T>(a: ArrayLike<T>, fComparator?: (x: T, y: T) => number): T[] {
    return a ? ARRAY(a).sort(fComparator) : []
}

/**
 * Returns a new array with only the elements that adhere to the filter function,
 * which itself is a Typescript-narrowing function, and therefore narrows data type of the resulting array.
 */
export function NARROW<T, U extends T>(a: ArrayLike<T>, fEvaluator: (x: T) => x is U): U[] {
    return ARRAY(a).filter(fEvaluator)
}

/**
 * Returns a new array containing only the first occurance of each element, with a function determining
 * what "duplicate" means.  The function returns any comparable that is used to determine if two elements
 * are the same.  It also can returned `undefined` to skip this element regardless.
 */
export function DEDUP<T, U extends Comparable>(a: ArrayLike<T>, fDuplicationValue: (x: T) => U | undefined): T[] {
    const seen = new Set<U>()
    return FILTER(a, x => {
        const v = fDuplicationValue(x)
        if (v === undefined || seen.has(v)) return false
        seen.add(v)
        return true
    })
}

/**
 * Returns the arithmetic average of the number-like elements in the list-like thing,
 * or `0` if there are no elements.
 */
export function AVERAGE(a: ArrayLike<number>): number {
    if (!a) return 0
    let sum = 0
    let n = 0
    for (const x of a) {
        sum += x
        ++n
    }
    return sum / n
}