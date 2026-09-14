---
packages:
  npm:fumadocs-openapi: minor
---

## Headless API pages

The runtime of API pages now lives in the new `fumadocs-openapi/headless` entry, so the UI can be installed with Fumadocs CLI or built from scratch:

- `<OpenAPIProvider />` takes the bundled document, request options and the components the UI renders through.
- `<OperationProvider />` with `useOperation()`, `useExampleRequests()`, `useExampleRequest()`, `useCodeUsages()`, `useCodeUsage()` and `useResponseExamples()`.
- `useOpenAPI()`, `useComponents()`, `useServer()`, `useAuth()`, `useStorageKey()` and `useTypeScriptDefinitions()`.

The operation UI can be installed with `npx @fumadocs/cli add fumadocs/openapi/operation` and replaced via `components.Operation`. `components.SchemaUI` replaces the Schema UI.

Inline code samples (`x-codeSamples`, `generateCodeSamples`) with an id that isn't a built-in generator are now rendered, they were skipped before.

Deprecated, removed in the next major: the `content.render*`, `schemaUI.render`, `playground.provider` and `operation` options of `createOpenAPIPage()`, the `ctx` passed to `playground.render`, `useRenderContext()`, `useServerContext()` (use `useServer()`), `useOperationContext()` and the `ctx` of `generateTypeScriptDefinitions` (use `document`). They remain on `fumadocs-openapi/ui`, the headless entry only ships the new API.
