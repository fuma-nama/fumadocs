## @fumadocs/graphql@0.3.0

### Headless GraphQL pages

#### Headless layer

GraphQL pages are now built on a headless layer, use it to build your own UI:

```tsx title="components/api-page.tsx"
'use client';
import { createGraphQLRenderer } from '@fumadocs/graphql';

export const GraphQLPage = createGraphQLRenderer({
  components: { Operation, TypeDocs, Markdown, CodeBlock, Heading, SchemaUI },
});
```

- `<GraphQLProvider />` holds the schema built from SDL, the page links and your components.
- `<OperationProvider />` and `useOperation()` derive an operation: its `field`, `title`, `directives` and generated `example`.
- `<TypeProvider />` and `useNamedType()` derive a named type: its `kind`, `directives`, `relations` and usages.
- `useGraphQL()`, `useComponents()`, `useRenderContext()`, `useTypeLink()` and `useOperationLink()` expose the page state.
- `generateRequestSnippets()` from `@fumadocs/graphql/utils/snippets` builds the cURL and `fetch` snippets of an example.
- `generateGraphQLSchemaUI()` turns a type, field or argument into the data the Schema UI draws, the installed Schema UI only renders it.

`@fumadocs/graphql/ui` is built on it, its rendering is unchanged. `typeLinks` and `operationLinks` receive the name (and kind) only, the `ctx` argument is gone.

#### Install the UI

The UI of GraphQL pages can be installed with Fumadocs CLI and edited:

```npm
npx @fumadocs/cli add fumadocs/graphql/page
```

It installs `<GraphQLPage />` itself, import it from `@/components/graphql/page` in place of your `components/api-page.tsx`.

Parts are installable too (`operation`, `type-docs`, `schema-ui`, `playground`) and passed to the new `components` options:

```tsx
export const GraphQLPage = createGraphQLPage({
  components: { Operation, TypeDocs },
});
```

