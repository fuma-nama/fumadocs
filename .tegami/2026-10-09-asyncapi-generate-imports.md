---
packages:
  '@fumadocs/asyncapi': patch
---

### Fix `imports` option of `generateFiles()`

Imports were written one character per line. They are now written as whole `import` lines, same as the fix for `fumadocs-openapi` in #3678.
