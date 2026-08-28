## @fumadocs/sanity@0.2.2

### Support `@sanity/client` v8 and `next-sanity` v13

Widened the peer dependency ranges to `^7.22.0 || ^8.0.0` and `^12.4.0 || ^13.0.0` respectively.

## @fumadocs/sanity@0.2.1

### Simplify cache

## @fumadocs/sanity@0.2.0

### Redesign source API

Content sources can hook into the static loader they are attached to, and dynamic sources can opt out of the loader's in-memory file cache.

`configureStatic` runs when a source is attached to `loader()`, and again whenever `dynamicLoader()` builds a new static loader:

```ts
export function createMySource(): DynamicSource {
  return {
    cache: 'custom',
    async files() {
      return loadFiles();
    },
    configureStatic({ loader, source }) {
      // `loader` is the created static loader
      // `source` is the record key when using named sources
    },
    configure(loader, { source }) {
      loader.invalidate();
    },
  };
}
```

- `cache: 'memory'` (default): `files()` is called once until `invalidate()`.
- `cache: 'custom'`: the source caches itself. `dynamicLoader()` re-runs `files()` on `get()` and rebuilds only when the file list is shallowly different (by identity).

### Integrations

GraphQL cross-links are generated from the attached loader instead of a `baseUrl` option on `staticSource()`. Local, OpenAPI, and AsyncAPI `dynamicSource()` use `cache: 'custom'` and reuse generated files by identity until `invalidate()`.

Sanity now uses `cache: 'custom'` when given a `sanityFetch` from `next-sanity/live`, calling `invalidate()` in draft mode is no longer needed.

## @fumadocs/sanity@0.1.0

### Default to Base UI

Internal packages & templates now use Base UI rather than Radix UI.

# @fumadocs/sanity

## 0.0.5

### Patch Changes

- 66426c7: fix peer deps

## 0.0.4

### Patch Changes

- 1fb6a61: Support custom base directory for content sources

## 0.0.3

### Patch Changes

- dd74f03: Support usage without `next-sanity`
- 015e496: Expose `renderToc()`
  - fumadocs-core@16.8.6

## 0.0.2

### Patch Changes

- c8beaa2: fix slug format

## 0.0.1

### Patch Changes

- initial release
