---
subject: Headless GraphQL pages
packages:
  npm:@fumadocs/graphql: minor
---

## Headless layer

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

## Install the UI

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

## `@fumadocs/graphql/ui/playground`

The playground is its own entry, so installing the operation or page UI no longer copies it:

```npm
npx @fumadocs/cli add fumadocs/graphql/playground
```

What it runs on comes from `@fumadocs/graphql/playground`: `executeGraphQL()` (moved from the package entry), `inputTypeToJsonSchema()` for the form model of arguments, and the stored endpoint and headers.

## Highlighting out of the box

`createGraphQLRenderer()` highlights code blocks with the full Shiki bundle, pass a smaller `shiki` factory to trim it.
