import * as V from "../src/index"
import * as T from "./testutil"
import { passes, fails, toFromJSON, failsWithErrorRegex, TestVisitor } from "./moreutil"
import { isPrimative } from "../src/common"
import { JS_UNDEFINED_SIGNAL } from "../src/undef";

test('isPrimative', () => {
    T.eq(isPrimative(undefined), false)
    T.eq(isPrimative(null), true)
    T.eq(isPrimative(0), true)
    T.eq(isPrimative(123), true)
    T.eq(isPrimative(""), true)
    T.eq(isPrimative("foo"), true)
    T.eq(isPrimative(true), true)
    T.eq(isPrimative(false), true)
    T.eq(isPrimative([]), false)
    T.eq(isPrimative([1]), false)
    T.eq(isPrimative({}), false)
    T.eq(isPrimative({ a: 1 }), false)
    T.eq(isPrimative(new Date()), false)
})

test('smart undefined', () => {
    let ty = V.UNDEF()
    T.eq(ty.description, "undefined")
    T.eq(ty.canBeUndefined, true)
    T.eq(ty.keys, undefined)
    T.eq(ty.visit(TestVisitor.SINGLETON, undefined), "undefined")
    T.eq(ty.isOfType(null), false)

    // strict
    passes(true, ty, undefined)
    fails(true, ty, false, true, null, 0, 1, -1, 123.4, -567.68, Number.EPSILON, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NaN, "", "a", "foo bar", "0", "123", "12bar", [], [1], [2, 1], [3, "a", 1], {}, { a: 1 }, { b: 2, a: 1 })
    T.be(ty.input(undefined), undefined, "default parameter")

    toFromJSON(ty, undefined, JS_UNDEFINED_SIGNAL)
    T.throws(() => ty.toJSON(123))
    T.throws(() => ty.fromJSON(123))
})

test('smart null', () => {
    let ty = V.NIL()
    T.eq(ty.description, "null")
    T.eq(ty.canBeUndefined, false)
    T.eq(ty.keys, undefined)
    T.eq(ty.visit(TestVisitor.SINGLETON, null), "null")
    T.eq(ty.isOfType(undefined), false)

    // strict
    passes(true, ty, null)
    fails(true, ty, undefined, false, true, 0, 1, -1, 123.4, -567.68, Number.EPSILON, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NaN, "", "a", "foo bar", "0", "123", "12bar", [], [1], [2, 1], [3, "a", 1], {}, { a: 1 }, { b: 2, a: 1 })
    T.be(ty.input(null), null, "default parameter")

    toFromJSON(ty, null, null)
    T.throws(() => ty.toJSON(123))
    T.throws(() => ty.fromJSON(123))
})

test('smart boolean', () => {
    let ty = V.BOOL()
    T.eq(ty.description, "boolean")
    T.eq(ty.canBeUndefined, false)
    T.eq(ty.keys, undefined)
    T.eq(ty.visit(TestVisitor.SINGLETON, true), "b:true")
    T.eq(ty.isOfType(null), false)
    T.eq(ty.isOfType(0), false)
    T.eq(ty.isOfType("true"), false)

    // strict
    passes(true, ty, false, true)
    fails(true, ty, undefined, null, 0, 1, -1, 123.4, -567.68, Number.EPSILON, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NaN, "", "a", "foo bar", "0", "123", "12bar", [], [1], [2, 1], [3, "a", 1], {}, { a: 1 }, { b: 2, a: 1 })
    T.be(ty.input(true), true, "default parameter")

    // not strict
    T.be(ty.input(undefined, false), false)
    T.be(ty.input(null, false), false)
    T.be(ty.input(0, false), false)
    T.be(ty.input(1, false), true)
    T.be(ty.input(-1, false), true)
    T.be(ty.input(Number.EPSILON, false), true)
    T.be(ty.input(Number.NEGATIVE_INFINITY, false), true)
    T.be(ty.input(Number.NaN, false), false, "the native way in javascript too")
    T.be(ty.input("", false), false)
    T.be(ty.input("0", false), true)
    T.be(ty.input("123", false), true)
    T.be(ty.input([], false), false)
    T.be(ty.input([1], false), true)
    T.be(ty.input({}, false), false)
    T.be(ty.input({ a: 1 }, false), true)

    toFromJSON(ty, false, false)
    toFromJSON(ty, true, true)
    T.throws(() => ty.toJSON(123 as any))
    T.throws(() => ty.fromJSON(123))
})

