import { SmartType, JSONType, SmartTypeVisitor } from "./common";
/** The native `boolean` type */
declare class SmartBoolean extends SmartType<boolean, boolean> {
    constructor();
    input(x: unknown, strict?: boolean): boolean;
    isOfType(x: unknown): x is boolean;
    visit<U>(visitor: SmartTypeVisitor<U>, x: boolean): U;
    toJSON(x: boolean): boolean;
    fromJSON(x: JSONType): x is true;
}
/** Simple boolean */
export declare function BOOL(): SmartBoolean;
export {};
