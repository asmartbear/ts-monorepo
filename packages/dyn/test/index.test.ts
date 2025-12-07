import * as D from "../src/index"

test('FALSEY / TRUTHY', () => {
    const tst = (x: any, want: boolean) => {
        expect(D.FALSEY(x)).toBe(want)
        expect(D.TRUTHY(x)).toBe(!want)
    }
    tst(undefined, true)
    tst(null, true)
    tst(false, true)
    tst(true, false)
    tst(0, true)
    tst("", true)
    tst("x", false)
    tst("0", false)
    tst(1, false)
    tst(-1, false)
    tst([], true)
    tst([1], false)
    tst({}, false)
    tst({ a: 1 }, false)
    tst(new Date(123), false)
    tst(new Date(0), false)
    tst("asdf".match(/a/), false)
    tst("asdf".match(/x/), true)
})

test('ARRAY', () => {
    expect(D.ARRAY(undefined)).toEqual([])
    expect(D.ARRAY(null)).toEqual([])
    expect(D.ARRAY([])).toEqual([])
    expect(D.ARRAY([1])).toEqual([1])
    expect(D.ARRAY([3, 2, 1])).toEqual([3, 2, 1])
    expect(D.ARRAY(D.ITER([3, 2, 1]))).toEqual([3, 2, 1])
    expect(D.ARRAY(new Set([3, 2, 1]))).toEqual([3, 2, 1])
    expect(D.ARRAY(new Map([[1, 2], [3, 4]]))).toEqual([[1, 2], [3, 4]])
})

test('ITER', () => {
    let iter = D.ITER<number>(undefined)
    expect(D.isIterable(iter)).toEqual(true)
    expect(Array.isArray(iter)).toEqual(false)
    expect(D.ARRAY(iter)).toEqual([])
    iter = D.ITER(null)
    expect(D.isIterable(iter)).toEqual(true)
    expect(Array.isArray(iter)).toEqual(false)
    expect(D.ARRAY(iter)).toEqual([])
    iter = D.ITER([1, 2, 3])
    expect(D.isIterable(iter)).toEqual(true)
    expect(Array.isArray(iter)).toEqual(false)
    expect(D.ARRAY(iter)).toEqual([1, 2, 3])
    iter = D.ITER(new Set([1, 2, 3]))
    expect(D.isIterable(iter)).toEqual(true)
    expect(Array.isArray(iter)).toEqual(false)
    expect(D.ARRAY(iter)).toEqual([1, 2, 3])
    const iter2 = D.ITER(new Map([[1, 2], [3, 4]]))
    expect(D.isIterable(iter2)).toEqual(true)
    expect(Array.isArray(iter2)).toEqual(false)
    expect(D.ARRAY(iter2)).toEqual([[1, 2], [3, 4]])

    expect(D.isIterable(undefined)).toBeFalsy()
    expect(D.isIterable(null)).toBeFalsy()
    expect(D.isIterable("hi")).toBeFalsy()
    expect(D.isIterable(new Date())).toBeFalsy()

    expect(D.isIterator(undefined)).toBeFalsy()
    expect(D.isIterator(null)).toBeFalsy()
    expect(D.isIterator("hi")).toBeFalsy()
    expect(D.isIterator(new Date())).toBeFalsy()
})

test('MAP / aMAP', async () => {
    const tst = async (arr: any, f: (x: any) => any, want: any) => {
        expect(D.MAP(arr, f)).toEqual(want)
        expect(D.MAP(new Set(arr), f)).toEqual(want)
        expect(await D.aMAP(arr, f)).toEqual(want)
        expect(await D.aMAP(arr, async (x: any) => f(x))).toEqual(want)
        if (Array.isArray(arr)) {
            expect(D.MAP(new Map(arr.map(x => [x.toString(), x])), ([_, v]) => f(v))).toEqual(want)
        }
    }
    await tst(undefined, (x: number) => x * x, [])
    await tst(null, (x: number) => x * x, [])
    await tst([], x => x * x, [])
    await tst([1, 2, 3], x => x * x, [1, 4, 9])
    await tst([1, 2, 3], x => x * x, [1, 4, 9])
    await tst([1, 2, 3, 4, 5, 6, 7], x => x % 2 == 0 ? x : undefined, [2, 4, 6])
    await tst([1, 2, 3, 4, 5, 6, 7], x => x % 2 == 1 ? x : undefined, [1, 3, 5, 7])
})

