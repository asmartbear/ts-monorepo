# Environment utilities

Reading .env files and similar, and reading values from those files.

## Usage

```typescript
import { loadEnvironment, getEnv } from "@asmartbear/env"

// Call to ensure loaded; will not reload if already loaded.
loadEnvironment()

const foo = getEnv('FOO')
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
