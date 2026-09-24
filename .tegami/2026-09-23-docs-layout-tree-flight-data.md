---
packages:
  'fumadocs-ui': patch
---

### Strip internal page-tree fields from client flight data

`DocsLayout` no longer forwards `$ref` file paths, non-root `$id`s, or unset optional fields into the client-rendered page tree, reducing RSC flight data size on large docs sites.
