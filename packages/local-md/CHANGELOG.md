## @fumadocs/local-md@0.5.0

### Path params at runtime

- Refactored path params: each file of a dynamic path compiles once, and its content reads the params as `props` when rendering.
- Refactored `remarkShow`: conditions are checked when rendering, and the `define` option and `showElement` export are removed.
- The table of contents, structured data and processed Markdown of a page only include the `<show>` branches that show for its props, and give the values of its expressions.
- Headings with expressions get their IDs from the rendered text, and duplicate IDs only count the headings that show.
- Added the `props` option of `getPage()`: the content and outputs of the page follow these props, with its path params.
- Processed Markdown and search records resolve JSX elements like the page, with the components that it imports or declares and the MDX components of its props.
- Search records of Fumadocs MDX keep the elements of every component by default, set `filterElement` of `remarkStructure` to choose them.
- Deprecated the `components` option of `getText()`, pass MDX components as page props.
- Added `unstable_runtimeOutputs` in file data for custom content sources: the plugins export the outputs of a page as functions of its props. Without it, a document with `<show>` fails to compile.
- Added `rehypeHeading`, which gives headings their IDs from code. Fumadocs MDX, `@fumadocs/astro` and local Markdown enable it.
- Added `slugImportSource` of `remarkHeading`: a module that slugs heading IDs from the rendered text, for a custom `slug`.
- The client loader of Fumadocs MDX takes the params of a page: `preload(path, params)`, `getComponent(path, params)` and `useContent(path, props, params)`.
- Table of contents titles resolve MDX components from the page props.
- Loading a page of an async collection or of `@fumadocs/astro` no longer renders its structured data: `structuredData` of the loaded page is read without rendering, `structuredData()` renders it.
- Added the `search` target of `renderToMarkdown()`, which renders search records: `asMarkdown()` returns the target, so a component can give agents more than search indexes.
- Added the `markdown` namespace of `replaceSource()`, for edits of processed Markdown only.
- Search records no longer include the imports of included files.
- The frontmatter in code of Fumadocs MDX can use imports declared after it, and keeps the other variables declared in its statement.
- `@fumadocs/astro` supports frontmatter in code and meta files in code, like `meta.ts`.
- Async pages of Fumadocs MDX load their content once, and render without suspending again once loaded.

## @fumadocs/local-md@0.4.1

### Frontmatter and Meta Files in Code

- An MDX page can export `frontmatter`, merged into its frontmatter and validated by the schema. On a dynamic page, it reads the params as `props`.
- Meta files can be modules, like `meta.ts`. The meta file of a dynamic folder can export a function of the folder's params.

### Path params and `<show>`

- A folder or file named `[name]` makes a page for each value listed in `staticParams` of its meta file or frontmatter.
- Each page is compiled for its params, read as `props`, and a file at a static path replaces the page of its value.
- `<show when={...}>` shows content on a condition. Conditions on params and inlined env vars are decided before headings, TOC, search and Markdown.
- The `define` option of Remark Show sets the values resolved at build time, like Vite's `define`, also per page.
- Custom sources give a dynamic file `dataAt()`, and `getStaticParams()` lists its params from any storage.

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
