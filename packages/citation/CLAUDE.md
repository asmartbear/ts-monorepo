# @asmartbear/citation

Fetches and formats bibliographic citations from DOIs, ISBNs, URLs (via live HTML scraping), or manual CSL fields. Produces CSL-JSON metadata that can be cached, plus formatted output (HTML/text/RTF) in styles like Chicago. Consumed by other `@asmartbear/*` packages that need to render references for web content; no CLI entry point despite the `cli` keyword in `package.json`.

## Key concepts

- **CSL-JSON** — the Citation Style Language schema. All metadata flows in and out as CSL fields (`type`, `author`, `issued`, `container-title`, etc.). See `types.ts` for the full shape.
- **CitationMetadataInput** — looser input shape accepted by `fetchCitationMetadata`. Has source-identifying fields (`doi`, `isbn`, `url`) plus loose overrides (string authors get parsed, `year` becomes a `CSLDate`, etc.).
- **CitationMetadata** — canonical CSL output. Internal fields are prefixed with `_` (`_fetchedFrom`, `_fetchedAt`, `_originalInput`) and stripped before formatting.
- **metascraper rule bundle** — a singleton `globalScraper` built once at module load in `urls.ts` with author/date/description/image/logo/publisher/title/url rules plus a custom JSON-LD author rule.

## Code organization

- `index.ts` — public re-exports plus `CITATION_SYSTEM_VERSION` (bump when changing generation logic so downstream caches can invalidate). Also has a `require.main === module` demo block that runs several live fetches when the file is executed directly.
- `citation.ts` — the core. `fetchCitationMetadata` (priority: DOI -> ISBN -> URL, then manual override merge), `formatCitation` (wraps `citation-js`), `convertMetascaperResultToCitationMetadata`, and private helpers (`parseAuthor`/`parseAuthors`, `parseDate`, `buildManualMetadata`, `generateMetadataId`, `cleanHtmlCitation`).
- `urls.ts` — `scrapeUrl` (live fetch with browser-like headers + 20s timeout) and `parseHtmlForMetadata` (parse already-loaded HTML). Both go through the shared `globalScraper`.
- `metascraper-ldjson.ts` — custom metascraper author rule that walks `<script type="application/ld+json">` blocks and extracts authors from schema.org `CreativeWork`/`WebPage` nodes (with `@graph` flattening), falling back to standalone `Person`/`Organization` nodes.
- `types.ts` — `CSLPerson`, `CSLDate`, `CitationMetadata`, `CitationMetadataInput`, `FormatOptions`, `MetadataFetchResult`.
- `*.d.ts` — local ambient module declarations for `metascraper`, `@metascraper/helpers`, and `citation-js` (none ship usable types). Edit these if you need to expose new fields from upstream.

## Implementation notes / gotchas

- **Source priority is exclusive, manual is additive.** DOI/ISBN/URL fetches are tried in order and stop at the first success; only one of those runs. Manual fields from `buildManualMetadata` are then merged on top and *override* the fetched data (source flips to `'mixed'`). When editing the priority chain, preserve the `if (!success && ...)` guard.
- **`Cite.async` for DOI/ISBN** uses `citation-js` plugins (`plugin-doi`, `plugin-isbn`) that hit external APIs. There's no built-in caching here — that's the caller's job, which is why `_fetchedAt` and `CITATION_SYSTEM_VERSION` exist.
- **URL scrape uses `node-fetch` v2** (the `headers.timeout` option is v2-only — don't "upgrade" without changing the call). Headers impersonate Chrome with a Google referer to bypass mild bot protection; some sites (e.g. Fastcompany) still block live fetches but their saved HTML parses fine, which is why tests use saved fixtures.
- **`response.url` overrides the scraped URL** to capture redirects; `convertMetascaperResultToCitationMetadata` then prefers `scraped.url` over the input URL for the same reason.
- **`formatCitation` strips `_*` fields by cloning** before handing to `citation-js`. If you add new internal fields, prefix with `_` and add them to the delete list.
- **HTML output is post-processed** by `cleanHtmlCitation` to strip `csl-bib-body`/`csl-entry` div wrappers. Pass `wrapper: true` to opt out.
- **Author parsing heuristics** in `parseAuthor` are best-effort: comma triggers "Last, First"; otherwise last word is family, rest is given; suffixes (`Jr`, `III`, etc.) are detected; single words become `literal` (org/mononym). The `parseAuthors` split regex deliberately preserves `, Jr.` style suffixes via lookahead.
- **JSON-LD parser handles HTML comments** wrapping JSON (`<!-- ... -->`) — some CMSs emit this. `safeParse` swallows errors silently; missing JSON-LD just falls through to other metascraper rules.
- **`globalScraper` is module-scoped and lazy-built once.** Don't rebuild per request — metascraper rule compilation is expensive.
- **Jest `moduleNameMapper`** has a special-case for `iso-639-3/to-1` resolving to the root `node_modules` JSON file. This is required because a citation-js transitive dep does a dynamic require that ts-jest otherwise can't resolve.

## Public API

From `index.ts`:
- `fetchCitationMetadata(input, fStatus?) -> Promise<MetadataFetchResult>`
- `formatCitation(metadata, options?) -> string`
- `convertMetascaperResultToCitationMetadata(url, scraped) -> CitationMetadata`
- `parseHtmlForMetadata(url, html) -> Promise<MetadataResult>` (re-exported from `urls.ts`)
- `CITATION_SYSTEM_VERSION: number`

Types are not re-exported from `index.ts` — consumers import `MetadataResult` from `metascraper` directly and the CSL types aren't currently surfaced (add to `index.ts` if needed downstream).

## Dependencies

- `@citation-js/core` + `plugin-csl` / `plugin-doi` / `plugin-isbn` — does the actual CSL formatting and DOI/ISBN lookups.
- `metascraper` + rule packages (`author`, `date`, `description`, `image`, `logo`, `publisher`, `title`, `url`) — HTML metadata extraction. `@metascraper/helpers` is pulled in for the ambient typings only.
- `node-fetch` v2 — HTTP client for `scrapeUrl` (chosen for the `timeout` option).
- Sibling packages (dev only): `@asmartbear/testutil` (`T.eq`, `T.includes`) and `@asmartbear/filesystem` (`Path`) for test fixture loading. No runtime deps on sibling packages.

## Testing

- `test/html.test.ts` parses saved HTML fixtures under `test/html/` rather than hitting the network — the live URLs in `index.ts`'s demo block are *not* exercised by the test suite. When adding a test for a new site, save its HTML to `test/html/<name>.html` and use the `parseTextHtml` helper.
- The fastcompany fixture exists specifically because that site blocks live bot requests; treat it as the canonical "we parse HTML correctly even when scraping fails" case.
- Tests run with `--runInBand`. No mocks or network stubs are configured — if you add a test that calls `scrapeUrl` or `Cite.async`, it will hit the live internet.
