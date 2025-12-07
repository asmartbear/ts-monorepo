import { ValidationError, SmartType, SmartTypeVisitor } from "./common"

class SmartRegexp extends SmartType<RegExp, string> {

    constructor() {
        super("regexp")
    }

    input(x: unknown, strict: boolean = true): RegExp {
        if (x instanceof RegExp) return x
        if (typeof x === "string") {
            if (!x) throw new ValidationError(this, x, "Empty string is not a regexp")
            try {
                const m = x.match(/^\/(.*)\/([gimsuvy]*)$/)     // looks like a full regexp?
                if (m) return new RegExp(m[1], m[2])        // construct it in parts
                return new RegExp(x)                    // a static string
            } catch (e) {       // convert syntax error to validation error
                throw new ValidationError(this, x, String(e))
            }
        }
        throw new ValidationError(this, x)
    }

    isOfType(x: unknown) {
        return x instanceof RegExp
    }

    visit<U>(visitor: SmartTypeVisitor<U>, x: RegExp): U {
        return visitor.visitRegExp(x)
    }

    toJSON(x: RegExp) {
        return String(x)
    }

    fromJSON(x: string) {
        return this.input(x)        // re-parse the pieces
    }
}

/** `RegExp` object, can be parsed from a string, or be a RegExp object */
export function REGEXP() {
    return new SmartRegexp()
}
