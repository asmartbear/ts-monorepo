import { Simple, ISimplifiable, simplifiedToDisplay, simplifiedToHash, simplifyOpaqueType, SimplifiedWalker, getClassOf } from "@asmartbear/simplified";

export type Primative = boolean | number | string | null
export type JSONType = null | boolean | string | number | JSONType[] | { [K: string]: JSONType } | { [K: number]: JSONType }
export type JSONTuple = { [K: number]: JSONType }
export type JSONObject = { [K: string]: JSONType }

/**
 * The values of object or array `T`
 */
export type ValuesOf<T> = T[keyof T];

/**
 * Given a type, returns the Class of that type.
 */
export type ClassOf<T> = (new (...args: any[]) => T);

/**
 * Given a class, returns the instance-type that it creates.
 */
export type InstanceOf<C> = C extends new (...args: any[]) => infer T ? T : never;

type ConcreteConstructor<T = {}> = new (...args: any[]) => T;

/**
 * True if the argument is a `Primative`, and tells Typescript.
 */
export function isPrimative(x: unknown): x is Primative {
    switch (typeof x) {
        case 'boolean':
        case 'number':
        case 'string':
            return true
        case 'object':
            return x === null
    }
    return false
}

/**
 * The exception thrown when `input()` goes wrong.  Includes the fundamental problem,
 * and a full path to where the issue lies.
 */
export class ValidationError extends Error implements ISimplifiable<string> {
    private readonly myMessage: string

    constructor(
        type: IDescriptive,
        valueEncountered: any,
        expectedPrefix?: string,
        public path: string[] = []
    ) {
        let msg = expectedPrefix ?? "Expected " + type.description
        msg += ` but got ${typeof valueEncountered}: ${simplifiedToDisplay(simplifyOpaqueType(valueEncountered))}`
        super(msg);
        this.name = 'ValidationError';
        this.myMessage = msg
    }

    addPath(segment: string | number | symbol) {
        this.path.push(String(segment));
        this.message = this.fullMessage
    }

    get fullMessage(): string {
        const pathStr = this.path.length
            ? `At key [${this.path.reverse().join('.')}]: `
            : '';
        return pathStr + this.myMessage;
    }

    toSimplified() {
        return this.fullMessage
    }
}

export interface IDescriptive {

    /** A human-readable description of whatever this is */
    description: string
}

/**
 * Implements a parser for a native type, converting `unknown` into the desired native type `T`,
 * or throwing `ValidationError` if it fails.
 */
export interface INativeParser<T> extends IDescriptive {

    /**
     * Attempts to convert an input value into this smart type, validating against
     * any additional rules, possibly transforming the value, and finally returning
     * the raw value if it passes, or throwing `ValidationError` on error.
     * 
     * @param x the value to validate, process, and ultimately return as a native value.
     * @param strict if `true`, only allow precise inputs, otherwise try to convert similar types into this type.
     * @returns the validated value.
     * @throws {ValidationError} If the input is invalid
     */
    input(x: unknown, strict: boolean): T

    /**
     * True if the given value is of the correct output type that `input()` might give, as a Typescript type-guard.
     * This doesn't tell you for certain whether it passed all the validations; just that it's of the right type.
     * 
     * @param x the value to validate
     * @param deep if true, recursively check structured types, else only look at the first level
     */
    isOfType(x: unknown, deep?: boolean): x is T;
}

/**
 * Implements marshalling a native type to and from a JSON-compatible object.
 */
export interface IMarshallJson<T, J extends JSONType> {
    /** Sends the native type to a JSON format */
    toJSON(x: T): J

    /** Converts something from `toJSON()` back into the native type */
    fromJSON(js: J): T
}


/**
 * Callbacks for walking a type tree alongside parsed data, optionally accumulating some return value.
 * 
 * Some default implementations are given for built-in types, in case you don't care about how they are visited,
 * for example many built-in objects are visited as opaque objects, tuples are visited as arrays, maps are visited
 * as arrays of pairs.
 */
export abstract class SmartTypeVisitor<T, STRING extends T = T> {
    abstract visitUndefined(x: undefined): T
    abstract visitNull(x: null): T
    abstract visitBoolean(x: boolean): T
    abstract visitNumber(x: number): T
    abstract visitString(x: string): STRING
    abstract visitOpaqueObject(x: object): T
    abstract visitArray(x: T[]): T

    visitTuple(x: T[]): T { return this.visitArray(x) }
    visitDate(x: Date): T { return this.visitOpaqueObject(x) }
    visitRegExp(x: RegExp): T { return this.visitOpaqueObject(x) }
    visitSet(x: T[]): T { return this.visitArray(x) }
    visitMap(x: [T, T][]): T { return this.visitArray(x.map(pair => this.visitArray(pair))) }
    visitFields(x: [STRING, T][]): T { return this.visitMap(x) }
}

/** Visitor that converts like `simplify()` except we don't look into opaque objects and stuff like that. */
class SmartTypeToSimplifiedVisitor extends SmartTypeVisitor<Simple, string> {
    // istanbul ignore next
    visitUndefined(x: undefined) { return x }
    visitNull(x: null) { return x }
    visitBoolean(x: boolean) { return x }
    visitNumber(x: number) { return x }
    visitString(x: string) { return x }
    visitArray(x: Simple[]) { return x }
    visitDate(x: Date) { return `Date(${x.getTime()})` }
    visitFields(x: [string, Simple][]) { return Object.fromEntries(x) }
    visitRegExp(x: RegExp) { return String(x) }

    visitOpaqueObject(x: object) {
        // istanbul ignore next
        return (getClassOf(x)?.name ?? "Object") + "()"
    }

    static INSTANCE = new SmartTypeToSimplifiedVisitor()
}

