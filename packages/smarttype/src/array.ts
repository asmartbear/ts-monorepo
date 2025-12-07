import { isIterable } from '@asmartbear/simplified'
import { ValidationError, SmartType, JSONType, SmartTypeVisitor } from "./common"

class SmartArray<T, J extends JSONType, EL extends SmartType<T, J>> extends SmartType<T[], J[]> {

    // We carry along the smart type belonging to the array elements.
    constructor(
        public readonly elementType: EL,
    ) {
        super(elementType.description + '[]')
    }

    get constructorArgs() { return [this.elementType] }

    input(x: unknown, strict: boolean): T[] {
        if (!isIterable(x)) throw new ValidationError(this, x)
        const result: T[] = []
        for (const y of x) {
            const z = this.elementType.inputReturnError(y, strict)
            if (z instanceof ValidationError) {
                z.addPath(result.length)
                throw z
            }
            result.push(z)
        }
        return result
    }

    isOfType(x: unknown, deep?: boolean): x is T[] {
        if (!Array.isArray(x)) return false
        if (deep) {
            for (const y of x) {
                if (!this.elementType.isOfType(y, deep)) return false
            }
        }
        return true
    }

    visit<U>(visitor: SmartTypeVisitor<U>, x: T[]): U {
        return visitor.visitArray(x.map(y => this.elementType.visit(visitor, y)))
    }

    toJSON(x: T[]) {
        return x.map(el => this.elementType.toJSON(el))
    }

    fromJSON(x: J[]): T[] {
        return x.map(el => this.elementType.fromJSON(el))
    }

    /** Validate that the array has at least this elements. */
    minLen(min: number) {
        return this.transformSameType(
            `minLen=${min}`,
            (a) => {
                if (a.length < min) throw new ValidationError(this, a);
                return a
            }
        )
    }
}

/** Generic string */
export function ARRAY<T, J extends JSONType>(elementType: SmartType<T, J>) {
    return new SmartArray<T, J, typeof elementType>(elementType)
}
