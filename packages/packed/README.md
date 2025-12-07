# Packed Buffers

Simple, very fast mechnaism for reading and writing data to generic byte buffers.

Features:

* No other library dependencies.
* Special encoding for integers that are typically (but not necessarily) small.
* Especially efficient at Javascript primatives, including `undefined` and `null`, especially with small integers and strings.
* Support for "tokens" -- strings that you expect to repeat, building an internal table and emitting indicies.
* Support for arbitrary JSON objects.
* Support for objects that implement `serialize()`/`unserialize()` methods.
* Support for generic serialization handling all native types, including arrays, structures, sets, maps, dates, and registered custom objects.

100% test coverage.

## Usage

```typescript
const buf = new PackedBuffer()      // or supply input Buffer
buf.writeSmallNonNegativeInteger(12)
buf.writeJson({foo: "bar"})
buf.writeToken("baz")
buf.writeSerializable({foo: [1,"two",{}], bar: new Date()})
buf.rewind()            // can change position
console.log(buf.readSmallNonNegativeInteger())
```

## Development Usage

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

Prepare for release (e.g. run tests and bump version number), then publish to npm:

```bash
npm run release && npm publish
```
