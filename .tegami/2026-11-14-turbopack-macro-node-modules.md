---
packages:
  'fumadocs-mdx': patch
---

### Macro outside node_modules in Turbopack

- With Turbopack, `createMDX()` no longer runs the `fumadocs-mdx/macro` transform on modules in `node_modules`, like with webpack and as the `macro.include` option documents.
