---
subject: Headless AsyncAPI pages
packages:
  npm:@fumadocs/asyncapi: minor
---

## Headless API pages

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

## Install the UI

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

## Remove `generateTypeScriptDefinitions`

The option was never rendered by API pages, and it is gone with its `@fumari/json-schema-ts` dependency. Passing it is now a type error, nothing else changes.

## Client-safe package entry

`generateFiles()` reads and writes files, so the package entry ships a stubbed build under the `browser` condition. Client components can import `createAsyncAPIRenderer()` and the hooks without pulling `node:fs` into the bundle.

## Highlighting out of the box

`createAsyncAPIRenderer()` highlights code blocks with the full Shiki bundle, pass a smaller `shiki` factory to trim it.
