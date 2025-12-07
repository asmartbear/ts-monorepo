import { SmartType, NativeFor, SmartTypeVisitor } from "./common";
declare class SmartString extends SmartType<string, string> {
    constructor();
    input(x: unknown, strict?: boolean): string;
    isOfType(x: unknown): x is string;
    visit<U>(visitor: SmartTypeVisitor<U>, x: string): U;
    toJSON(x: string): string;
    fromJSON(x: string): string;
    /** Validate that the string is at least this many characters. */
    minLen(min: number): this;
    trim(): this;
    /** Validate that the string matches a regualar expression */
    match(re: RegExp): this;
    /** Make regex replacement, optionally failing if there is nothing to replace */
    replace(re: RegExp, replacement: string | ((substring: string, ...args: string[]) => string), failIfNoMatches?: boolean): this;
    /**
     * Validates that the string matches the given regex, then transforms into a different data type
     * using the result of that regex, typically looking at match-groups.
     */
    transformByRegex<RESULT extends SmartType, R = NativeFor<RESULT>>(re: RegExp, resultType: RESULT, fTransform: (match: RegExpMatchArray) => R): typeof resultType;
}
/** General string */
export declare function STR(): SmartString;
/** Non-empty string shortcut */
export declare function NONEMPTYSTR(): SmartString;
/** String that validates as a Javascript identifier */
export declare function JSID(): SmartString;
/** String that validates as an HTML/XHTML identifier */
export declare function WEBID(): SmartString;
/** String that validates as a URL */
export declare function URL(): SmartString;
export {};
