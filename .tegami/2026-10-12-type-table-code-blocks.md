---
packages:
  '@fumadocs/satteri': patch
  'fumadocs-typescript': patch
---

### Code blocks in type tables

- `remarkAutoTypeTable()` of `@fumadocs/satteri` highlights the code blocks in descriptions.
- Code blocks of unknown languages in descriptions are shown as plain text, instead of failing the build.
