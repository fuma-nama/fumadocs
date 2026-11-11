---
packages:
  'fumadocs-core': minor
  'fumadocs-mdx': minor
  '@fumadocs/satteri': minor
  '@fumadocs/local-md': minor
  '@fumadocs/astro': minor
  'create-fumadocs-app': patch
---

### Path params at runtime

- Refactored path params: each file of a dynamic path compiles once, and its content reads the params as `props` when rendering.
- Refactored `remarkShow`: conditions are checked when rendering, and the `define` option and `showElement` export are removed.
- The table of contents, structured data and processed Markdown of a page only include the `<show>` branches that show for its props, and give the values of its expressions.
- An output is a function of the page props only when it reads them, with expressions, `<show>` branches or heading IDs from code: otherwise `toc`, `structuredData`, `_markdown` and `extractedReferences` stay static values.
- Processed Markdown of a page that reads props is a component, render it with `renderToMarkdown()`.
- Headings with expressions get their IDs from the rendered text, and duplicate IDs only count the headings that show.
- Added the `props` option of `getPage()`: the content and outputs of the page follow these props, with its path params.
- Processed Markdown with `output: 'function'` resolves JSX elements like the page, with the components that it imports or declares and the MDX components of its props.
- Deprecated the `components` option of `getText()`, pass MDX components as page props.
- Added `unstable_runtimeOutputs` in file data for custom content sources: expressions are values in the outputs of a page, and the outputs that read props are functions of its props. Without it, a document with `<show>` fails to compile.
- Added `rehypeHeading`, which gives headings their IDs from code. Fumadocs MDX, `@fumadocs/astro` and local Markdown enable it.
- Added `slugImportSource` of `remarkHeading`: a module that slugs heading IDs from the rendered text, for a custom `slug`.
- The client loader of Fumadocs MDX takes the params of a page: `preload(path, params)`, `getComponent(path, params)` and `useContent(path, props, params)`.
- Table of contents titles resolve MDX components from the page props.
- Search records are text with the values of expressions, reading the structured data of a page never renders it.
- Added the `search` target of `renderToMarkdown()`, for the text of search indexes: `asMarkdown()` returns the target.
- Added the `markdown` namespace of `replaceSource()`, for edits of processed Markdown only.
- Search records no longer include the imports of included files.
- The frontmatter in code of Fumadocs MDX can use imports declared after it, and keeps the other variables declared in its statement.
- `@fumadocs/astro` supports frontmatter in code.
