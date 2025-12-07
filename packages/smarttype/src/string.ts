import { ValidationError, SmartType, NativeFor, SmartTypeVisitor } from "./common"

class SmartString extends SmartType<string, string> {

    constructor() {
        super("string")
    }

    input(x: unknown, strict: boolean = true): string {
        if (typeof x === "string") return x
        if (!strict) {
            return String(x)
        }
        throw new ValidationError(this, x)
    }

    isOfType(x: unknown) {
        return typeof x === "string"
    }

    visit<U>(visitor: SmartTypeVisitor<U>, x: string): U {
        return visitor.visitString(x)
    }

    toJSON(x: string): string {
        if (typeof x === "string") return x
        throw new ValidationError(this, x)
    }

    fromJSON(x: string): string {
        if (typeof x === "string") return x
        throw new ValidationError(this, x)
    }

    /** Validate that the string is at least this many characters. */
    minLen(min: number) {
        return this.transformSameType(
            `minLen=${min}`,
            (s) => { if (s.length < min) throw new ValidationError(this, s, `Expected string to be at least ${min} characters`); return s }
        )
    }

    trim() {
        return this.transformSameType(
            `trim`,
            (s) => { return s.trim() }
        )
    }

    /** Validate that the string matches a regualar expression */
    match(re: RegExp) {
        return this.transformSameType(
            `re=${re}`,
            (s) => { if (!re.test(s)) throw new ValidationError(this, s, `Expected string to match ${re}`); return s }
        )
    }

    /** Make regex replacement, optionally failing if there is nothing to replace */
    replace(re: RegExp, replacement: string | ((substring: string, ...args: string[]) => string), failIfNoMatches: boolean = false) {
        return this.transformSameType(
            `re=${re}->${typeof replacement === "string" ? replacement : "[function]"}`,
            (s) => {
                const result = s.replaceAll(re, replacement as any)
                if (failIfNoMatches && result == s) {        // if changed, it cannot be a match failure
                    if (!s.match(re)) throw new ValidationError(this, s, `Expected string to match ${re}`)
                }
                return result
            }
        )
    }

    /**
     * Validates that the string matches the given regex, then transforms into a different data type
     * using the result of that regex, typically looking at match-groups.
     */
    transformByRegex<RESULT extends SmartType, R = NativeFor<RESULT>>(re: RegExp, resultType: RESULT, fTransform: (match: RegExpMatchArray) => R): typeof resultType {
        return this.transform<RESULT, R>(
            `${re}`,
            resultType,
            (s: string) => {
                const m = s.match(re)
                if (!m) throw new ValidationError(this, s, `Expected string to match ${re}`)
                return fTransform(m)
            }
        )
    }
}

/** General string */
export function STR() {
    return new SmartString()
}

/** Non-empty string shortcut */
export function NONEMPTYSTR() {
    return STR().minLen(1)
}

/** String that validates as a Javascript identifier */
export function JSID() {
    return STR().match(/^[a-zA-Z_]\w*$/)
}

/** String that validates as an HTML/XHTML identifier */
export function WEBID() {
    return STR().match(/^[a-zA-Z][\w-]*$/)
}

/** String that validates as a URL */
export function URL() {
    return STR().match(/^https?:\/\/./)
}

