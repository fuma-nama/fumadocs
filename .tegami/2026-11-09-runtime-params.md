---
packages:
  'fumadocs-core': minor
  'fumadocs-mdx': minor
  '@fumadocs/satteri': minor
  '@fumadocs/local-md': minor
  '@fumadocs/astro': minor
  '@fumadocs/cli': patch
  'create-fumadocs-app': patch
---

### Path params at runtime

- Refactored path params: each file of a dynamic path compiles once, and its content reads the params as `props` when rendering.
- Refactored `remarkShow`: conditions are checked when rendering, and the `define` option and `showElement` export are removed.
- Added the `analysis` option to Fumadocs MDX collections, `remarkHeading`, `remarkStructure`, `rehypeToc`, `remarkLLMs` and the MDX presets of `fumadocs-core/content`. `static` (default) analyses the outputs from the source, `runtime` renders them for the props of a page.
- With runtime analysis, `toc`, `structuredData` and `extractedReferences` of a page are functions of its props, and processed Markdown is a component. Fumadocs MDX binds them to the path params of a page, so `page.data.toc()` takes the props you pass to its content.
- With runtime analysis, the outputs of a page only include the `<show>` branches that show and render its expressions as values. Headings with expressions get their IDs from the rendered text, and duplicate IDs only count the headings that show.
- Deprecated the `output` option of `remarkLLMs`, use `analysis`: `string` is `static`, `function` is `runtime`.
- The templates of the CLI and `create-fumadocs-app` use runtime analysis.
- The frontmatter in code of Fumadocs MDX can use imports declared after it, and keeps the other variables declared in its statement.
- `@fumadocs/astro` supports frontmatter in code.
