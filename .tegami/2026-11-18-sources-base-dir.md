---
packages:
  'fumadocs-mdx': patch
  '@fumadocs/local-content': patch
  '@fumadocs/sanity': patch
  '@fumadocs/notion': patch
---

### Fix `baseDir` with the `dir` parser

- A source with `baseDir` keeps its languages with `parser: 'dir'`.
