import { SmartType, JSONType, SmartTypeVisitor } from "./common";
declare class SmartArray<T, J extends JSONType, EL extends SmartType<T, J>> extends SmartType<T[], J[]> {
    readonly elementType: EL;
    constructor(elementType: EL);
    get constructorArgs(): EL[];
    input(x: unknown, strict: boolean): T[];
    isOfType(x: unknown, deep?: boolean): x is T[];
    visit<U>(visitor: SmartTypeVisitor<U>, x: T[]): U;
    toJSON(x: T[]): J[];
    fromJSON(x: J[]): T[];
    /** Validate that the array has at least this elements. */
    minLen(min: number): this;
}
/** Generic string */
export declare function ARRAY<T, J extends JSONType>(elementType: SmartType<T, J>): SmartArray<T, J, SmartType<T, J>>;
export {};
