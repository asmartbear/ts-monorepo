import { ValidationError, SmartType, JSONType, NativeFor, SmartTypeVisitor } from "./common"

class SmartSet<T, ST extends SmartType<T>> extends SmartType<Set<T>, JSONType[]> {

    // We carry along the smart type belonging to the set elements.
    constructor(
        public readonly typ: ST,
    ) {
        super(`Set(${typ.description})`)
    }

    // istanbul ignore next
    get constructorArgs() { return [this.typ] }

    input(x: unknown, strict: boolean = true) {
        if (x === null || typeof x !== "object") throw new ValidationError(this, x, "Expected Array or Set")
        if (x instanceof Set) x = Array.from(x)
        if (Array.isArray(x)) return new Set(x.map(y => this.typ.input(y, strict)))
        throw new ValidationError(this, x, "Expected Array or Set")
    }

    isOfType(x: unknown, deep?: boolean): x is Set<T> {
        if (!(x instanceof Set)) return false
        if (deep) {
            for (const y of x) {
                if (!this.typ.isOfType(y, deep)) return false
            }
        }
        return true
    }

    visit<U>(visitor: SmartTypeVisitor<U>, x: Set<T>): U {
        return visitor.visitSet(Array.from(x).sort().map(y => this.typ.visit(visitor, y)))
    }

    toJSON(x: Iterable<T>): JSONType[] {
        return Array.from(x).map(y => this.typ.toJSON(y))
    }

    fromJSON(js: JSONType): Set<T> {
        if (!Array.isArray(js)) throw new ValidationError(this, js, "Expected array")
        return new Set(js.map(y => this.typ.fromJSON(y)))
    }
}

/** A `Set<T>` with arbitrary types. */
export function SET<ST extends SmartType>(elementType: ST) {
    return new SmartSet<NativeFor<ST>, ST>(elementType)
}
