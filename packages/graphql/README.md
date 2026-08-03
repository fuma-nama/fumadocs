# Fumadocs GraphQL

Generate API reference docs from GraphQL schemas for [Fumadocs](https://fumadocs.dev), with an interactive playground.

```bash
npm i @fumadocs/graphql graphql
```

`graphql` is a peer dependency.

## Quick Start

Create the server instance from your schema:

```ts
// lib/graphql.ts
import { createGraphQL } from '@fumadocs/graphql/server';

export const graphql = createGraphQL({
  input: ['./schema.graphql'],
});
```

Add the generated pages to your source:

```ts
// lib/source.ts
import { loader } from 'fumadocs-core/source';
import { defineDocs } from 'fumadocs-mdx/macro';
import { graphql } from './graphql';

const docs = defineDocs({
  dir: 'content/docs',
});

export const source = loader(
  {
    docs: docs.toFumadocsSource(),
    graphql: await graphql.staticSource({
      // a route group, generated pages won't have a `/graphql` prefix in their URLs
      baseDir: '(graphql)',
      meta: true,
    }),
  },
  {
    baseUrl: '/docs',
    plugins: [graphql.loaderPlugin()],
  },
);
```

Render them from a client component:

```tsx
// components/api-page.tsx
'use client';
import { createGraphQLPage } from '@fumadocs/graphql/ui';

export const GraphQLPage = createGraphQLPage({
  playground: {
    url: '/api/graphql',
  },
});
```

```tsx
// app/docs/[[...slug]]/page.tsx
if (page.type === 'graphql') {
  return (
    <DocsPage toc={page.data.toc} full>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <GraphQLPage {...page.data.getGraphQLPageProps()} />
      </DocsBody>
    </DocsPage>
  );
}
```

And import the styles in your global CSS:

```css
@import '@fumadocs/graphql/css/preset.css';
```

## Options

### Inputs

`input` accepts an array of file paths/URLs to SDL files, or a record of schema id to input:

- SDL file paths/URLs, or SDL text (including `extend type` definitions).
- Introspection results (JSON).
- `GraphQLSchema` instances.

### Page Presets

Pass options to `staticSource()` to control the generated pages:

- `per: 'item'` (default): a page per operation/named type, use `groupBy` (`'kind' | 'none'` or a function) to group them into folders, and `includeOperations`/`includeTypes` to filter items.
- `per: 'file'`: a single page per schema.
- `per: 'custom'`: bring your own pages builder.

### UI

`createGraphQLPage()` accepts:

- Cross-links of type & operation references are pre-generated when you pass `baseUrl` (the `baseUrl` of your `loader()`) to `staticSource()`; override them with the `typeLinks`/`operationLinks` callbacks if needed.
- `playground`: interactive playground shown on operation pages — `url` (GraphQL endpoint, operations are sent over HTTP POST), `fetcher` (replace the default fetcher, e.g. to proxy requests), or `render` (replace the playground UI).
- `shikiOptions`, `components`, and `content`/`schemaUI` render slots for deeper customisation.

See [Fumadocs docs](https://fumadocs.dev) for more.
