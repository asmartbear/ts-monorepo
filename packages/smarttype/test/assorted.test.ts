import * as T from "./testutil"
import * as V from "../src/index"
import { passes, fails, toFromJSON, TestVisitor } from "./moreutil"
import { JS_UNDEFINED_SIGNAL } from "../src/undef"
import { simplifyOpaqueType } from "@asmartbear/simplified"

test('smart literal primative', () => {
    let ty = V.LITERAL("none", "left", "right", "both")
    T.eq(ty.description, "(both|left|none|right)")
    T.eq(ty.canBeUndefined, false)
    T.eq(ty.keys, undefined)
    T.eq(ty.visit(TestVisitor.SINGLETON, "left"), "s:left")

    // strict
    T.eq(ty.input("none"), "none")
    passes(true, ty, "none", "left", "right", "both")
    fails(true, ty, undefined, null, false, true, 0, 1, -1, 123.4, -567.68, Number.EPSILON, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NaN, "", "a", "foo bar", "0", "123", "12bar", " both", "none.", "non", [], [1], [2, 1], [3, "a", 1], {}, { a: 1 }, { b: 2, a: 1 }, [321, "123", 0], ["123", 123], [321, "123", 0], ["123", 123, true], [321, "123", true, true], { x: "foo", s: "bar", b: false })
    T.eq(ty.isOfType("taco"), false)
    T.eq(ty.isOfType(""), false)
    T.eq(ty.isOfType(123), false)

    // JSON
    toFromJSON(ty, "none", "none")
    toFromJSON(ty, "both", "both")
})

test('smart literal with every type', () => {
    let ty = V.LITERAL<"none" | 0 | "" | null | false>("none", 0, "", null, false)
    T.eq(ty.description, "(|0|false|none|null)")
    T.eq(ty.canBeUndefined, false)
    T.eq(ty.keys, undefined)
    T.eq(ty.visit(TestVisitor.SINGLETON, 0), "n:0")
    T.eq(ty.visit(TestVisitor.SINGLETON, ""), "s:")
    T.eq(ty.visit(TestVisitor.SINGLETON, null), "null")
    T.eq(ty.visit(TestVisitor.SINGLETON, false), "b:false")
    T.eq(ty.toSimplified(0), 0)
    T.eq(ty.toSimplified(null), null)
    T.eq(ty.toSimplified("none"), "none")
    T.eq(ty.isOfType(0), true)
    T.eq(ty.isOfType("0"), false)
    T.eq(ty.isOfType("none"), true)
    T.eq(ty.isOfType("some"), false)
    T.eq(ty.isOfType(undefined), false)
    T.eq(ty.isOfType(null), true)
})

test('smart optional without being embedded in an object', () => {
    let ty = V.OPT(V.NUM())
    T.eq(ty.description, "number?")
    T.eq(ty.canBeUndefined, true)
    T.eq(ty.keys, undefined)
    T.eq(ty.visit(TestVisitor.SINGLETON, 123), "n:123")
    T.eq(ty.visit(TestVisitor.SINGLETON, undefined), "undefined")

    // strict
    passes(true, ty, undefined, 0, 1, -1, 123.4, -567.68, Number.EPSILON, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NaN)
    fails(true, ty, null, false, true, "", "a", "foo bar", "0", "123", "12bar", [], [1], [2, 1], [3, "a", 1], {}, { a: 1 }, { b: 2, a: 1 })
    T.eq(ty.isOfType(undefined), true)
    T.eq(ty.isOfType(0), true)
    T.eq(ty.isOfType(123), true)
    T.eq(ty.isOfType("123"), false)
    T.eq(ty.isOfType(null), false)

    // not strict
    T.eq(ty.input(123), 123)
    T.eq(ty.input(123, false), 123)
    T.eq(ty.input("123", false), 123)
    T.eq(ty.input(undefined), undefined)
    T.eq(ty.input(undefined, false), undefined)

    // JSON
    toFromJSON(ty, 123, 123)
    toFromJSON(ty, undefined, JS_UNDEFINED_SIGNAL)
})

test('smart or with primatives', () => {
    let ty = V.OR(V.NUM(), V.STR())
    T.eq(ty.description, "(number|string)")
    T.eq(ty.canBeUndefined, false)
    T.eq(ty.keys, undefined)
    T.eq(ty.visit(TestVisitor.SINGLETON, 123), "n:123")
    T.eq(ty.visit(TestVisitor.SINGLETON, "123"), "s:123")
    T.throws(() => ty.visit(TestVisitor.SINGLETON, null as any))
    T.eq(ty.toSimplified(123), 123)
    T.eq(ty.toSimplified("123"), "123")
    T.eq(ty.isOfType(0), true)
    T.eq(ty.isOfType(1), true)
    T.eq(ty.isOfType(""), true)
    T.eq(ty.isOfType("foo"), true)
    T.eq(ty.isOfType(true), false)
    T.eq(ty.isOfType(undefined), false)
    T.eq(ty.isOfType(new Date()), false)

    // strict
    passes(true, ty, 0, 1, -1, 123.4, -567.68, Number.EPSILON, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NaN, "", "a", "foo bar", "0", "123", "12bar")
    fails(true, ty, undefined, null, false, true, [], [1], [2, 1], [3, "a", 1], {}, { a: 1 }, { b: 2, a: 1 })

    // not strict
    T.eq(ty.input(123), 123)
    T.eq(ty.input(123, false), 123)
    T.eq(ty.input("123", false), 123, "number comes first, so it wins when not strict")
    T.eq(ty.input(true, false), 1, "number comes first, so it wins when not strict")        // number comes first, so it wins when not strict
    T.eq(ty.input(null, false), "null", "string wins if number fails")

    // JSON
    toFromJSON(ty, 123, { t: "number", x: 123 })
    toFromJSON(ty, "123", { t: "string", x: "123" })
    T.throws(() => ty.fromJSON(123 as any))
    T.throws(() => ty.fromJSON({} as any))
    T.throws(() => ty.fromJSON({ t: "foo", x: 123 }))
    T.throws(() => ty.toJSON(true as any))
    T.eq(ty.toSimplified(123), 123)
    T.eq(ty.toSimplified("123"), "123")
})

