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
