import * as T from '@asmartbear/testutil'
import { isWellFormed, between, ALPHABET, random, fromInteger, toInteger, fromString, next, getStarterForNext } from "../src";

// utility for smaller tests
function bt(lo: string, hi: string) {
    const x = between(lo, hi);
    expect(isWellFormed(x)).toStrictEqual(true);
    T.gt(x, lo)
    T.lt(x, hi)
    expect(1 <= x.length && x.length <= Math.max(lo.length, hi.length) + 1).toStrictEqual(true);       // don't make them too short, and shouldn't need to be longer than one more than the longest string
    expect(between(hi, lo)).toEqual(x);     // order doesn't matter
}

test("alphabet is ordered", () => {
    for (let k = 1; k < ALPHABET.length; ++k) {
        expect(ALPHABET.charCodeAt(k - 1)).toBeLessThan(ALPHABET.charCodeAt(k));
    }
});

test("can detect well-formed", () => {
    expect(isWellFormed(undefined)).toStrictEqual(false);
    expect(isWellFormed(null)).toStrictEqual(false);
    expect(isWellFormed(false)).toStrictEqual(false);
    expect(isWellFormed(true)).toStrictEqual(false);
    expect(isWellFormed(0)).toStrictEqual(false);
    expect(isWellFormed(1)).toStrictEqual(false);
    expect(isWellFormed(12345)).toStrictEqual(false);
    expect(isWellFormed(12.345)).toStrictEqual(false);
    expect(isWellFormed([])).toStrictEqual(false);
    expect(isWellFormed(['a'])).toStrictEqual(false);
    expect(isWellFormed({})).toStrictEqual(false);
    expect(isWellFormed({ a: "a" })).toStrictEqual(false);
    expect(isWellFormed("")).toStrictEqual(false);
    expect(isWellFormed("-")).toStrictEqual(false);
    expect(isWellFormed("_")).toStrictEqual(false);
    expect(isWellFormed("abc.def")).toStrictEqual(false);
    expect(isWellFormed("abc_def")).toStrictEqual(false);

    expect(isWellFormed("a")).toStrictEqual(true);
    expect(isWellFormed("abcd")).toStrictEqual(true);
    expect(isWellFormed("AB")).toStrictEqual(true);
    expect(isWellFormed("B")).toStrictEqual(true);
    expect(isWellFormed("a")).toStrictEqual(true);
    expect(isWellFormed("z")).toStrictEqual(true);
    expect(isWellFormed("pa")).toStrictEqual(true);

    expect(isWellFormed("A")).toStrictEqual(false);
    expect(isWellFormed("qA")).toStrictEqual(false);
    expect(isWellFormed("BBBBBA")).toStrictEqual(false);
});

test("between simple cases", () => {
    bt("b", "y");
    bt("p", "r");
    bt("p", "q");
    bt("p", "pb");
    bt("abc", "def");
    bt("abc", "abcd");
    bt("abc", "abce");
    bt("abc", "abcd");
    bt("zzzBz", "zzzCB");
    expect(() => between("_", "{")).toThrow();
});

test("between special cases", () => {
    expect(between("p", "pb")).toBe("pN");
    expect(between("p", "pB")).toBe("pAa");
    expect(between("pp", "ppb")).toBe("ppN");
    expect(between("pp", "ppB")).toBe("ppAa");
    expect(between("pp", "ppBC")).toBe("ppAB");
    expect(between("pp", "ppBB")).toBe("ppAAa");
    expect(between("pp", "ppAB")).toBe("ppAAa");
    expect(between("pp", "ppABABABAB")).toBe("ppAAAAAAAAa");
    expect(between("ppAAAAAAAAa", "ppAAAAAAAAaB")).toBe("ppAAAAAAAAaAa");
    expect(between("ppABABABAB", "ppAAAAAAAAa")).toBe("ppAAZ");
    expect(between("ABABABAB", "AAAAAAAAa")).toBe("AAZ");
    expect(between("Z", "a")).toBe("Za");            // this would fail if we were "averaging" charCodes directly, which once upon a time was how the algorithm worked
});

test("seek the next character in 'low' that can be updated", () => {
    expect(between("zzzB", "zzzCB")).toBe("zzzBa");
    expect(between("zzzBz", "zzzCB")).toBe("zzzBza");
    expect(between("zzzBzz", "zzzCB")).toBe("zzzBzza");
    expect(between("zzzBzy", "zzzCB")).toBe("zzzBzya");
    expect(between("zzzBzyz", "zzzCB")).toBe("zzzBzyza");
    expect(between("zzzBzyy", "zzzCB")).toBe("zzzBzyya");
    expect(between("zzzBzwz", "zzzCB")).toBe("zzzBzx");
});

