# BearDB

Document-database using Bear as a backend.

Also has in-memory version especially for unit-testing, and could have other implementations
like the filesystem, but at that point you should probably be using a better system.

## Usage

```typescript
import * as V from "@asmartbear/beardb"

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

