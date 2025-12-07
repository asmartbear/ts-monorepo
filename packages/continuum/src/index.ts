
// These are the letters allowed in a Continuum string.
export const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const MIDPOINT_IDX = 26;
const LAST_IDX = ALPHABET.length - 1;

/**
 * Converts the char-code at the given location of a string, into an offset in our alphabet.
 * If it is given a character outside of the alphabet, it throws an exception.
 */
function charToIdx(str: string, offset: number): number {
    const x = str.charCodeAt(offset);
    if (x >= 65 && x <= 90) return x - 65;     // A-Z
    if (x >= 97 && x <= 122) return x - 71;     // a-z
    throw new Error(`Continuum string contains characters outside of the allowable alphabet: "${str}"[${offset}]`);
}

/**
 * True if the provided object is "well-formed," meaning it is a non-empty string, contains only letters from `ALPHABET`,
 * and does not end with the first letter of the alphabet.
 */
export function isWellFormed(s: any): s is string {
    if (typeof s !== "string") return false;      // this also handles null and undefined
    return !!s.match(/^[A-Za-z]*[B-Za-z]$/);
}

/**
 * Returns a string between the two given strings, which must be unequal and conform to the rules of Continuum strings,
 * otherwise the output is undefined, and exceptions might be thrown.  The inputs can be either low/high or high/low.
 */
export function between(s1: string, s2: string): string {
    const floor = Math.floor;

    // Check for parameters in the wrong order
    const isOrderedLowHigh = s1 < s2;
    let lo = isOrderedLowHigh ? s1 : s2;
    const hi = isOrderedLowHigh ? s2 : s1;

    // Skip the common prefix of both strings as quickly as possible
    let k;
    const N = lo.length;
    for (k = 0; k < N; ++k) {
        if (lo[k] < hi[k]) {
            break;
        }
    }

    // Unless we ran out of string completely, we can compute a new segment now
    if (k < N) {
        const a = charToIdx(lo, k);
        const b = charToIdx(hi, k);

        // Pick the mid-point between the two values that we have to split
        const m = floor((a + b) / 2);

        // If the mid-point is the same as what `lo` already has, that's because we're just one letter apart.
        // To create space, we have to append beyond this point, and we use the midpoint character to create
        // space on both sides of the new string.  You can cut off "low" here, with a letter that's still
        // greater than whatever comes next in low.  If there isn't one, i.e. it is "z", you have to proceed
        // until you find one, up to potentially just appending a new one.
        if (m <= a) {
            ++k;        // definitely need this character to be strictly less than high.
            while (k < N) {       // scan for the next one that we can slip in front of
                const c = charToIdx(lo, k);
                if (c < LAST_IDX - 1) {     // need that extra 1, because we average against it and still need to be greater than it
                    return lo.substring(0, k) + ALPHABET[floor((c + LAST_IDX) / 2)];
                }
                ++k;
            }
            return lo + ALPHABET[MIDPOINT_IDX];
        }

        return lo.substring(0, k) + ALPHABET[m];
    }

    // `lo` must have been the string that ran out, because it is a prefix of `hi` and `hi` is the larger one.
    // We can pick the "mid-point" between the lowest character in the alphabet and what `hi` has.
    const M = hi.length;
    for (; k < M; ++k) {
        const b = charToIdx(hi, k);
        const m = floor(b / 2);
        if (m >= b || m <= 0) {        // this isn't going to be enough!
            lo += ALPHABET[0];      // try to make an end-run using the lowest character, but keep going because we can't end with the last letter of the alphabet
            continue;
        }
        return lo + ALPHABET[m];
    }

    // We got past `hi` with the lowest charcode, so now we append something that gives space on either side.
    return lo + ALPHABET[MIDPOINT_IDX];
}

/**
 * Returns a continuum string that comes after the given string.  It is fairly close, but far enough away to admit additional strings to be
 * between the original one and the returned one.  This is useful for "append" style operations, that still allow future "inserts."
 * 
 * @param s the C-string that the new string needs to sort after
 * @param increment the number of strings at this level to increment by; clamped to a minimum of 2 to allow for future inserts, it can be made larger, or even random, which is better for some applications
 */