// test("repeated executions of between() doesn't grow the string too much", () => {
//     const lo = "aaaaa";
//     let hi = "abcde";
//     const ITERATIONS = 100;
//     for ( let k = ITERATIONS ; --k >= 0 ; ) {
//         hi = between(lo,hi);
//         // console.log(lo,hi);
//     }
//     expect(hi.length).toBeLessThan( 8 );
// });

test("generates 'next' strings of varying intervals", () => {
    expect(next("PPP", 2)).toEqual("PPR");
    expect(next("PPP", 1)).toEqual("PPR");      // doesn't allow going below 2
    expect(next("PPP", 0)).toEqual("PPR");      // doesn't allow going below 2
    expect(next("PPP", -1)).toEqual("PPR");      // doesn't allow going below 2
    expect(next("PPP", 3)).toEqual("PPS");
    expect(next("PPP", 13)).toEqual("PPc");
    expect(next("PPP", 35)).toEqual("PPy");
    expect(next("PPP", 36)).toEqual("PQB");
    expect(next("PPP", 37)).toEqual("PQC");
    expect(next("PPP", 85)).toEqual("PQy");
    expect(next("PPP", 1750)).toEqual("PyP");
    expect(next("PPP", 1785)).toEqual("Pyy");
    expect(next("PPP", 1786)).toEqual("QBB");
    expect(next("PPP", 1787)).toEqual("QBC");
    expect(next("PPP", 4287)).toEqual("RBC");
    expect(next("PPP", 86787)).toEqual("yBC");
    expect(next("PPP", 89285)).toEqual("yyy");

    // After total wrap, it's constant... but in future, it would be better if this continued to increment!
    expect(next("PPP", 89286)).toEqual("zzzBBB");
    expect(next("PPP", 89287)).toEqual("zzzBBB");
    expect(next("PPP", 89288)).toEqual("zzzBBB");
    expect(next("PPP", 89289)).toEqual("zzzBBB");
});

test("can generate 'next' strings, and more strings are between those", () => {
    const ITERATIONS = 2600;
    const SEEDS = ["B", "z", "vp", "BAjasWsfO", "zzzzzzz"];
    SEEDS.forEach((seed) => {
        let s = seed;
        for (let k = 0; k < ITERATIONS; ++k) {
            const nxt = next(s);
            T.gt(nxt, s);
            expect(isWellFormed(nxt)).toStrictEqual(true);
            if (k % 13 === 0) {       // otherwise tests run too slowly; pick prime so we test all sorts of combinations
                bt(s, nxt);         // still possible to create a string between the two strings
            }
            // if ( k % 100 === 0 ) {
            //     console.log(s,nxt);
            // }
            s = nxt;
        }
        expect(s.length).toBeLessThan(Math.max(4, seed.length) * 2);       // the minimum appending, plus a doubling, should be enough for all these strings!
    });
});

test("generates strings that maximize next() invocations", () => {
    expect(getStarterForNext(0).length).toBe(2);
    expect(getStarterForNext(1).length).toBe(2);
    expect(getStarterForNext(2).length).toBe(2);
    expect(getStarterForNext(3).length).toBe(2);
    expect(getStarterForNext(4).length).toBe(2);
    expect(getStarterForNext(100).length).toBe(2);
    expect(getStarterForNext(1000).length).toBe(2);
    expect(getStarterForNext(10000).length).toBe(3);
    expect(getStarterForNext(100000).length).toBe(4);
    expect(getStarterForNext(1000000).length).toBe(4);
    expect(getStarterForNext(10000000).length).toBe(5);
    expect(getStarterForNext(100000000).length).toBe(5);
    expect(getStarterForNext(1000000000).length).toBe(6);

    // see if it actually works
    const ITERATIONS = 10000;
    let s = getStarterForNext(ITERATIONS);
    for (let k = ITERATIONS; --k >= 0;) {
        s = next(s);
    }
    expect(s.length).toBe(3);
});

test("generates random strings of the correct length", () => {
    expect(random(1).length).toBe(1);
    expect(random(2).length).toBe(2);
    expect(random(3).length).toBe(3);
    expect(random(10).length).toBe(10);
    expect(random(100).length).toBe(100);

    // clamps length
    expect(random(-1).length).toBe(1);
    expect(random(0).length).toBe(1);
});

test("generates random strings that are unique and well-formed", () => {
    const N_SAMPLES = 10000;
    const result = new Set<string>();
    for (let k = 0; k < N_SAMPLES; ++k) {
        const s = random(16);
        result.add(s);
        expect(isWellFormed(s)).toStrictEqual(true);
    }
    expect(result.size).toBe(N_SAMPLES);
});

