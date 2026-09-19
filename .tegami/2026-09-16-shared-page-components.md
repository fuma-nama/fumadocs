---
subject: Shared components of API pages
packages:
  npm:fumadocs-openapi: patch
  npm:@fumadocs/asyncapi: patch
  npm:@fumadocs/graphql: patch
  npm:@fumadocs/story: patch
---

## Default page components

`createOpenAPIPage()`, `createAsyncAPIPage()` and `createGraphQLPage()` now fill the `Markdown`, `CodeBlock` and `Heading` components you didn't pass, rendering Markdown through Remark and code blocks through the `shiki` option:

```tsx
createOpenAPIPage({
  shiki: defaultShikiFactory,
  components: { SchemaUI, Operation },
});
```

`shiki` is optional — without it, code blocks render unhighlighted.

## Installable UI

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
