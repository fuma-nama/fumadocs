---
packages:
  'fumadocs-openapi': patch
---

### Write `imports` of `generateFiles()` as import lines

The `imports` option of `generateFiles()` no longer splits the generated imports into one character per line. Each entry is written as one `import { ... } from '...';` line.

Fix [#3676](https://github.com/fuma-nama/fumadocs/issues/3676)
