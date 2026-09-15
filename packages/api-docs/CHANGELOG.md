## @fumadocs/api-docs@0.3.0

### Mark packages side-effect free

All packages now declare `sideEffects` in `package.json`, so bundlers can tree-shake unused modules. Packages shipping stylesheets list them as side effects to keep CSS imports.

### Fumadocs OpenAPI v12

#### Headless API pages

API pages are now built on a headless layer, use it to build your own UI:

- `fumadocs-openapi/headless`: `createOpenAPIPage()` and `<OpenAPIProvider />` with your own components, and the hooks of pages and operations, like `useOperation()`, `useExampleRequests()` and `useServer()`.
- `fumadocs-openapi/headless/base`: `createOpenAPIPage()` and `<OpenAPIProvider />` without the default code usages and TypeScript definitions, for smaller bundles.
- `@fumadocs/api-docs/components/schema/headless`: the generation and navigation state of Schema UI, like `generateSchemaUI()` and `useSchemaTabs()`.

See [Headless](https://fumadocs.dev/docs/integrations/openapi/headless).

#### Install the full UI

The entire UI of API pages can be installed with Fumadocs CLI:

```npm
npx @fumadocs/cli add fumadocs/openapi/page
```

```tsx title="components/api-page.tsx"
'use client';
import { createOpenAPIPageBase } from '@/components/api/page';
import { defaultShikiFactory } from 'fumadocs-core/highlight/shiki/full';

export const OpenAPIPage = createOpenAPIPageBase({ shiki: defaultShikiFactory });
```

To customise parts of it, install `fumadocs/openapi/operation` or `fumadocs/api-docs/schema`, and pass them to the new `components` options:

```tsx
export const OpenAPIPage = createOpenAPIPage({
  components: { Operation, SchemaUI: Schema },
});
```

#### Render custom inline code samples

Code samples from `x-codeSamples` and `generateCodeSamples` are now rendered when their id isn't a built-in generator.

#### Data info tags in Schema UI

`SchemaData.infoTags` entries are data rendered by the UI: `{ label, value, block? }` or `{ label, list }`. Custom nodes (`{ node }`) are still accepted, code reading `tag.node` must handle all shapes.

#### Merge `components/schema/client` into `components/schema`

`@fumadocs/api-docs/components/schema` exports the entire Schema UI, including its headless utilities.

```diff
- import { SchemaUI, InlineTag } from '@fumadocs/api-docs/components/schema/client';
+ import { SchemaUI, InlineTag } from '@fumadocs/api-docs/components/schema';
```

#### Migrate options of `createOpenAPIPage()`

Pass components to the `components` option:

```diff
 createOpenAPIPage({
-  schemaUI: { render: (props) => <Schema {...props} /> },
-  renderHeading: (props, depth) => <Heading depth={depth} {...props} />,
-  renderCodeBlock: (props) => <CodeBlock {...props} />,
-  renderMarkdown: (md) => <Markdown md={md} />,
+  components: { SchemaUI: Schema, Heading, CodeBlock, Markdown },
 });
```

- `playground.provider` is removed, the page provides the auth state of API playground.
- `playground.render` and `generateTypeScriptDefinitions` no longer receive `ctx`, read the document from `useOpenAPI().doc`, or the `doc` passed to `generateTypeScriptDefinitions`.
- `operation.APIExampleSelector` is removed, install `fumadocs/openapi/operation` and edit the selector in `usage-tabs.tsx`.
- The `ctx` of `content` render options holds your options with the `schema` and `proxyUrl` of page. `ctx.SchemaUI` and `ctx._default_processMarkdown` are removed, use `useComponents()` in a component.

#### Migrate hooks

The hooks of `fumadocs-openapi/ui` are replaced by `fumadocs-openapi/headless`:

| v11                     | v12                                                              |
| ----------------------- | ---------------------------------------------------------------- |
| `useRenderContext()`    | `useOpenAPI()` (`schema` is renamed to `doc`), `useComponents()` |
| `useServerContext()`    | `useServer()`                                                    |
| `useOperationContext()` | `useOperation()`, `useExampleRequests()`, `useExampleRequest()`  |

```diff
- const { route, examples, example, setExample, setExampleData } = useOperationContext();
+ const { path } = useOperation();
+ const { items, selected, select, update } = useExampleRequests();
+ // data of the selected example, replaces `addListener()`
+ const data = useExampleRequest();
```

Components installed from v11 with Fumadocs CLI (e.g. the API playground) use the old hooks, reinstall them.

#### Remove deprecated APIs

| Removed                                                    | Use                                                 |
| ---------------------------------------------------------- | --------------------------------------------------- |
| `fumadocs-openapi/ui/create-client`                        | `createOpenAPIPage()` from `fumadocs-openapi/ui`    |
| `ApiPageProps`                                             | `OpenAPIPageProps`                                  |
| `OperationItem` and `WebhookItem` of `fumadocs-openapi/ui` | import them from `fumadocs-openapi`                 |
| `getAPIPageProps()` and `getClientAPIPageProps()`          | `getOpenAPIPageProps()`                             |
| `defineI18nOpenAPI()`                                      | `i18n.translations().extend(openapiTranslations())` |
| `APIPage` of MDX components                                | `OpenAPIPage`, generated files only render it       |

## @fumadocs/api-docs@0.2.9

### Mark packages side-effect free

All packages now declare `sideEffects` in `package.json`, so bundlers can tree-shake unused modules. Packages shipping stylesheets list them as side effects to keep CSS imports.

## @fumadocs/api-docs@0.2.8

### Replace `cnfast` with `cn`

Internal refactor only.

## @fumadocs/api-docs@0.2.7

### Keep overlapping `type` sets when merging `allOf`

`intersection` treated any difference in the `type` keyword as an impossible schema and returned `false`, so an `allOf` member using a type array (e.g. `['string', 'null']`, emitted for `nullable: true`) merged with a typed member (`type: 'string'`) produced `false` instead of `type: 'string'` — dropping every property of the schema in the Schema UI and the playground.

Intersecting overlapping type sets now keeps the shared members, and only genuinely disjoint types (e.g. `['string']` with `['number']`) resolve to `false`.

### Use the explicit title of composed schemas in Schema UI

`mergeAllOf` now keeps an explicit title as the display alias of the composed schema (`ChildA | ChildB`), skips titles already covered by the other side of an intersection (`DerivedConfig`, `array<NamedItem>`), and still combines the titles of untitled intersections (`Readable & Writable`).

## @fumadocs/api-docs@0.2.6

### Fix OpenAPI 3.0 `example` in external files crashing `OpenAPIPage`

The version upgrader ran after external documents were embedded under `x-ext`, where it can no longer classify schemas by their JSON path: a schema-level `example` from an external 3.0 file became an Example Object map instead of the JSON Schema `examples` array, crashing the schema UI with `schema.examples is not iterable`.

Each document is now upgraded before bundling embeds it. This also honors the external file's own declared OpenAPI version, so a 3.0 file referenced from a 3.1 document is upgraded too (previously it was skipped entirely).

## @fumadocs/api-docs@0.2.5

### Support HTTP Basic client authentication in OAuth password flow

Some OAuth servers require client credentials in an HTTP Basic `Authorization` header instead of the request body. The password flow dialog now offers a Client Authentication select to choose between the two methods, as described in [RFC 6749, section 2.3.1](https://www.rfc-editor.org/rfc/rfc6749#section-2.3.1).

Fix [#3506](https://github.com/fuma-nama/fumadocs/issues/3506)

## @fumadocs/api-docs@0.2.4

### Preserve `description` when merging `allOf` schemas

`mergeAllOf()` no longer drops descriptions defined inside `allOf` members, so this common composition pattern renders its description in the Schema UI:

```yaml
amount:
  allOf:
    - $ref: '#/components/schemas/Money'
    - description: Property-specific description
```

The last defined description among members wins, and a description on the outer schema keeps precedence over all of them.

## @fumadocs/api-docs@0.2.3

### Survive `$ref` cycles in `dereferenceShallow`

A Reference Object whose target eventually refers back to it overflowed the stack. The schema is now marked while its target resolves, so a cycle resolves to the sibling keywords instead of recursing forever.

## @fumadocs/api-docs@0.2.2

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

## @fumadocs/api-docs@0.2.1

### Rewrite union detector

Use a simplified JSON schema validator to identify the active tab of an union field in playground UI.

## @fumadocs/api-docs@0.2.0

### Use `@scalar/json-magic` for dereferencing

This will affect all raw access to OpenAPI/AsyncAPI documents, ensure to use `dereferenceShallow()` public API.

### Migrate from `js-yaml` to `yaml`

## @fumadocs/api-docs@0.1.0

### Default to Base UI

Internal packages & templates now use Base UI rather than Radix UI.

## @fumadocs/api-docs@0.0.4

### Migrate to `cnfast`

Drop `tailwind-merge`.

### Inline ref parser dependency

## @fumadocs/api-docs@0.0.3

### Improve Schema UI tag rendering

Change behaviour for multi-line value in schema tags.

# @fumadocs/api-docs

## 0.0.2

### Patch Changes

- 5017289: Use stable `fuma-translate`
- Updated dependencies [5017289]
- Updated dependencies [7a77722]
  - fumadocs-ui@16.10.1
  - fumadocs-core@16.10.1