test('JOIN / aJOIN', async () => {
    const tst = async (j: string, arr: any, f: (x: any) => string, want: string) => {
        expect(D.JOIN(j, arr, f)).toEqual(want)
        expect(await D.aJOIN(j, arr, f)).toEqual(want)
        expect(await D.aJOIN(j, arr, async (x) => f(x))).toEqual(want)
    }

    await tst(";", undefined, (x: number) => x.toString(), "")
    await tst(";", null, (x: number) => x.toString(), "")
    await tst(";", [], (x: number) => x.toString(), "")
    await tst(";", [1], (x: number) => x.toString(), "1")
    await tst(";", [1, 2], (x: number) => x.toString(), "1;2")
    await tst(";", [1, 2, 3], (x: number) => x.toString(), "1;2;3")
    await tst(";", [1, 2, 3, 4, 5, 6, 7], (x: number) => x.toString(), "1;2;3;4;5;6;7")
    await tst(";", [1, 2, 3, 4, 5, 6, 7], x => x % 2 == 0 ? x.toString() : undefined, "2;4;6")
    await tst(";", [1, 2, 3, 4, 5, 6, 7], x => x % 2 == 1 ? x.toString() : undefined, "1;3;5;7")
    await tst("", [1, 2, 3, 4, 5, 6, 7], x => x % 2 == 1 ? x.toString() : undefined, "1357")
})

test('JOIN with plain string', async () => {
    const tst = async (j: string, arr: string[] | D.Nullish, want: string) => {
        expect(D.JOIN(j, arr)).toEqual(want)
    }

    await tst(";", undefined, "")
    await tst(";", null, "")
    await tst(";", [], "")
    await tst(";", [""], "")
    await tst(";", ["", ""], ";")
    await tst(";", ["a"], "a")
    await tst(";", ["", "b"], ";b")
    await tst(";", ["a", ""], "a;")
    await tst(";", ["a", "b"], "a;b")
    await tst(";", ["a", "b", "c"], "a;b;c")

    await tst("", undefined, "")
    await tst("", null, "")
    await tst("", [], "")
    await tst("", [""], "")
    await tst("", ["", ""], "")
    await tst("", ["a"], "a")
    await tst("", ["", "b"], "b")
    await tst("", ["a", ""], "a")
    await tst("", ["a", "b"], "ab")
    await tst("", ["a", "b", "c"], "abc")
})

test('IF / aIF', async () => {
    const tst = async (x: any, want: string) => {
        expect(D.IFELSE(x, x => '+' + JSON.stringify(x), x => '-' + JSON.stringify(x))).toBe(want)
        expect(D.IFELSE(() => x, x => '+' + JSON.stringify(x), x => '-' + JSON.stringify(x))).toBe(want)
        expect(await D.aIFELSE(x, x => '+' + JSON.stringify(x), x => '-' + JSON.stringify(x))).toBe(want)
        expect(await D.aIFELSE(x, async x => '+' + JSON.stringify(x), async x => '-' + JSON.stringify(x))).toBe(want)
        expect(await D.aIFELSE(() => x, x => '+' + JSON.stringify(x), x => '-' + JSON.stringify(x))).toBe(want)
        expect(await D.aIFELSE(() => x, async x => '+' + JSON.stringify(x), async x => '-' + JSON.stringify(x))).toBe(want)
        expect(await D.aIFELSE(async () => x, x => '+' + JSON.stringify(x), x => '-' + JSON.stringify(x))).toBe(want)
        expect(await D.aIFELSE(async () => x, async x => '+' + JSON.stringify(x), async x => '-' + JSON.stringify(x))).toBe(want)
    }

    await tst(true, "+true")
    await tst(false, "-false")
    await tst(null, "-null")
    await tst("", "-\"\"")
    await tst("x", "+\"x\"")
    await tst(0, "-0")
    await tst(1, "+1")
    await tst(-1, "+-1")
    await tst([], "-[]")
    await tst([1, 2], "+[1,2]")
})

