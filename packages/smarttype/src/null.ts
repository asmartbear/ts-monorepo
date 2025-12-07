import { ValidationError, SmartType, SmartTypeVisitor } from "./common"

class SmartNull extends SmartType<null, null> {

    constructor() {
        super("null")
    }

    input(x: unknown, strict: boolean = true): null {
        if (x === null) return null
        throw new ValidationError(this, x)
    }

    isOfType(x: unknown) {
        return x === null
    }

    visit<U>(visitor: SmartTypeVisitor<U>, x: null): U {
        return visitor.visitNull(x)
    }

    toJSON(x: any): null {
        if (x === null) return x
        throw new ValidationError(this, x)
    }

    fromJSON(x: any) {
        if (x === null) return x
        throw new ValidationError(this, x)
    }
}

/** The `null` value */
export function NIL() {
    return new SmartNull()
}
