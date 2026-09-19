---
subject: Headless GraphQL pages
packages:
  npm:@fumadocs/graphql: minor
---

## Headless layer

GraphQL pages are now built on a headless layer, use it to build your own UI:

```tsx title="components/api-page.tsx"
'use client';
import { createGraphQLPage } from '@fumadocs/graphql';

export const GraphQLPage = createGraphQLPage({
  components: { Operation, TypeDocs, Markdown, CodeBlock, Heading, SchemaUI },
});
```

- `<GraphQLProvider />` holds the schema built from SDL, the page links and your components.
- `<OperationProvider />` and `useOperation()` derive an operation: its `field`, `title`, `directives` and generated `example`.
- `<TypeProvider />` and `useNamedType()` derive a named type: its `kind`, `directives`, `relations` and usages.
- `useGraphQL()`, `useComponents()`, `useTypeLink()` and `useOperationLink()` expose the page state.
- `generateRequestSnippets()` builds the cURL and `fetch` snippets of an example.

`@fumadocs/graphql/ui` is built on it, its options and rendering are unchanged.

## Install the UI

The UI of GraphQL pages can be installed with Fumadocs CLI and edited:

```npm
npx @fumadocs/cli add fumadocs/graphql/page
```

```tsx title="components/api-page.tsx"
'use client';
import { createGraphQLPageBase } from '@/components/api/graphql/page';
import { defaultShikiFactory } from 'fumadocs-core/highlight/shiki/full';

export const GraphQLPage = createGraphQLPageBase({ shiki: defaultShikiFactory });
```

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

`inputTypeToJsonSchema()`, which turns GraphQL input types into the form's JSON Schema, comes from `@fumadocs/graphql`.

## Highlighting out of the box

`createGraphQLPage()` highlights code blocks with the full Shiki bundle, pass a smaller `shiki` factory to trim it.
