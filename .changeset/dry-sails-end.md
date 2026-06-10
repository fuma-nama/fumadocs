---
'fumadocs-openapi': major
---

**Unify RSC & client APIs**

- `createAPIPage()` & `createClientAPIPage()` unify into `createOpenAPIPage()`:
  - no longer accepts an `OpenAPIServer` & `client` option.
  - requires `api-page.tsx` to be a client component.
  - server should pass page props using `page.data.getOpenAPIPageProps()` (virtual files) or `openapi.preloadOpenAPIPage()` (pre-generated files).
- Remove subpath exports: `ui/client`.

**Server & loader**

- `getSchema()` no longer includes the dereferenced document.
- `input`: drop the whole-map factory `() => SchemaMap`. Use a record instead: `[k: string]: string | Document | (() => Awaitable<string | Document>)`.

**Customization callbacks**

More context will be available to callbacks:

- `generateCodeSamples`: `(method: MethodInformation)` → `({ operation, method, pathItem })`.
- `renderOperationLayout`: `(slots, ctx, method)` → `(slots, { operation, method, pathItem, ctx })`.
- `playground.render`: `method: MethodInformation` → `({ operation, method, pathItem })`.

**Drop deprecated APIs**

- `transformerOpenAPI()`: use `openapiPlugin()` instead.
- `createCodeSample()`: use `CodeUsageGenerator` API instead.
- `generateTypeScriptSchema()`: use `generateTypeScriptDefinitions()` instead.
- `defineI18nOpenAPI()`: use the new translations API instead.
- `playground.requestTimeout` option: use `fetchOptions.requestTimeout` instead.
- `allowedUrls` option: use `allowedOrigins` or `filterRequest` instead.
- `groupStyle` option: use `folderStyle` instead.

**Other**

- `generateFiles` & `beforeWrite` context: remove `documents` field, access from the OpenAPI server instead.