test('smart number', () => {
    let ty = V.NUM()
    T.eq(ty.description, "number")
    T.eq(ty.canBeUndefined, false)
    T.eq(ty.keys, undefined)
    T.eq(ty.visit(TestVisitor.SINGLETON, 123), "n:123")
    T.eq(ty.isOfType("0"), false)

    // strict
    passes(true, ty, 0, 1, -1, 123.4, -567.68, Number.EPSILON, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NaN)
    fails(true, ty, undefined, null, false, true, "", "a", "foo bar", "0", "123", "12bar", [], [1], [2, 1], [3, "a", 1], {}, { a: 1 }, { b: 2, a: 1 })
    T.be(ty.input(-0), -0)      // might be nice to fix this?

    // not strict
    passes(false, ty, 0, 1, -1, 123.4, -567.68, Number.EPSILON, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NaN)
    fails(false, ty, undefined, null, "", "a", "foo bar", "12bar", [], [1], [2, 1], [3, "a", 1], {}, { a: 1 }, { b: 2, a: 1 })
    T.be(ty.input(false, false), 0)
    T.be(ty.input(true, false), 1)
    T.be(ty.input("0", false), 0)
    T.be(ty.input("123", false), 123)
    T.be(ty.input("-2.3", false), -2.3)

    // min-limit
    ty = V.NUM().min(3)
    passes(true, ty, 3, 4, 5, 6, Number.POSITIVE_INFINITY)
    fails(true, ty, -10, 0, 1, 2, 2.999, Number.NEGATIVE_INFINITY, Number.NaN)

    // max-limit
    ty = V.NUM().max(3)
    passes(true, ty, -10, 0, 1, 2, 2.999, 3, Number.NEGATIVE_INFINITY)
    fails(true, ty, 3.00001, 4, 5, 6, Number.POSITIVE_INFINITY, Number.NaN)

    // double-limit
    ty = V.NUM().min(0).max(10)
    passes(true, ty, 0, 1, 2, 2.999, 10)
    fails(true, ty, -Number.EPSILON, 10.001, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NaN)
})

