---
packages:
  'fumadocs-openapi': patch
---

### Generated files

- `watch` of `generateFiles()` watches the files of record inputs, like `{ petstore: './petstore.yaml' }`.
- Index cards with quotes in titles or descriptions generate valid MDX.
- Generated pages keep backslashes in document IDs, like Windows paths.
- `staticSource()` and `generateFiles()` are faster on large documents, `per: 'tag'` groups operations in one pass.
