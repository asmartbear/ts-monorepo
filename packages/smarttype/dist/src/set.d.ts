import { SmartType, JSONType, NativeFor, SmartTypeVisitor } from "./common";
declare class SmartSet<T, ST extends SmartType<T>> extends SmartType<Set<T>, JSONType[]> {
    readonly typ: ST;
    constructor(typ: ST);
    get constructorArgs(): ST[];
    input(x: unknown, strict?: boolean): Set<T>;
    isOfType(x: unknown, deep?: boolean): x is Set<T>;
    visit<U>(visitor: SmartTypeVisitor<U>, x: Set<T>): U;
    toJSON(x: Iterable<T>): JSONType[];
    fromJSON(js: JSONType): Set<T>;
}
/** A `Set<T>` with arbitrary types. */
export declare function SET<ST extends SmartType>(elementType: ST): SmartSet<NativeFor<ST>, ST>;
export {};
