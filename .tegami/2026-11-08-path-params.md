---
packages:
  'fumadocs-core': patch
  'fumadocs-mdx': patch
  '@fumadocs/satteri': patch
  '@fumadocs/astro': patch
  '@fumadocs/local-content': patch
  '@fumadocs/local-md': patch
---

### Path params and `<show>`

- A folder or file named `[name]` makes a page for each value listed in `staticParams` of its meta file or frontmatter.
- Each page is compiled for its params, read as `props`, and a file at a static path replaces the page of its value.
- `<show when={...}>` shows content on a condition. Conditions on params and inlined env vars are decided before headings, TOC, search and Markdown.
- The `define` option of Remark Show sets the values resolved at build time, like Vite's `define`, also per page.
- Custom sources give a dynamic file `dataAt()`, and `getStaticParams()` lists its params from any storage.
