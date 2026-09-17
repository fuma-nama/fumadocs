---
subject: Shared components of API pages
packages:
  npm:@fumadocs/api-docs: minor
  npm:fumadocs-openapi: patch
  npm:@fumadocs/asyncapi: patch
  npm:@fumadocs/graphql: patch
  npm:@fumadocs/story: patch
---

## `@fumadocs/api-docs/components/defaults`

`createPageComponents()` builds the default `Markdown`, `CodeBlock` and `Heading` of an API page, with the Remark processor rendering code blocks through your own component.

```tsx
import { createPageComponents } from '@fumadocs/api-docs/components/defaults';

const { components, renderMarkdown, renderCodeblock } = createPageComponents({
  shiki,
  shikiOptions: { themes: { light: 'github-light', dark: 'github-dark' } },
});
```

The OpenAPI, AsyncAPI and GraphQL integrations now share it, and no longer depend on `remark`, `remark-rehype` or `hast-util-to-jsx-runtime` themselves.

## Installable UI

The UI an API page renders through is now part of the installation, instead of being imported from the package:

| Component                                                                                   | Installed at                               |
| ------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `Select`, `Input`                                                                           | `components/ui`, reusing the project's own |
| `Accordion`, `Collapsible`, `Dialog`, `Popover`, `Spinner`, `SelectTabs`, playground inputs | `components/api/ui`                        |

`Select` and `Input` follow the Shadcn UI API, so a project that already has them keeps its own. `@fumadocs/story` no longer ships a second copy of either.

`labelVariants` moved from `@fumadocs/api-docs/components/input` to `@fumadocs/api-docs/components/label`, leaving the input a plain Shadcn-compatible primitive.

## Shared internals

The integrations no longer keep their own copy of these, they come from `@fumadocs/api-docs`:

| Module                   | What it holds                                                      |
| ------------------------ | ------------------------------------------------------------------ |
| `utils/use-server-store` | the selected server and its variables, persisted in `localStorage` |
| `utils/use-query`        | the state of an async request                                      |
| `components/badge`       | the coloured label of methods, actions and kinds                   |
| `utils/is-plain-object`  | the plain-object check of both schema layers                       |
