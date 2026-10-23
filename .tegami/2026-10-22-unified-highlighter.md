---
packages:
  'fumadocs-core': patch
  'fumadocs-ui': patch
  '@fumadocs/base-ui': patch
  'fumadocs-openapi': patch
  '@fumadocs/openapi-standalone': patch
  '@fumadocs/graphql': patch
  '@fumadocs/asyncapi': patch
  'fumadocs-typescript': patch
  '@fumadocs/satteri': patch
  'fumadocs-python': patch
  '@fumadocs/local-html': patch
  '@fumadocs/shadcn': patch
  '@fumadocs/ai-chat': patch
  '@fumadocs/local-md': patch
  'fumadocs-obsidian': patch
  'fumadocs-preview': patch
  'fumadocs-twoslash': patch
---

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