/** Symbol used for the configured default value for the type, if any. */
export const __DEFAULT_VALUE = Symbol('__DEFAULT_VALUE')

/**
 * A type capable of parsing, validating, conversion, marshalling, and more.
 * Represents a specific Typescript type on input and output.
 */
export abstract class SmartType<T = any, J extends JSONType = JSONType> implements INativeParser<T>, IMarshallJson<T, J>, ISimplifiable<Simple> {

    /** If not `undefined`, a default value to use in things like structured fields, if it is missing. */
    [__DEFAULT_VALUE]: T | undefined = undefined

    constructor(public description: string) { }

    /**
     * Same as `input()` but returns errors as objects rather than throwing them.
     */
    inputReturnError(x: unknown, strict: boolean = true): T | ValidationError {
        try {
            return this.input(x, strict)
        } catch (e) {
            // istanbul ignore next
            if (e instanceof ValidationError) return e
            // istanbul ignore next
            throw e
        }
    }

    /** Sets the default value to use if this type isn't represent in a parent object or other structure. */
    def(x: T): this {
        this[__DEFAULT_VALUE] = x
        this.description += '=' + simplifiedToDisplay(this.toSimplified(x))
        return this
    }

    /** 
     * Gets the simplified version of this data (a la `@asmartbear/simplified`), or a description of self if no argument is provided.
     * 
     * This is different from just calling `simplify()`, which of course you could do, because it handles cases like not recursing
     * into opaque objects.
     */
    toSimplified(x?: T): Simple {
        if (x === undefined) return this.description
        return this.visit(SmartTypeToSimplifiedVisitor.INSTANCE, x)
    }

    /** Gets a hash value for the object, normalized for things like field-ordering and ignoring undefined fields */
    toHash(x: T): string {
        return simplifiedToHash(this.toSimplified(x))
    }

    /**
     * Transforms something of this type into another type, including validation and arbitrary additional logic.
     * 
     * @param description human-readable description to add to the overall type definition
     * @param resultType the type definition of the result of the transformation
     * @param fTransform the function that transforms a validated value of the current type into the value needed by `resultType`.
     */
    transform<RESULT extends SmartType, R = NativeFor<RESULT>>(description: string, resultType: RESULT, fTransform: (x: T) => R): typeof resultType {
        const upstream = this     // make local copy of this value
        const suffix = resultType.description != this.description ? '>>' + resultType.description : ''        // say, if there's a new type
        const newDescription = this.description + '>>' + description + suffix
        const ResultClass = resultType.constructor as ConcreteConstructor<ClassOf<typeof resultType>>;
        const cls = class extends ResultClass {
            public readonly description = newDescription
            // Wrap input in the transformation
            input(x: unknown, strict: boolean = true) {
                return resultType.input(fTransform(upstream.input(x, strict)), true)        // reinterpret the transformation for more validation
            }
            // Carry state forward
            [__DEFAULT_VALUE] = upstream[__DEFAULT_VALUE]
        }
        return new cls(...resultType.constructorArgs) as any
    }

    /**
     * Like `transform()` where the resulting type is the same, and thus the function signature is simpler.
     */
    transformSameType(description: string, fTransform: (x: T) => T): this {
        return this.transform(description, this, fTransform)
    }

    get constructorArgs(): any[] { return [this.description] }

    /** If true, this type can potentially be `undefined`, otherwise it is never undefined. */
    get canBeUndefined(): boolean { return false }

    /** If this type has an index-like structure, like fields, this is the set of keys in that structure, otherwise it is `undefined`. */
    get keys(): Set<string> | undefined {
        return undefined
    }

    abstract input(x: unknown, strict?: boolean): T;
    abstract isOfType(x: unknown, deep?: boolean): x is T;
    abstract visit<U>(visitor: SmartTypeVisitor<U>, x: T): U;
    abstract toJSON(x: T): J;
    abstract fromJSON(js: JSONType): T;
}

/**  */
type NativeUndefinable<T> = T extends undefined ? undefined : never;

/**
 * Extracts the native type out of a SmartType, or the union of native types if an array or other amalgamation.
 */
export type NativeFor<ST> =
    ST extends SmartType<undefined, any> ? undefined
    : ST extends SmartType<null, any> ? null
    : ST extends SmartType<infer T, any> ? T
    : ST extends SmartType[] ? NativeFor<ValuesOf<ST>>
    : ST extends { readonly [K: string]: SmartType } ? (
        {
            [K in keyof ST as undefined extends NativeFor<ST[K]> ? K : never]?: Exclude<NativeFor<ST[K]>, undefined>
        } & {
            [K in keyof ST as undefined extends NativeFor<ST[K]> ? never : K]: NativeFor<ST[K]>
        }
    )
    : never;

/**
 * Extracts the JSON out of a SmartType, or the union of JSON types if an array or other amalgamation.
 */
export type JsonFor<ST> =
    ST extends SmartType<any, infer J> ? J
    : ST extends SmartType[] ? JsonFor<ValuesOf<ST>>
    : ST extends { readonly [K: string]: SmartType } ? (
        {
            [K in keyof ST as undefined extends NativeFor<ST[K]> ? K : never]?: Exclude<JsonFor<ST[K]>, undefined>
        } & {
            [K in keyof ST as undefined extends NativeFor<ST[K]> ? never : K]: JsonFor<ST[K]>
        }
    )
    : never;


/** From a tuple of SmartType, gives a tuple of the native types */
export type NativeTupleFor<ST extends readonly SmartType[]> = {
    [K in keyof ST]: NativeFor<ST[K]>;
};

/** From a tuple of SmartType, gives a tuple of the JSON types */
export type JsonTupleFor<ST extends readonly SmartType[]> = {
    [K in keyof ST]: JsonFor<ST[K]>;
};