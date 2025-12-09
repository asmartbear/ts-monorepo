import { isPromise } from 'util/types';
import { getClassOf, isClassObject, isIterable, isPlainObject, isSimple, Simple, simplifiedAwait, simplifiedCompare, simplifiedJoin, simplifiedToDisplay, simplifiedToHash, simplifiedToJSON, simplifiedToKey, SimplifiedWalker, simplify, simplifyOpaqueType } from '../src/index';

class MyTestClass {
    public a: number = 123
    private b: string = "321"
    public toString() { return this.b }
    public foo() { return this.b + this.a }
}

class MyTestJSON {
    public toString() { return "hi" }
    public toSimplified() { return { "foo": 123 } }
}

class MyTestWalker extends SimplifiedWalker<string, "undef", "null", "t" | "f"> {
    doUndefined(): "undef" { return "undef" }
    doNull(): "null" { return "null" }
    doBoolean(x: boolean) { return x ? "t" : "f" }
    doNumber(x: number) { return String(x) }
    doString(x: string) { return `s:${x.length}` }
    doArray(x: string[]) { return x.join(',') }
    doObject(x: [string | number, string][]) { return x.join(',') }
}

test('is plain object', () => {
    const f = isPlainObject
    expect(f(undefined)).toBe(false)
    expect(f(null)).toBe(false)
    expect(f(true)).toBe(false)
    expect(f(123)).toBe(false)
    expect(f("{a:1}")).toBe(false)
    expect(f([])).toBe(false)
    expect(f([1, 2, 3])).toBe(false)
    expect(f(parseInt)).toBe(false)
    expect(f(() => 123)).toBe(false)

    expect(f({})).toBe(true)
    expect(f({ a: 1 })).toBe(true)
    expect(f({ a: 1, b: () => { } })).toBe(true)
    expect(f(Object.fromEntries([["a", 1]]))).toBe(true)
    expect(f(new Object({ a: 1 }))).toBe(true)
    expect(f({ constructor: true })).toBe(true)     // tried to fake me out reusing this word!

    expect(f(new Date())).toBe(false)
    expect(f(new Set())).toBe(false)
    expect(f(/foo/)).toBe(false)
    expect(f(new MyTestClass())).toBe(false)
    expect(f(MyTestClass)).toBe(false)
    expect(f(Date)).toBe(false)
    expect(f(class { })).toBe(false)
})

test('is class object', () => {
    function localFunc() { return 213; }
    const f = isClassObject
    expect(f(undefined)).toBe(false)
    expect(f(null)).toBe(false)
    expect(f(true)).toBe(false)
    expect(f(123)).toBe(false)
    expect(f("{a:1}")).toBe(false)
    expect(f([])).toBe(false)
    expect(f([1, 2, 3])).toBe(false)
    expect(f({})).toBe(false)
    expect(f({ a: 1 })).toBe(false)
    expect(f({ a: 1, b: () => { } })).toBe(false)
    expect(f(Object.fromEntries([["a", 1]]))).toBe(false)
    expect(f(new Object({ a: 1 }))).toBe(false)
    expect(f(new Date())).toBe(false)
    expect(f(/foo/)).toBe(false)
    expect(f(new MyTestClass())).toBe(false)
    expect(f(parseInt)).toBe(false)
    expect(f(localFunc)).toBe(false)
    expect(f(() => 123)).toBe(false)

    expect(f(MyTestClass)).toBe(true)
    expect(f(class { })).toBe(true)
    expect(f(Date)).toBe(true)
    expect(f(RegExp)).toBe(true)
    expect(f(Set)).toBe(true)
    expect(f(Map)).toBe(true)
})

