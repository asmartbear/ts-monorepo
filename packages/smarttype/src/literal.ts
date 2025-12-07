import { ValidationError, Primative, SmartType, isPrimative, NativeFor, JsonFor, ValuesOf, JSONTuple, JSONType, SmartTypeVisitor } from "./common"

class SmartLiteral<T extends Primative> extends SmartType<T, T> {

    constructor(
        public readonly values: readonly T[],
    ) {
        super('(' + values.map(String).sort().join('|') + ')')
    }

    // istanbul ignore next
    get constructorArgs() { return [this.values] }

    input(x: unknown, strict: boolean = true) {
        if (isPrimative(x)) {
            const i = this.values.indexOf(x as any)
            if (i >= 0) {
                return this.values[i]        // found, and use our constant and consistent object
            }
        }
        throw new ValidationError(this, x)
    }

    isOfType(x: unknown): x is T {
        if (isPrimative(x)) {
            const i = this.values.indexOf(x as any)
            if (i >= 0) return true
        }
        return false
    }

    visit<U>(visitor: SmartTypeVisitor<U>, x: T): U {
        switch (typeof x) {
            // case 'undefined': return visitor.visitUndefined(x)
            case 'boolean': return visitor.visitBoolean(x)
            case 'number': return visitor.visitNumber(x)
            case 'string': return visitor.visitString(x)
            case 'object': return visitor.visitNull(x)
        }
    }

    toJSON(x: T): T {
        return x
    }

    fromJSON(js: T): T {
        return this.input(js, true)      // check types and normalize
    }
}

/** One of a given specific set of literal, primative values. */
export function LITERAL<T extends Primative>(...values: readonly T[]) {
    return new SmartLiteral(values)
}
