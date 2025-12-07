import * as D from '@asmartbear/dyn'

/** Implementation of a Map proxy */
export interface IMapImplementation<K, V> {
    /** Adds an element to the map, that doesn't already exist in the set. */
    add(k: K, v: V): void
    /** Update an element that is already in the map. */
    update(k: K, v: V): void
    /** Removes an element to the map, that is already in the map. */
    delete(k: K): void
    /** Returns any iterable over all pairs of elements in the map. */
    elements(): Iterable<[K, V]>
}

/** Proxy object that acts like a native `Map` */
export class ProxyMap<K, V> extends Map<K, V> {

    private readonly impl: IMapImplementation<K, V>

    constructor(impl: IMapImplementation<K, V>) {
        super(impl.elements())
        this.impl = impl
    }

    set(k: K, v: V): this {
        if (super.has(k)) {
            this.impl.update(k, v)
        } else {
            this.impl?.add(k, v)       // is undefined when we're initializing
        }
        super.set(k, v)
        return this
    }

    clear(): void {
        for (const k of this.keys()) {
            this.impl.delete(k)
        }
        super.clear()
    }

    delete(k: K): boolean {
        if (!super.has(k)) return false
        this.impl.delete(k)
        super.delete(k)
        return true
    }

}