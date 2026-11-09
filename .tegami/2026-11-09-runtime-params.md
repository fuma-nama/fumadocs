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
- The table of contents, structured data and processed Markdown of a page in Fumadocs MDX only include the `<show>` branches that show for its props, and render its expressions as values. Set `analysis: 'static'` on the collection to analyse them from the source instead.
- Headings with expressions get their IDs from the rendered text, and duplicate IDs only count the headings that show.
- Added the `props` option of `getPage()`: the content of the page and its outputs render for these props, with its path params.
- Added the `props` option of `loader()`: props for every page, like its MDX components.
- With runtime analysis, processed Markdown and search records render JSX elements like the page, with the components that it imports or declares and the MDX components of its props.
- Deprecated the `components` option of `getText()`, pass MDX components as page props.
- Added `renderToMarkdownSync()` to `fumadocs-core/server`.
- Search records no longer include the imports of included files.
- Added the `analysis` option to `remarkHeading`, `remarkStructure`, `rehypeToc`, `remarkLLMs` and the MDX presets of `fumadocs-core/content`, `static` by default.
- Deprecated the `output` option of `remarkLLMs`, use `analysis`: `string` is `static`, `function` is `runtime`.
- The frontmatter in code of Fumadocs MDX can use imports declared after it, and keeps the other variables declared in its statement.
- `@fumadocs/astro` supports frontmatter in code.
