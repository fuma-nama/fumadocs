## @fumadocs/asyncapi@0.4.0

### Headless AsyncAPI pages

#### Headless API pages

API pages are now built on a headless layer, use it to build your own UI:

- `createAsyncAPIRenderer()` and `<AsyncAPIProvider />` with your own components.
- the hooks of pages and operations: `useAsyncAPI()`, `useComponents()`, `useRenderContext()`, `useServer()`, `useOperation()` and `useOperationSecurity()`.
- `useServer()` resolves server URLs: `resolveUrl(id)` fills in the variables of a server, and the selected one carries its `title`.

```tsx title="components/api-page.tsx"
'use client';
import { createAsyncAPIRenderer } from '@fumadocs/asyncapi';

export const AsyncAPIPage = createAsyncAPIRenderer({
  components: { Operation, Markdown, CodeBlock, Heading, SchemaUI },
});
```

See [Headless](https://fumadocs.dev/docs/integrations/asyncapi/headless).

`@fumadocs/asyncapi/ui` renders through the layer, its options are unchanged except `content.renderAPIExampleLayout`, which was never rendered and is removed.

#### Install the UI

The UI of API pages can be installed with Fumadocs CLI and edited, reusing the `components/ui` files you already have:

```npm
npx @fumadocs/cli add fumadocs/asyncapi/page
```

It installs `<AsyncAPIPage />` itself, import it from `@/components/asyncapi/page` in place of your `components/api-page.tsx`.

To replace parts of it, install `fumadocs/asyncapi/operation` or `fumadocs/api-docs/schema` and pass them to the new `components` options:

```tsx
export const AsyncAPIPage = createAsyncAPIPage({
  components: { Operation, SchemaUI: Schema },
});
```

#### Remove `generateTypeScriptDefinitions`

The option was never rendered by API pages, and it is gone with its `@fumari/json-schema-ts` dependency. Passing it is now a type error, nothing else changes.

#### Client-safe package entry

`generateFiles()` reads and writes files, so the package entry ships a stubbed build under the `browser` condition. Client components can import `createAsyncAPIRenderer()` and the hooks without pulling `node:fs` into the bundle.

#### Highlighting out of the box

`createAsyncAPIRenderer()` highlights code blocks with the full Shiki bundle, pass a smaller `shiki` factory to trim it.

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

## @fumadocs/asyncapi@0.3.6

### Mark packages side-effect free

All packages now declare `sideEffects` in `package.json`, so bundlers can tree-shake unused modules. Packages shipping stylesheets list them as side effects to keep CSS imports.

## @fumadocs/asyncapi@0.3.5

### Replace `cnfast` with `cn`

Internal refactor only.

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