test('smart string', () => {
    let ty = V.STR()
    T.eq(ty.description, "string")
    T.eq(ty.canBeUndefined, false)
    T.eq(ty.keys, undefined)
    T.eq(ty.visit(TestVisitor.SINGLETON, "foo"), "s:foo")
    T.eq(ty.isOfType(0), false)
    T.eq(ty.isOfType(null), false)
    T.eq(ty.isOfType(undefined), false)
    T.eq(ty.isOfType([]), false)

    // strict
    passes(true, ty, "", "a", "foo bar", "foo\nbar")
    fails(true, ty, undefined, null, false, true, 0, 1, -1, 123.4, -567.68, Number.EPSILON, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NaN, [], [1], [2, 1], [3, "a", 1], {}, { a: 1 }, { b: 2, a: 1 })
    T.be(ty.input("\n"), "\n")

    // not strict
    passes(true, ty, "", "a", "foo bar", "foo\nbar")
    T.be(ty.input(undefined, false), "undefined")
    T.be(ty.input(null, false), "null")
    T.be(ty.input(false, false), "false")
    T.be(ty.input(true, false), "true")
    T.be(ty.input(0, false), "0")
    T.be(ty.input(-12.34, false), "-12.34")
    T.be(ty.input(Number.POSITIVE_INFINITY, false), "Infinity")
    T.be(ty.input(Number.NEGATIVE_INFINITY, false), "-Infinity")
    T.be(ty.input(Number.NaN, false), "NaN")

    // trim
    ty = V.STR().trim()
    T.eq(ty.input(""), "")
    T.eq(ty.input("foo"), "foo")
    T.eq(ty.input("foo "), "foo")
    T.eq(ty.input(" foo"), "foo")
    T.eq(ty.input(" foo "), "foo")
    T.eq(ty.input("\tfoo\r\n"), "foo")
    T.eq(ty.input("\t\r\n"), "")

    // minimum length
    ty = V.STR().minLen(5)
    passes(true, ty, "seven", "eighty")
    fails(true, ty, "", "1", "12", "two", "four")

    // regex match
    ty = V.STR().match(/[a-zA-Z]+[0-9]+$/)
    passes(true, ty, "foo1", "bar321", "taco/good123")
    fails(true, ty, "foo", "321bar", "taco123/good")

    // regex replace; don't care if missing
    ty = V.STR().replace(/([a-zA-Z]+)([0-9]+)$/g, '$2$1')
    T.eq(ty.input("foo"), "foo")
    T.eq(ty.input("12foo"), "12foo")
    T.eq(ty.input("foo12"), "12foo")
    ty = V.STR().replace(/([a-zA-Z]+)([0-9]+)$/g, (_, pre, dig) => pre + (parseInt(dig) * 2))
    T.eq(ty.input("foo"), "foo")
    T.eq(ty.input("foo12"), "foo24")
    T.eq(ty.input("12foo"), "12foo")
    T.eq(ty.input("12foo12"), "12foo24")

    // regex replace; do care if missing
    ty = V.STR().replace(/([a-zA-Z]+)([0-9]+)$/g, (_, pre, dig) => pre + (parseInt(dig) * 2), true)
    T.throws(() => ty.input("foo"), V.ValidationError)
    T.eq(ty.input("foo12"), "foo24")
    T.throws(() => ty.input("12foo"), V.ValidationError)
    T.eq(ty.input("12foo12"), "12foo24")
    T.eq(ty.input("foo0"), "foo0", "string wasn't changed, but also the pattern wasn't missing")

    // JSON
    ty = V.STR()
    toFromJSON(ty, "123", "123")
    T.throws(() => ty.toJSON(2 as any))
    T.eq(ty.toSimplified("123"), "123")
})

test('string regex transform', () => {
    const ty = V.STR().transformByRegex(
        /(\d+)\s+(\w+)/,
        V.OBJ({ noun: V.STR(), count: V.NUM() }),
        m => ({ noun: m[2], count: parseInt(m[1]) })
    )
    T.eq(ty.description, "string>>/(\\d+)\\s+(\\w+)/>>{noun:string,count:number}")
    T.eq(ty.canBeUndefined, false)
    T.eq(ty.keys, new Set(["noun", "count"]))

    T.throws(() => ty.input(""))
    T.throws(() => ty.input("crows 13"))
    T.eq(ty.input("13 crows"), { noun: "crows", count: 13 })
    T.eq(ty.input("there are 12 crows."), { noun: "crows", count: 12 })

    // JSON is only about the final result, after transformation
    toFromJSON(ty, { noun: "crows", count: 13 }, { noun: "crows", count: 13 })
})

