---
'fumadocs-openapi': major
---

**Unify RSC & client APIs**

- `createAPIPage()` & `createClientAPIPage()` unify into `createOpenAPIPage()`, no longer accepts an `OpenAPIServer` & `client` option.
- MDX component `<APIpage />` renames to `<OpenAPIPage />`, server should pass props to it using `page.data.getOpenAPIPageProps()` (virtual files) or `openapi.preloadOpenAPIPage()` (pre-generated files).
- Remove subpath exports: `ui/base`, `ui/client`, `ui/create-client`.
- Rename types: `CreateAPIPageOptions` → `CreateOpenAPIPageOptions`, `ApiPageProps` → `OpenAPIPageProps`.

**Server & loader**

- `page.data.getAPIPageProps()` / `getClientAPIPageProps()` → `getOpenAPIPageProps()` (sync).
- `getSchema()` now returns `{ id, bundled }` instead of a dereferenced document. Dereferencing happens at render time.
- `input`: drop the whole-map factory `() => SchemaMap`. Use a record instead: `[k: string]: string | Document | (() => Awaitable<string | Document>)`.

**Customization callbacks**

- `generateCodeSamples`: `(method: MethodInformation)` → `({ operation, method, pathItem })`, more context is available.
- `generateTypeScriptDefinitions`: context is now `{ readOnly, writeOnly, ctx }`, operation object is no longer available.
- `renderOperationLayout`: `(slots, ctx, method)` → `(slots, { operation, method, pathItem, ctx })`.
- `playground.render`: `method: MethodInformation` → separate `method`, `operation`, `pathItem`.
- Rename options: `renderHeading`, `renderMarkdown`, `renderCodeBlock` → `components.Heading`, `components.Markdown`, `components.CodeBlock`.

**Drop deprecated APIs**

- `transformerOpenAPI()`: use `openapiPlugin()` instead.
- `createCodeSample()`: use `CodeUsageGenerator` API instead.
- `generateTypeScriptSchema()`: use `generateTypeScriptDefinitions()` instead.
- `defineI18nOpenAPI()`: use new translations API instead.

**Other**

- `generateFiles` & `beforeWrite` context: remove `documents` field, access from the OpenAPI server instead.
