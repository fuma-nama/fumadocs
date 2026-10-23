## @fumadocs/local-html@0.2.0

### Watch the dependencies of local content

- Integrations call `file.addDependency(path)` for the files a parsed file depends on, like included files. A change to them invalidates the file, and the Vite & dev server watchers watch them, even outside the content directory.
- `invalidateFile()` returns whether the source uses the file, `onDependency()` listens to the dependencies. Custom sources passed to the watchers need both.
- `watchWithVite()` called after the Vite server started now watches content directories outside of Vite's root.

### Unknown languages in Local HTML

Code blocks in languages Shiki doesn't know render as plain text, instead of failing the page.

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

## @fumadocs/local-html@0.1.3

### Mark packages side-effect free

All packages now declare `sideEffects` in `package.json`, so bundlers can tree-shake unused modules. Packages shipping stylesheets list them as side effects to keep CSS imports.

## @fumadocs/local-html@0.1.2

### Read structured data from `page.data.structuredData()`

Search indexing no longer falls back to `(await page.data.load()).structuredData`. Runtime content sources expose `structuredData()` on page data instead, sharing the compile with `load()`:

```ts
const structuredData = await page.data.structuredData();
```

The renderer returned by `load()` still carries `structuredData`, existing code keeps working.

## @fumadocs/local-html@0.1.0

### New package: `@fumadocs/local-html`

A content source for local HTML files. It integrates externally-produced HTML pages (exported decks, reports, agent-generated deliverables) into a Fumadocs site, adapting them to the docs theme: content is scoped to `<main>`/`<article>`, page chrome and scripts/styles are dropped, `class`/`style` attributes are removed so prose styling takes over, and headings get generated ids for TOC and search indexing.

Code blocks are highlighted with Shiki, configured through `rehypeCodeOptions` like `@fumadocs/local-md` (`false` to skip it). The language comes from the block's `language-*` class, which now survives `adaptStyles`.

Hot reload works like `@fumadocs/local-md`: `@fumadocs/local-html/dev/vite` for Vite, or the bundled `local-html dev` server with `@fumadocs/local-html/dev/ws` for everything else.