test('get class of object', () => {
    const f = getClassOf
    expect(f(undefined)).toBeUndefined()
    expect(f(null)).toBeUndefined()
    expect(f(true)).toBeUndefined()
    expect(f(123)).toBeUndefined()
    expect(f("{a:1}")).toBeUndefined()
    expect(f(parseInt)).toBeUndefined()
    expect(f(() => 123)).toBeUndefined()

    expect(f({})).toBeUndefined()
    expect(f({ a: 1 })).toBeUndefined()
    expect(f({ a: 1, b: () => { } })).toBeUndefined()
    expect(f(Object.fromEntries([["a", 1]]))).toBeUndefined()
    expect(f(new Object({ a: 1 }))).toBeUndefined()
    expect(f({ constructor: true })).toBeUndefined()

    expect(f(new Date())).toBe(Date)
    expect(f(new Set())).toBe(Set)
    expect(f(/foo/)).toBe(RegExp)
    expect(f(new MyTestClass())).toBe(MyTestClass)
    expect(f([])).toBe(Array)
    expect(f([1, 2, 3])).toBe(Array)

    expect(f(MyTestClass)).toBeUndefined()
    expect(f(Date)).toBeUndefined()
    expect(f(class { })).toBeUndefined()
})

test('is iterable', () => {
    const f = isIterable
    expect(f(undefined)).toBe(false)
    expect(f(null)).toBe(false)
    expect(f(true)).toBe(false)
    expect(f(0)).toBe(false)
    expect(f(1)).toBe(false)
    expect(f("")).toBe(false)
    expect(f("foo")).toBe(false)
    expect(f({})).toBe(false)
    expect(f({ a: 1 })).toBe(false)
    expect(f([])).toBe(true)
    expect(f([1, 2])).toBe(true)
    expect(f(new Set())).toBe(true)
    expect(f(new Map())).toBe(true)
    expect(f(new Date())).toBe(false)
    expect(f(/foo/)).toBe(false)
    expect(f(() => [1, 2, 3])).toBe(false)
})

test('is simple', () => {
    const f = isSimple
    expect(f(undefined)).toBe(true)
    expect(f(null)).toBe(true)
    expect(f(0)).toBe(true)
    expect(f(-0)).toBe(true)
    expect(f(Number.POSITIVE_INFINITY)).toBe(true)
    expect(f(Number.NaN)).toBe(true)
    expect(f("")).toBe(true)
    expect(f("hello")).toBe(true)
    expect(f([])).toBe(true)
    expect(f([1, "hi", 3])).toBe(true)
    expect(f({})).toBe(true)
    expect(f({ foo: "bar", a: 5 })).toBe(true)

    expect(f(new Date())).toBe(false)
    expect(f(/adf/)).toBe(false)
    expect(f(MyTestClass)).toBe(false)
    expect(f(Date)).toBe(false)
    expect(f(Set)).toBe(false)
    expect(f(RegExp)).toBe(false)
    expect(f(new MyTestClass())).toBe(false)
    expect(f({ foo: "bar", a: new MyTestClass() })).toBe(false)
})

test('simplify primatives', () => {
    const f = simplify
    expect(f(undefined)).toBeUndefined
    expect(f(null)).toBe(null)
    expect(f(true)).toBe(true)
    expect(f(false)).toBe(false)

    expect(f("")).toEqual("")
    expect(f("foo")).toEqual("foo")
    expect(f("foo bar")).toEqual("foo bar")

    expect(f(Symbol("foobar"))).toBe("foobar")

    expect(f(0)).toEqual(0)
    expect(f(-0)).toEqual(0)
    expect(f(-9.2)).toEqual(-9.2)
    expect(f(14)).toEqual(14)
    expect(f(Number.POSITIVE_INFINITY)).toBe(Number.POSITIVE_INFINITY)
    expect(f(Number.NEGATIVE_INFINITY)).toBe(Number.NEGATIVE_INFINITY)
    expect(f(Number.NaN)).toBe(Number.NaN)
    expect(f(Number.EPSILON)).toEqual(0)
    expect(f(-Number.EPSILON)).toEqual(0)

    expect(f(BigInt(123))).toBe(123)       // number when it fits in a number
    expect(f(BigInt("9007199254740993"))).toBe("9007199254740993")       // string when it's too large for a number

    expect(f([])).toEqual([])
    expect(f([1, "foo"])).toEqual([1, "foo"])

    expect(f({})).toEqual({})
    expect(f({ foo: 123 })).toEqual({ "foo": 123 })
    expect(f({ foo: 123, bar: 321 })).toEqual({ "bar": 321, "foo": 123 })
    expect(f({ foo: 123, bar: undefined })).toEqual({ "foo": 123 })
    expect(f({ foo: new Set([1, 3, 2]), bar: new Map([[3, 4], [1, 2]]) })).toEqual({ foo: [1, 2, 3], bar: { 1: 2, 3: 4 } })
    expect(f({ "pizza": "fine", [Symbol("taco")]: "good", 123: "great" })).toEqual({ "123": "great", pizza: "fine" })
})

