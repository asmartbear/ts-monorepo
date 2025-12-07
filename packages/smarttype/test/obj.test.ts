import * as T from "./testutil"
import * as V from "../src/index"
import { passes, fails, toFromJSON, failsWithErrorRegex, TestVisitor } from "./moreutil"
import { simplify } from "@asmartbear/simplified"

test('smart fields', () => {
    let ty = V.OBJ({
        x: V.NUM(),
        s: V.STR(),
        b: V.BOOL(),
    })
    T.eq(ty.description, "{x:number,s:string,b:boolean}")
    T.eq(ty.canBeUndefined, false)
    T.eq(ty.keys, new Set(["x", "s", "b"]))
    T.eq(ty.visit(TestVisitor.SINGLETON, { x: 1, s: "hi", b: false }), "[[s:x,n:1],[s:s,s:hi],[s:b,b:false]]")
    T.eq(ty.toSimplified({ x: 1, s: "hi", b: false }), simplify({ x: 1, s: "hi", b: false }))
    T.eq(ty.isOfType({}), true, "not checking inside")
    T.eq(ty.isOfType({}, true), false)
    T.eq(ty.isOfType({ s: "foo", b: false }, true), false)
    T.eq(ty.isOfType({ x: "foo", s: "foo", b: false }, true), false)
    T.eq(ty.isOfType({ x: 3, s: "foo", b: false }, true), true)
    T.eq(ty.isOfType({ x: 3, s: "foo", b: false, extra: "yup" }, true), true, "extra fields are still the right type")

    // strict
    passes(true, ty, { x: 0, s: "", b: false }, { x: 123, s: "cool", b: true })
    fails(true, ty, undefined, null, false, true, 0, 1, -1, 123.4, -567.68, Number.EPSILON, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NaN, "", "a", "foo bar", "0", "123", "12bar", [], [1], [2, 1], [3, "a", 1], {}, { a: 1 }, { b: 2, a: 1 }, [321, "123", 0], ["123", 123], [321, "123", 0], ["123", 123, true], [321, "123", true, true], { x: "foo", s: "bar", b: false })
    T.eq(ty.input({ x: 123, s: "cool", b: true }), { x: 123, s: "cool", b: true })

    // not strict
    T.eq(ty.input({ x: "123", s: "123", b: "123" }, false), { x: 123, s: "123", b: true })
    T.eq(ty.input({ x: 123, s: 123, b: 123 }, false), { x: 123, s: "123", b: true })

    // JSON
    toFromJSON(ty, { x: 123, s: "cool", b: true }, { x: 123, s: "cool", b: true })
})

test('smart fields with defaults', () => {
    let ty = V.OBJ({
        x: V.NUM().def(123),
        s: V.STR().def("hi").replace(/hi/g, "there"),
        b: V.BOOL().def(false),
    })
    T.eq(ty.description, "{x:number=123,s:string=hi>>re=/hi/g->there,b:boolean=false}")
    T.eq(ty.canBeUndefined, false)
    T.eq(ty.keys, new Set(["x", "s", "b"]))
    T.eq(ty.toSimplified({ x: 123, s: "there", b: true }), simplify({ x: 123, s: "there", b: true }))

    T.eq(ty.input({}), { x: 123, s: "hi", b: false }, "default means we don't run the replacement")
    T.eq(ty.input({ s: "taco" }), { x: 123, s: "taco", b: false }, "replacement didn't match")
    T.eq(ty.input({ s: "and hi" }), { x: 123, s: "and there", b: false }, "replacement when no default")
    T.eq(ty.input({ b: true, s: "there" }), { x: 123, s: "there", b: true })
    T.eq(ty.input({ x: undefined, s: undefined, b: undefined }), { x: 123, s: "hi", b: false }, "explicit undefined instead of missing")

    T.eq(ty.toHash(ty.input({})), "6699494d73460ec8215aa9a29e152c71", "the exact value doesn't matter")
})

