import { SmartType, SmartTypeVisitor } from "./common";
declare class SmartRegexp extends SmartType<RegExp, string> {
    constructor();
    input(x: unknown, strict?: boolean): RegExp;
    isOfType(x: unknown): x is RegExp;
    visit<U>(visitor: SmartTypeVisitor<U>, x: RegExp): U;
    toJSON(x: RegExp): string;
    fromJSON(x: string): RegExp;
}
/** `RegExp` object, can be parsed from a string, or be a RegExp object */
export declare function REGEXP(): SmartRegexp;
export {};
