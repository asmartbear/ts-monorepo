import * as T from '@asmartbear/testutil'
import { ISetImplementation, ProxySet } from "../src/set"

class UnitSetImpl implements ISetImplementation<number> {
    public readonly list: number[]

    constructor(init: number[]) {
        this.list = init.slice()
    }
    add(x: number): void {
        this.list.push(x)
    }
    delete(x: number): void {
        this.list.splice(this.list.indexOf(x), 1)
    }
    elements(): Iterable<number> {
        return this.list
    }
}

test('basic set operations', () => {
    const impl = new UnitSetImpl([4, 5, 6])
    const s = new ProxySet(impl)
    T.eq(s.size, 3)
    T.eq(Array.from(s), [4, 5, 6])
    T.eq(Array.from(s.add(5)), [4, 5, 6])
    T.eq(impl.list, [4, 5, 6], "didn't re-add a number")
    T.eq(s.delete(7), false)
    T.eq(impl.list, [4, 5, 6])
    T.eq(s.delete(5), true)
    T.eq(impl.list, [4, 6])
    T.eq(Array.from(s), [4, 6])
    T.eq(Array.from(s.add(2)), [4, 6, 2])
    T.eq(impl.list, [4, 6, 2])
    s.clear()
    T.eq(s.size, 0)
    T.eq(Array.from(s), [])
    T.eq(impl.list, [])
})