test('smart fields with optional fields', () => {
    let ty = V.OBJ({
        x: V.OPT(V.NUM()),
        s: V.OPT(V.OPT(V.STR())),     // the second one is ignored
        b: V.BOOL(),
    })
    T.eq(ty.description, "{x:number?,s:string?,b:boolean}")
    T.eq(ty.canBeUndefined, false)
    T.eq(ty.keys, new Set(["x", "s", "b"]))
    T.eq(ty.visit(TestVisitor.SINGLETON, { x: 1, b: false }), "[[s:x,n:1],[s:b,b:false]]")
    T.eq(ty.isOfType({}, true), false)
    T.eq(ty.isOfType({ b: true }, true), true)
    T.eq(ty.isOfType({ s: "foo", b: true }, true), true)
    T.eq(ty.isOfType({ s: 123, b: true }, true), false, "can be missing but not the wrong type")
    T.eq(ty.isOfType({ x: "foo", b: true }, true), false, "can be missing but not the wrong type")
    T.eq(ty.isOfType({ b: 0 }, true), false)
    T.eq(ty.isOfType(null), false)
    T.eq(ty.isOfType(undefined), false)
    T.eq(ty.isOfType("hi"), false)

    T.eq(ty.input({ b: true }), { b: true }, "can just be missing")
    T.eq(ty.input({ b: true }), { x: undefined, s: undefined, b: true }, "can be explicitly set to undefined")

    T.eq(ty.input({ s: "hello", b: true }), { s: "hello", b: true })
    toFromJSON(ty, { b: true }, { b: true })
    toFromJSON(ty, { s: "hi", b: true }, { s: "hi", b: true })
})

test('smart fields with null objects', () => {
    let ty = V.OBJ({
        dn: V.OR(V.DATE(), V.NIL()),
        du: V.OPT(V.DATE()),
    })
    T.eq(ty.description, "{dn:(date|null),du:date?}")
    T.eq(ty.canBeUndefined, false)
    T.eq(ty.keys, new Set(["dn", "du"]))
    T.eq(ty.toSimplified({ dn: new Date(1234), du: new Date(6789) }), { "dn": "Date(1234)", "du": "Date(6789)" })
    T.eq(ty.toSimplified({ dn: null }), { "dn": null, })

    T.eq(ty.input({ dn: new Date(1234), du: new Date(6789) }), { dn: new Date(1234), du: new Date(6789) })
    T.eq(ty.input({ dn: null, du: new Date(6789) }), { dn: null, du: new Date(6789) })
    T.eq(ty.input({ dn: null }), { dn: null })
    T.throws(() => ty.input({}))
    T.throws(() => ty.input({ du: null }))

    toFromJSON(ty, { dn: new Date(1234), du: new Date(6789) }, { dn: { t: "date", x: 1234 }, du: 6789 })
    toFromJSON(ty, { dn: new Date(1234) }, { dn: { t: "date", x: 1234 } })
})

test('smart fields made partial', () => {
    let ty = V.OBJ({
        x: V.NUM(),
        s: V.OPT(V.STR()),
        b: V.BOOL(),
    })
    T.eq(ty.description, "{x:number,s:string?,b:boolean}")
    T.eq(ty.canBeUndefined, false)
    T.eq(ty.keys, new Set(["x", "s", "b"]))
    T.eq(ty.toSimplified({ x: 1, b: true }), { x: 1, b: true })

    let opt = ty.partial()
    T.eq(opt.description, "{x:number?,s:string?,b:boolean?}")
    T.eq(opt.canBeUndefined, false, "the fields inside can be undefined, but the outer object is not")
    T.eq(opt.toSimplified({ b: true }), { b: true })

    T.eq(opt.input({ b: true }), { b: true })
    T.eq(opt.input({}), {})

    T.eq(opt.fromJSON({ x: undefined, s: "foo" }), { s: "foo" }, "explicitly undefined and tacitly")
})

test('smart fields with extra fields provided', () => {
    const allowExtra = V.OBJ({
        x: V.NUM(),
    }, { ignoreExtraFields: true })
    T.eq(allowExtra.input({ x: 123, y: 456 }), { x: 123 })
    T.eq(allowExtra.keys, new Set(["x"]))
    T.eq(allowExtra.visit(TestVisitor.SINGLETON, { x: 1 }), "[[s:x,n:1]]")

    const noExtra = V.OBJ({
        x: V.NUM(),
    }, { ignoreExtraFields: false })
    T.throws(() => noExtra.input({ x: 123, y: 456 }))
    T.eq(noExtra.keys, new Set(["x"]))
})

