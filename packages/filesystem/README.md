# Filesystem

Class-based filesystem access, with lots of nice, Promise-based utilities.

## Usage

```typescript
import * as V from "@asmartbear/filesystem"

const f = new Path("my/path")
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
npm run release && git push --follow-tags origin main && npm publish
```
