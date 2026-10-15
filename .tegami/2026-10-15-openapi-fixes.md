---
packages:
  'fumadocs-openapi': patch
---

### Fix inline code samples with a function `source`

`x-codeSamples` and `generateCodeSamples` with a function as `source` rendered an empty code sample.

### Fix the sticky example column

The example column sat under the header of Notebook layouts, and could be taller than the viewport.

### Hide internal APIs

- `generatePythonObject()` of `fumadocs-openapi/requests/generators/python`.
- `InternalOpenAPIMeta` of `fumadocs-openapi/server`, and `_getWatchPaths()` of the OpenAPI server.
- The `Awaitable` and `DistributiveOmit` types.
- `subscribe()` of `usePlaygroundAuth()`, listen to the auth values in its `stf` instead.
- Files under `fumadocs-openapi/css/` other than `preset.css`.
