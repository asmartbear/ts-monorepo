import { SmartType, JSONType, NativeFor, JsonFor, SmartTypeVisitor } from "./common";
declare class SmartMap<K, V, KEY extends SmartType<K>, VALUE extends SmartType<V>> extends SmartType<Map<K, V>, [JsonFor<KEY>, JsonFor<VALUE>][]> {
    readonly tKey: KEY;
    readonly tValue: VALUE;
    constructor(tKey: KEY, tValue: VALUE);
    get constructorArgs(): (KEY | VALUE)[];
    input(x: unknown, strict?: boolean): Map<K, V>;
    isOfType(x: unknown, deep?: boolean): x is Map<K, V>;
    visit<U>(visitor: SmartTypeVisitor<U>, x: Map<K, V>): U;
    toJSON(x: Map<K, V>): [JsonFor<KEY>, JsonFor<VALUE>][];
    fromJSON(js: JSONType): Map<K, V>;
}
/** A `Map<K,V>` whether both types are arbitrary. */
export declare function MAP<KEY extends SmartType, VALUE extends SmartType>(keyType: KEY, valueType: VALUE): SmartMap<NativeFor<KEY>, NativeFor<VALUE>, KEY, VALUE>;
export {};
