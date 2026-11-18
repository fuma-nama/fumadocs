---
packages:
  'fumadocs-core': patch
---

### Fix `baseDir` with the `dir` parser

- A source with `baseDir` keeps its languages with `parser: 'dir'`: its files go in `baseDir` after the language folder.
