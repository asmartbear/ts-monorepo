import { ValidationError, SmartType, SmartTypeVisitor } from "./common"

class SmartDate extends SmartType<Date, number> {

    constructor() {
        super("date")
    }

    input(x: unknown, strict: boolean = true): Date {
        if (x instanceof Date) return x
        if (typeof x === "string") {
            const d = new Date(x)
            if (isNaN(d.getTime()) || x.length < 5) throw new ValidationError(this, x, "Invalid Date string")
            return d
        }
        throw new ValidationError(this, x)
    }

    visit<U>(visitor: SmartTypeVisitor<U>, x: Date): U {
        return visitor.visitDate(x)
    }

    isOfType(x: unknown) {
        return x instanceof Date
    }

    toJSON(x: Date) {
        return x.getTime()      // the most efficient representation
    }

    fromJSON(x: number) {
        return new Date(x)
    }
}

/** `Date` object, can be parsed from a string, encoded as a number in JSON */
export function DATE() {
    return new SmartDate()
}