class MyObjA { }
class MyObjB extends MyObjA { }

test('smart class', () => {
    const a = new MyObjA()
    const b = new MyObjB()
    let ty = V.CLASS(MyObjA)
    T.eq(ty.description, "MyObjA")
    T.eq(ty.canBeUndefined, false)
    T.eq(ty.keys, undefined)
    T.eq(ty.visit(TestVisitor.SINGLETON, a), "MyObjA()")
    T.eq(ty.visit(TestVisitor.SINGLETON, b), "MyObjB()")
    T.eq(ty.toSimplified(b), "MyObjB()")
    T.eq(ty.isOfType(null), false)
    T.eq(ty.isOfType(0), false)
    T.eq(ty.isOfType({}), false)
    T.eq(ty.isOfType(new Date()), false)
    T.eq(ty.isOfType(MyObjA), false, "the class object rather than an instance")

    // validate
    passes(true, ty, a, b)
    fails(true, ty, undefined, null, false, true, 0, 1, -1, 123.4, -567.68, Number.EPSILON, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NaN, "", "a", "foo bar", "0", "123", "12bar", [], [1], [2, 1], [3, "a", 1], {}, { a: 1 }, { b: 2, a: 1 }, [321, "123", 0], ["123", 123], [321, "123", 0], ["123", 123, true], [321, "123", true, true], { x: "foo", s: "bar", b: false }, new Date(123456789))

    T.throws(() => ty.toJSON(a))
    T.throws(() => ty.fromJSON(null))
})

test('smart date', () => {
    let ty = V.DATE()
    T.eq(ty.description, "date")
    T.eq(ty.canBeUndefined, false)
    T.eq(ty.keys, undefined)
    T.eq(ty.visit(TestVisitor.SINGLETON, new Date(1234)), "Date()")
    T.eq(ty.toSimplified(new Date(1234)), "Date(1234)")
    T.eq(ty.isOfType(null), false)
    T.eq(ty.isOfType(/foo/), false)
    T.eq(ty.isOfType(new Date()), true)

    // strict
    passes(true, ty, new Date(123456789))
    fails(true, ty, undefined, null, false, true, 0, 1, -1, 123.4, -567.68, Number.EPSILON, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NaN, "", "a", "foo bar", "0", "123", "12bar", [], [1], [2, 1], [3, "a", 1], {}, { a: 1 }, { b: 2, a: 1 }, [321, "123", 0], ["123", 123], [321, "123", 0], ["123", 123, true], [321, "123", true, true], { x: "foo", s: "bar", b: false })

    // parsing common date strings
    T.eq(ty.input("2025-11-14"), new Date(Date.UTC(2025, 11 - 1, 14)))
    T.eq(ty.input("2025-11-14 12:34:56+00"), new Date(Date.UTC(2025, 11 - 1, 14, 12, 34, 56)))
    T.eq(ty.input("2025-11-14T12:34:56+0000"), new Date(Date.UTC(2025, 11 - 1, 14, 12, 34, 56)))
    T.eq(ty.input("2025-11-14T12:34:56Z"), new Date(Date.UTC(2025, 11 - 1, 14, 12, 34, 56)))
    T.throws(() => ty.input("12:34:56+00"))
    T.eq(simplifyOpaqueType(ty.inputReturnError("12:34:56+00")), "Invalid Date string but got string: 12:34:56+00")

    // JSON
    toFromJSON(ty, new Date(1234567890), 1234567890)
})

test('smart regexp', () => {
    let ty = V.REGEXP()
    T.eq(ty.description, "regexp")
    T.eq(ty.canBeUndefined, false)
    T.eq(ty.keys, undefined)
    T.eq(ty.visit(TestVisitor.SINGLETON, /foo/gi), "RegExp()")
    T.eq(ty.toSimplified(/foo/gi), "/foo/gi")
    T.eq(ty.isOfType(null), false)
    T.eq(ty.isOfType(new Date()), false)

    // strict
    passes(true, ty, /foo/gi)
    fails(true, ty, undefined, null, false, true, 0, 1, -1, 123.4, -567.68, Number.EPSILON, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NaN, "", [], [1], [2, 1], [3, "a", 1], {}, { a: 1 }, { b: 2, a: 1 }, [321, "123", 0], ["123", 123], [321, "123", 0], ["123", 123, true], [321, "123", true, true], { x: "foo", s: "bar", b: false }, new Date(123456789))

    // parsing regexp from strings - either it's a static string, or it's a regex if it has the right form with slashes.
    T.eq(ty.input("foo"), /foo/)
    T.eq(ty.input("foo/bar"), /foo\/bar/)
    T.eq(ty.input("/bar/m"), /bar/m)
    T.eq(ty.input("/bar/gi"), /bar/gi)
    T.throws(() => ty.input("taco\\"))
    T.eq(simplifyOpaqueType(ty.inputReturnError("taco\\")), "SyntaxError: Invalid regular expression: /taco\\/: \\ at end of pattern but got string: taco\\")

    // JSON
    toFromJSON(ty, /foo/gi, "/foo/gi")
})