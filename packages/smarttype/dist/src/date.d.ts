import { SmartType, SmartTypeVisitor } from "./common";
declare class SmartDate extends SmartType<Date, number> {
    constructor();
    input(x: unknown, strict?: boolean): Date;
    visit<U>(visitor: SmartTypeVisitor<U>, x: Date): U;
    isOfType(x: unknown): x is Date;
    toJSON(x: Date): number;
    fromJSON(x: number): Date;
}
/** `Date` object, can be parsed from a string, encoded as a number in JSON */
export declare function DATE(): SmartDate;
export {};
