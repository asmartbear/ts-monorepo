# Proxy Objects

Objects like `Array`, `Set`, `Map` and `object`, with behavior that mimics
Typescript exactly, but which delegates the actual implementation to a simpler
system.

The purpose is to be able to have a different underlying implementation, like
a CRDT or opcode system, or triggering events, but where the user of the object
can almost completely drop-in replace native objects, making it easy to work with.

There are complex edge cases in the Javascript specification, so this implements
those things, leaving just simple cases for the underlying implementation.

## Usage

```typescript
import * as AI from "@asmartbear/proxy-object"

...
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

Prepare for release (e.g. run tests and bump version number), and then release:

```bash
npm run release && git push --follow-tags origin main && npm publish
```

