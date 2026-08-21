## @fumadocs/graphql@0.2.0

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

## @fumadocs/graphql@0.1.2

### Fix dropped optional arguments in playground

The playground's Variables panel exposes every argument of an operation, but the generated query only declares the required ones. Setting an optional argument used to send a variable the document never references, which servers ignore — the request looked successful but ran without it.

The query's variable declarations now follow the panel: setting an argument declares it, unsetting removes it. Sending an operation declares whatever the panel has set, so a query edited by hand can no longer drop a value. Declarations and values written by hand are never rewritten.

Also fixes the playground's form editing the example rendered on the page, which made **Reset** restore edited values instead of the original ones.

## @fumadocs/graphql@0.1.1

### Bump `graphql`

Use GraphQL.js v18.

## @fumadocs/graphql@0.1.0

### Introduce `@fumadocs/graphql`

Generate API reference docs from your GraphQL schemas, similar to the OpenAPI/AsyncAPI integration.

```ts
import { createGraphQL } from '@fumadocs/graphql/server';

export const graphql = createGraphQL({
  input: ['./schema.graphql'],
});
```

Add the generated pages to your source:

```ts
import { loader } from 'fumadocs-core/source';

export const source = loader(
  {
    docs: docs.toFumadocsSource(),
    graphql: await graphql.staticSource({
      baseDir: 'graphql',
      meta: true,
    }),
  },
  {
    baseUrl: '/docs',
    plugins: [graphql.loaderPlugin()],
  },
);
```

And render them with `createGraphQLPage` from `@fumadocs/graphql/ui`, with an optional interactive playground:

```tsx
export const GraphQLPage = createGraphQLPage({
  playground: {
    url: 'https://api.example.com/graphql',
  },
});
```

It accepts SDL files (including `extend type`), SDL text, introspection results, and `GraphQLSchema` instances, and generates per-operation & per-type pages with arguments/fields, deprecations, custom directive callouts, and example queries/responses.

Highlights:

- **Playground**: syntax-highlighted query editor with live validation, a typed variables form generated from argument types, per-endpoint header presets, and GraphQL-aware error display. Configurable via `playground.url`, `allowUrlEdit`, `headers`, `fetcher` and `render`.
- **Usage backlinks**: type pages list where a type is returned, used as a field, or accepted as input.
- **Cross-linking out of the box**: pass `baseUrl` (the `baseUrl` of your `loader()`) to `staticSource()` and type & operation references link to their pages automatically.
- **Request snippets**: generated cURL & JavaScript tabs next to the example query.
