import * as T from '../src/index'

test('near', () => {
    T.near(12, 12)
    T.near(12, 12.00000001)
})

test('simplified', () => {
    T.isSimple(12, "12")
    T.isSimple({ foo: 1, bar: "hi" }, "bar=hi, foo=1")
    const m = new Map<string, any>()
    m.set("foo", 1)
    m.set("bar", "hello")
    T.isSimple(m, "bar=hello, foo=1")
})

test('console output', () => {
    T.consoleLog(() => console.log("foo"), "foo")
    T.consoleLog(() => console.log("foo", "bar"), "foo bar")
    T.consoleLog(() => console.log("foo", 123, 456), "foo 123 456")
    T.consoleLog(() => console.log("foo", ["bar"]), "foo [ 'bar' ]")
})

test('object includes', () => {
    T.includes({}, {})
    T.includes({ a: 1 }, {})
    T.includes({ a: 1 }, { a: 1 })
    T.includes({ a: 1, b: 2 }, { a: 1 })
    T.includes({ a: 1, b: 2 }, { a: 1, b: 2 })
    T.includes({ a: 1, b: 2 }, { b: 2 })
    T.throws(() => T.includes({}, { a: 1 }))
    T.throws(() => T.includes<any>({ b: 2 }, { a: 1 }))
    T.throws(() => T.includes({ b: 2 }, { b: 1 }))
})

test('length', () => {
    T.throws(() => T.len(undefined, 0))
    T.throws(() => T.len(null, 0))
    T.len([], 0)
    T.len([0], 1)
    T.len(["a", "b"], 2)
    T.len(new Set(), 0)
    T.len(new Set([0]), 1)
    T.len(new Set([0, -1]), 2)
})

test('isInstance', () => {
    const foo: any = [1, 2, 3]
    T.throws(() => T.isInstance(foo, Set))
    T.throws(() => T.isInstance(foo, Date))
    T.isInstance(foo, Object)
    T.isInstance(foo, Array, "named array instance class")
})