test('IF with constant FALSE', () => {
    const t = (x: string) => x.length
    const r1 = D.IF("foo", t, "bar")
    expect(r1).toBe(3)
    const r2 = D.IF("", t, "bar")
    expect(r2).toBe("bar")
})

test('IF without FALSE', () => {
    const t = (x: string) => x.length
    let result = D.IF("foo", t)
    expect(result).toBe(3)
    result = D.IF("", t)
    expect(result).toBe(undefined)
})

test('WHILE', () => {
    let str = 'x'
    D.WHILE(
        () => str.length < 20 ? str : false,
        s => {
            str = '(' + s + ',' + s + ')'
        }
    )
    expect(str).toBe("(((x,x),(x,x)),((x,x),(x,x)))")
})

test('FOREACH', () => {
    let result: Record<string, number> = {}
    function acc(v: number, k: string) { result[k] = v * v; }

    result = {}
    D.FOREACH(new Map([["a", 2], ["b", 5]]), acc)
    expect(result).toEqual({ a: 4, b: 25 })

    result = {}
    D.FOREACH({ "a": 2, "b": 5 }, acc)
    expect(result).toEqual({ a: 4, b: 25 })

    result = {}
    D.FOREACH([2, 5], acc as any)
    expect(result).toEqual({ "0": 4, "1": 25 })

    result = {}
    D.FOREACH(new Set([2, 5]), acc as any)
    expect(result).toEqual({ "0": 4, "1": 25 })
})

test('WITH / aWITH', async () => {
    const tst = async (x: any, want: string) => {
        expect(D.WITH(x, x => '+' + JSON.stringify(x))).toBe(want)
        expect(D.WITH(() => x, x => '+' + JSON.stringify(x))).toBe(want)
        expect(await D.aWITH(x, x => '+' + JSON.stringify(x))).toBe(want)
        expect(await D.aWITH(() => x, x => '+' + JSON.stringify(x))).toBe(want)
        expect(await D.aWITH(async () => x, x => '+' + JSON.stringify(x))).toBe(want)
    }

    await tst(true, "+true")
    await tst(false, "")
    await tst(null, "")
    await tst(undefined, "")
    await tst("", "")
    await tst("x", "+\"x\"")
    await tst(0, "")
    await tst(1, "+1")
    await tst(-1, "+-1")
    await tst([], "")
    await tst([1, 2], "+[1,2]")
})

test('MAX / aMAX', async () => {
    const tst = async (lst: string[], want: number) => {
        expect(D.MAX(2, lst, x => x == "no way jose" ? undefined : x.length)).toBe(want)
        expect(await D.aMAX(2, lst, x => x == "no way jose" ? undefined : x.length)).toBe(want)
        expect(await D.aMAX(2, lst, async x => x == "no way jose" ? undefined : x.length)).toBe(want)
    }

    await tst([], 2)
    await tst([""], 2)
    await tst(["ab"], 2)
    await tst(["ab", "abc"], 3)
    await tst(["abcd", "abc"], 4)
    await tst(["abcd", "abc", "abc", "abc", "abc", "abc", "abc", "abc"], 4)
    await tst(["abc", "abc", "abc", "abc", "abc", "abc", "abc", "abc"], 3)
    await tst(["abcd", "no way joe"], 10)
    await tst(["abcd", "no way jose"], 4)
    await tst(["no way jose"], 2)
})

