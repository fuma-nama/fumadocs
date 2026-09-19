---
subject: Headless AsyncAPI pages
packages:
  npm:@fumadocs/asyncapi: minor
---

## Headless API pages

API pages are now built on a headless layer, use it to build your own UI:

- `createAsyncAPIPage()` and `<AsyncAPIProvider />` with your own components.
- the hooks of pages and operations: `useAsyncAPI()`, `useComponents()`, `useServer()`, `useOperation()` and `useOperationSecurity()`.

```tsx title="components/api-page.tsx"
'use client';
import { createAsyncAPIPage } from '@fumadocs/asyncapi';

export const AsyncAPIPage = createAsyncAPIPage({
  components: { Operation, Markdown, CodeBlock, Heading, SchemaUI },
});
```

See [Headless](https://fumadocs.dev/docs/integrations/asyncapi/headless).

`@fumadocs/asyncapi/ui` is unchanged, it now renders through the layer.

## Install the UI

The UI of API pages can be installed with Fumadocs CLI and edited:

```npm
npx @fumadocs/cli add fumadocs/asyncapi/page
```

```tsx title="components/api-page.tsx"
'use client';
import { createAsyncAPIPageBase } from '@/components/api/asyncapi/page';
import { defaultShikiFactory } from 'fumadocs-core/highlight/shiki/full';

export const AsyncAPIPage = createAsyncAPIPageBase({ shiki: defaultShikiFactory });
```

To replace parts of it, install `fumadocs/asyncapi/operation` or `fumadocs/api-docs/schema` and pass them to the new `components` options:

```tsx
export const AsyncAPIPage = createAsyncAPIPage({
  components: { Operation, SchemaUI: Schema },
});
```

## Remove `generateTypeScriptDefinitions`

The option was never rendered by API pages, and it is gone with its `@fumari/json-schema-ts` dependency. Passing it is now a type error, nothing else changes.

## Client-safe package entry

`generateFiles()` reads and writes files, so the package entry ships a stubbed build under the `browser` condition. Client components can import `createAsyncAPIPage()` and the hooks without pulling `node:fs` into the bundle.

## Highlighting out of the box

`createAsyncAPIPage()` highlights code blocks with the full Shiki bundle, pass a smaller `shiki` factory to trim it.