test('big image configuration object', () => {
    const ty = V.OBJ({
        alt: V.STR(),
        caption: V.STR(),
        lightenForPrint: V.BOOL(),
        floatWhenNarrow: V.BOOL(),
        width: V.OR(V.NUM(), V.LITERAL("bleed")),
        height: V.OR(V.NUM(), V.LITERAL("full", "page", "page-rotated")),
        size: V.LITERAL("decoration"),
        autocropEarly: V.BOOL(),
        autocropLast: V.BOOL(),
        border: V.STR().transformByRegex(
            /^(\d+)px\s+([\w+-]+)$/,
            V.OBJ({ color: V.STR().minLen(1), px: V.NUM().int().min(0) }),
            m => ({ color: m[2], px: parseInt(m[1]) })
        ),
        transparentColors: V.ARRAY(V.STR()),
        crop: V.OR(V.LITERAL("auto", "none"), V.STR()),
        credit: V.STR(),
        float: V.LITERAL("none", "left", "right", "inside", "outside", "top", "bottom", "nearest"),
        figure: V.WEBID(),
        box: V.BOOL(),
        brightness: V.NUM(),
        contrast: V.NUM(),
        sharpen: V.NUM().min(1),
        composeLight: V.BOOL(),
        grayscale: V.BOOL(),
        dpiMinimum: V.NUM().int().min(0),
        featured: V.OR(
            V.BOOL(),
            V.STR().transformByRegex(
                /^\s*([\d\.]+)\s+([\d\.]+)\s*([\d\.]+)?\s*$/,
                V.OBJ({ cx: V.NUM().min(-2).max(2), cy: V.NUM().min(-2).max(2), scale: V.OPT(V.NUM().min(0).max(100)) }),
                m => ({ cy: parseFloat(m[1]), cx: parseFloat(m[2]), scale: m[3] ? parseFloat(m[3]) : undefined })
            )
        ),
        showClickToEnlarge: V.BOOL(),
        keepSvg: V.BOOL(),
        chapterHead: V.BOOL(),
        comment: V.STR(),
        preset: V.LITERAL("none", "andertoon", "bear", "diagram-solid", "diagram-trans", "google-chart", "notability", "photo", "screenshot", "tweet"),
        background: V.LITERAL("solid", "transparent"),
        shape: V.LITERAL("figure", "framed", "cropped"),
        content: V.LITERAL("text", "lines", "splotches", "photo"),
        dark: V.LITERAL("none", "dim", "invert", "i180"),
        format: V.LITERAL("png", "jpg", "webp"),
        inPrint: V.BOOL(),
        decorationFloatWidthIn: V.NUM(),
        decorationInlineHeightIn: V.NUM(),
    }, { ignoreExtraFields: false }).partial();

    // Keys
    const keys = ty.keys
    T.defined(keys)
    T.eq(keys.size, 36)
    T.eq(keys.has("inPrint"), true)
    T.eq(keys.has("inprint"), false)

    // Validation and transformation
    T.eq(ty.input(
        { caption: "hi", figure: "my-picture", autocropEarly: true, width: 2.5, height: "full" }),
        { caption: "hi", figure: "my-picture", autocropEarly: true, width: 2.5, height: "full" }
    )
    T.eq(ty.input(
        { grayscale: true, transparentColors: ["white"], width: "bleed", height: 2, featured: "0.3 0.5" }),
        { grayscale: true, transparentColors: ["white"], width: "bleed", height: 2, featured: { cx: 0.5, cy: 0.3 } }
    )
    T.eq(ty.input(
        { crop: "auto", dark: "i180", border: "16px red", featured: "0.3 0.5 1.2" }),
        { crop: "auto", dark: "i180", border: { color: "red", px: 16 }, featured: { cx: 0.5, cy: 0.3, scale: 1.2 } }
    )
    T.throws(() => ty.input(
        { caption: "hi", figure: "-picture", autocropEarly: true, width: 2.5, height: "full" }),
    )
    T.throws(() => ty.input(
        { caption: "hi", figure: "my-picture", autocropEarly: true, width: 2.5, height: "another word" }),
    )
    T.throws(() => ty.input(
        { crop: "auto", dark: "i180", border: "16px red", featured: "10 0.5 1.2" }),
    )

    // Error messages being helpful
    failsWithErrorRegex(ty, { figure: "-picture" }, /.*\[figure\].+-picture/)
    failsWithErrorRegex(ty, { transparentColors: "white" }, /.*\[transparentColors\].+\bExpected string\[\].+\bstring\b.+\bwhite/)
    failsWithErrorRegex(ty, { transparentColors: ["white", 123] }, /.*\[transparentColors\.1\].+\bExpected string.+\bnumber\b.+123/)
    failsWithErrorRegex(ty, { featured: "10 0.5 1.2" }, /.*\[featured\].+\bExpected/)
    failsWithErrorRegex(ty, { taco: "good" }, /.*\[taco\].+\|comment\|.+\|format\|.+\|keepSvg\|.+\|width/)
    failsWithErrorRegex(ty, { format: 123 }, /.*\[format\].+jpg\|png\|webp/)
    failsWithErrorRegex(ty, { format: "taco" }, /.*\[format\].+jpg\|png\|webp/)
    failsWithErrorRegex(ty, { height: "taco" }, /.*number.+full.+taco/)
    failsWithErrorRegex(ty, { height: false }, /.*number.+full.+false/)
})