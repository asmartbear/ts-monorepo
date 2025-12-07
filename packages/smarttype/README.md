# Smart Types

Data types that parse, validate, transform, marshal, compare, and hash.

## Features

* Parse anything, either strictly or non-strict where it infers and converts values.
* Send anything to/from JSON, using "as native as possible," but with enough meta-data to support anything.
* Get a simple string from any type.
* Get a hash value of any type.
* A Visitor pattern for types, with defaults that simplify implementations.

## Types

* Supports primatives, arrays
* Objects with well-defined typed structures including optional fields
* Records and Maps with arbitrary key and value types
* Tuples (arrays of fixed length and element-types in each position)
* Literals (one of a fixed set of primative values)
* Alternations -- any of a set of types
* Standard objects:
  * `Date` - as the object or parsed from a string
  * `RegExp` - as the object, or with all features if a string like `"/foo/g"`, or an encoded simple substring

## Usage

```typescript
import * as V from "@asmartbear/smarttype"

const myType = V.OBJ({
    id: V.STR().re(/^[a-zA-Z]\w+$/),
    count: V.INT().min(0),
})
// `obj` will be of type `{id:string,count:number}`, or throw exception.
const obj = myType.input({id: "taco", count: 4})
// JSON is designed for transmission, e.g. `Date` is a number, not a string.
const js = myType.toJSON(obj)
const o2 = myType.fromJSON(js)
// Like `@asmartbear/simplified` but keeps objects opaque
console.log(myType.toSimplified(obj))
// Checks whether a type is valid, and tells Typescript too.
// Doesn't include full validation and transformation like `input()`.
assert(myType.isOfType(obj,true))
// Reverse-engineer an existing object into its types.
const ty = V.reverseEngineerType(obj)
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

Prepare for release (e.g. run tests and bump version number):

```bash
npm run release
```

Publish to npm:

```bash
npm publish
```
