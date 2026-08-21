## @fumadocs/asyncapi@0.3.0

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

### Cache the document proxy in `toStaticData`

Matches `fumadocs-openapi`: the magic proxy is created once per document instead of once per generated page.

## @fumadocs/asyncapi@0.2.0

### Use `@scalar/json-magic` for dereferencing

This will affect all raw access to OpenAPI/AsyncAPI documents, ensure to use `dereferenceShallow()` public API.

### Migrate from `js-yaml` to `yaml`

## @fumadocs/asyncapi@0.1.1

### Fix minor UI inconsistencies

More aligned with original styles.

## @fumadocs/asyncapi@0.1.0

### Default to Base UI

Internal packages & templates now use Base UI rather than Radix UI.

## @fumadocs/asyncapi@0.0.4

### Migrate to `cnfast`

Drop `tailwind-merge`.

# @fumadocs/asyncapi

## 0.0.2

### Patch Changes

- 5017289: Use stable `fuma-translate`
- Updated dependencies [5017289]
- Updated dependencies [7a77722]
  - @fumadocs/api-docs@0.0.2
  - fumadocs-ui@16.10.1
  - fumadocs-core@16.10.1

## 0.0.1

### Patch Changes

- 74102c5: Implement
- Updated dependencies [9b9545f]
- Updated dependencies [0cc1fac]
- Updated dependencies [779efff]
  - fumadocs-core@16.10.0
  - fumadocs-ui@16.10.0
