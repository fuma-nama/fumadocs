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
