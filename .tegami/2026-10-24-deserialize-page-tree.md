---
packages:
  'fumadocs-core': patch
---

### Copy the page tree on deserialization

- `deserializePageTree()` and `useFumadocsLoader()` no longer mutate the serialized page tree.
