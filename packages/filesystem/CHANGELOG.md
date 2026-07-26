# Changelog

## 2.0.0

### Major Changes

- `copyTo` takes a `CopyCondition` instead of an `onlyIfNewer` boolean: `'always'`,
  `'if-newer'`, or the new `'if-content-differs'`.

  `'if-newer'` only compares mtime and size, which silently does nothing useful when
  the source is regenerated from scratch on every run -- a rebuilt file is always
  "newer" even when its bytes never changed, so the copy happens anyway and the
  destination gets a fresh mtime. That defeats every downstream "mtime + size"
  staleness check (rsync, CDN uploads, build caches).

  `'if-content-differs'` compares sizes and then bytes, and leaves an identical
  destination completely untouched, mtime included. Also exposed as
  `Path.hasSameContentAs()`.

  Migration: `copyTo(dest, true)` -> `copyTo(dest, 'if-newer')`,
  `copyTo(dest, false)` -> `copyTo(dest, 'always')`.

## 1.0.8

### Patch Changes

- Can open in a non-default application

### [1.0.7](https://github.com/asmartbear/filesystem/compare/v1.0.6...v1.0.7) (2025-12-04)

### [1.0.6](https://github.com/asmartbear/filesystem/compare/v1.0.5...v1.0.6) (2025-12-04)

### [1.0.5](https://github.com/asmartbear/filesystem/compare/v1.0.4...v1.0.5) (2025-11-29)

### [1.0.4](https://github.com/asmartbear/filesystem/compare/v1.0.3...v1.0.4) (2025-11-26)

### [1.0.3](https://github.com/asmartbear/filesystem/compare/v1.0.2...v1.0.3) (2025-11-25)

### 1.0.2 (2025-11-20)

# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.
