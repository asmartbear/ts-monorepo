import { SmartType, JSONType, NativeFor } from "./common";
import { BOOL } from "./boolean";
import { UNDEF } from "./undef";
import { NUM } from "./number";
import { STR } from "./string";
import { NIL } from "./null";
import { FieldOptions } from "./fields";
import { DATE } from './date';
import { REGEXP } from './regexp';
/** Given a type, returns the Class of that type. */
type ClassOf<T> = (abstract new (...args: any[]) => T) | (new (...args: any[]) => T);
type HasFunction<T> = {
    [K in keyof T]: T[K] extends (...args: any[]) => any ? true : never;
}[keyof T] extends never ? false : true;
/** The smart type corresponding to a given native type */
export type SmartTypeFrom<T> = T extends undefined ? ReturnType<typeof UNDEF> : T extends null ? ReturnType<typeof NIL> : T extends boolean ? ReturnType<typeof BOOL> : T extends number ? ReturnType<typeof NUM> : T extends string ? ReturnType<typeof STR> : T extends Date ? ReturnType<typeof DATE> : T extends RegExp ? ReturnType<typeof REGEXP> : T extends Set<infer U> ? SmartType<Set<U>, JSONType[]> : T extends Map<infer K, infer V> ? SmartType<Map<K, V>, JSONType[]> : T extends ClassOf<infer U> ? SmartType<U> : HasFunction<T> extends true ? SmartType<T> : T extends Array<infer U> ? SmartType<NativeFor<SmartTypeFrom<U>>[]> : T extends {
    [K in keyof T]: T[K];
} ? SmartType<{
    [K in keyof T]: NativeFor<SmartTypeFrom<T[K]>>;
}> : never;
/**
 * Given an instantiated Javascript object, attempts to reverse-engineer the smart-type that matches it.
 *
 * @param x the object to match
 * @param options optional options for creating types
 */
export declare function reverseEngineerType<T>(x: T, options?: FieldOptions): SmartTypeFrom<T>;
export {};