test('MIN', async () => {
    const tst = (lst: string[], want: number) => {
        expect(D.MIN(99, lst, x => x == "no way jose" ? undefined : x.length)).toBe(want)
    }

    await tst([], 99)
    await tst([""], 0)
    await tst(["ab"], 2)
    await tst(["ab", "abc"], 2)
    await tst(["abcd", "abc"], 3)
    await tst(["abcd", "abc", "abc", "abc", "abc", "abc", "abc", "abc"], 3)
    await tst(["abc", "abc", "abc", "abc", "abc", "abc", "abc", "abc"], 3)
    await tst(["this is even longer", "no way joe"], 10)
    await tst(["this is even longer", "no way jose"], 19)
    await tst(["no way jose"], 99)
})

test('FIND / aFIND', async () => {
    const tst = async (lst: number[], want: any) => {
        expect(D.FIND(lst, x => x % 2 == 0)).toBe(want)
        expect(await D.aFIND(lst, x => x % 2 == 0)).toBe(want)
        expect(await D.aFIND(lst, async x => x % 2 == 0)).toBe(want)
    }

    await tst([], undefined)
    await tst([1], undefined)
    await tst([1, 2], 2)
    await tst([1, 2, 3, 4], 2)
    await tst([1, 4, 3, 2], 4)
    await tst([4, 3, 2], 4)
    await tst([0, 4, 3, 2], 0)
})

test('FIND_LAST', async () => {
    const tst = async (lst: number[], want: any) => {
        expect(D.FIND_LAST(lst, x => x % 2 == 0)).toBe(want)        // as array
        expect(D.FIND_LAST(D.ITER(lst), x => x % 2 == 0)).toBe(want)        // as iterator (separate code path)
    }

    await tst([], undefined)
    await tst([1], undefined)
    await tst([1, 2], 2)
    await tst([1, 2, 3, 4], 4)
    await tst([1, 4, 3, 2], 2)
    await tst([1, 3, 5, 7], undefined)
    await tst([4, 3, 2], 2)
    await tst([0, 4, 3, 2], 2)
    await tst([2, 4, 3, 0], 0)
})

test('ANY / aANY', async () => {
    const tst = async (lst: number[], want: boolean) => {
        expect(D.ANY(lst, x => x % 2 == 0)).toBe(want)
        expect(await D.aANY(lst, x => x % 2 == 0)).toBe(want)
        expect(await D.aANY(lst, async x => x % 2 == 0)).toBe(want)
    }

    await tst([], false)
    await tst([1], false)
    await tst([1, 2], true)
    await tst([1, 3], false)
})

test('FIRST', () => {
    const tst = (lst: number[], want: string | undefined) => {
        expect(D.FIRST(lst, x => x % 2 == 0 ? String(x) : undefined)).toEqual(want)
    }
    tst([], undefined)
    tst([1], undefined)
    tst([0], "0")
    tst([0, 1, 2], "0")
    tst([1, 2], "2")
    tst([2], "2")
})

test('EVERY', async () => {
    const tst = (lst: number[] | undefined | null, defaultIfEmpty: boolean, want: boolean) => {
        expect(D.EVERY(lst, x => x % 2 == 0, defaultIfEmpty)).toBe(want)
    }

    tst(undefined, false, false)
    tst(undefined, true, true)
    tst(null, false, false)
    tst(null, true, true)
    tst([], false, false)
    tst([], true, true)
    tst([1], false, false)
    tst([1], true, false)
    tst([1, 2], false, false)
    tst([1, 2], true, false)
    tst([4, 2], false, true)
    tst([4, 2], true, true)
})

