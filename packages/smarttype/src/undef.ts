import { ValidationError, SmartType, SmartTypeVisitor } from "./common"

export const JS_UNDEFINED_SIGNAL = "__undefined__"

class SmartUndefined extends SmartType<undefined, typeof JS_UNDEFINED_SIGNAL> {

    constructor() {
        super("undefined")
    }

    get canBeUndefined() { return true }

    input(x: unknown, strict: boolean = true): undefined {
        if (typeof x === "undefined") return x
        throw new ValidationError(this, x)
    }

    isOfType(x: unknown) {
        return x === undefined
    }

    visit<U>(visitor: SmartTypeVisitor<U>, x: undefined): U {
        return visitor.visitUndefined(x)
    }

    toJSON(x: any): typeof JS_UNDEFINED_SIGNAL {
        if (x === undefined) return JS_UNDEFINED_SIGNAL
        throw new ValidationError(this, x)
    }

    fromJSON(x: any) {
        if (x === JS_UNDEFINED_SIGNAL) return undefined
        throw new ValidationError(this, x)
    }

    static SINGLETON = new SmartUndefined()
}

/** The `undefined` value */
export function UNDEF() {
    return SmartUndefined.SINGLETON
}
