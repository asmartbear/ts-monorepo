import { SmartType, NativeFor, JsonFor, SmartTypeVisitor } from "./common";
export type FieldOptions = {
    /** If `false`, throw exception if extra fields are found, otherwise (default) ignore them, keeping only known fields */
    ignoreExtraFields?: boolean;
};
declare class SmartFields<ST extends {
    readonly [K: string]: SmartType<any>;
}> extends SmartType<NativeFor<ST>, JsonFor<ST>> {
    readonly types: ST;
    private readonly options;
    constructor(types: ST, options: FieldOptions);
    get constructorArgs(): (FieldOptions | ST)[];
    get keys(): Set<string>;
    input(x: unknown, strict?: boolean): NativeFor<ST>;
    isOfType(x: unknown, deep?: boolean): x is NativeFor<ST>;
    visit<U>(visitor: SmartTypeVisitor<U>, x: NativeFor<ST>): U;
    toJSON(x: NativeFor<ST>): JsonFor<ST>;
    fromJSON(js: JsonFor<ST>): NativeFor<ST>;
    /** Makes all fields optional */
    partial(): SmartFields<{ [K in keyof ST]: SmartType<NativeFor<ST[K]> | undefined, JsonFor<ST[K]>>; }>;
    /** Gets the sorted list of fields in this type. */
    get fields(): string[];
}
/** An array of fixed length and types */
export declare function OBJ<ST extends {
    readonly [K: string]: SmartType<any>;
}>(types: ST, options?: FieldOptions): SmartFields<ST>;
export {};