test('FIELD', () => {
    const nonObjects = [undefined, null, true, 123, "hi", ["foo", 2], {}, new Date()]

    // If no fields, we just return the object
    for (const a of nonObjects) {
        expect(D.FIELD(a)).toBe(a)
    }

    // If a field is there, we return it, all else is undefined
    for (const a of nonObjects) {
        expect(D.FIELD(a, "foo")).toBeUndefined()
    }
    expect(D.FIELD({ "bar": "foo" }, "foo")).toBeUndefined()
    expect(D.FIELD({ "foo": "bar" }, "foo")).toEqual("bar")
    expect(D.FIELD({ "bar": "foo", "foo": "bar" }, "foo")).toEqual("bar")
    expect(D.FIELD({ "bar": "foo", "foo": null }, "foo")).toEqual(null)
    expect(D.FIELD({ "bar": "foo", "foo": 321 }, "foo")).toEqual(321)

    // Two fields
    for (const a of nonObjects) {
        expect(D.FIELD(a, "foo", "bar")).toBeUndefined()
    }
    expect(D.FIELD({ "bar": "foo" }, "foo", "bar")).toBeUndefined()
    expect(D.FIELD({ "foo": "bar" }, "foo", "bar")).toBeUndefined()
    expect(D.FIELD({ "bar": "foo", "foo": "bar" }, "foo", "bar")).toBeUndefined()
    expect(D.FIELD({ "foo": {} }, "foo", "bar")).toBeUndefined()
    expect(D.FIELD({ "foo": null }, "foo", "bar")).toBeUndefined()
    expect(D.FIELD({ "foo": { asd: 321 } }, "foo", "bar")).toBeUndefined()
    expect(D.FIELD({ "foo": { bar: 123 } }, "foo", "bar")).toEqual(123)
    expect(D.FIELD({ "foo": { bar: null } }, "foo", "bar")).toEqual(null)
    expect(D.FIELD({ "foo": { bar: 321 } }, "foo", "bar")).toEqual(321)

    // Fields as a map
    const map = new Map([["a", 1], ["b", 2], ["c", 3]])
    expect(D.FIELD(map, "a")).toEqual(1)
    expect(D.FIELD(map, "c")).toEqual(3)
    expect(D.FIELD(map, "d")).toBeUndefined()

    // Fields as array indicies
    const arr = ["a", "b", "c"]
    expect(D.FIELD(arr, "0")).toEqual("a")
    expect(D.FIELD(arr, "1")).toEqual("b")
    expect(D.FIELD(arr, "2")).toEqual("c")
    expect(D.FIELD(arr, "d")).toBeUndefined()
})

test('fieldListFromDotString', () => {
    const f = D.fieldListFromDotString
    expect(f("")).toEqual([])
    expect(f(" ")).toEqual([])
    expect(f("foo")).toEqual(["foo"])
    expect(f("  foo\t")).toEqual(["foo"])
    expect(f("foo.bar")).toEqual(["foo", "bar"])
    expect(f("  foo\t.   bar ")).toEqual(["foo", "bar"])
    expect(f("  foo\t..   bar ")).toEqual(["foo", "bar"])
    expect(f("  foo\t.  .   bar ")).toEqual(["foo", "bar"])
    expect(f(".  foo\t.  .   bar ")).toEqual(["foo", "bar"])
    expect(f(".  foo\t.  .   bar .")).toEqual(["foo", "bar"])
    expect(f(". . .  foo\t.  .   bar ....")).toEqual(["foo", "bar"])
})

test('KEYS', () => {
    expect(D.KEYS(undefined)).toEqual([])
    expect(D.KEYS(null)).toEqual([])
    expect(D.KEYS({})).toEqual([])
    expect(D.KEYS({ a: 1 })).toEqual(["a"])
    expect(D.KEYS({ b: 2, a: 1 })).toEqual(["b", "a"])
    expect(D.KEYS([])).toEqual([])
    expect(D.KEYS([1, 2, 3])).toEqual([])
    expect(D.KEYS(["a", "b"])).toEqual([])
    expect(D.KEYS(new Map())).toEqual([])
    expect(D.KEYS(new Map<string, number>().set("foo", 1))).toEqual(["foo"])
    expect(D.KEYS(new Map<string, number>().set("foo", 1).set("bar", 2))).toEqual(["foo", "bar"])
})

