import * as T from "./testutil"
import { passes, fails, toFromJSON, TestVisitor } from "./moreutil"
import { MAP } from "../src/map"
import { SET } from "../src/set"
import { NUM } from "../src/number"
import { BOOL } from "../src/boolean"
import { STR } from "../src/string"
import { simplify } from "@asmartbear/simplified"

test("set", () => {
    const ty = SET(NUM())
    T.eq(ty.description, "Set(number)")
    T.eq(ty.canBeUndefined, false)
    T.eq(ty.keys, undefined)
    T.eq(ty.visit(TestVisitor.SINGLETON, new Set([2, 1])), "[n:1,n:2]", "elements got sorted along the way")
    T.eq(ty.toSimplified(new Set([2, 1])), simplify(new Set([2, 1])))
    T.eq(ty.isOfType({}), false)
    T.eq(ty.isOfType([]), false)
    T.eq(ty.isOfType(new Set(["str"])), true, "not checking inside")
    T.eq(ty.isOfType(new Set(["str"]), true), false)
    T.eq(ty.isOfType(new Set([1]), true), true)
    T.eq(ty.isOfType(new Set([]), true), true)

    passes(true, ty, new Set([]), new Set([1]), new Set([1, 2, 3]))
    fails(true, ty, undefined, null, false, true, 0, -2, "", "foo", "new Map", new Set(["hi"]), new Map([["0", ""]]), new Map([["123", "abc"], ["0", ""]]))

    // Array conversion, even if strict
    T.eq(ty.input([]), new Set([]))
    T.eq(ty.input([1, 2, 3]), new Set([1, 2, 3]))

    // Type conversion only if not-strict
    T.throws(() => ty.input(new Set(["123", "456"])))
    T.throws(() => ty.input(["123", "456"]))
    T.eq(ty.input(new Set(["123", "456"]), false), new Set([123, 456]))
    T.eq(ty.input(["123", "456"], false), new Set([123, 456]))

    toFromJSON(ty, new Set([]), [])
    toFromJSON(ty, new Set([1]), [1])
    toFromJSON(ty, new Set([1, 2, 3]), [1, 2, 3])

    T.throws(() => ty.fromJSON({}))
    T.throws(() => ty.fromJSON(false))
    T.throws(() => ty.fromJSON(["taco"]))
    T.throws(() => ty.fromJSON([[]]))
    T.throws(() => ty.fromJSON([[123]]))
    T.throws(() => ty.fromJSON([[123, "abc", "more"]]), undefined, "too many")
    T.throws(() => ty.fromJSON([[123, 123]]), undefined, "wrong type")
})

test("map from map", () => {
    const ty = MAP(NUM(), STR())
    T.eq(ty.description, "{number:string}")
    T.eq(ty.canBeUndefined, false)
    T.eq(ty.keys, undefined)
    T.eq(ty.visit(TestVisitor.SINGLETON, new Map([[2, "b"], [1, "a"]])), "[[n:1,s:a],[n:2,s:b]]", "elements got sorted along the way")
    T.eq(ty.toSimplified(new Map([[2, "b"], [1, "a"]])), [[1, "a"], [2, "b"]])
    T.eq(ty.isOfType({}), false)
    T.eq(ty.isOfType([]), false)
    T.eq(ty.isOfType(["foo"]), false)
    T.eq(ty.isOfType(new Map([[null, null]])), true, "not checking types inside")
    T.eq(ty.isOfType(new Map([[null, null]]), true), false)
    T.eq(ty.isOfType(new Map([[0, null]]), true), false)
    T.eq(ty.isOfType(new Map([[null, "foo"]]), true), false)
    T.eq(ty.isOfType(new Map([[0, "foo"]]), true), true)

    passes(true, ty, new Map([]), new Map([[0, ""]]), new Map([[123, "abc"], [0, ""]]))
    fails(true, ty, undefined, null, false, true, 0, -2, "", "foo", "new Map", [], [1, 2, 3], new Map([["0", ""]]), new Map([["123", "abc"], ["0", ""]]))

    // Type conversion only if not-strict
    T.throws(() => ty.input(new Map([["123", "abc"], ["0", ""]])))
    T.eq(ty.input(new Map([["123", "abc"], ["0", ""]]), false), new Map([[123, "abc"], [0, ""]]))

    toFromJSON(ty, new Map([]), [])
    toFromJSON(ty, new Map([[1, "a"]]), [[1, "a"]])
    toFromJSON(ty, new Map([[1, "a"], [2, "b"]]), [[1, "a"], [2, "b"]])
    toFromJSON(ty, new Map([[Number.POSITIVE_INFINITY, "a"], [Number.NaN, "b"]]), [["Inf", "a"], ["NaN", "b"]])

    T.throws(() => ty.fromJSON({}))
    T.throws(() => ty.fromJSON(false))
    T.throws(() => ty.fromJSON(["taco"]))
    T.throws(() => ty.fromJSON([[]]))
    T.throws(() => ty.fromJSON([[123]]))
    T.throws(() => ty.fromJSON([[123, "abc", "more"]]), undefined, "too many")
    T.throws(() => ty.fromJSON([[123, 123]]), undefined, "wrong type")
})

test("map from object, even if strict", () => {
    const ty = MAP(STR(), BOOL())
    T.eq(ty.keys, undefined)
    T.eq(ty.toSimplified(new Map([["a", false], ["b", true]])), [["a", false], ["b", true]])

    T.eq(ty.input({}), new Map())
    T.eq(ty.input({ a: false }), new Map([["a", false]]))
    T.eq(ty.input({ a: false, b: true }), new Map([["a", false], ["b", true]]))
    T.eq(ty.input({ a: false, b: true, 0: false }), new Map([["0", false], ["a", false], ["b", true]]), "javascript converted it to a string")

    T.throws(() => ty.input([]))
    T.throws(() => ty.input([true]))
    T.throws(() => ty.input({ a: true, b: "taco" }))

    // Type conversion only if not-strict
    T.throws(() => ty.input({ 0: "true" }))
    T.eq(ty.input({ 0: "true" }, false), new Map([["0", true]]))
})
