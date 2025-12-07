import * as D from '@asmartbear/dyn'
import * as T from '@asmartbear/testutil'
import { IMapImplementation, ProxyMap } from "../src/map"

class UnitMapImpl implements IMapImplementation<string, number> {
    public readonly list: [string, number][]
    public addCounter: number = 0
    public updateCounter: number = 0
    public deleteCounter: number = 0

    constructor(init: [string, number][]) {
        this.list = init.slice()
    }
    add(k: string, v: number): void {
        this.list.push([k, v])
        ++this.addCounter
    }
    update(k: string, v: number): void {
        this.list[this.list.findIndex(pair => pair[0] == k)] = [k, v]
        ++this.updateCounter
    }
    delete(k: string): void {
        this.list.splice(this.list.findIndex(pair => pair[0] == k), 1)
        ++this.deleteCounter
    }
    elements() {
        return this.list
    }
}

test('basic map operations', () => {
    const impl = new UnitMapImpl([['foo', 1], ['bar', 2]])
    const m = new ProxyMap(impl)
    T.eq<number, number>(m.size, 2)
    T.eq(Array.from(m), [['foo', 1], ['bar', 2]])
    T.eq(m.get("foo"), 1)
    T.eq(m.get("bar"), 2)
    T.eq(m.get("cat"), undefined)
    T.eq<number, number>(impl.addCounter, 0)
    T.eq<number, number>(impl.updateCounter, 0)
    T.eq<number, number>(impl.deleteCounter, 0)

    // add element
    m.set("cat", 3)
    T.eq<number, number>(m.size, 3)
    T.eq(Array.from(m), [['foo', 1], ['bar', 2], ['cat', 3]])
    T.eq(impl.list, [['foo', 1], ['bar', 2], ['cat', 3]])
    T.eq(m.get("foo"), 1)
    T.eq(m.get("bar"), 2)
    T.eq(m.get("cat"), 3)
    T.eq<number, number>(impl.addCounter, 1)
    T.eq<number, number>(impl.updateCounter, 0)
    T.eq<number, number>(impl.deleteCounter, 0)

    // update element
    m.set("bar", 22)
    T.eq<number, number>(m.size, 3)
    T.eq(Array.from(m), [['foo', 1], ['bar', 22], ['cat', 3]])
    T.eq(impl.list, [['foo', 1], ['bar', 22], ['cat', 3]])
    T.eq(m.get("foo"), 1)
    T.eq(m.get("bar"), 22)
    T.eq(m.get("cat"), 3)
    T.eq<number, number>(impl.addCounter, 1)
    T.eq<number, number>(impl.updateCounter, 1)
    T.eq<number, number>(impl.deleteCounter, 0)

    // delete element that doesn't exist
    T.eq(m.delete('zzz'), false)
    T.eq<number, number>(m.size, 3)
    T.eq(Array.from(m), [['foo', 1], ['bar', 22], ['cat', 3]])
    T.eq(impl.list, [['foo', 1], ['bar', 22], ['cat', 3]])
    T.eq(D.ARRAY(m.keys()), ['foo', 'bar', 'cat'])
    T.eq(D.ARRAY(m.values()), [1, 22, 3])
    T.eq<number, number>(impl.addCounter, 1)
    T.eq<number, number>(impl.updateCounter, 1)
    T.eq<number, number>(impl.deleteCounter, 0)

    // delete element that does exist
    T.eq(m.delete('bar'), true)
    T.eq<number, number>(m.size, 2)
    T.eq(Array.from(m), [['foo', 1], ['cat', 3]])
    T.eq(impl.list, [['foo', 1], ['cat', 3]])
    T.eq(m.get("foo"), 1)
    T.eq(m.get("bar"), undefined)
    T.eq(m.get("cat"), 3)
    T.eq<number, number>(impl.addCounter, 1)
    T.eq<number, number>(impl.updateCounter, 1)
    T.eq<number, number>(impl.deleteCounter, 1)

    // clear the map
    m.clear()
    T.eq<number, number>(m.size, 0)
    T.eq(Array.from(m), [])
    T.eq(impl.list, [])
    T.eq(m.get("foo"), undefined)
    T.eq(m.get("bar"), undefined)
    T.eq(m.get("cat"), undefined)
    T.eq<number, number>(impl.addCounter, 1)
    T.eq<number, number>(impl.updateCounter, 1)
    T.eq<number, number>(impl.deleteCounter, 3)
})

