---
packages:
  'fumadocs-mdx': patch
---

### Smaller builds of MDX pages

- The webpack/Turbopack loader no longer returns a source map of its own generated code, which cut about 1 GB of build memory on a large site.
