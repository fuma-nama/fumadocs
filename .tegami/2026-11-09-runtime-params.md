---
packages:
  'fumadocs-core': minor
  'fumadocs-mdx': minor
  '@fumadocs/satteri': minor
  '@fumadocs/local-md': minor
  '@fumadocs/astro': minor
  '@fumadocs/cli': patch
  '@fumadocs/mdx-remote': patch
  'create-fumadocs-app': patch
---

### Path params at runtime

- Refactored path params: each file of a dynamic path compiles once, and its content reads the params as `props` when rendering.
- Refactored `remarkShow`: conditions are checked when rendering, and the `define` option and `showElement` export are removed.
- The table of contents, structured data and processed Markdown of a page only include the `<show>` branches that show for its props, and render its expressions as values.
- Headings with expressions get their IDs from the rendered text, and duplicate IDs only count the headings that show.
- Added the `analysis` option to Fumadocs MDX collections, `remarkHeading`, `remarkStructure`, `rehypeToc` and `remarkLLMs`: `runtime` (default) renders their outputs for the props of a page, `static` analyses them from the source.
- Refactored the outputs of MDX files: `toc`, `structuredData` and `extractedReferences` are functions of the props, and `_markdown` is a component, unless `analysis` is `static`.
- Refactored `page.data.structuredData` of Fumadocs MDX into an async function. Set `analysis: 'static'` on the collection to keep an object.
- `@fumadocs/mdx-remote` and the MDX presets of `fumadocs-core/content` keep static outputs, unless `analysis: 'runtime'` is set on the presets or their plugins.
- Deprecated the `output` option of `remarkLLMs`, use `analysis`: `string` is `static`, `function` is `runtime`.
- The search templates of the CLI await `page.data.structuredData()`.
- The frontmatter in code of Fumadocs MDX can use imports declared after it, and keeps the other variables declared in its statement.
- `@fumadocs/astro` supports frontmatter in code.
