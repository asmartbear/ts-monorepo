import { getClassOf, isClassObject, isPlainObject } from '@asmartbear/simplified'
import { ValidationError, ValuesOf, SmartType, JSONType, NativeFor, JsonFor, Primative, isPrimative } from "./common"
import { BOOL } from "./boolean"
import { UNDEF } from "./undef"
import { NUM } from "./number"
import { STR } from "./string"
import { NIL } from "./null"
import { ARRAY } from "./array"
import { CLASS } from "./class"
import { OBJ, FieldOptions } from "./fields"
import { DATE } from './date'
import { REGEXP } from './regexp'
import { SET } from './set'
import { MAP } from './map'
import { OR } from './alternation'

/** Given a type, returns the Class of that type. */
type ClassOf<T> = (abstract new (...args: any[]) => T) | (new (...args: any[]) => T);

type HasFunction<T> = {
    [K in keyof T]: T[K] extends (...args: any[]) => any ? true : never;
}[keyof T] extends never ? false : true;

/** Given a class, returns the instance-type that it creates. */
type InstanceOf<C> = C extends ClassOf<infer T> ? T : never;

/** The smart type corresponding to a given native type */
export type SmartTypeFrom<T> =
    T extends undefined ? ReturnType<typeof UNDEF> :
    T extends null ? ReturnType<typeof NIL> :
    T extends boolean ? ReturnType<typeof BOOL> :
    T extends number ? ReturnType<typeof NUM> :
    T extends string ? ReturnType<typeof STR> :
    T extends Date ? ReturnType<typeof DATE> :
    T extends RegExp ? ReturnType<typeof REGEXP> :
    T extends Set<infer U> ? SmartType<Set<U>, JSONType[]> :
    T extends Map<infer K, infer V> ? SmartType<Map<K, V>, JSONType[]> :
    T extends ClassOf<infer U> ? SmartType<U> :
    HasFunction<T> extends true ? SmartType<T> :      // catch class-instances before generic structures
    T extends Array<infer U> ? SmartType<NativeFor<SmartTypeFrom<U>>[]> :       // rewrap inner
    T extends { [K in keyof T]: T[K] } ? SmartType<{ [K in keyof T]: NativeFor<SmartTypeFrom<T[K]>> }> :       // rewrap inner
    never;

/**
 * Given an instantiated Javascript object, attempts to reverse-engineer the smart-type that matches it.
 * 
 * @param x the object to match
 * @param options optional options for creating types
 */
export function reverseEngineerType<T>(x: T, options?: FieldOptions): SmartTypeFrom<T> {
    switch (typeof x) {
        case 'undefined': return UNDEF() as any
        case 'boolean': return BOOL() as any
        case 'number': return NUM() as any
        case 'string': return STR() as any

        // Mostly no, but catch classes
        case 'function':
            if (isClassObject(x)) {
                return CLASS(x) as any
            }
            throw new Error(`Unsupported native type for reverse-engineering a data type: ${typeof x}`)

        case 'object':

            // null
            if (x === null) return NIL() as any

            // Arrays
            if (Array.isArray(x)) {
                const typ = reverseEngineerSetOfTypes(x, options)
                if (typ == null) throw new Error(`Arrays cannot be empty for reverse-engineering`)
                return ARRAY(typ) as any
            }

            // Sets
            if (x instanceof Set) {
                const typ = reverseEngineerSetOfTypes(x, options)
                if (typ == null) throw new Error(`Arrays cannot be empty for reverse-engineering`)
                return SET(typ) as any
            }

            // Maps
            if (x instanceof Map) {
                const keyType = reverseEngineerSetOfTypes(x.keys(), options)
                const valueType = reverseEngineerSetOfTypes(x.values(), options)
                if (keyType == null || valueType == null) throw new Error(`Maps cannot be empty for reverse-engineering`)
                return MAP(keyType, valueType) as any
            }

            // The known built-in objects
            if (x instanceof Date) return DATE() as any
            if (x instanceof RegExp) return REGEXP() as any

            // Direct class-derived objects are simply validated that they are that type of object
            const derivedClass = getClassOf(x)
            if (derivedClass) {
                return CLASS(derivedClass) as any
            }

            // Remaining objects are treated as generic fields
            return OBJ(Object.fromEntries(
                Object.entries(x).map(
                    ([k, v]) => [k, reverseEngineerType(v, options)]
                )
            ), options) as any

        default:
            throw new Error(`Unsupported native type for reverse-engineering a data type: ${typeof x}`)
    }
}

/**
 * Given a set of types to reverse-engineer, e.g. from an array or set, returns the single
 * reverse-engineered type for the whole set.  This is a concrete type if they're all of
 * the same type, or some alternation if there are distinct sets of types.
 * 
 * Returns `null` if the list is empty, and therefore no type can be identified.
 */
function reverseEngineerSetOfTypes(x: Iterable<any>, options?: FieldOptions): SmartType | null {
    // Create a list of unique types
    const types: SmartType[] = []     // running list of all types we've seen
    for (const y of x) {
        // If we've seen this before, don't add another type to the list
        let sawTypeBefore = false
        for (const t2 of types) {
            if (t2.isOfType(y, true)) {
                sawTypeBefore = true
                break
            }
        }
        if (!sawTypeBefore) {
            types.push(reverseEngineerType(y, options))
        }
    }
    // Special case: No types
    if (types.length == 0) return null
    // If one type, it's easy
    if (types.length == 1) return types[0]
    // Multiple types, so create an alternation
    return OR(...types)
}
