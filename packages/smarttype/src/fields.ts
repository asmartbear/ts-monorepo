import { ValidationError, SmartType, NativeFor, __DEFAULT_VALUE, JsonFor, SmartTypeVisitor } from "./common"
import { OPT } from "./alternation"
import { isPlainObject } from "@asmartbear/simplified"

export type FieldOptions = {
    /** If `false`, throw exception if extra fields are found, otherwise (default) ignore them, keeping only known fields */
    ignoreExtraFields?: boolean,
}

class SmartFields<ST extends { readonly [K: string]: SmartType<any> }> extends SmartType<NativeFor<ST>, JsonFor<ST>> {

    // We carry along the smart type belonging to the field elements.
    constructor(
        public readonly types: ST,
        private readonly options: FieldOptions,
    ) {
        super('{' + Object.entries(types).map(([k, t]) => `${k}:${t.description}`).join(',') + '}')
    }

    // istanbul ignore next
    get constructorArgs() { return [this.types, this.options] }

    get keys() {
        return new Set(Object.keys(this.types))
    }

    input(x: unknown, strict: boolean = true) {
        if (typeof x !== "object") throw new ValidationError(this, x, "Expected object")
        if (!x) throw new ValidationError(this, x, "Got null instead of object")

        // Copy all known fields into our resulting pairs
        const ent: [string, any][] = []
        for (const [k, t] of Object.entries(this.types)) {
            // Load this field
            const y = (x as any)[k]
            // Field missing?
            if (y === undefined) {
                // If it's optional anyway, we're fine
                if (!t.canBeUndefined) {
                    // If there's a default value, it's time to use it
                    if (t[__DEFAULT_VALUE] !== undefined) {
                        ent.push([k, t[__DEFAULT_VALUE]])
                    }
                    // No recourse; you're missing a required, non-default field.
                    else {
                        throw new ValidationError(this, x, `Missing required field [${k}]`)
                    }
                }
            }
            // Field was present; convert it.  Upon failure, accumulate our path
            else {
                const z = t.inputReturnError(y, strict)
                if (z instanceof ValidationError) {
                    z.addPath(k)
                    throw z
                }
                ent.push([k, z])
            }
        }

        // If we're not allowed to ignore extra fields, check for their existence and throw if found
        if (this.options.ignoreExtraFields === false) {
            for (const k of Object.keys(x)) {
                if (!(k in this.types)) {
                    throw new ValidationError(this, x, `Found spurious field [${k}].  Valid fields are: [${this.fields.join('|')}]`)
                }
            }
        }
        return Object.fromEntries(ent) as NativeFor<ST>
    }

    isOfType(x: unknown, deep?: boolean): x is NativeFor<ST> {
        if (!isPlainObject(x)) return false
        if (deep) {
            for (const [k, t] of Object.entries(this.types)) {
                const y = (x as any)[k]
                if (y === undefined) {      // if missing or undefined, that's ok exactly if this type is allowed to be undefined
                    if (!t.canBeUndefined) return false
                } else {
                    if (!t.isOfType(y, deep)) return false      // value is present, so much be of the correct type
                }
            }
        }
        return true
    }

    visit<U>(visitor: SmartTypeVisitor<U>, x: NativeFor<ST>): U {
        return visitor.visitFields(
            Object.entries(x).map(
                ([k, v]) => [visitor.visitString(k), this.types[k].visit(visitor, v)]
            )
        )
    }

    toJSON(x: NativeFor<ST>): JsonFor<ST> {
        return Object.fromEntries(
            Object.entries(x).map(
                ([k, y]) => [k, this.types[k].toJSON(y)]
            )
        ) as JsonFor<ST>
    }

    fromJSON(js: JsonFor<ST>) {

        // Load everything from the JS object into pairs for ourselves.
        // Convert based on the type of that field, which might be extraneous.
        const myEntries: [string, any][] = []
        for (const [k, x] of Object.entries(js)) {
            const type = this.types[k]
            if (!type) {            // JS has a field we don't have?
                if (this.options.ignoreExtraFields) continue      // maybe that's OK!
                throw new ValidationError(this, k, `Extraneous JSON field [${k}]`)
            }
            if (x !== undefined) {            // if undefined, it's like it's not here
                myEntries.push([k, type.fromJSON(x)])
            }
        }

        // Reconstruct the object
        return Object.fromEntries(myEntries) as NativeFor<ST>
    }

    /** Makes all fields optional */
    partial() {
        const newTypes = Object.fromEntries(
            Object.entries(this.types).map(
                ([k, t]) => [k, OPT(t)]
            )
        )
        return new SmartFields<{ [K in keyof ST]: SmartType<NativeFor<ST[K]> | undefined, JsonFor<ST[K]>> }>(newTypes as any, this.options)
    }

    /** Gets the sorted list of fields in this type. */
    get fields(): string[] {
        return Object.keys(this.types).sort()
    }
}

/** An array of fixed length and types */
export function OBJ<ST extends { readonly [K: string]: SmartType<any> }>(types: ST, options: FieldOptions = {}): SmartFields<ST> {
    return new SmartFields(types, options)
}
