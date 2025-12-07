import * as D from '@asmartbear/dyn'

/** Implementation of an Object proxy */
export interface IObjectImplementation<T extends object> {
    /** Adds a field to the object, that doesn't already exist in the object. */
    add<K extends keyof T>(k: K, v: T[K]): void
    /** Update a field that is already in the object. */
    update<K extends keyof T>(k: K, v: T[K]): void
    /** Removes a field from the object, that was already in the object. */
    delete<K extends keyof T>(x: K): void
    /** Returns any iterable over all pairs of field/values in the object. */
    elements<K extends keyof T>(): Iterable<[K, T[K]]>
}

/** Proxy object that acts like a native generic object */
export class ProxyObject<T extends object> {

    private readonly impl: IObjectImplementation<T>

    private constructor(impl: IObjectImplementation<T>) {
        this.impl = impl
    }

    static from<T extends object>(impl: IObjectImplementation<T>): T {
        const obj: any = {}
        for (const [k, v] of impl.elements()) {
            Object.defineProperty(obj, k, {
                enumerable: true,
                writable: true,
                configurable: true,
                value: v
            })
        }
        return new Proxy<T>(obj, new ProxyObject(impl))
    }

    /**
     * A trap for `Object.defineProperty()`.
     * @param target The original object which is being proxied.
     * @returns A `Boolean` indicating whether or not the property has been defined.
     */
    defineProperty(target: T, property: string | symbol, attributes: PropertyDescriptor): boolean {
        if ('value' in attributes) {
            if (Reflect.has(target, property)) {
                this.impl.update(property as any, attributes.value)
            } else {
                this.impl.add(property as any, attributes.value)
            }
        }
        return Reflect.defineProperty(target, property, attributes)
    }

    /**
     * A trap for the `delete` operator.
     * @param target The original object which is being proxied.
     * @param p The name or `Symbol` of the property to delete.
     * @returns A `Boolean` indicating whether or not the property was deleted.
     */
    deleteProperty(target: T, p: string | symbol): boolean {
        if (p in target) {      // don't notify if we delete a field that doesn't exist
            this.impl.delete(p as any)
            return Reflect.deleteProperty(target, p)
        }
        return true
    }

}