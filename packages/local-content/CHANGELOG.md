## @fumadocs/local-content@0.3.0

### Watch the dependencies of local content

- Integrations call `file.addDependency(path)` for the files a parsed file depends on, like included files. A change to them invalidates the file, and the Vite & dev server watchers watch them, even outside the content directory.
- `invalidateFile()` returns whether the source uses the file, `onDependency()` listens to the dependencies. Custom sources passed to the watchers need both.
- `watchWithVite()` called after the Vite server started now watches content directories outside of Vite's root.

## @fumadocs/local-content@0.2.2

### Mark packages side-effect free

All packages now declare `sideEffects` in `package.json`, so bundlers can tree-shake unused modules. Packages shipping stylesheets list them as side effects to keep CSS imports.

## @fumadocs/local-content@0.2.1

### Simplify cache

## @fumadocs/local-content@0.2.0

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

### Read files in bounded chunks during a cold scan

`getFiles()` awaits each chunk before starting the next, instead of starting the entire tree concurrently.

## @fumadocs/local-content@0.1.2

### Obsidian content source v1

Render Obsidian vaults directly through static or dynamic Fumadocs sources, with lazy in-memory compilation and local content hot reload. Remove the old generated-file and remark-plugin integrations.

Resolve URL-encoded relative file links against their decoded source paths.

## @fumadocs/local-content@0.1.1

### Extract shared local content source logic to `@fumadocs/local-content`