test('simplify functions', () => {
    function myFunc() { }
    expect(simplify(myFunc)).toEqual("myFunc()")
    expect(simplify(() => 123)).toEqual("()")
})

test('simplify sets', () => {
    expect(simplify(new Set())).toEqual([])
    expect(simplify(new Set([1, "foo"]))).toEqual([1, "foo"])
    expect(simplify(new Set(["foo", 1]))).toEqual([1, "foo"])
})

test('simplify maps', () => {
    // primative keys go to objects
    expect(simplify(new Map([["foo", 123], ["baz", undefined], ["bar", 321]]))).toEqual({ bar: 321, foo: 123 })
    expect(simplify(new Map<string | number, string | number>([["foo", 123], [321, "bar"]]))).toEqual({ 321: "bar", foo: 123 })
    // complex keys go to a pair-list, sorted in the simplify way
    expect(simplify(new Map<number[], string>([[[123], "foo"], [[321], "bar"]]))).toEqual([[[123], "foo"], [[321], "bar"]])
    expect(simplify(new Map<(number | string)[], string>([[[321], "foo"], [[123], "bar"]]))).toEqual([[[123], "bar"], [[321], "foo"]])
    // Next one fails if we do a standard `sort()` instead of using the simplified sort-order
    expect(simplify(new Map<(number | string)[], string>([[[321], "foo"], [["123"], "bar"]]))).toEqual([[[321], "foo"], [["123"], "bar"]])
})

test('simplify date', () => {
    expect(simplify(new Date(12345678))).toEqual({ t: 12345678 })
    expect(simplify(simplify(new Date(12345678)))).toEqual(simplify(new Date(12345678)))      // idempotent
})

test('simplify regex', () => {
    expect(simplify(new RegExp(/\s*(\w+)\s*/gi))).toEqual("/\\s*(\\w+)\\s*/gi")
})

test('simplify URL', () => {
    expect(simplify(new URL("/foo/bar.html?a=1", "https://something.com"))).toEqual("https://something.com/foo/bar.html?a=1")
})

test('simplify generator', () => {
    function* gen(n: number = 4) { for (let i = 0; i < n; ++i) yield i }

    // Generator object
    expect(simplify(gen(0))).toEqual([])
    expect(simplify(gen(1))).toEqual([0])
    expect(simplify(gen(2))).toEqual([0, 1])
    expect(simplify(gen(5))).toEqual([0, 1, 2, 3, 4])
})

test('simplify toJSON instance', () => {
    const my = new MyTestJSON()
    expect(simplify(my)).toEqual({ foo: 123 })
    expect(simplify(simplify(my))).toEqual(simplify(my))      // idempotent
})

test('simplify class', () => {
    const my = new MyTestClass()
    expect(simplify(MyTestClass)).toEqual("MyTestClass")
    expect(simplify(my)).toEqual({ __class__: "MyTestClass", a: 123, b: "321" })
    expect(simplify(simplify(my))).toEqual(simplify(my))      // idempotent
})

test('simplify Promise', async () => {
    function createPromise() { return new Promise<Set<number>>(success => success(new Set([3, 2, 1]))) }
    expect(Array.from(await createPromise())).toEqual([3, 2, 1])
    expect(await simplify(createPromise())).toEqual([1, 2, 3])
})

