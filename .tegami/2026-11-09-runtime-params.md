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
- Authored expressions render into the TOC, search data, processed Markdown and heading IDs.
- Refactored compiled outputs: `toc` and `structuredData` are functions of the props, processed Markdown is a component. In Fumadocs MDX, `page.data.structuredData` is an async function, the search templates of the CLI await it.
- Refactored `remarkShow`: removed the `define` option and the `showElement` export, conditions are always checked when rendering.
- `@fumadocs/astro` supports frontmatter in code.
