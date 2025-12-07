import * as V from "../src/string"
import * as T from "./testutil"

test("NONEMPTYSTR", () => {
    const ty = V.NONEMPTYSTR()
    T.eq(ty.input("a"), "a")
    T.throws(() => ty.input(""))
})

test("URL", () => {
    const ty = V.URL()
    T.eq(ty.input("https://google.com"), "https://google.com")
    T.eq(ty.input("http://google.com"), "http://google.com")
    T.throws(() => ty.input("//google.com"))
    T.throws(() => ty.input("google.com"))
    T.throws(() => ty.input(""))
})

test("JSID", () => {
    const ty = V.JSID()
    T.eq(ty.input("abc"), "abc")
    T.eq(ty.input("a10"), "a10")
    T.eq(ty.input("_a10"), "_a10")
    T.throws(() => ty.input(""))
    T.throws(() => ty.input("0"))
    T.throws(() => ty.input("0a"))
    T.throws(() => ty.input("-a"))
    T.throws(() => ty.input("a-b"))
})

test("WEBID", () => {
    const ty = V.WEBID()
    T.eq(ty.input("abc"), "abc")
    T.eq(ty.input("a10"), "a10")
    T.eq(ty.input("a-b"), "a-b")
    T.eq(ty.input("a-b10"), "a-b10")
    T.throws(() => ty.input(""))
    T.throws(() => ty.input("0"))
    T.throws(() => ty.input("0a"))
    T.throws(() => ty.input("-a"))
    T.throws(() => ty.input("_ab"))
})