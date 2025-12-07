import * as D from '@asmartbear/dyn'
import * as T from '@asmartbear/testutil'
import { IObjectImplementation, ProxyObject } from "../src/obj"

class UnitObjectImpl implements IObjectImplementation<Record<string, number | string>> {
    public readonly list: [string, number | string][]
    public counters: {
        adds: number,
        updates: number,
        deletes: number,
    }

    constructor(init: Record<string, number | string>) {
        this.list = D.ENTRIES(init)
        this.counters = { adds: 0, updates: 0, deletes: 0 }
    }
    add(k: string, v: number): void {
        this.list.push([k, v])
        ++this.counters.adds
    }
    update(k: string, v: number): void {
        this.list[this.list.findIndex(pair => pair[0] == k)] = [k, v]
        ++this.counters.updates
    }
    delete(k: string): void {
        this.list.splice(this.list.findIndex(pair => pair[0] == k), 1)
        ++this.counters.deletes
    }
    elements() {
        return this.list as any
    }
}

test('basic object operations', () => {
    const impl = new UnitObjectImpl({ foo: 1, bar: 2 })
    const m = ProxyObject.from<Record<string, number | string>>(impl) as any

    // Initial state
    T.eq<any, any>(m, { foo: 1, bar: 2 })
    T.eq(impl.list.toString(), "foo,1,bar,2")
    T.eq(D.LEN(m), 2)
    T.eq(Object.entries(m), [['foo', 1], ['bar', 2]])
    T.eq(impl.counters, { adds: 0, updates: 0, deletes: 0 })
    T.eq(m.foo, 1)
    T.eq(m.bar, 2)
    T.eq(m.baz, undefined)

    // Set existing field
    m.foo = 111
    T.eq<any, any>(m, { foo: 111, bar: 2 })
    T.eq(impl.counters, { adds: 0, updates: 1, deletes: 0 })
    T.eq(impl.list.toString(), "foo,111,bar,2")

    // Set new field
    m.cat = 3
    T.eq<any, any>(m, { foo: 111, bar: 2, cat: 3 })
    T.eq(impl.counters, { adds: 1, updates: 1, deletes: 0 })
    T.eq(impl.list.toString(), "foo,111,bar,2,cat,3")

    // Delete non-existant field
    delete m.dog
    T.eq<any, any>(m, { foo: 111, bar: 2, cat: 3 })
    T.eq(impl.counters, { adds: 1, updates: 1, deletes: 0 })
    T.eq(impl.list.toString(), "foo,111,bar,2,cat,3")

    // Delete existing field
    delete m.bar
    T.eq<any, any>(m, { foo: 111, cat: 3 })
    T.eq(impl.counters, { adds: 1, updates: 1, deletes: 1 })
    T.eq(impl.list.toString(), "foo,111,cat,3")

    // Define a property without a value; nothing happens
    Object.defineProperty(m, 'taco', { writable: true })
    T.eq<any, any>(m, { foo: 111, cat: 3 })
    T.eq(impl.counters, { adds: 1, updates: 1, deletes: 1 })
    T.eq(impl.list.toString(), "foo,111,cat,3")
})