test('simplify buffer arrays', () => {
    expect(simplify(new Int8Array([0, 1, 2, 3]))).toEqual([0, 1, 2, 3])
    expect(simplify(new Uint8Array([0, 1, 2, 3]))).toEqual([0, 1, 2, 3])
    expect(simplify(new Int16Array([0, 1, 2, 3]))).toEqual([0, 1, 2, 3])
    expect(simplify(new Uint16Array([0, 1, 2, 3]))).toEqual([0, 1, 2, 3])
    expect(simplify(new Int32Array([0, 1, 2, 3]))).toEqual([0, 1, 2, 3])
    expect(simplify(new Uint32Array([0, 1, 2, 3]))).toEqual([0, 1, 2, 3])
    expect(simplify(new Float32Array([0, 1, 2, 3]))).toEqual([0, 1, 2, 3])
    expect(simplify(new Float64Array([0, 1, 2, 3]))).toEqual([0, 1, 2, 3])
})

test('simplify opaque', async () => {
    function createPromise() { return new Promise<Set<number>>(success => success(new Set([3, 2, 1]))) }
    expect(simplifyOpaqueType(new Set([3, 2, 1]))).toEqual([1, 2, 3])
    const promisedResult = simplifyOpaqueType(createPromise())
    expect(isPromise(promisedResult)).toEqual(true)         // "promise" type was maintained
    expect(await promisedResult).toEqual([1, 2, 3])         // inside the promise was the expected simplification
})

test("simplify nested promises", async () => {
    function createPromise() { return new Promise<Set<number>>(success => success(new Set([3, 2, 1]))) }

    // With primative types, behaves like `simplify()`
    expect(simplifiedAwait(undefined)).toEqual(undefined)
    expect(simplifiedAwait(null)).toEqual(null)
    expect(simplifiedAwait(true)).toEqual(true)
    expect(simplifiedAwait(123)).toEqual(123)
    expect(simplifiedAwait("hi")).toEqual("hi")

    // With arrays, it's a promise even when that's not "necessary" because of recursion
    const arr = simplifiedAwait([1, 2, 3])
    expect(isPromise(arr)).toEqual(true)
    expect(await arr).toEqual([1, 2, 3])

    // With objects, it's a promise even when that's not "necessary" because of recursion
    const obj = simplifiedAwait(simplify({ b: 1, a: 2 }))
    expect(isPromise(obj)).toEqual(true)
    expect(await obj).toEqual({ a: 2, b: 1 })

    // With a direct promise, just pass it through
    const prom = simplifiedAwait(simplify(createPromise()))
    expect(isPromise(prom)).toEqual(true)
    expect(await prom).toEqual([1, 2, 3])

    // Recursive promises
    const s = simplify({ a: 1, s: createPromise(), z: [1, 2, createPromise()] })
    expect(isPromise(s)).toEqual(false)         // the parent object is not a promise
    expect(isPromise(s.s)).toEqual(true)        // the promised set is still a promise, just as an array of numbers (eventually)
    const p = simplifiedAwait(s)
    expect(isPromise(p)).toEqual(true)          // outer is now a promise
    const result = await p
    expect(result).toEqual({ a: 1, s: [1, 2, 3], z: [1, 2, [1, 2, 3]] })       // waiting on the one promise resolves everything
})

test('simplify recursive objects', () => {
    const p: any = { p: 1 }
    const q: any = { q: 2, a: p }
    p.b = q
    expect(simplify(p)).toEqual({ p: 1, b: { q: 2, a: null } })
    expect(simplify(q)).toEqual({ q: 2, a: { p: 1, b: null } })
})

test('simplify walker', async () => {
    const walker = new MyTestWalker()
    expect(walker.walk(undefined)).toEqual("undef")
    expect(walker.walk(null)).toEqual("null")
    expect(walker.walk(false)).toEqual("f")
    expect(walker.walk(0)).toEqual("0")
    expect(walker.walk("foo")).toEqual("s:3")
    expect(walker.walk([1, "foo", 3])).toEqual("1,s:3,3")
    expect(walker.walk({ a: 1, b: "foo" })).toEqual("a,1,b,s:3")
})

