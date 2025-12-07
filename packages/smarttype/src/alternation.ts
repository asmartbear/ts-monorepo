import { ValidationError, SmartType, JSONType, NativeFor, JsonFor, NativeTupleFor, SmartTypeVisitor } from "./common"
import { JS_UNDEFINED_SIGNAL } from "./undef"

type AlternationJSON = {
    t: string,
    x: JSONType,
}

class SmartAlternation<T> extends SmartType<T, AlternationJSON> {

    constructor(
        public readonly types: readonly SmartType<T>[],
    ) {
        super('(' + types.map(t => t.description).join('|') + ')')
    }

    /** Finds the first type that matches this native value, or `undefined` if none match. */
    private getTypeForNative(x: unknown, deep?: boolean): SmartType<T> | undefined {
        for (const t of this.types) {
            if (t.isOfType(x, deep)) return t
        }
        return undefined
    }

    // istanbul ignore next
    get constructorArgs() { return [this.types] }

    get canBeUndefined() {
        return !!this.types.find(t => t.canBeUndefined)         // yes if any of the types is undefined
    }

    input(x: unknown, strict: boolean = true): T {
        for (const t of this.types) {
            const y = t.inputReturnError(x, strict)
            if (y instanceof ValidationError) continue
            return y
        }
        throw new ValidationError(this, x)
    }

    isOfType(x: unknown, deep?: boolean): x is T {
        return this.getTypeForNative(x, deep) !== undefined
    }

    visit<U>(visitor: SmartTypeVisitor<U>, x: T): U {
        const t = this.getTypeForNative(x, false)
        if (t) return t.visit(visitor, x)
        // istanbul ignore next
        throw new ValidationError(this, x, "expected validated type for visitor")
    }

    toJSON(x: T): AlternationJSON {
        const t = this.getTypeForNative(x, false)
        if (t) return { t: t.description, x: t.toJSON(x) }
        throw new ValidationError(this, x, "expected validated type for JSON")
    }

    fromJSON(js: AlternationJSON): T {
        // Pick off the type and value, then unwrap recursively
        for (const t of this.types) {
            if (t.description === js.t) {
                return t.fromJSON(js.x)
            }
        }
        throw new ValidationError(this, js, "expected alternation type for JSON")
    }
}

/** Any of these types are acceptable.  Typescript is a union; JSON is a special structure that specifies which type it is. */
export function OR<ST extends readonly SmartType[]>(...types: ST) {
    return new SmartAlternation<NativeFor<ST>>(types)
}

class SmartOptional<T, J extends JSONType> extends SmartType<T | undefined, J | typeof JS_UNDEFINED_SIGNAL> {

    constructor(
        public readonly typ: SmartType<T, J>,
    ) {
        super(typ.description + "?")
    }

    // istanbul ignore next
    get constructorArgs() { return [this.typ] }

    get canBeUndefined() {
        return true
    }

    input(x: unknown, strict: boolean = true): T | undefined {
        if (x === undefined) return undefined
        return this.typ.input(x, strict)
    }

    isOfType(x: unknown, deep?: boolean): x is T {
        if (x === undefined) return true
        return this.typ.isOfType(x, deep)
    }

    visit<U>(visitor: SmartTypeVisitor<U>, x: T): U {
        if (x === undefined) return visitor.visitUndefined(undefined)
        return this.typ.visit(visitor, x)
    }

    toJSON(x: T): J | typeof JS_UNDEFINED_SIGNAL {
        if (x === undefined) return JS_UNDEFINED_SIGNAL
        return this.typ.toJSON(x)
    }

    fromJSON(js: J | typeof JS_UNDEFINED_SIGNAL): T | undefined {
        if (js === undefined || js === JS_UNDEFINED_SIGNAL) return undefined
        return this.typ.fromJSON(js)
    }
}

/** 
 * Returns the same type, but where `undefined` is also an acceptable value.
 * If `undefined` is already one of the types it can be, returns the original object unchanged.
 */
export function OPT<T, J extends JSONType>(typ: SmartType<T, J>): SmartType<T | undefined, J | typeof JS_UNDEFINED_SIGNAL> {
    return typ.canBeUndefined ? typ : new SmartOptional(typ)
}