export function next(s: string, increment: number = 2): string {

    // Convert both the increment and the existing string into a sort of "base 50" integer.
    // Can't actually use integers because it won't scale to long strings.
    // Put the least-significant digit first -- opposite to normal reading-order -- because it's easier to reason about.
    const a = _cstring_to_faux_bigint(s);
    const b = _integer_to_faux_bigint(increment < 2 ? 2 : increment);

    // Add and carry, adding in-place into 'a'
    let carry = 0;
    if (a.length >= b.length) {            // if this isn't so, we're already doomed
        for (let k = 0; k < a.length && (k < b.length || carry); ++k) {        // go until the (not longer) addend is exhausted, and no carry to apply
            const sum = a[k] + carry + (k < b.length ? b[k] : 0);
            if (sum >= BASE) {
                a[k] = sum % BASE;
                carry = Math.round((sum - a[k]) / BASE);
            } else {
                a[k] = sum;
                carry = 0;
            }
        }
    }
    // console.log(`add result: ${a}, carry=${carry}, length-issue=${a.length < b.length}`);

    // If we still have more to add in b, or in the carry, we need more digits, which is a different algorithm.
    // If we emit only one more character, we'll quickly use it up as next() is called more often, and we end up with very long strings.
    // Therefore, increase the length by some amount proportional to the existing length, to create more space.
    if (carry > 0 || a.length < b.length) {
        s = ALPHABET[LAST_IDX].repeat(s.length) + ALPHABET[1].repeat(Math.max(3, Math.ceil(s.length / 2)));      // expand by 50%, and always give it at least some sort of kick
        return s;       // FIX ME: could continue incrementing...
    }

    // Reconstruct the resulting string
    return a.map(d => ALPHABET[d + IDX_DIGIT_0]).reverse().join('');
}

function _cstring_to_faux_bigint(s: string): number[] {
    const n = s.length;
    const d = new Array<number>(n);
    for (let k = 0; k < n; ++k) {
        d[k] = charToIdx(s, n - k - 1) - IDX_DIGIT_0;
    }
    // console.log(`_cstring_to_faux_bigint(${s}) -> ${d}`);
    return d;
}

function _integer_to_faux_bigint(x: number): number[] {
    const d: number[] = [];
    while (x > 0) {
        const digit = x % BASE;
        d[d.length] = digit;
        x = Math.round((x - digit) / BASE);
    }
    // console.log(`_integer_to_faux_bigint(${x}) -> ${d}`);
    return d;
}

/**
 * Strings can end up growing long when `next()` is invoked many times.  By pre-allocating a longer string, you can prevent
 * that from happening.  Example: getStarterForNext(1000000000) returns "BBBBBB"; six letters is sufficient for more than
 * a billion invocations before the string gets longer.
 * 
 * @param numNextInvocations able to invoke `next()` this many times before the string has to get longer
 */
export function getStarterForNext(numNextInvocations: number): string {
    // Each invocation increments the last "digit" by 2, so double the number of invocations, then compute number of digits in the correct base
    const nDigits = Math.ceil(Math.log(numNextInvocations * 2) / Math.log(LAST_IDX - 1));
    return "B".repeat(Math.max(2, nDigits));           // never shorter than 2 elements; no interesting space-savings there anyway
}

/**
 * Generates a well-formed Continuum string of a given length.
 *
 * @param len length; is mapped to `1` if the provided value is less than `1`.
 */
export function random(len: number): string {
    const MAX = ALPHABET.length - 2;        // don't include the first or last characeter of the alphabet, ever, to make future insertions less likely to immediately lengthen strings
    let s = "";
    for (let k = len > 1 ? len : 1; --k >= 0;) {      // clamp to valid range
        s += ALPHABET[Math.floor(Math.random() * MAX) + 1];
    }
    return s;
}

