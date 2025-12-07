import { SmartType, JSONType, SmartTypeVisitor } from "./common";
/** Given a type, returns the Class of that type. */
type ClassOf<T> = (abstract new (...args: any[]) => T) | (new (...args: any[]) => T);
declare class SmartClass<T extends object> extends SmartType<T, null> {
    readonly cls: ClassOf<T>;
    constructor(cls: ClassOf<T>);
    get constructorArgs(): ClassOf<T>[];
    visit<U>(visitor: SmartTypeVisitor<U>, x: T): U;
    input(x: unknown, _?: boolean): T;
    isOfType(x: unknown): x is T;
    toJSON(x: T): null;
    fromJSON(x: JSONType): T;
}
/** An opaque object that is an instance of a given class, and throws if attempts to be converted to JSON. */
export declare function CLASS<T extends object>(cls: ClassOf<T>): SmartClass<T>;
export {};