test('smart array', () => {
    let ty = V.ARRAY(V.NUM())
    T.eq(ty.description, "number[]")
    T.eq(ty.canBeUndefined, false)
    T.eq(ty.keys, undefined)
    T.eq(ty.visit(TestVisitor.SINGLETON, [1, 2, 3]), "[n:1,n:2,n:3]")
    T.eq(ty.isOfType(undefined), false)
    T.eq(ty.isOfType(null), false)
    T.eq(ty.isOfType(""), false)
    T.eq(ty.isOfType(new Date()), false)
    T.eq(ty.isOfType(["foo"]), true, "we're not checking inside the array")
    T.eq(ty.isOfType(["foo", null]), true, "we're not checking inside the array")
    T.eq(ty.isOfType(["foo"], true), false)
    T.eq(ty.isOfType(["foo", null], true), false)
    T.eq(ty.isOfType([0], true), true)
    T.eq(ty.isOfType([0, 2, "foo", 3], true), false)

    // strict
    passes(true, ty, [], [1], [2, 1])
    fails(true, ty, undefined, null, false, true, 0, 1, -1, 123.4, -567.68, Number.EPSILON, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NaN, "", "a", "foo bar", "0", "123", "12bar", [3, "a", 1], {}, { a: 1 }, { b: 2, a: 1 })

    // not strict
    passes(true, ty, [], [1], [2, 1])
    fails(true, ty, undefined, null, false, true, 0, 1, -1, 123.4, -567.68, Number.EPSILON, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NaN, "", "a", "foo bar", "0", "123", "12bar", [3, "a", 1], {}, { a: 1 }, { b: 2, a: 1 })
    T.eq(ty.input([12, "34", true], false), [12, 34, 1])

    // min length
    ty = V.ARRAY(V.NUM()).minLen(3)
    passes(true, ty, [1, 2, 3], [4, 3, 2, -1])
    fails(true, ty, [], [1], [2, 1])

    // JSON
    ty = V.ARRAY(V.NUM())
    toFromJSON(ty, [], [])
    toFromJSON(ty, [1, 2, 3], [1, 2, 3])
    toFromJSON(ty, [1, Number.NaN, 3], [1, "NaN", 3])
    T.eq(ty.toSimplified([1, 2, 3]), [1, 2, 3])

    // JSON after transformation
    ty = V.ARRAY(V.NUM()).minLen(3)
    toFromJSON(ty, [1, 2, 3], [1, 2, 3])
})

test('smart tuple x2', () => {
    let ty = V.TUPLE(V.NUM(), V.STR())
    T.eq(ty.description, "[number,string]")
    T.eq(ty.canBeUndefined, false)
    T.eq(ty.keys, new Set(["0", "1"]))
    T.eq(ty.visit(TestVisitor.SINGLETON, [123, "foo"]), "[n:123,s:foo]")
    T.eq(ty.isOfType(undefined), false)
    T.eq(ty.isOfType(null), false)
    T.eq(ty.isOfType(""), false)
    T.eq(ty.isOfType(new Date()), false)
    T.eq(ty.isOfType([]), false)
    T.eq(ty.isOfType([null]), false)
    T.eq(ty.isOfType([null, null, null]), false)
    T.eq(ty.isOfType([null, null]), true, "not really because of the inners, but we only check the outer level")
    T.eq(ty.isOfType([null, null], true), false)
    T.eq(ty.isOfType([0, null], true), false)
    T.eq(ty.isOfType([null, "hi"], true), false)
    T.eq(ty.isOfType([0, "hi"], true), true)

    // strict
    passes(true, ty, [123, "foo"], [321, "123"])
    fails(true, ty, undefined, null, false, true, 0, 1, -1, 123.4, -567.68, Number.EPSILON, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NaN, "", "a", "foo bar", "0", "123", "12bar", [], [1], [2, 1], [3, "a", 1], {}, { a: 1 }, { b: 2, a: 1 }, [321, "123", 0], ["123", 123])
    T.eq(ty.input([123, "123"]), [123, "123"])

    // not strict
    T.eq(ty.input([123, 123], false), [123, "123"])
    T.eq(ty.input(["123", "123"], false), [123, "123"])

    // JSON
    toFromJSON(ty, [123, "123"], [123, "123"])
    T.throws(() => ty.fromJSON([123, 123] as any))
    T.throws(() => ty.fromJSON(["123", "123"] as any))
    T.throws(() => ty.fromJSON({} as any))
    T.throws(() => ty.fromJSON(true as any))
    T.eq(ty.toSimplified([1, "a"]), [1, "a"])
    T.eq(ty.toSimplified(undefined), "[number,string]")

    // Errors
    failsWithErrorRegex(ty, [123, 123], /1.*string.*123/)
})