See [Headless](https://fumadocs.dev/docs/integrations/graphql/headless).

#### `@fumadocs/graphql/ui/playground`

The playground is its own entry, so installing the operation or page UI no longer copies it:

```npm
npx @fumadocs/cli add fumadocs/graphql/playground
```

What it runs on comes from `@fumadocs/graphql/playground`: `executeGraphQL()` (moved from the package entry), `inputTypeToJsonSchema()` for the form model of arguments, and the stored endpoint and headers.

#### Highlighting out of the box

`createGraphQLRenderer()` highlights code blocks with the full Shiki bundle, pass a smaller `shiki` factory to trim it.

### Shared components of API pages

#### Default page components

`createOpenAPIRenderer()`, `createAsyncAPIRenderer()` and `createGraphQLRenderer()` fill the `Markdown`, `CodeBlock` and `Heading` components you didn't pass, rendering Markdown through Remark and code blocks through Shiki:

```tsx
createOpenAPIRenderer({
  components: { SchemaUI, Operation },
});
```

`shiki` defaults to the full bundle, `createOpenAPIBaseRenderer()` takes the factory you pass instead and leaves the bundle out.

#### Installable UI

The UI an API page renders through is now part of the installation, instead of being imported from the package:

| Component                                                                                   | Installed at                               |
| ------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `Select`, `Input`                                                                           | `components/ui`, reusing the project's own |
| `Accordion`, `Collapsible`, `Dialog`, `Popover`, `Spinner`, `SelectTabs`, playground inputs | `components/api/ui`                        |
| anchor IDs of deep-linkable sections                                                        | `components/api/ui/auto-anchor`            |

`Select` and `Input` follow the Shadcn UI API, so a project that already has them keeps its own. `@fumadocs/story` no longer ships a second copy of either.

`labelVariants` moved to the installed `label` component, leaving the input a plain Shadcn-compatible primitive.

The integrations share one implementation of these internally, instead of each keeping a copy: the selected server and its variables, the state of an async request, the coloured label of methods and kinds, and the plain-object check of both schema layers.

The request pipeline of the playground stays in the package too, so an installed playground drives it instead of copying it: `encodeRequestData()`, `resolveMediaAdapter()`, `isMediaTypeSupported()` and the request data types come from `fumadocs-openapi/requests`, and `createBrowserFetcher()` with `usePlaygroundAuth()` from `fumadocs-openapi/playground`.

### JSON Schema toolkit

#### `@fumadocs/json-schema`

The JSON Schema utilities of API pages are now their own package, with no Fumadocs dependencies:

```ts
import { dereference, matches, mergeAllOf, sample, stringify } from '@fumadocs/json-schema';
import { bundle } from '@fumadocs/json-schema/bundle';
```

`bundle()` is a separate entry because it reads files and URLs, everything else runs in the browser.

`@fumadocs/json-schema/react` renders a schema into the data an API page draws: `generateSchemaUI()` with the `SchemaData` and `InfoTag` types. It was in the Schema UI before, where every install copied it. A labelled tag can be `prose`, for values like a Markdown deprecation reason.

They were `@fumadocs/api-docs/schema/*` before, and the API was cleaned up while moving:

| Before                                         | Now                                    |
| ---------------------------------------------- | -------------------------------------- |
| `ParsedSchema`                                 | `JsonSchema`                           |
| `NoReference` / `NoReferenceSwallow`           | `Dereferenced` / `DereferencedShallow` |
| `dereferenceShallow(schema)`                   | `dereference(schema)`                  |
| `matchesSchema(schema, value)`                 | `matches(schema, value)`               |
| `typeMatches(value, type)`                     | `matchesType(value, type)`             |
| `schemaToString(schema, FormatFlags.UseAlias)` | `stringify(schema, { alias: true })`   |

#### Trim code usages and TypeScript definitions

`createOpenAPIBaseRenderer()` from `fumadocs-openapi` registers no code usage generators and no TypeScript definitions, so a page built on it bundles only what you pass:

```tsx
import { createCodeUsageGeneratorRegistry } from 'fumadocs-openapi/requests/generators';
import { curl } from 'fumadocs-openapi/requests/generators/curl';

createOpenAPIBaseRenderer({
  shiki,
  codeUsages: createCodeUsageGeneratorRegistry().register(curl),
  components: { ... },
});
```

`createOpenAPIRenderer()` and `fumadocs-openapi/ui` register every language and TypeScript definitions for you.

#### Remove `useStorageKey()`

The hook returned `(name) => storageKeyPrefix + name`. Read the prefix from the page instead:

```tsx
const { storageKeyPrefix } = useOpenAPI();
localStorage.getItem(`${storageKeyPrefix}my-key`);
```

`useAsyncAPI()` works the same way.

#### `@fumadocs/api-docs` is no longer published

It held the UI the integrations share, and that UI is now either bundled into them or installed with Fumadocs CLI, so nothing imports it by name any more. If you imported it directly:

| Before                                     | Now                                                  |
| ------------------------------------------ | ---------------------------------------------------- |
| `@fumadocs/api-docs/schema/*`              | `@fumadocs/json-schema`                              |
| `@fumadocs/api-docs/components/schema*`    | `npx @fumadocs/cli add fumadocs/api-docs/schema`     |
| `@fumadocs/api-docs/components/*` (the UI) | installed with the component that uses it            |
| `@fumadocs/api-docs/i18n`                  | the integration's own `Translations` covers its keys |
| `@fumadocs/api-docs/css/preset.css`        | already included by the integration's preset         |

The CLI namespace is unchanged, `fumadocs/api-docs/schema` still installs the Schema UI.

## @fumadocs/graphql@0.2.7

### Mark packages side-effect free

All packages now declare `sideEffects` in `package.json`, so bundlers can tree-shake unused modules. Packages shipping stylesheets list them as side effects to keep CSS imports.

## @fumadocs/graphql@0.2.6

### Replace `cnfast` with `cn`

Internal refactor only.

## @fumadocs/graphql@0.2.4

### Require `graphql` v17

The peer range now correctly requires `^17.0.0`.

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