test('VALUES', () => {
    expect(D.VALUES(undefined)).toEqual([])
    expect(D.VALUES(null)).toEqual([])
    expect(D.VALUES({})).toEqual([])
    expect(D.VALUES({ a: 1 })).toEqual([1])
    expect(D.VALUES({ b: 2, a: 1 })).toEqual([2, 1])
    expect(D.VALUES({ b: 2, a: "foo" })).toEqual([2, "foo"])
    // expect(D.VALUES([])).toEqual([])
    // expect(D.VALUES([1, 2, 3])).toEqual([])
    // expect(D.VALUES(["a", "b"])).toEqual([])
    expect(D.VALUES(new Map<string, number>())).toEqual([])
    expect(D.VALUES(new Map<string, number>().set("foo", 1))).toEqual([1])
    expect(D.VALUES(new Map<string, number>().set("foo", 1).set("bar", 2))).toEqual([1, 2])
})

test('ENTRIES', () => {
    expect(D.ENTRIES(undefined)).toEqual([])
    expect(D.ENTRIES(null)).toEqual([])
    expect(D.ENTRIES({})).toEqual([])
    expect(D.ENTRIES({ a: 1 })).toEqual([["a", 1]])
    expect(D.ENTRIES({ b: 2, a: 1 })).toEqual([["b", 2], ["a", 1]])
    // expect(D.ENTRIES([])).toEqual([])
    // expect(D.ENTRIES([1, 2, 3])).toEqual([])
    // expect(D.ENTRIES(["a", "b"])).toEqual([])
    expect(D.ENTRIES(new Map())).toEqual([])
    expect(D.ENTRIES(new Map<string, number>().set("foo", 1))).toEqual([["foo", 1]])
    expect(D.ENTRIES(new Map<string, number>().set("foo", 1).set("bar", 2))).toEqual([["foo", 1], ["bar", 2]])
})

test('NARROW', () => {
    const f = (x: any[]) => D.NARROW(x, x => x instanceof Date)
    expect(f([])).toEqual([])
    expect(f([123, "hi", []])).toEqual([])
    expect(f([undefined, null, {}, []])).toEqual([])
    const p = new Date()
    expect(f([123, "hi", p, []])).toEqual([p])
    const q = new Date()
    expect(f([123, q, "hi", p, [], p])).toEqual([q, p, p])
})

test('OMAP', () => {
    expect(D.OMAP(undefined, x => String(x))).toEqual({})
    expect(D.OMAP(null, x => String(x))).toEqual({})
    expect(D.OMAP({}, x => String(x))).toEqual({})
    expect(D.OMAP({ foo: 123 }, x => String(x))).toEqual({ foo: "123" })
    expect(D.OMAP({ foo: 123, bar: 456 }, x => String(x))).toEqual({ foo: "123", bar: "456" })
    expect(D.OMAP({ foo: 123, bar: false }, x => String(x))).toEqual({ foo: "123", bar: "false" })
})

test('LEN', () => {
    expect(D.LEN(undefined)).toEqual(0)
    expect(D.LEN(null)).toEqual(0)
    expect(D.LEN([])).toEqual(0)
    expect(D.LEN([3])).toEqual(1)
    expect(D.LEN([3, 0])).toEqual(2)
    expect(D.LEN(D.ITER([]))).toEqual(0)
    expect(D.LEN(D.ITER([3]))).toEqual(1)
    expect(D.LEN(D.ITER([3, 0]))).toEqual(2)
    expect(D.LEN(new Set())).toEqual(0)
    expect(D.LEN(new Set([3, 0]))).toEqual(2)
    expect(D.LEN(new Map())).toEqual(0)
    expect(D.LEN(new Map([[3, 0], [0, 3]]))).toEqual(2)
    expect(D.LEN({})).toEqual(0)
    expect(D.LEN({ a: 1 })).toEqual(1)
    expect(D.LEN({ b: 5, a: 10 })).toEqual(2)
})