test('smart tuple x3', () => {
    let ty = V.TUPLE(V.NUM(), V.STR(), V.BOOL())
    T.eq(ty.description, "[number,string,boolean]")
    T.eq(ty.canBeUndefined, false)
    T.eq(ty.keys, new Set(["0", "1", "2"]))
    T.eq(ty.visit(TestVisitor.SINGLETON, [123, "foo", false]), "[n:123,s:foo,b:false]")

    // strict
    passes(true, ty, [123, "foo", true], [321, "123", false])
    fails(true, ty, undefined, null, false, true, 0, 1, -1, 123.4, -567.68, Number.EPSILON, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NaN, "", "a", "foo bar", "0", "123", "12bar", [], [1], [2, 1], [3, "a", 1], {}, { a: 1 }, { b: 2, a: 1 }, [321, "123", 0], ["123", 123], [321, "123", 0], ["123", 123, true], [321, "123", true, true])

    // not strict
    T.eq(ty.input([123, 123, 1], false), [123, "123", true])
    T.eq(ty.input(["123", "123", 0], false), [123, "123", false])

    // JSON
    toFromJSON(ty, [123, "123", false], [123, "123", false])
    T.throws(() => ty.fromJSON([123, 123] as any))
    T.throws(() => ty.fromJSON(["123", "123"] as any))
    T.throws(() => ty.fromJSON({} as any))
    T.throws(() => ty.fromJSON(true as any))
})

test('transform', () => {
    const cssType = V.OBJ({
        left: V.NUM(),
        top: V.NUM(),
        right: V.NUM(),
        bottom: V.NUM(),
    })
    const ty = V.STR().minLen(4).transform("css quad", cssType, (s: string) => {
        const m = s.match(/^\s*([\d\.-]+)\s+([\d\.-]+)\s+([\d\.-]+)\s+([\d\.-]+)/)
        if (!m) throw new V.ValidationError(cssType, s, "Didn't match regex")
        return {
            top: parseFloat(m[1]),
            right: parseFloat(m[2]),
            bottom: parseFloat(m[3]),
            left: parseFloat(m[4]),
        }
    })
    T.eq(ty.description, "string>>minLen=4>>css quad>>{left:number,top:number,right:number,bottom:number}")
    T.eq(ty.canBeUndefined, false)
    T.eq(ty.keys, new Set(["left", "top", "right", "bottom"]))
    T.eq(ty.isOfType({}), true, "not checking inside")
    T.eq(ty.isOfType({ left: null }), true, "not checking inside")
    T.eq(ty.isOfType({ foo: null }), true, "not checking inside")
    T.eq(ty.isOfType({ foo: null }, true), false)
    T.eq(ty.isOfType({ left: null }, true), false)
    T.eq(ty.isOfType({ left: 0 }, true), false)
    T.eq(ty.isOfType({ left: 0, top: 1, right: 2, bottom: "hi" }, true), false)
    T.eq(ty.isOfType({ left: 0, top: 1, right: 2, bottom: 4 }, true), true)

    T.eq(ty.input("1 2 3 4"), { left: 4, top: 1, right: 2, bottom: 3 })
    T.eq(ty.input("12 2.6 -3 4"), { left: 4, top: 12, right: 2.6, bottom: -3 })
    T.eq(ty.input("12 2.6 -3 4 !important"), { left: 4, top: 12, right: 2.6, bottom: -3 })

    T.throws(() => ty.input(undefined))
    T.throws(() => ty.input(""))
    T.throws(() => ty.input("this is long enough but does not match"))
    T.throws(() => ty.input("1 2 3 nope 4"))

    toFromJSON(ty, { left: 4, top: 12, right: 2.6, bottom: -3 }, { left: 4, top: 12, right: 2.6, bottom: -3 })
})