const IDX_DIGIT_0 = 1;      // 0 digit starts here and moves forward.
const IDX_EXPONENT_0 = 26;  // 0 exponent starts here, forward for positive NUMBERS, backward for negative NUMBERS, and no support for actual negative exponents (i.e. floating-point where -1 < x < 1 and x != 0).
const BASE = 50;            // numbers are in this base

/**
 * Generates a well-formed Continuum string representing the given integer, where the strings associated
 * with those numbers will sort the same way.  The mapping is stable; the same input will always result in the same output.  After
 * more strings are generated (e.g. using `between()`), it is no longer necessarily the case that those strings will map backwards to numbers.
 * 
 * Throws error if not an integer (floating-point, infinity, NaN, or non-number).
 */
export function fromInteger(x: number): string {
    const MAX_EXPONENT = ALPHABET.length - IDX_EXPONENT_0 - 1;      // exponent is just one character; don't overflow!
    let exponent = -1;          // we'll build this up as we process the number
    let sMantissa = "";         // we'll build up this string with digits as we process the number

    // If this isn't an integer, bail
    if (!Number.isInteger(x)) {
        throw new Error("Only integers are supported at this time.");
    }

    // Special case: Zero!  Needs to sort strictly between positive and negatives.
    if (x === 0) {
        return ALPHABET[IDX_EXPONENT_0];
    }

    // Case of negative: We use the equivalent of "two's complement."  For now, flip the sign of x to positive, but we'll emit different
    // characters and a different exponent to create that effect.
    const wasNegative = x < 0;
    if (wasNegative) {
        x = -x;
    }

    // Process the integer part fully.
    while (x >= 1 && exponent < MAX_EXPONENT) {           // we should always run out of "x" before running out of exponents, but JUST in case, this is a check against run-away looping and invalid outputs
        const nextDigit = Math.floor(x % BASE);
        x = Math.round((x - nextDigit) / BASE);       // round needed to keep it as an integer
        ++exponent;
        sMantissa = ALPHABET[(wasNegative ? (BASE - 1 - nextDigit) : nextDigit) + IDX_DIGIT_0] + sMantissa;
    }

    // Finish the number leading with the exponent
    return ALPHABET[(wasNegative ? (-1 - exponent) : exponent) + IDX_EXPONENT_0] + sMantissa;
}

/**
 * The converse of `fromInteger()` -- converts a Contiuum string back to an integer.
 * The behavior is undefined if you pass in a string that is not of the `fromInteger()` format.
 * 
 * @param s a string previously generated by fromInteger()
 */
export function toInteger(s: string): number {
    if (!isWellFormed(s)) return 0;         // invalid!
    if (s === "a") return 0;      // special case

    let k = 0;                  // position in the string
    let exponent = charToIdx(s, k++) - IDX_EXPONENT_0;       // pick off current value of the exponent, translating to a numeric value

    const isNegative = exponent < 0;
    if (isNegative) {
        exponent = -1 - exponent;     // do it positive, then we'll flip it at the end
    }

    let x = 0;
    while (exponent >= 0) {
        const digit = charToIdx(s, k++) - IDX_DIGIT_0;      // convert from our BASE 50 to a number
        x = (x * BASE) + (isNegative ? BASE - 1 - digit : digit);     // accumulate this digit, handling "twos-complement"
        --exponent;
    }

    return isNegative ? -x : x;
}

/**
 * Converts an arbitrary Javascript string into a valid Continuum string, which is obfuscated and longer, but uses the valid alphabet and is well-formed.
 * Generally resulting strings are 4-5 times as large as the original string, but the exact spec of that is intentionally not given.
 */
export function fromString(input: string): string {
    // Simple algorithm: Treat each character code as a number.
    const result: string[] = [ALPHABET[MIDPOINT_IDX]];     // need a "seed" to include the empty string; choosing the midpoint character means there's lots of space behind even an empty string too.
    for (let k = 0; k < input.length; ++k) {
        result[result.length] = fromInteger(input.charCodeAt(k));
    }
    return result.join(ALPHABET[0]);        // joining with the special starting character, so it sorts properly across different characters with different lengths
}
