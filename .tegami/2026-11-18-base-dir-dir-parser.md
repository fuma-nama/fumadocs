---
packages:
  'fumadocs-core': patch
---

### Fix the `dir` parser under a base directory

- The `dir` parser finds the folder of a language under the base directory of a source, like `docs/en/page.mdx`.
