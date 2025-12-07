import { ValidationError, SmartType, JSONType, NativeFor, JsonFor, SmartTypeVisitor } from "./common"

class SmartMap<
    K, V,
    KEY extends SmartType<K>,
    VALUE extends SmartType<V>
> extends SmartType<Map<K, V>, [JsonFor<KEY>, JsonFor<VALUE>][]> {

    // We carry along the smart type belonging to the array elements.
    constructor(
        public readonly tKey: KEY,
        public readonly tValue: VALUE,
    ) {
        super(`{${tKey.description}:${tValue.description}}`)
    }

    // istanbul ignore next
    get constructorArgs() { return [this.tKey, this.tValue] }

    input(x: unknown, strict: boolean = true) {
        if (!x || typeof x !== "object" || Array.isArray(x)) throw new ValidationError(this, x, "Expected plain object or Map")
        if (x instanceof Map) {
            // Map from map, to process everything through our types
            return new Map(Array.from(x.entries()).map(([k, v]) => [this.tKey.input(k, strict), this.tValue.input(v, strict)] as const))
        }
        // Map from object
        return new Map(Object.entries(x).map(([k, v]) => [this.tKey.input(k, strict), this.tValue.input(v, strict)] as const))
    }

    isOfType(x: unknown, deep?: boolean): x is Map<K, V> {
        if (!(x instanceof Map)) return false
        if (deep) {
            for (const [k, v] of x.entries()) {
                if (!this.tKey.isOfType(k, deep)) return false
                if (!this.tValue.isOfType(v, deep)) return false
            }
        }
        return true
    }

    visit<U>(visitor: SmartTypeVisitor<U>, x: Map<K, V>): U {
        return visitor.visitMap(
            Array.from(x).sort().map(
                ([k, v]) => [this.tKey.visit(visitor, k), this.tValue.visit(visitor, v)]
            )
        )
    }

    toJSON(x: Map<K, V>): [JsonFor<KEY>, JsonFor<VALUE>][] {
        return Array.from(x.entries()).map(([k, v]) => [this.tKey.toJSON(k), this.tValue.toJSON(v)] as const) as any
    }

    fromJSON(js: JSONType): Map<K, V> {
        if (!Array.isArray(js)) throw new ValidationError(this, js, "Expected array")
        return new Map(js.map(pair => {
            if (!Array.isArray(pair) || pair.length != 2) throw new ValidationError(this, js, "Expected array of pairs")
            return [this.tKey.fromJSON(pair[0]), this.tValue.fromJSON(pair[1])] as const
        }))
    }
}

/** A `Map<K,V>` whether both types are arbitrary. */
export function MAP<KEY extends SmartType, VALUE extends SmartType>(keyType: KEY, valueType: VALUE) {
    return new SmartMap<NativeFor<KEY>, NativeFor<VALUE>, KEY, VALUE>(keyType, valueType)
}
