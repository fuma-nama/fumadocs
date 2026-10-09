---
packages:
  'fumadocs-core': patch
  'fumadocs-typescript': patch
---

### Format generated Markdown tables

- Generated tables have aligned columns: the type tables of `auto-type-table`, the tables of `renderToMarkdown()` and the table rows of search records.
- `markdownTable()` from `fumadocs-core/mdx-plugins/stringifier` creates a formatted table for your plugins.
- `fumadocs-typescript` requires `fumadocs-core` 16.17.1.
