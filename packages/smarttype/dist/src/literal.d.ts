import { Primative, SmartType, SmartTypeVisitor } from "./common";
declare class SmartLiteral<T extends Primative> extends SmartType<T, T> {
    readonly values: readonly T[];
    constructor(values: readonly T[]);
    get constructorArgs(): (readonly T[])[];
    input(x: unknown, strict?: boolean): T;
    isOfType(x: unknown): x is T;
    visit<U>(visitor: SmartTypeVisitor<U>, x: T): U;
    toJSON(x: T): T;
    fromJSON(js: T): T;
}
/** One of a given specific set of literal, primative values. */
export declare function LITERAL<T extends Primative>(...values: readonly T[]): SmartLiteral<T>;
export {};
