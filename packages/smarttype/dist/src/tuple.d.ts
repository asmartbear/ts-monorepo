import { SmartType, JSONTuple, NativeTupleFor, JsonTupleFor, SmartTypeVisitor } from "./common";
declare class SmartTuple<ST extends readonly SmartType<any>[], J extends JSONTuple> extends SmartType<NativeTupleFor<ST>, J> {
    readonly types: ST;
    constructor(types: ST);
    get constructorArgs(): ST[];
    get keys(): Set<string>;
    input(x: unknown, strict?: boolean): NativeTupleFor<ST>;
    isOfType(x: unknown, deep?: boolean): x is NativeTupleFor<ST>;
    visit<U>(visitor: SmartTypeVisitor<U>, x: NativeTupleFor<ST>): U;
    toJSON(x: NativeTupleFor<ST>): J;
    fromJSON(js: J): NativeTupleFor<ST>;
}
/** An array of fixed length and types */
export declare function TUPLE<ST extends readonly SmartType<any>[]>(...types: ST): SmartTuple<ST, JsonTupleFor<ST>>;
export {};
