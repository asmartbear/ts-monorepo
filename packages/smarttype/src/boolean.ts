import { ValidationError, SmartType, JSONType, SmartTypeVisitor } from "./common"

/** The native `boolean` type */
class SmartBoolean extends SmartType<boolean, boolean> {

    constructor() {
        super("boolean")
    }

    input(x: unknown, strict: boolean = true): boolean {
        if (typeof x === "boolean") return x
        if (!strict) {
            if (!x) return false
            if (typeof x === "object") {
                if (Array.isArray(x)) return x.length > 0
                return Object.keys(x).length > 0
            }
            return true
        }
        throw new ValidationError(this, x)
    }

    isOfType(x: unknown) {
        return typeof x === "boolean"
    }

    visit<U>(visitor: SmartTypeVisitor<U>, x: boolean): U {
        return visitor.visitBoolean(x)
    }

    toJSON(x: boolean) {
        if (typeof x === "boolean") return x
        throw new ValidationError(this, x)
    }

    fromJSON(x: JSONType) {
        if (typeof x === "boolean") return x
        throw new ValidationError(this, x)
    }
}

/** Simple boolean */
export function BOOL() {
    return new SmartBoolean()
}