test('AT', () => {
    expect(D.AT(undefined, 0)).toBeUndefined()
    expect(D.AT(null, 0)).toBeUndefined()
    expect(D.AT([], 0)).toBeUndefined()
    expect(D.AT([], 1)).toBeUndefined()
    expect(D.AT([], -1)).toBeUndefined()

    expect(D.AT([5], -2)).toBeUndefined()
    expect(D.AT([5], -1)).toEqual(5)
    expect(D.AT([5], 0)).toEqual(5)
    expect(D.AT([5], 1)).toBeUndefined()
    expect(D.AT([5], 2)).toBeUndefined()

    expect(D.AT([5, 9], -3)).toBeUndefined()
    expect(D.AT([5, 9], -2)).toEqual(5)
    expect(D.AT([5, 9], -1)).toEqual(9)
    expect(D.AT([5, 9], 0)).toEqual(5)
    expect(D.AT([5, 9], 1)).toEqual(9)
    expect(D.AT([5, 9], 2)).toBeUndefined()
})

test('DEDUP', () => {
    const f = (x: { id: number, s: string }[] | null | undefined) => D.DEDUP(x, x => x.id)
    expect(f(undefined)).toEqual([])
    expect(f(null)).toEqual([])
    expect(f([])).toEqual([])
    expect(f([{ id: 1, s: "one" }])).toEqual([{ id: 1, s: "one" }])
    expect(f([{ id: 1, s: "one" }, { id: 2, s: "two" }, { id: 3, s: "three" }])).toEqual([{ id: 1, s: "one" }, { id: 2, s: "two" }, { id: 3, s: "three" }])
    expect(f([{ id: 1, s: "one" }, { id: 1, s: "two" }, { id: 3, s: "three" }])).toEqual([{ id: 1, s: "one" }, { id: 3, s: "three" }])
    expect(f([{ id: 1, s: "one" }, { id: 1, s: "two" }, { id: 1, s: "three" }])).toEqual([{ id: 1, s: "one" }])
})

test('ARRAY_OF', () => {
    expect(D.ARRAY_OF(-1, 5)).toEqual([])
    expect(D.ARRAY_OF(0, 5)).toEqual([])
    expect(D.ARRAY_OF(1, 5)).toEqual([5])
    expect(D.ARRAY_OF(2, 5)).toEqual([5, 5])
})

test('ARRAY_OF_DYN', () => {
    expect(D.ARRAY_OF_DYN(-1, i => i * i)).toEqual([])
    expect(D.ARRAY_OF_DYN(0, i => i * i)).toEqual([])
    expect(D.ARRAY_OF_DYN(1, i => i * i)).toEqual([0])
    expect(D.ARRAY_OF_DYN(2, i => i * i)).toEqual([0, 1])
    expect(D.ARRAY_OF_DYN(3, i => i * i)).toEqual([0, 1, 4])
    expect(D.ARRAY_OF_DYN(4, i => i * i)).toEqual([0, 1, 4, 9])
})

test('FROM_ENTRIES', () => {
    expect(D.FROM_ENTRIES([])).toEqual({})
    expect(D.FROM_ENTRIES([['foo', 123]])).toEqual({ foo: 123 })
    expect(D.FROM_ENTRIES([['foo', 123], ['bar', 321]])).toEqual({ foo: 123, bar: 321 })
    expect(D.FROM_ENTRIES([['foo', 123], ['bar', 'baz']])).toEqual({ foo: 123, bar: 'baz' })
})

test('NOT_EMPTY', () => {
    expect(D.NOT_EMPTY(undefined)).toEqual(false)
    expect(D.NOT_EMPTY(null)).toEqual(false)
    expect(D.NOT_EMPTY("")).toEqual(false)
    expect(D.NOT_EMPTY("!")).toEqual(true)
    expect(D.NOT_EMPTY([])).toEqual(false)
    expect(D.NOT_EMPTY([1])).toEqual(true)
    expect(D.NOT_EMPTY({})).toEqual(false)
    expect(D.NOT_EMPTY({ a: 1 })).toEqual(true)
    expect(D.NOT_EMPTY(new Set<string>())).toEqual(false)
    expect(D.NOT_EMPTY(new Set<string>(['hi']))).toEqual(true)
    expect(D.NOT_EMPTY(new Map<string, number>())).toEqual(false)
    expect(D.NOT_EMPTY(new Map([['hi', 123]]))).toEqual(true)
})