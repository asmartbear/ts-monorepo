import { isIterable } from '@asmartbear/simplified'
import { ValidationError, SmartType, JSONType, JSONTuple, NativeTupleFor, JsonTupleFor, SmartTypeVisitor } from "./common"

class SmartTuple<ST extends readonly SmartType<any>[], J extends JSONTuple> extends SmartType<NativeTupleFor<ST>, J> {

    // We carry along the smart type belonging to the array elements.
    constructor(
        public readonly types: ST,
    ) {
        super('[' + types.map(t => t.description).join(',') + ']')
    }

    // istanbul ignore next
    get constructorArgs() { return [this.types] }

    get keys() {
        // Our numeric indicies are effectively keys.
        return new Set(this.types.map((_, i) => i.toString()))
    }

    input(x: unknown, strict: boolean = true): NativeTupleFor<ST> {
        if (!isIterable(x)) throw new ValidationError(this, x)
        const a = Array.from(x)       // convert to Array even if it isn't already
        if (a.length !== this.types.length) throw new ValidationError(this, x, "Tuple of the wrong length")
        const result: any[] = []
        for (let i = 0; i < this.types.length; ++i) {
            const z = this.types[i].inputReturnError(a[i], strict)
            if (z instanceof ValidationError) {
                z.addPath(i)
                throw z
            }
            result.push(z)
        }
        return result as NativeTupleFor<ST>
    }

    isOfType(x: unknown, deep?: boolean): x is NativeTupleFor<ST> {
        if (!Array.isArray(x) || x.length !== this.types.length) return false
        if (deep) {
            for (let i = 0; i < this.types.length; ++i) {
                if (!this.types[i].isOfType(x[i], deep)) return false
            }
        }
        return true
    }

    visit<U>(visitor: SmartTypeVisitor<U>, x: NativeTupleFor<ST>): U {
        return visitor.visitTuple(
            x.map((y, i) => this.types[i].visit(visitor, y))
        )
    }

    toJSON(x: NativeTupleFor<ST>): J {
        return x.map((y, i) => this.types[i].toJSON(y)) as any as J
    }

    fromJSON(js: J) {
        return (js as any as JSONType[]).map((x, i) => this.types[i].fromJSON(x)) as NativeTupleFor<ST>
    }
}

/** An array of fixed length and types */
export function TUPLE<ST extends readonly SmartType<any>[]>(...types: ST) {
    return new SmartTuple<ST, JsonTupleFor<ST>>(types)
}
