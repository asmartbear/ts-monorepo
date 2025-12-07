# Continuum

Generates compact strings that behave as a continuum -- ordered points, for which between any two points is always another point.

Strings are kept as short as possible, unlike some traditional implementations of this data type in which strings grow quickly with normal usage.

Both integers and floating point numbers have representations as compact strings, for example the number `3` is `"aD"`. This allows for a direct
mapping between numeric continuums to this string-typed continuum.  The reason to use strings instead of numbers for this purpose, is that floating
point numbers do not have arbitrary precision, and floating point numbers can't be used as keys in maps.

Uses:

* **GUIDs/UUIDs:** With the additional property that they can easily be ordered with regard to each other or with regard to time, while being shorter than UUID5.
* **Distributed, multi-writer arrays**: Using these as keys in a map, writers can insert/prepend/append arbitrarily, maintaining ordering without coordination.
* **CRDTs & Operational Transforms:** These data structures need unique, orderable strings for things like keys in maps and arrays, and to resolve last-write-wins. Specifically, this solves the same problem as famous structures like LOGOOT, WOOT, and Treedoc, but more efficient in both time and space.

Features:

* **Compatible:** Strings only use the characters matching `[A-Za-z]+`, to be compatible with every kind of key/value map or data store, and they're easy to read while debugging.
* **Compact:** Strings converted from numbers are short, with no padding, and strings generated between other strings often collapse to shorter strings in the process.
* **Typescript:** Written in Typescript, but distributed as regular Javascript, and includes Typescript declarations

## Usage

Use through [`npm`](https://www.npmjs.com/package/@asmartbear/continuum), or get the source from [Github](https://github.com/asmartbear/continuum).

### `fromInteger() / toInteger()`

Generates a Continuum string from a Javascript `number` (integers only). The strings are designs to be as short as possible for integers with small absolute value, and still quite compact even with large ones. Ordering is preserved; that is, given two integers where `i1 < i2`, then also `fromInteger(i1) < fromInteger(i2)`. *See discussion below for the algorithm.*

```javascript
import * as C from '@asmartbear/continuum';

console.log(C.fromInteger( 0 ));  // -> a
console.log(C.fromInteger( 1 ));  // -> aC
console.log(C.fromInteger( 2 ));  // -> aD
console.log(C.fromInteger( 1234 ));  // -> bZj
console.log(C.fromInteger( Number.MAX_SAFE_INTEGER ));  // -> jFfeLmfmvUq
console.log(C.fromInteger( -1 ));  // -> Zx
console.log(C.fromInteger( -2 ));  // -> Zw
console.log(C.fromInteger( Number.MIN_SAFE_INTEGER ));  // -> QuUVoNUNEfJ

console.log(C.toInteger("Zw")); // -> -2
```

### `fromString()`

Generates a valid Continuum string from an arbitrary string (including empty and unicode characters). Ordering is preserved; given two Javascript strings where `s1 < s2`, you will always also have `fromString(s1) < fromString(s2)`.

```javascript
import * as C from '@asmartbear/continuum';

console.log(C.fromString( "" ));  // -> a
console.log(C.fromString( "\u0000" ));  // -> aAa
console.log(C.fromString( "\uffff" ));  // -> aAcbLk
console.log(C.fromString( "Hello, World!" ));  // -> aAbCXAbD[...]DBAai
```

### `between()`

Given two Continuum strings, generates a new string that sorts strictly between them.

```javascript
import * as C from '@asmartbear/continuum';

console.log(C.between( 'abc', 'abg' ));  // -> abe
console.log(C.between( 'abc', 'abd' ));  // -> abccn
```

### `next()`

Given a Continuum string, generates a string that sorts "next," but sufficiently distant from the first string that any number of other strings can be inserted between them, without causing very long strings. Includes an algorithm preventing a common problem with other libraries in which strings grow very long if `next()` is used thousands or millions of times.

You can also provide an increment for `next()`, though the minimum is `2`.  It's useful in some algorithms to skip a lot of slots, or even an random number of slots.

Finally, you can supply negative increments, for "previous."

```javascript
import * as C from '@asmartbear/continuum';

console.log(C.next( 'abc' ));  // -> abe  (leaves space for abd)
console.log(C.next( 'abc', 3  ));  // -> abf
console.log(C.next( 'abc', 10 ));  // -> abp
console.log(C.next( 'abz' ));  // -> acB
console.log(C.next( 'zzz' ));  // -> zzzBBB  (string increases with pure 'z's prefixed)
```

### `getStarterForNext()`

Strings can end up growing long when `next()` is invoked many times.  By pre-allocating a longer string to begin with, you can prevent that from happening.  Relatively few letters are needed for huge numbers of invocations, so this can save lots of space in the long run.

```javascript
import * as C from '@asmartbear/continuum';

// Only need 5 characters to call `next()` 100,000,000 times without growing the string
console.log(C.getStarterForNext(100000000));  // -> BBBBB
```

### `random()`

Generates a valid Continuum string using random characters.  Use to seed a new distributed array, or as a sort of GUID (even just 10 characters is enough for a 1-in-100-quadrillion chance of collision!).
This is not cryptographically secure!

```javascript
import * as C from '@asmartbear/continuum';

console.log(C.random( 20 ));  // -> PyTkqGaJKkGjrsnUSIrq
```

### `isWellFormed()`

Reports whether the given object is a well-formed Continuum string.

```javascript
import * as C from '@asmartbear/continuum';

console.log(C.isWellFormed( null ));   // -> false   (same with any non-string)
console.log(C.isWellFormed( "" ));     // -> false   (empty is not orderable!)
console.log(C.isWellFormed( "nBq" ));  // -> true
console.log(C.isWellFormed( "RtA" ));  // -> false   (cannot end with first letter of the alphabet)
```

## Technical Discussion

#### Alphabet

The "Alphabet" is the ordered list of characters that can make up a string.  Currently these are `A-Z` followed by `a-z`, but code should reference the exported `ALPHABET` string for compatibility if the Alphabet changes.

#### The rule of the last letter of a string

Strings cannot end with the first letter of the alphabet, because then you can construct another string that won't sort between the two.
For example, consider `S1="BCD"` and `S2="BCDA"`, where `"A"` is the first letter of the alphabet.  It's not possible to create a string between
these two. You cannot increment `"D"` in `S1`, because the result would sort *after* `S2`. The lowest-value character you can append to `S1` is
`"A"`; the result is already equal to `S2` so we don't have space to create something "in between!"  This is not a problem if we require the
last character to be anything else.  For example, with `S1="BCD"` and `S2="BCDB"`, we can build `"BCDAN"`.  The ability to use the first
letter of the alphabet to "get past" the `"B"`, then allows us to further append something in the middle of the alphabet, giving us space
for more insertions before or after this new string and `S1` or `S2`.

#### Converting from integers

The traditional way of representing integers as strings that sort the same way is to pad the numbers with zeros; for example, `37` might become `"000000037"`. This has three drawbacks: (1) small numbers use far more memory than necessary; (2) numbers are limited in size (this example fails just before one billion); (3) can't represent negative numbers (because prepending a negative sign doesn't result in correct sort order, e.g. `"-0001" < "-0002"` but `-1 > -2`).