test('simplified converted to JSON', () => {
    const example = {
        a: null,
        b: true,
        c: 123,
        d: "hello",
        e: [1, [2, 3, 4], 5],
        f: { x: 1, y: 2 },
    }
    expect(simplifiedToJSON(undefined)).toEqual('null')
    expect(simplifiedToJSON([1, undefined, 2])).toEqual('[1,null,2]')
    expect(simplifiedToJSON(example, true)).toEqual(`{"a":null,"b":true,"c":123,"d":"hello","e":[1,[2,3,4],5],"f":{"x":1,"y":2}}`)
    expect(simplifiedToJSON(example, false)).toEqual(`{\n  "a": null,\n  "b": true,\n  "c": 123,\n  "d": "hello",\n  "e": [\n    1,\n    [\n      2,\n      3,\n      4\n    ],\n    5\n  ],\n  "f": {\n    "x": 1,\n    "y": 2\n  }\n}`)
})

test('simplified to display string', () => {
    const f = simplifiedToDisplay

    expect(f(undefined)).toEqual('undefined')
    expect(f(null)).toEqual('null')
    expect(f(true)).toEqual('true')
    expect(f(false)).toEqual('false')

    expect(f("")).toEqual("")
    expect(f("foo")).toEqual("foo")
    expect(f("foo bar")).toEqual("foo bar")
    expect(f("foo\nbar ")).toEqual("foo\\nbar ")
    expect(f(" foo\tbar")).toEqual(" foo\\tbar")
    expect(f("0123456789".repeat(200))).toEqual("0123456789".repeat(12) + '…')

    expect(f(0)).toEqual("0")
    expect(f(-9.2)).toEqual("-9.2")
    expect(f(14)).toEqual("14")
    expect(f(Number.POSITIVE_INFINITY)).toEqual("Infinity")
    expect(f(Number.NEGATIVE_INFINITY)).toEqual("-Infinity")
    expect(f(Number.NaN)).toEqual("NaN")

    expect(f([])).toEqual("[]")
    expect(f([1, "foo"])).toEqual("[1,foo]")
    expect(f([1, "foo", [3, 4]])).toEqual("[1,foo,[3,4]]")

    expect(f({})).toEqual(`[]`)
    expect(f({ foo: 123 })).toEqual(`foo=123`)
    expect(f({ foo: 123 }, 1)).toEqual(`[foo=123]`)
    expect(f({ bar: 321, foo: ["bizz", "baz"] })).toEqual(`bar=321, foo=[bizz,baz]`)
    expect(f({ bar: 321, foo: ["bizz", "baz"] }, 1)).toEqual(`[bar=321, foo=[bizz,baz]]`)
    expect(f({ __class__: "MyClass", bar: 321, foo: 123 })).toEqual(`[MyClass: bar=321, foo=123]`)
    expect(f({ __class__: "MyClass" })).toEqual(`[MyClass: ]`)
})

test('simplified join', () => {
    const f = simplifiedJoin
    expect(f(undefined)).toEqual('undefined')
    expect(f(null)).toEqual('null')
    expect(f(false)).toEqual('false')
    expect(f("")).toEqual("")
    expect(f("foo")).toEqual("foo")
    expect(f(123)).toEqual("123")
    expect(f([])).toEqual("")
    expect(f([1])).toEqual("1")
    expect(f([1, 2])).toEqual("1,2")
    expect(f([1, "foo", [3, 4]])).toEqual("1,foo,[3,4]")
    expect(f([1, "foo", [3, 4]], ';')).toEqual("1;foo;[3,4]")
})

test('simplified hashed', () => {
    expect(simplifiedToHash(0)).toEqual('cfcd208495d565ef66e7dff9f98764da')
    expect(simplifiedToHash("0")).toEqual('cfcd208495d565ef66e7dff9f98764da')
    expect(simplifiedToHash("")).toEqual('d41d8cd98f00b204e9800998ecf8427e')
    expect(simplifiedToHash(null)).toEqual('37a6259cc0c1dae299a7866489dff0bd')
    expect(simplifiedToHash(undefined)).toEqual('37a6259cc0c1dae299a7866489dff0bd')     // XXXX: bad that there's no difference with null!
})

