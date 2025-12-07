import * as T from "./testutil"
import * as V from "../src/common"

/** These values pass validation and are identical in their final form. */
export function passes(strict: boolean, ty: V.SmartType, ...x: unknown[]) {
    for (const y of x) {
        try {
            T.eq(ty.input(y, strict), y)
        } catch (e) {
            throw new Error(
                `Expected validation to succeed for value: ${JSON.stringify(y)} ` +
                `(type: ${typeof y})`
            );
        }
        T.eq(ty.isOfType(y), true)
    }
}

/** These value fail validation. */
export function fails(strict: boolean, ty: V.SmartType, ...x: unknown[]) {
    for (const y of x) {
        T.throws(() => ty.input(y, strict), V.ValidationError, JSON.stringify(y))
        T.eq(ty.inputReturnError(y, strict) instanceof V.ValidationError, true)
    }
}

/** Tests that an input fails with a validation error whose text matches a regular expression */
export function failsWithErrorRegex(ty: V.SmartType, x: unknown, expected: RegExp) {
    const y = ty.inputReturnError(x)
    T.isInstance(y, V.ValidationError)
    T.eq(expected.test(y.message), true, `Expected error message to match ${expected}, but got: ${y.message}`)
}

export function toFromJSON<U, J extends V.JSONType>(m: V.IMarshallJson<U, J>, from: U, to: J) {
    const js = m.toJSON(from)
    T.eq(js, to)
    T.eq(m.fromJSON(to), from)
}

export class TestVisitor extends V.SmartTypeVisitor<string> {
    visitUndefined(x: undefined): string {
        return "undefined"
    }
    visitNull(x: null): string {
        return "null"
    }
    visitBoolean(x: boolean): string {
        return `b:${x}`
    }
    visitNumber(x: number): string {
        return `n:${x}`
    }
    visitString(x: string): string {
        return `s:${x}`
    }
    visitOpaqueObject(x: object): string {
        return `${x.constructor.name}()`
    }
    visitArray(x: string[]): string {
        return '[' + x.join(',') + ']'
    }

    static SINGLETON = new TestVisitor()
}