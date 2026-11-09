---
packages:
  'fumadocs-core': minor
  'fumadocs-mdx': minor
  '@fumadocs/satteri': minor
  '@fumadocs/local-md': minor
  '@fumadocs/astro': minor
  '@fumadocs/cli': patch
---

### Path params at runtime

- Refactored path params: a file of a dynamic path compiles once, its content reads the params as `props` when rendering.
- `<show>` branches are checked when rendering. The TOC, search data and processed Markdown of a page only contain the branches that show for its props.
- Authored expressions render into the TOC, search data, processed Markdown and heading IDs, duplicate IDs count only the headings that show.
- Refactored outputs: `output: 'runtime'` (default) makes `toc`, `structuredData` and `extractedReferences` functions of the props and processed Markdown a component, `output: 'static'` keeps values analysed from source. In Fumadocs MDX, set it on a collection: `page.data.structuredData` is an async function by default, the search templates of the CLI await it.
- Deprecated `output: 'string'` and `output: 'function'` of `remarkLLMs`, use `static` and `runtime`.
- The frontmatter in code of Fumadocs MDX reads the imports after it, and keeps the other declarators of its statement.
- Refactored `remarkShow`: removed the `define` option and the `showElement` export, conditions are always checked when rendering.
- `@fumadocs/astro` supports frontmatter in code.
