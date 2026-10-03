---
packages:
  'fumadocs-openapi': minor
---

### Headless API playground

`usePlayground()` from `fumadocs-openapi/playground` holds the state of an API playground: its form, auth and the request it sends. The playground installed with Fumadocs CLI is built on it, so the installed code is only UI.

- Responses of `createBrowserFetcher()` carry `duration`, `mediaType`, `fileName` and `text()`.
- Parameters of `useOperation()` are typed as `OperationParameter`, with the `name` and `in` required by OpenAPI. Parameters without a name are skipped.
- `writeOnly` and `readOnly` of `<PlaygroundClient />` are deprecated, they default to the values for requests.
- `FormValues` of `fumadocs-openapi/ui/playground/client` is deprecated.
