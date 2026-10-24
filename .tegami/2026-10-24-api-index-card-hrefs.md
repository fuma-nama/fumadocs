---
packages:
  'fumadocs-openapi': patch
  '@fumadocs/asyncapi': patch
---

### Index card links with `contentDir`

- `index.url.contentDir` of `generateFiles()` resolves the generated pages from the `output` directory, card links no longer start with `../`.
- Card links use forward slashes on Windows.
