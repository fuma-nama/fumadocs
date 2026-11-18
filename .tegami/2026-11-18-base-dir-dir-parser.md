---
packages:
  'fumadocs-core': patch
---

### Fix `baseDir` with the `dir` parser

- The loader reads the locale of a file from its own path, so a source with `baseDir` keeps its languages with `parser: 'dir'`.