test('simplified to key', () => {
    const f = simplifiedToKey
    expect(f(undefined)).toEqual('__undefined__')
    expect(f(null)).toEqual('__null__')
    expect(f(false)).toEqual('false')
    expect(f(true)).toEqual('true')
    expect(f(0)).toEqual('0')
    expect(f(BigInt(0))).toEqual('0')
    expect(f(-1)).toEqual('-1')
    expect(f(1)).toEqual('1')
    expect(f(12345678)).toEqual('12345678')
    expect(f(BigInt(12345678))).toEqual('12345678')
    expect(f(12345678.34)).toEqual('12345678.34')
    expect(f(Number.MAX_SAFE_INTEGER)).toEqual('9007199254740991')
    expect(f(Number.POSITIVE_INFINITY)).toEqual('Infinity')
    expect(f(Number.NEGATIVE_INFINITY)).toEqual('-Infinity')
    expect(f(Number.EPSILON)).toEqual('2.220446049250313e-16')
    expect(f(Number.NaN)).toEqual('NaN')
    expect(f("")).toEqual('')
    expect(f("x")).toEqual('x')
    expect(f(Symbol.for("x"))).toEqual('Symbol(x)')
    expect(f("foo bar baz")).toEqual('foo bar baz')
    expect(f("foo bar baz foo bar baz foo bar ")).toEqual('foo bar baz foo bar baz foo bar ')
    expect(f("foo bar baz foo bar baz foo bar baz foo bar baz foo bar baz")).toEqual('6e4f570be5b255f6ebee7b28d9f92a1f')
    expect(f([])).toEqual('d751713988987e9331980363e24189ce')
    expect(f([1])).toEqual('35dba5d75538a9bbe0b4da4422759a0e')
    expect(f([1] as const)).toEqual('35dba5d75538a9bbe0b4da4422759a0e')
    expect(f([1, 2, 3])).toEqual('f1e46f328e6decd56c64dd5e761dc2b7')
    expect(f([1, 2, 3] as const)).toEqual('f1e46f328e6decd56c64dd5e761dc2b7')
    expect(f({})).toEqual('99914b932bd37a50b983c5e7c90ae93b')
    expect(f({ a: 1 })).toEqual('bb6cb5c68df4652941caf652a366f2d8')

    // That structured objects didn't change their hash values
    expect(f([])).toEqual(simplifiedToHash([]))
    expect(f([1])).toEqual(simplifiedToHash([1]))
    expect(f([1, 2, 3])).toEqual(simplifiedToHash([1, 2, 3]))
    expect(f([1, 2, 3] as const)).toEqual(simplifiedToHash([1, 2, 3] as const))
    expect(f({})).toEqual(simplifiedToHash({}))
    expect(f({ a: 1 })).toEqual(simplifiedToHash({ a: 1 }))
})

test("simplified comparison", () => {
    const TOTAL_ORDERING: Simple[] = [
        undefined, null,
        false, true,
        Number.NaN, Number.NEGATIVE_INFINITY, Number.MIN_SAFE_INTEGER, -1, -0.001, -Number.EPSILON, 0, Number.EPSILON, 0.001, 1, Number.MAX_SAFE_INTEGER, Number.POSITIVE_INFINITY,
        "", "a", "aa", "ab", "ac", "az", "b", "ba", "bb", "bc", "bz", "c", "ca", "cb", "cc", "cz", "z", "za", "zb", "zc", "zz",
        [], [1], [1, 2], [1, 2, 3], [1, 2, 3, 4], [1, 2, 3, 4, 5], [2], [2, 1], [3, 1], [3, 2], [3, 2, 1],
        {}, { a: 1 }, { a: 1, b: 2 }, { a: 1, b: 2, c: 3 }, { a: 1, b: 2, c: 3, d: 4 }, { a: 1, b: 2, c: 3, d: 4, e: 5 }, { a: 1, b: 3 }, { a: 2, b: 2 }, { b: 2 }, { b: 2, c: 1 },
    ]
    for (let i = 0; i < TOTAL_ORDERING.length; ++i) {
        for (let j = 0; j < TOTAL_ORDERING.length; ++j) {
            const a = TOTAL_ORDERING[i];
            const b = TOTAL_ORDERING[j];
            const cmp = simplifiedCompare(a, b)
            // console.log(a, b, cmp)
            if (i < j) expect(cmp).toBeLessThan(0);
            if (i === j) expect(cmp).toBe(0);
            if (i > j) expect(cmp).toBeGreaterThan(0);
        }
    }
});