---
'fumadocs-openapi': major
---

**Unify RSC & client APIs**

- `createAPIPage()` & `createClientAPIPage()` unify into `createOpenAPIPage()`, it is client component only. It no longer accepts an `OpenAPIServer`.
- MDX component `<APIpage />` renames to `<OpenAPIPage />`, server should pass props to it using `page.data.getOpenAPIPageProps()` (virtual files) or `openapi.preloadOpenAPIPage()` (pre-generated files).
- Remove subpath exports: `ui/base`, `ui/client` (`defineClientConfig`), `ui/create-client`.
- Rename types: `CreateAPIPageOptions` → `CreateOpenAPIPageOptions`, `ApiPageProps` / `ServerApiPageProps` / `ClientApiPageProps` → `OpenAPIPageProps` / `OpenAPIPageProps_Spec` / `OpenAPIPageProps_Preloaded`. `OperationItem` & `WebhookItem` are exported from the root entry only.

**Server & loader**

- `page.data.getAPIPageProps()` / `getClientAPIPageProps()` → `getOpenAPIPageProps()` (sync).
- `getSchema()` now returns `{ id, bundled }` instead of a dereferenced document. Dereferencing happens at render time.
- `input`: drop the whole-map factory `() => SchemaMap`. Use a record instead: `[k: string]: string | Document | (() => Awaitable<string | Document>)`.

**Customization callbacks**

- `generateCodeSamples`: `(method: MethodInformation)` → `({ operation, method, pathItem })`. `MethodInformation` is removed.
- `generateTypeScriptDefinitions`: context is now `{ readOnly, writeOnly, ctx }` instead of extending `RenderContext` with `operation`.
- `renderOperationLayout`: `(slots, ctx, method)` → `(slots, { operation, method, pathItem, ctx })`.
- `APIPlaygroundProps` (for `playground.render`): `method: MethodInformation` → separate `method`, `operation`, `pathItem`.
- Rename options: `renderHeading`, `renderMarkdown`, `renderCodeBlock` → `components.Heading`, `components.Markdown`, `components.CodeBlock`.
- Remove options: `client`, `generateTypeScriptSchema` (deprecated).

**Drop deprecated APIs**

- `transformerOpenAPI()` (use `openapiPlugin()`), `createCodeSample()`, `defineI18nOpenAPI()`, `defineClientConfig()`.

**Other**

- `generateFiles` & `beforeWrite` context: remove `documents` field, access from the OpenAPI server instead.
