import * as D from '@asmartbear/dyn'

/** Implementation of a Set proxy */
export interface ISetImplementation<T> {
    /** Adds an element to the set, that doesn't already exist in the set. */
    add(x: T): void
    /** Removes an element to the set, that is already in the set. */
    delete(x: T): void
    /** Returns any iterable over all elements in the set. */
    elements(): Iterable<T>
}

/** Proxy object that acts like a native `Set` */
export class ProxySet<T> extends Set<T> {

    private readonly impl: ISetImplementation<T>

    constructor(impl: ISetImplementation<T>) {
        super(impl.elements())
        this.impl = impl
    }

    add(value: T): this {
        if (!super.has(value)) {
            this.impl?.add(value)       // is undefined when we're initializing
            super.add(value)
        }
        return this
    }

    clear(): void {
        for (const el of this) {
            this.impl.delete(el)
        }
        super.clear()
    }

    delete(value: T): boolean {
        if (!super.has(value)) return false
        this.impl.delete(value)
        super.delete(value)
        return true
    }
}