This system has none of those problems. Consider positive integers first. "Digits" are stored in base-50, using all but the first and last characters of the Alphabet. (This is done both for well-formed strings, and to allow space for operations like `next()` and `between()`.) Digits do have to come in the usual order, with the largest place-values first, but then you have the usual string sorting problem, e.g. `"2" > "12"`, or in our base-50 encoding, starting with the second Alphabet letter `"B"`, that problem looks like `"C" > "BC"`. Therefore, we prefix the digits with a character that encodes the number of digits, i.e. `'a'` for one digit, "`b`" for two, etc.. So our immediate example becomes `"aC" < "bBC"` and now we're sorting correctly.  (Actually, `2` would be `aC` and `12` would be `aM` because of base-50, but the principle is correct when you get multiple digits.)  This does place a limit on the maximum size of an integer at 26 base-50 digits, about `7 * 10^45` or 146 bits.

Negative integers are represented the same way as negative binary integers are in machine code: in "50's complement," the equivalent of "two's complement." The idea is that each digit `d` is stored instead as `50-d`. Thus, if `2` in base-50 would be the digit `"C"`, then `-2` would be the digit `"x"`. We still need a prefix character to do a job for us, however, because just `"x"` alone might be the digit for `-2` if the number is negative, but it's the digit for `48` if the number is positive, so without the prefix character, `-2` would sort after `2`. The prefix character works the same way as with positive integers -- encoding the number of digits -- but counts backwards from `"Z"`. Therefore, `-2` is encoded as `"Zx"` and `-52` would be `"Yyx"`.

Zero is special, and is represented simply as `"a"`, which sorts after all negative numbers (because `-1` is `"Zy"`) and before all positive numbers (because `1` is `aB`).

#### Converting from floating point

Starting with our integer representation, it is apparent that we can continue adding digits to the end of the string to represent fractional place values. Because the leading character already encodes the number of integral place-values, it implies that anything beyond that count is fractional, and will already sort correctly given the previous rules.

There is a question of how many digits to use when the fraction is repeating in base-50. For example, if the fractional-part is just `1/2`, there's no problem as this is the (single digit) `[25]` in base 50, and as the remaining digits would be zero, there's nothing else we need to append to the integer-part. But if the fraction is `1/3`, then just as in base-10 the decimal representation repeats forever `0.333333...`, so in base-50 it repeats forever in the two-digit pattern `.[16][33][16][33]...`.

Of course, it is at our discretion when to stop appending digits.  Therefore, we take as an input to floating-point conversions the maximum number of fractional-part digits, and simply stop there.
