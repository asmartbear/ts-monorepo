import { SmartType, JSONType, SmartTypeVisitor } from "./common";
/** The native `number` type */
declare class SmartNumber extends SmartType<number, number | "Inf" | "-Inf" | "NaN"> {
    constructor();
    input(x: unknown, strict?: boolean): number;
    isOfType(x: unknown): x is number;
    visit<U>(visitor: SmartTypeVisitor<U>, x: number): U;
    toJSON(x: number): number | "Inf" | "-Inf" | "NaN";
    fromJSON(x: JSONType): number;
    /** Validate that the number is at least as large as this, inclusive. */
    min(min: number): this;
    /** Validate that the number is at not larger than this, inclusive. */
    max(max: number): this;
    /** If the input is less or greater than some limit, set it to that limit.  Or `undefined` to ignore that limit. */
    clamp(min: number | undefined, max: number | undefined): this;
    /** Enforce the number is a (safe) integer value. */
    int(): this;
}
/** Simple number */
export declare function NUM(): SmartNumber;
export {};
