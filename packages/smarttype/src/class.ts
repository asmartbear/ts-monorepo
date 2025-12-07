import { getClassOf } from "@asmartbear/simplified";
import { ValidationError, SmartType, JSONType, SmartTypeVisitor } from "./common"

/** Given a type, returns the Class of that type. */
type ClassOf<T> = (abstract new (...args: any[]) => T) | (new (...args: any[]) => T);

/** Given a class, returns the instance-type that it creates. */
type InstanceOf<C> = C extends ClassOf<infer T> ? T : never;

class SmartClass<T extends object> extends SmartType<T, null> {

    constructor(
        public readonly cls: ClassOf<T>
    ) {
        super(cls.name)
    }

    // istanbul ignore next
    get constructorArgs() { return [this.cls] }

    visit<U>(visitor: SmartTypeVisitor<U>, x: T): U {
        return visitor.visitOpaqueObject(x)
    }

    input(x: unknown, _?: boolean): T {
        // The only valid thing: The object is an instance of the class
        if (x instanceof this.cls) return x

        // Check for the common case of it being another object with a class, because the error message can be nice.
        const classOf = getClassOf<any>(x)
        if (classOf) {     // if an object, can report its class
            throw new ValidationError(this, x, `Expected instance of ${this.cls.name} rather than ${classOf.name}`)
        }

        // Catch-all error
        throw new ValidationError(this, x, `Expected instance of ${this.cls.name}`)

    }

    isOfType(x: unknown): x is T {
        return x instanceof this.cls
    }

    toJSON(x: T): null {
        throw new Error("Smart class validator does not support conversion to JSON")
    }

    fromJSON(x: JSONType): T {
        throw new Error("Smart class validator does not support conversion from JSON")
    }
}

/** An opaque object that is an instance of a given class, and throws if attempts to be converted to JSON. */
export function CLASS<T extends object>(cls: ClassOf<T>) {
    return new SmartClass(cls)
}
