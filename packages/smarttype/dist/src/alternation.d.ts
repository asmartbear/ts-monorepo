import { SmartType, JSONType, NativeFor, SmartTypeVisitor } from "./common";
import { JS_UNDEFINED_SIGNAL } from "./undef";
type AlternationJSON = {
    t: string;
    x: JSONType;
};
declare class SmartAlternation<T> extends SmartType<T, AlternationJSON> {
    readonly types: readonly SmartType<T>[];
    constructor(types: readonly SmartType<T>[]);
    /** Finds the first type that matches this native value, or `undefined` if none match. */
    private getTypeForNative;
    get constructorArgs(): (readonly SmartType<T, JSONType>[])[];
    get canBeUndefined(): boolean;
    input(x: unknown, strict?: boolean): T;
    isOfType(x: unknown, deep?: boolean): x is T;
    visit<U>(visitor: SmartTypeVisitor<U>, x: T): U;
    toJSON(x: T): AlternationJSON;
    fromJSON(js: AlternationJSON): T;
}
/** Any of these types are acceptable.  Typescript is a union; JSON is a special structure that specifies which type it is. */
export declare function OR<ST extends readonly SmartType[]>(...types: ST): SmartAlternation<NativeFor<ST>>;
/**
 * Returns the same type, but where `undefined` is also an acceptable value.
 * If `undefined` is already one of the types it can be, returns the original object unchanged.
 */
export declare function OPT<T, J extends JSONType>(typ: SmartType<T, J>): SmartType<T | undefined, J | typeof JS_UNDEFINED_SIGNAL>;
export {};
