import { SmartType, SmartTypeVisitor } from "./common";
declare class SmartNull extends SmartType<null, null> {
    constructor();
    input(x: unknown, strict?: boolean): null;
    isOfType(x: unknown): x is null;
    visit<U>(visitor: SmartTypeVisitor<U>, x: null): U;
    toJSON(x: any): null;
    fromJSON(x: any): any;
}
/** The `null` value */
export declare function NIL(): SmartNull;
export {};
