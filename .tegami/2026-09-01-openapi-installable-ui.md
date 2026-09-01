---
packages:
  npm:fumadocs-openapi: minor
---

## Support installing the API playground via Fumadocs CLI

```npm
npx @fumadocs/cli add fumadocs/openapi/playground
```

Use it with the `playground.provider` and `playground.render` options, see [Customise UI](https://fumadocs.dev/docs/integrations/openapi/api-page#customise-ui).

## Pass full props to `schemaUI.render`

It now receives the same props as the built-in Schema UI (including `renderMarkdown` and `renderCodeblock`), so a customised Schema UI can act as a drop-in replacement:

```tsx
schemaUI: {
  render: (props) => <Schema {...props} />,
},
```

## New exports

- OpenAPI schema types from `fumadocs-openapi` (e.g. `OperationObject`, `HttpMethods`).
- `useRenderContext`, `useServerContext` and `useOperationContext` from `fumadocs-openapi/ui`.