test("converts integers to strings and back", () => {

    const tests: [number, string][] = [
        [1, "aC"],
        [2, "aD"],
        [3, "aE"],
        [7, "aI"],
        [9, "aK"],
        [10, "aL"],
        [20, "aV"],
        [48, "ax"],
        [49, "ay"],
        [50, "bCB"],
        [51, "bCC"],
        [52, "bCD"],
        [53, "bCE"],
        [99, "bCy"],
        [100, "bDB"],
        [101, "bDC"],
        [1234, "bZj"],
        [2499, "byy"],
        [2500, "cCBB"],
        [2501, "cCBC"],
        [2502, "cCBD"],
        [2550, "cCCB"],
        [2551, "cCCC"],
        [12345678, "eCxnOd"],
        [Number.MAX_SAFE_INTEGER, "jFfeLmfmvUq"],
        [Number.MAX_SAFE_INTEGER + 1, "jFfeLmfmvUr"],
        [Number.MAX_VALUE, "zxlfjtLVvpfVBfHtpHDNZRDLVbT"],       // we run out letters!  Our code still functions, but this number != MAX_VALUE; it is smaller.

        [0, "a"],
        [-0, "a"],       // floating point "negative zero" maps to the same thing

        [-1, "Zx"],
        [-2, "Zw"],
        [-3, "Zv"],
        [-4, "Zu"],
        [-15, "Zj"],
        [-49, "ZB"],
        [-50, "Yxy"],
        [-51, "Yxx"],
        [-52, "Yxw"],
        [-1234, "YaQ"],
        [-2499, "YBB"],
        [-2500, "Xxyy"],
        [-2501, "Xxyx"],
        [-2502, "Xxyw"],
        [-2550, "Xxxy"],
        [-2551, "Xxxx"],
        [Number.MIN_SAFE_INTEGER, "QuUVoNUNEfJ"],
        [Number.MIN_SAFE_INTEGER - 1, "QuUVoNUNEfI"],
    ];
    tests.forEach(([x, s]) => {
        expect(fromInteger(x)).toBe(s);
        if (Number.isInteger(x) && x >= Number.MIN_SAFE_INTEGER && x <= Number.MAX_SAFE_INTEGER && x != -0) {       // we don't support floating, nor -0
            expect(toInteger(s)).toEqual(x);
        }
    });
});

test("broad test of integer -> string correct sorting and well-formed", () => {
    let prev_string: string | null = null;
    for (let k = -ALPHABET.length * 3; k <= ALPHABET.length * 3; ++k) {      // use length to ensure we cover carrying and multiple lengths of digits
        const str = fromInteger(k);
        if (prev_string) {
            T.lt(prev_string, str);
        }
        expect(isWellFormed(str)).toStrictEqual(true);
        expect(str).toEqual(expect.not.stringContaining(ALPHABET[0]));       // no first char here
        expect(str).toEqual(expect.not.stringContaining(ALPHABET[ALPHABET.length - 1]));       // no last char here
        expect(toInteger(str)).toBe(k);     // can transform back
        prev_string = str;
    }
});

test("floating point numbers are not supported", () => {
    expect(() => fromInteger(0.5)).toThrow();
    expect(() => fromInteger(Number.MIN_VALUE)).toThrow();        // because this can't be an integer
    expect(() => fromInteger(Number.NaN)).toThrow();
    expect(() => fromInteger(Number.POSITIVE_INFINITY)).toThrow();
    expect(() => fromInteger(Number.NEGATIVE_INFINITY)).toThrow();
});

test("malformed integers aren't converted", () => {
    expect(toInteger("")).toBe(0);
    expect(toInteger("_")).toBe(0);
    expect(toInteger("1234")).toBe(0);
});

test("convert arbitrary strings into continuum strings", () => {
    expect(fromString("")).toBe("a");
    expect(fromString("a")).toBe("aAbCw");
    expect(fromString("abc")).toBe("aAbCwAbCxAbCy");
    expect(fromString("Hello, World!")).toBe("aAbCXAbDCAbDJAbDJAbDMAatAahAbCmAbDMAbDPAbDJAbDBAai");
    expect(fromString("\x00")).toBe("aAa");
    expect(fromString("\x01")).toBe("aAaC");
    expect(fromString("\ufffe")).toBe("aAcbLj");
    expect(fromString("\ufffe\u0000")).toBe("aAcbLjAa");
});

test("string conversions sort properly", () => {
    const string_list = ["", "a", "ab", "abc", "\u0000", "\u0001", "\u0000a", "\u0000b", "\ufffe", "\uffff", "\uffff\u0000", "Hello, World!", "\uffff\uffff\uffff\uffff\uffff\uffff", "0", "1", "-1", "2", "123", "true", "false", "_", "a_b", "/", "/a"];
    string_list.sort();     // whatever Javascript says is the sort-order, is the sort-order!
    for (let k = 1; k < string_list.length; ++k) {
        expect(isWellFormed(fromString(string_list[k]))).toStrictEqual(true);
        expect(fromString(string_list[k - 1]) < fromString(string_list[k])).toBeTruthy();
    }
});
