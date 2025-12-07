# Simplified

Able to recursively simplify nearly any Javascript type into something JSON plus undefined.
Typescript inference works for that transformation, with exceptions only with some self-referential
types.

Not only simpler data types, but normalized, with floating point rounded to 4 decimal places, and
unordered things (e.g. `Set` elements or `Map`/`Object` key order) sorted.
* `number` rounded to 4 digits, and `-0` is resolved to `0`.
* `bigint` is resolved into a `number` if it fits, otherwise a `string`.
* `symbol` is resolved into the `string` that is its name.
* `object` fields are sorted.
* `function` throw an error; they are ignored if part of something like an object, e.g. for classes.
* Class instances have their class name added as a `__class__` field.
* Classes with `ISimplifiable` implement their own conversion.
* Iterable and array-like things (generators, iterables, buffer arrays) are converted to arrays.
* Sets are sorted arrays.
* Map keys are always sorted; they become objects if keys are strings or numbers, otherwise it is an array of pairs.
* Promises are (recursively) chained into simplified promises. Can unwrap promises recursively into fully simplified.

Lots of tools on simplified data, like various formats of display, comparison, hashing, etc..

Use `SimplifiedWalker` like a typesafe recursive `Array.map()` on simplified types.

## Usage

```typescript
import { simplify } from "@asmartbear/simplified"

const s = simplify({a:new MyClass(), b: new Set([1,2,3])})
const s = simplifyOpaque(b)     // if `b`'s type is complex and Typescript can't infer
const sp = await simplifiedAwait(...)
```

## Development

Build:

```bash
npm run build
```

Unit tests:

```bash
npm run test
```

Unit tests, refreshed live:

```bash
npm run watch
```
