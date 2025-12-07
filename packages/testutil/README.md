# Typescript Test Utilities

Unit test utilities for Typescript + Jest:

* Shorter than Jest
* Includes an optional error/explaination message
* Typesafe arguments helps find errors at compile-time
* Typescript assertions allow you to test in series, e.g. testing that a result is not undefined, and then continuing to test its value without Typescript thinking it might still be undefined.

## Usage

```typescript
import * as T from "@asmartbear/testutil"

test("my test", () => {
    T.be(x,"foo")
})
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
