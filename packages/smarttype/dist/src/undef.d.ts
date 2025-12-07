import { SmartType, SmartTypeVisitor } from "./common";
export declare const JS_UNDEFINED_SIGNAL = "__undefined__";
declare class SmartUndefined extends SmartType<undefined, typeof JS_UNDEFINED_SIGNAL> {
    constructor();
    get canBeUndefined(): boolean;
    input(x: unknown, strict?: boolean): undefined;
    isOfType(x: unknown): x is undefined;
    visit<U>(visitor: SmartTypeVisitor<U>, x: undefined): U;
    toJSON(x: any): typeof JS_UNDEFINED_SIGNAL;
    fromJSON(x: any): undefined;
    static SINGLETON: SmartUndefined;
}
/** The `undefined` value */
export declare function UNDEF(): SmartUndefined;
export {};
