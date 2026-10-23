## @fumadocs/local-md@0.4.0

### `<include>` in Local Markdown

[`<include>`](https://fumadocs.dev/docs/mdx/include) is enabled by default in `@fumadocs/local-md` and `@fumadocs/satteri/local-md`, and pages reload when the files they include change, with both the Vite and dev server watchers.

- `invalidateFile()` returns whether the source uses the file.
- Both require `fumadocs-core` 16.17.8.

### Bring your own highlighter

Shiki stays the default, and isn't loaded when you highlight code with another highlighter.

- `fumadocs-core/highlight` exports a `Highlighter` interface, created with `createHighlights()` from `fumadocs-core/highlight/highlights` (`@pierre/highlights`) or `createShikiHighlighter()` from `fumadocs-core/highlight/shiki`, `override()` creates one with other options.
- `rehypeCodeFromHighlighter` from `fumadocs-core/mdx-plugins/rehype-code.core` highlights code blocks with a highlighter, or a function creating one with the transformers of Fumadocs. `createRehypeCode` is deprecated, Sätteri has `rehypeCodeFromHighlighter` in `@fumadocs/satteri/rehype-code`. Pass `transformerTwoslash()` in its `transformers` option to analyze Twoslash blocks in batches.
- `createServerCodeBlock()` and `createDynamicCodeBlock()` in Fumadocs UI create code blocks from a highlighter. Dynamic code blocks are highlighted on the server too.
- `toJsx()` from `fumadocs-core/utils/hast-to-jsx` converts hast into React elements like `toJsxRuntime()` of `hast-util-to-jsx-runtime`, MDX nodes through an `evaluator`, over 10x faster on highlighted code, whose spans render as one HTML string. Every Fumadocs renderer uses it, `hast-util-to-jsx-runtime` is no longer a dependency.
- Twoslash loads the languages of code blocks in popups before highlighting, an unknown language there no longer fails the code block.
- OpenAPI Standalone highlights code blocks with Highlights, in its server-rendered pages too.
- The page factories of OpenAPI, GraphQL and AsyncAPI, type tables, `createPython()`, `createPythonComponents()`, `localHtml()` and the shadcn `createSnippet()` take a `highlighter`.
- Deprecated `shiki` and `shikiOptions` of the API pages and `shiki` of type tables, pass a `highlighter` instead.
- Integrations require `fumadocs-core` 16.17.8, the API pages and shadcn also require `fumadocs-ui` 16.17.8.

## @fumadocs/local-md@0.3.5

### Mark packages side-effect free

All packages now declare `sideEffects` in `package.json`, so bundlers can tree-shake unused modules. Packages shipping stylesheets list them as side effects to keep CSS imports.

## @fumadocs/local-md@0.3.4

### Read structured data from `page.data.structuredData()`

Search indexing no longer falls back to `(await page.data.load()).structuredData`. Runtime content sources expose `structuredData()` on page data instead, sharing the compile with `load()`:

```ts
const structuredData = await page.data.structuredData();
```

The renderer returned by `load()` still carries `structuredData`, existing code keeps working.

## @fumadocs/local-md@0.3.1

### Improve performance

Fixed cache misses and edge cases.

### Extract shared local content source logic to `@fumadocs/local-content`

## @fumadocs/local-md@0.3.0

### Default to Base UI

Internal packages & templates now use Base UI rather than Radix UI.

## @fumadocs/local-md@0.2.4

### Fix deprecation warnings

Address https://github.com/fuma-nama/fumadocs/issues/3380.

# @fumadocs/local-md

## 0.2.3

### Patch Changes

- 42f0255: Support `invalidate` & `revalidate` on dynamic loader
- Updated dependencies [42f0255]
- Updated dependencies [a807798]
  - fumadocs-core@16.9.3

## 0.2.2

### Patch Changes

- 1fb6a61: Support custom base directory for content sources

## 0.2.1

### Patch Changes

- 79d3209: fix `icon` & `_openapi` page data locations
- Updated dependencies [79d3209]
  - fumadocs-core@16.8.5

## 0.2.0

### Minor Changes

- 4f9bd3e: support non-RSC usage

## 0.1.3

### Patch Changes

- 0e8405a: fix file watcher pattern matching
  - fumadocs-core@16.8.2

## 0.1.2

### Patch Changes

- 9aac45a: include types for compiler options

## 0.1.1

### Patch Changes

- 974b093: Support custom options for built-in plugins
  - fumadocs-core@16.8.1

## 0.1.0

### Minor Changes

- 0e2b5b6: Initial release
