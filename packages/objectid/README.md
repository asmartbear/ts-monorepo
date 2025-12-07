# objectId

Extremely tiny package (253 bytes uncompressed) for no-side-effect attaching unique IDs to Javascript objects.

IDs are stored in a `WeakMap`, so there's no alteration of the object in question (therefore cannot affect
other code), but also without affecting GC.

Supports IDs only for objects (including functions and arrays). IDs are based on the object "pointer," not based on the data inside the object. If you need to hash other data structures, you'll need to use a different hashing library.

## Usage

```js
const a = {};
const b = {};
console.log(objectId(a));     // 1
console.log(objectId(b));     // 2
console.log(objectId(a));     // 1
console.log(objectId(null));  // 0
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
